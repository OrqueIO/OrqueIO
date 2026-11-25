import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  ChangeDetectorRef, inject, DestroyRef, OnChanges, SimpleChanges, OnDestroy, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, interval, BehaviorSubject, combineLatest, of } from 'rxjs';
import { switchMap, takeWhile, map, catchError, tap, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTimes, faArrowRight, faExclamationTriangle, faSpinner,
  faCheckCircle, faTimesCircle, faPlayCircle, faCode,
  faChevronDown, faChevronUp, faInfoCircle, faCrosshairs, faListCheck,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { BatchService } from '../../../../services/batch.service';
import { BpmnElement } from '../../../../shared/bpmn-viewer/bpmn-viewer';
import { ModificationDto, ModificationInstruction } from '../../../../models/cockpit/modification.model';
import { SelectInstancesDialogComponent, InstanceSelectionResult, MOVE_INSTANCES_DIALOG_SESSION_KEY, SEARCH_PRESELECTION_SESSION_KEY, SearchMovePreselection } from './select-instances-dialog';
import { ConfirmModificationDialogComponent } from './confirm-modification-dialog';

export type ModifyOverlay = { activityId: string; role: 'source' | 'target' };

@Component({
  selector: 'app-modify-tab',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, FontAwesomeModule, TranslatePipe,
    SelectInstancesDialogComponent, ConfirmModificationDialogComponent
  ],
  templateUrl: './modify-tab.html',
  styleUrls: ['./modify-tab.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModifyTabComponent implements OnInit, OnChanges, OnDestroy {
  private processInstanceService = inject(ProcessInstanceService);
  private batchService = inject(BatchService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private pollSub: Subscription | null = null;

  // Reactive eligibility: these subjects drive automatic recalculation
  private sourceActivity$ = new BehaviorSubject<BpmnElement | null>(null);
  private searchPreselection$ = new BehaviorSubject<SearchMovePreselection | null>(null);
  private processDefinitionId$ = new BehaviorSubject<string | null>(null);

  @Input() processDefinitionId: string | null = null;
  @Input() bpmnXml: string | null = null;

  bpmnActivities: BpmnElement[] = [];

  @Output() overlaysChanged = new EventEmitter<ModifyOverlay[]>();
  @Output() refreshRequested = new EventEmitter<void>();

  faTimes = faTimes;
  faArrowRight = faArrowRight;
  faExclamationTriangle = faExclamationTriangle;
  faSpinner = faSpinner;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faPlayCircle = faPlayCircle;
  faCode = faCode;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faInfoCircle = faInfoCircle;
  faCrosshairs = faCrosshairs;
  faListCheck = faListCheck;
  faExclamationCircle = faExclamationCircle;

  sourceActivity: BpmnElement | null = null;
  targetActivity: BpmnElement | null = null;
  selectionMode: 'source' | 'target' = 'source';
  showPayload = false;

  showSelectDialog = false;
  showConfirmDialog = false;
  selectedInstanceIds: string[] = [];
  selectedQuery: Record<string, unknown> | null = null;
  selectionCount = 0;
  selectionIsQuery = false;

  eventSubprocessWarning = false;
  multiInstanceWarning = false;

  step: 'edit' | 'submitting' | 'result' = 'edit';
  batchId: string | null = null;
  batchError = false;
  batchCompleted = false;

  // Search preselection support
  searchPreselection: SearchMovePreselection | null = null;
  eligibleCount = 0;
  eligibleInstanceIds: string[] = [];
  eligibilityLoading = false;
  eligibilityError: string | null = null;
  batchProgress = 0;
  batchTotal = 0;

  ngOnInit(): void {
    // Reactive eligibility calculation: whenever source, preselection, or definitionId changes,
    // automatically recompute eligibility
    combineLatest([
      this.sourceActivity$,
      this.searchPreselection$,
      this.processDefinitionId$
    ]).pipe(
      debounceTime(50), // Avoid duplicate calls during rapid assignments
      switchMap(([source, preselection, defId]) => {
        // Reset state if any required input is missing
        if (!source || !preselection || !defId) {
          return of({
            loading: false,
            error: null as string | null,
            eligibleIds: [] as string[],
            eligibleCount: 0
          });
        }

        // All inputs present: start loading and fetch eligibility
        const requestBody = {
          processInstanceIds: preselection.selectedIds,
          activityIdIn: [source.id],
          processDefinitionId: defId
        };

        // Return loading state immediately, then fetch
        return of({ loading: true, error: null, eligibleIds: [], eligibleCount: 0 }).pipe(
          // Fetch actual data
          switchMap(() =>
            this.processInstanceService.queryRuntimeInstancesAtActivity(requestBody).pipe(
              map(eligibleIds => {
                return {
                  loading: false,
                  error: null as string | null,
                  eligibleIds,
                  eligibleCount: eligibleIds.length
                };
              }),
              catchError(err => {
                return of({
                  loading: false,
                  error: 'cockpit.modify.eligibilityCheckFailed' as string | null,
                  eligibleIds: [] as string[],
                  eligibleCount: 0
                });
              })
            )
          )
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(state => {
      this.eligibilityLoading = state.loading;
      this.eligibilityError = state.error;
      this.eligibleCount = state.eligibleCount;
      this.eligibleInstanceIds = state.eligibleIds;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processDefinitionId']) {
      this.reset();
      if (this.processDefinitionId) {
        // Update reactive stream
        this.processDefinitionId$.next(this.processDefinitionId);

        try {
          // Check for search preselection (Move from Search)
          const preselectionRaw = sessionStorage.getItem(SEARCH_PRESELECTION_SESSION_KEY);
          if (preselectionRaw) {
            const preselection = JSON.parse(preselectionRaw);
            if (preselection?.processDefinitionId === this.processDefinitionId) {
              this.searchPreselection = preselection;
              this.searchPreselection$.next(preselection); // Trigger reactive flow
              // DON'T remove from sessionStorage yet - keep it until success or manual clear
            } else {
              // Wrong process definition, clear it
              sessionStorage.removeItem(SEARCH_PRESELECTION_SESSION_KEY);
            }
          }

          // Check for dialogue session (Adjust selection)
          const raw = sessionStorage.getItem(MOVE_INSTANCES_DIALOG_SESSION_KEY);
          if (raw) {
            const state = JSON.parse(raw);
            if (state?.processDefinitionId === this.processDefinitionId) {
              if (state.sourceActivity || state.targetActivity) {
                this.showSelectDialog = true;
              }
              if (state.sourceActivity) {
                this.sourceActivity = state.sourceActivity;
                this.sourceActivity$.next(state.sourceActivity); // Trigger reactive flow
              }
              if (state.targetActivity) {
                this.targetActivity = state.targetActivity;
              }
              this.emitOverlays();
              this.cdr.markForCheck();
            } else {
              sessionStorage.removeItem(MOVE_INSTANCES_DIALOG_SESSION_KEY);
            }
          }
        } catch { }
      }
    }
    if (changes['bpmnXml'] && this.bpmnXml) {
      this.bpmnActivities = this.parseBpmnActivities(this.bpmnXml);
    }
  }

  get instructions(): ModificationInstruction[] {
    const result: ModificationInstruction[] = [];
    if (this.targetActivity) {
      result.push({ type: 'startBeforeActivity', activityId: this.targetActivity.id });
    }
    if (this.sourceActivity) {
      result.push({ type: 'cancel', activityId: this.sourceActivity.id });
    }
    return result;
  }

  get payloadJson(): string {
    if (!this.processDefinitionId || this.instructions.length === 0) return '';
    const preview: any = {
      processDefinitionId: this.processDefinitionId,
      instructions: this.instructions
    };

    // Add instance selection (when available)
    if (this.selectionIsQuery && this.selectedQuery) {
      preview.processInstanceQuery = this.selectedQuery;
    } else if (this.searchPreselection && this.eligibleInstanceIds.length > 0) {
      preview.processInstanceIds = this.eligibleInstanceIds;
    } else if (this.selectedInstanceIds.length > 0) {
      preview.processInstanceIds = this.selectedInstanceIds;
    }

    // Add default options
    preview.skipCustomListeners = true;
    preview.skipIoMappings = true;
    preview.annotation = '(optional)';

    return JSON.stringify(preview, null, 2);
  }

  get hasInstructions(): boolean {
    return !!this.sourceActivity || !!this.targetActivity;
  }

  get canSelectInstances(): boolean {
    return !!this.sourceActivity && !!this.targetActivity && !!this.processDefinitionId;
  }

  get callActivityWarning(): boolean {
    return this.sourceActivity?.type === 'bpmn:CallActivity';
  }

  togglePayload(): void {
    this.showPayload = !this.showPayload;
  }

  onElementClick(element: BpmnElement): void {
    if (!this.isSelectableElement(element)) return;

    if (this.selectionMode === 'source') {
      this.sourceActivity = element;
      this.sourceActivity$.next(element); // Trigger reactive eligibility
      this.selectionMode = 'target';
      this.eventSubprocessWarning = false;
    } else {
      if (element.isInEventSubprocessScope) {
        this.eventSubprocessWarning = true;
        this.cdr.markForCheck();
        return;
      }
      this.eventSubprocessWarning = false;
      this.targetActivity = element;
      this.multiInstanceWarning = !!element.isInMultiInstanceScope;
      this.selectionMode = 'source';
    }
    this.emitOverlays();
    this.cdr.markForCheck();
  }

  private isSelectableElement(element: BpmnElement): boolean {
    const type = element.type;
    return type.startsWith('bpmn:') && !['bpmn:Process', 'bpmn:SequenceFlow', 'bpmn:MessageFlow',
      'bpmn:Association', 'bpmn:DataObjectReference', 'bpmn:DataStoreReference',
      'bpmn:TextAnnotation', 'bpmn:Group', 'bpmn:Participant', 'bpmn:Lane',
      'bpmn:Collaboration'].includes(type);
  }

  setSource(element: BpmnElement | null): void {
    this.sourceActivity = element;
    this.sourceActivity$.next(element); // Trigger reactive eligibility
    this.emitOverlays();
    this.cdr.markForCheck();
  }

  setTarget(element: BpmnElement | null): void {
    this.targetActivity = element;
    this.eventSubprocessWarning = false;
    if (!element) {
      this.multiInstanceWarning = false;
    }
    this.emitOverlays();
    this.cdr.markForCheck();
  }

  // checkEligibility() removed - now handled by reactive stream in ngOnInit

  clearSearchPreselection(): void {
    this.searchPreselection = null;
    this.searchPreselection$.next(null); // Trigger reactive reset
    try {
      sessionStorage.removeItem(SEARCH_PRESELECTION_SESSION_KEY);
    } catch {}
    this.cdr.markForCheck();
  }

  retryEligibilityCheck(): void {
    // Re-trigger the reactive flow by re-emitting current values
    this.sourceActivity$.next(this.sourceActivity);
  }

  applyToEligibleInstances(): void {
    if (!this.searchPreselection || this.eligibleInstanceIds.length === 0 || !this.processDefinitionId || !this.sourceActivity) return;

    // Save state to sessionStorage for Select Instances dialog
    // CRITICAL: Include BOTH activityId and instanceId pills
    // - activityId pill is REQUIRED by validation to enable "Modify Selected" button
    // - instanceId pill restricts the query to eligible instances only
    const state = {
      processDefinitionId: this.processDefinitionId,
      activePills: [
        {
          field: 'activityId',
          values: [this.sourceActivity.id]
        },
        {
          field: 'instanceId',
          values: this.eligibleInstanceIds
        }
      ],
      selectionMode: 'instance' as const,
      selectedIds: this.eligibleInstanceIds,
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      sourceActivity: this.sourceActivity,
      targetActivity: this.targetActivity
    };

    try {
      sessionStorage.setItem(MOVE_INSTANCES_DIALOG_SESSION_KEY, JSON.stringify(state));
    } catch {}

    // Open Select Instances dialog (not Confirm Modification)
    this.showSelectDialog = true;
    this.cdr.markForCheck();
  }

  get canApplyToPreselection(): boolean {
    return !!this.searchPreselection && !!this.sourceActivity && !!this.targetActivity;
  }

  clearAll(): void {
    this.sourceActivity = null;
    this.sourceActivity$.next(null); // Trigger reactive reset
    this.targetActivity = null;
    this.selectedInstanceIds = [];
    this.selectedQuery = null;
    this.selectionCount = 0;
    this.selectionIsQuery = false;
    this.selectionMode = 'source';
    this.eventSubprocessWarning = false;
    this.multiInstanceWarning = false;
    this.emitOverlays();
    this.cdr.markForCheck();
  }

  openSelectInstancesDialog(): void {
    this.showSelectDialog = true;
    this.cdr.markForCheck();
  }

  onInstancesSelected(result: InstanceSelectionResult): void {
    this.selectionIsQuery = result.mode === 'query';
    this.selectedInstanceIds = result.instanceIds;
    this.selectedQuery = result.query;
    this.selectionCount = result.count;
    this.showSelectDialog = false;
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  onActivityIdCriterionChange(id: string | null): void {
    if (id === null) {
      this.sourceActivity = null;
      this.sourceActivity$.next(null);
    } else if (this.sourceActivity) {
      this.sourceActivity = { ...this.sourceActivity, id };
      this.sourceActivity$.next(this.sourceActivity);
    } else {
      this.sourceActivity = { id, type: 'bpmn:FlowNode' };
      this.sourceActivity$.next(this.sourceActivity);
    }
    this.emitOverlays();
    this.cdr.markForCheck();
  }

  onSelectDialogCancelled(): void {
    this.showSelectDialog = false;
    this.cdr.markForCheck();
  }

  onConfirmDialogBack(): void {
    this.showConfirmDialog = false;
    this.showSelectDialog = true;
    this.cdr.markForCheck();
  }

  onConfirmDialogCancelled(): void {
    this.showConfirmDialog = false;
    this.cdr.markForCheck();
  }

  onConfirmProceed(options: {
    skipCustomListeners: boolean;
    skipIoMappings: boolean;
    cancelCurrentActive: boolean;
    annotation: string;
  }): void {
    this.showConfirmDialog = false;
    try { sessionStorage.removeItem(MOVE_INSTANCES_DIALOG_SESSION_KEY); } catch { }
    if (!this.processDefinitionId) return;

    const instructions = this.buildInstructions(options.cancelCurrentActive);
    const dto: ModificationDto = {
      processDefinitionId: this.processDefinitionId,
      instructions,
      skipCustomListeners: options.skipCustomListeners,
      skipIoMappings: options.skipIoMappings,
      annotation: options.annotation || undefined
    };

    if (this.selectionIsQuery && this.selectedQuery) {
      dto.processInstanceQuery = this.selectedQuery;
    } else {
      dto.processInstanceIds = this.selectedInstanceIds;
    }

    this.step = 'submitting';
    this.cdr.markForCheck();

    this.processInstanceService.executeModificationAsync(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (batch) => {
          this.batchId = batch.id;
          this.batchError = false;
          this.batchCompleted = false;
          this.batchProgress = 0;
          this.batchTotal = 0;
          this.step = 'result';
          this.cdr.markForCheck();
          this.startPollingBatch(batch.id);
        },
        error: () => {
          this.batchError = true;
          this.step = 'result';
          this.cdr.markForCheck();
        }
      });
  }

  startNewModification(): void {
    try { sessionStorage.removeItem(MOVE_INSTANCES_DIALOG_SESSION_KEY); } catch { }
    this.reset();
    this.cdr.markForCheck();
  }

  private buildInstructions(cancelCurrentActive: boolean): ModificationInstruction[] {
    const result: ModificationInstruction[] = [];
    if (this.targetActivity) {
      result.push({ type: 'startBeforeActivity', activityId: this.targetActivity.id });
    }
    if (this.sourceActivity) {
      result.push({ type: 'cancel', activityId: this.sourceActivity.id, cancelCurrentActiveActivityInstances: cancelCurrentActive });
    }
    return result;
  }

  private startPollingBatch(batchId: string): void {
    this.stopPolling();
    this.pollSub = interval(2000).pipe(
      switchMap(() => this.batchService.getBatch(batchId)),
      takeWhile(batch => batch !== null && batch.remainingJobs > 0, true)
    ).subscribe({
      next: (batch) => {
        if (batch) {
          this.batchTotal = batch.totalJobs;
          this.batchProgress = batch.completedJobs;
          if (batch.remainingJobs === 0) {
            this.onBatchCompleted();
          }
        } else {
          this.onBatchCompleted();
        }
        this.cdr.markForCheck();
      },
      complete: () => {
        if (!this.batchCompleted) {
          this.onBatchCompleted();
          this.cdr.markForCheck();
        }
      }
    });
  }

  private onBatchCompleted(): void {
    this.batchCompleted = true;
    this.stopPolling();

    // Clear preselection on success
    try {
      sessionStorage.removeItem(SEARCH_PRESELECTION_SESSION_KEY);
    } catch {}
    this.searchPreselection = null;
    this.searchPreselection$.next(null);

    // Clear query params from URL
    const currentUrl = this.router.url.split('?')[0];
    this.router.navigate([currentUrl], { replaceUrl: true, queryParams: {} });

    this.refreshRequested.emit();
    this.cdr.detectChanges();
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  private reset(): void {
    this.stopPolling();
    this.sourceActivity = null;
    this.sourceActivity$.next(null); // Trigger reactive reset
    this.targetActivity = null;
    this.selectedInstanceIds = [];
    this.selectionCount = 0;
    this.selectionIsQuery = false;
    this.selectionMode = 'source';
    this.step = 'edit';
    this.batchId = null;
    this.batchError = false;
    this.batchCompleted = false;
    this.batchProgress = 0;
    this.batchTotal = 0;
    this.eventSubprocessWarning = false;
    this.multiInstanceWarning = false;
    this.searchPreselection = null;
    this.searchPreselection$.next(null); // Trigger reactive reset
    this.eligibleCount = 0;
    this.eligibleInstanceIds = [];
    this.emitOverlays();
  }

  private parseBpmnActivities(xml: string): BpmnElement[] {
    // Allowlist: only selectable BPMN flow node types.
    // We restrict to descendants of <process> to skip the entire bpmndi:BPMNDiagram
    // section (which contains _di shape/edge elements that also carry id attributes).
    const FLOW_NODE_TYPES = new Set([
      'task', 'userTask', 'serviceTask', 'manualTask', 'businessRuleTask',
      'scriptTask', 'sendTask', 'receiveTask', 'callActivity',
      'subProcess', 'transaction', 'adHocSubProcess',
      'startEvent', 'endEvent',
      'intermediateThrowEvent', 'intermediateCatchEvent', 'boundaryEvent',
      'exclusiveGateway', 'inclusiveGateway', 'parallelGateway',
      'eventBasedGateway', 'complexGateway'
    ]);
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const result: BpmnElement[] = [];
      const processElements = Array.from(doc.getElementsByTagName('*'))
        .filter(el => el.localName === 'process');
      for (const processEl of processElements) {
        const walker = doc.createTreeWalker(processEl, NodeFilter.SHOW_ELEMENT);
        let node: Node | null = walker.nextNode();
        while (node) {
          const el = node as Element;
          if (FLOW_NODE_TYPES.has(el.localName)) {
            const id = el.getAttribute('id');
            if (id) {
              const pascal = el.localName.charAt(0).toUpperCase() + el.localName.slice(1);
              result.push({ id, type: `bpmn:${pascal}`, name: el.getAttribute('name') || undefined });
            }
          }
          node = walker.nextNode();
        }
      }
      return result;
    } catch {
      return [];
    }
  }

  private emitOverlays(): void {
    const overlays: ModifyOverlay[] = [];
    if (this.sourceActivity) overlays.push({ activityId: this.sourceActivity.id, role: 'source' });
    if (this.targetActivity) overlays.push({ activityId: this.targetActivity.id, role: 'target' });
    this.overlaysChanged.emit(overlays);
  }
}
