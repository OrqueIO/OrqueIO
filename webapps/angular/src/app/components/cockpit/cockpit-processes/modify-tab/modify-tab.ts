import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  ChangeDetectorRef, inject, DestroyRef, OnChanges, SimpleChanges, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
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
import { SelectInstancesDialogComponent, InstanceSelectionResult } from './select-instances-dialog';
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
export class ModifyTabComponent implements OnChanges, OnDestroy {
  private processInstanceService = inject(ProcessInstanceService);
  private batchService = inject(BatchService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private pollSub: Subscription | null = null;

  @Input() processDefinitionId: string | null = null;
  @Input() bpmnXml: string | null = null;

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
  selectionCount = 0;
  selectionIsQuery = false;

  eventSubprocessWarning = false;
  multiInstanceWarning = false;

  step: 'edit' | 'submitting' | 'result' = 'edit';
  batchId: string | null = null;
  batchError = false;
  batchCompleted = false;
  batchProgress = 0;
  batchTotal = 0;

  ngOnDestroy(): void {
    this.stopPolling();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processDefinitionId']) {
      this.reset();
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
    const preview = {
      processDefinitionId: this.processDefinitionId,
      instructions: this.instructions
    };
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

  clearAll(): void {
    this.sourceActivity = null;
    this.targetActivity = null;
    this.selectedInstanceIds = [];
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
    this.selectionCount = result.count;
    this.showSelectDialog = false;
    this.showConfirmDialog = true;
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
    if (!this.processDefinitionId) return;

    const instructions = this.buildInstructions(options.cancelCurrentActive);
    const dto: ModificationDto = {
      processDefinitionId: this.processDefinitionId,
      instructions,
      skipCustomListeners: options.skipCustomListeners,
      skipIoMappings: options.skipIoMappings,
      annotation: options.annotation || undefined
    };

    dto.processInstanceIds = this.selectedInstanceIds;

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
    this.emitOverlays();
  }

  private emitOverlays(): void {
    const overlays: ModifyOverlay[] = [];
    if (this.sourceActivity) overlays.push({ activityId: this.sourceActivity.id, role: 'source' });
    if (this.targetActivity) overlays.push({ activityId: this.targetActivity.id, role: 'target' });
    this.overlaysChanged.emit(overlays);
  }
}
