import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef,
  DestroyRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subject, switchMap, catchError, EMPTY } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faPauseCircle, faPlayCircle, faTrash, faSpinner,
  faCheckCircle, faTimesCircle, faExclamationTriangle,
  faChevronDown, faChevronUp, faInfoCircle, faEye,
  faDatabase, faSyncAlt, faCodeBranch, faClock, faTag, faEnvelope
} from '@fortawesome/free-solid-svg-icons';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { ProcessInstanceService, ProcessInstance } from '../../../../services/process-instance.service';
import { CockpitService, MultiValueFilter } from '../../../../services/cockpit.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { CamDatePipe } from '../../../../pipes';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { InstanceFilterPanelComponent, FilterPanelChange } from '../../../../shared/instance-filter-panel/instance-filter-panel';
import { BatchWizardStepperComponent, WizardStep } from '../batch-wizard-stepper/batch-wizard-stepper';
import { BatchOperationListComponent, BatchOperationDef } from '../batch-operation-list/batch-operation-list';
import { environment } from '../../../../../environments/environment';


const BATCH_OPERATIONS: BatchOperationDef[] = [
  {
    id: 'suspend',
    labelKey: 'cockpit.batchOps.suspend.label',
    descKey: 'cockpit.batchOps.suspend.desc',
    icon: faPauseCircle,
    badgeClass: 'badge--amber',
    available: true,
    actionBtnKey: 'cockpit.batchOps.suspend.actionBtn',
    actionBtnQueryKey: 'cockpit.batchOps.suspend.actionBtnQuery'
  },
  {
    id: 'activate',
    labelKey: 'cockpit.batchOps.activate.label',
    descKey: 'cockpit.batchOps.activate.desc',
    icon: faPlayCircle,
    badgeClass: 'badge--green',
    available: true,
    actionBtnKey: 'cockpit.batchOps.activate.actionBtn',
    actionBtnQueryKey: 'cockpit.batchOps.activate.actionBtnQuery'
  },
  {
    id: 'delete-running',
    labelKey: 'cockpit.batchOps.deleteRunning.label',
    descKey: 'cockpit.batchOps.deleteRunning.desc',
    icon: faTrash,
    badgeClass: 'badge--red',
    available: true,
    actionBtnKey: 'cockpit.batchOps.deleteRunning.actionBtn',
    actionBtnQueryKey: 'cockpit.batchOps.deleteRunning.actionBtnQuery'
  },
  {
    id: 'delete-finished',
    labelKey: 'cockpit.batchOps.deleteFinished.label',
    descKey: 'cockpit.batchOps.deleteFinished.desc',
    icon: faTrash,
    badgeClass: 'badge--red',
    available: true,
    actionBtnKey: 'cockpit.batchOps.deleteFinished.actionBtn',
    actionBtnQueryKey: 'cockpit.batchOps.deleteFinished.actionBtnQuery'
  },
  {
    id: 'delete-decision',
    labelKey: 'cockpit.batchOps.deleteDecision.label',
    descKey: 'cockpit.batchOps.deleteDecision.desc',
    icon: faDatabase,
    badgeClass: 'badge--red',
    available: false
  },
  {
    id: 'set-retries-jobs',
    labelKey: 'cockpit.batchOps.setRetriesJobs.label',
    descKey: 'cockpit.batchOps.setRetriesJobs.desc',
    icon: faSyncAlt,
    badgeClass: 'badge--blue',
    available: false
  },
  {
    id: 'set-retries-external',
    labelKey: 'cockpit.batchOps.setRetriesExternal.label',
    descKey: 'cockpit.batchOps.setRetriesExternal.desc',
    icon: faSyncAlt,
    badgeClass: 'badge--blue',
    available: false
  },
  {
    id: 'set-variables',
    labelKey: 'cockpit.batchOps.setVariables.label',
    descKey: 'cockpit.batchOps.setVariables.desc',
    icon: faTag,
    badgeClass: 'badge--purple',
    available: false
  },
  {
    id: 'correlate',
    labelKey: 'cockpit.batchOps.correlate.label',
    descKey: 'cockpit.batchOps.correlate.desc',
    icon: faEnvelope,
    badgeClass: 'badge--blue',
    available: false
  },
  {
    id: 'migrate',
    labelKey: 'cockpit.batchOps.migrate.label',
    descKey: 'cockpit.batchOps.migrate.desc',
    icon: faCodeBranch,
    badgeClass: 'badge--purple',
    available: false
  },
  {
    id: 'removal-time-process',
    labelKey: 'cockpit.batchOps.removalTimeProcess.label',
    descKey: 'cockpit.batchOps.removalTimeProcess.desc',
    icon: faClock,
    badgeClass: 'badge--gray',
    available: false
  },
  {
    id: 'removal-time-decision',
    labelKey: 'cockpit.batchOps.removalTimeDecision.label',
    descKey: 'cockpit.batchOps.removalTimeDecision.desc',
    icon: faClock,
    badgeClass: 'badge--gray',
    available: false
  },
  {
    id: 'removal-time-batch',
    labelKey: 'cockpit.batchOps.removalTimeBatch.label',
    descKey: 'cockpit.batchOps.removalTimeBatch.desc',
    icon: faClock,
    badgeClass: 'badge--gray',
    available: false
  }
];

interface WizardPersistedState {
  operationId: string | null;
  mode: 'instances' | 'query';
  step: 1 | 2;
  filterCriteria: MultiValueFilter[];
  vnIgnoreCase: boolean;
  vvIgnoreCase: boolean;
  selectedIds: string[];
  deleteReason?: string;
  skipCustomListeners?: boolean;
  skipIoMappings?: boolean;
}

@Component({
  selector: 'app-batch-operations-wizard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    CamDatePipe,
    PaginationComponent,
    InstanceFilterPanelComponent,
    BatchWizardStepperComponent,
    BatchOperationListComponent
  ],
  templateUrl: './batch-operations-wizard.html',
  styleUrl: './batch-operations-wizard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchOperationsWizardComponent implements OnInit, OnDestroy {
  private navMenuService = inject(NavMenuService);
  private processInstanceService = inject(ProcessInstanceService);
  private cockpitService = inject(CockpitService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private translateService = inject(TranslateService);

  faSpinner = faSpinner;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faExclamationTriangle = faExclamationTriangle;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faInfoCircle = faInfoCircle;
  faEye = faEye;
  faPlayCircle = faPlayCircle;
  faPauseCircle = faPauseCircle;
  faCodeBranch = faCodeBranch;

  breadcrumbs: BreadcrumbItem[] = [
    { translateKey: 'cockpit.menu.batchOperations' }
  ];

  wizardSteps: WizardStep[] = [
    { number: 1, labelKey: 'cockpit.batchOps.stepper.define' },
    { number: 2, labelKey: 'cockpit.batchOps.stepper.confirm' },
    { number: 3, labelKey: 'cockpit.batchOps.stepper.results' }
  ];

  operations: BatchOperationDef[] = BATCH_OPERATIONS;

  private readonly SESSION_KEY = 'batchOpsWizardState';

  currentStep: 1 | 2 | 3 = 1;
  selectedOperationId: string | null = null;

  mode: 'instances' | 'query' = 'instances';

  instances: ProcessInstance[] = [];
  instancesTotal: number = 0;
  instancesLoading = false;
  instancesPage = 1;
  instancesPageSize = 10;

  filterCriteria: MultiValueFilter[] = [];
  vnIgnoreCase = false;
  vvIgnoreCase = false;
  hasActiveCriteria = false;

  deleteReason = '';
  skipCustomListeners = false;
  skipIoMappings = false;

  private knownInstances = new Map<string, ProcessInstance>();

  private readonly instanceLoad$ = new Subject<void>();

  selectedIds = new Set<string>();

  showTechnicalDetails = false;

  executing = false;
  batchId: string | null = null;
  batchError = false;

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);

    this.instanceLoad$.pipe(
      switchMap(() => {
        let injectedStatePill: MultiValueFilter | null;
        if (this.selectedOperationId === 'activate') {
          injectedStatePill = { field: 'state', values: ['suspended'] };
        } else if (this.selectedOperationId === 'delete-running') {
          injectedStatePill = { field: 'state', values: ['unfinished'] };
        } else if (this.selectedOperationId === 'delete-finished') {
          injectedStatePill = { field: 'state', values: ['finished'] };
        } else {
          injectedStatePill = { field: 'state', values: ['active'] };
        }
        const criteria: MultiValueFilter[] = injectedStatePill
          ? [injectedStatePill, ...this.filterCriteria]
          : [...this.filterCriteria];

        const firstResult = (this.instancesPage - 1) * this.instancesPageSize;
        return forkJoin({
          results: this.cockpitService.searchProcessInstancesGlobal(
            criteria, this.vnIgnoreCase, this.vvIgnoreCase, firstResult, this.instancesPageSize),
          count: this.cockpitService.searchProcessInstancesGlobalCount(
            criteria, this.vnIgnoreCase, this.vvIgnoreCase)
        }).pipe(
          catchError(() => {
            this.instances = [];
            this.instancesTotal = 0;
            this.instancesLoading = false;
            this.cdr.markForCheck();
            return EMPTY;
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ results, count }) => {
      this.instances = results;
      this.instancesTotal = Math.max(count, results.length);
      results.forEach(i => this.knownInstances.set(i.id, i));
      this.instancesLoading = false;
      this.cdr.markForCheck();
    });

    this.loadFromSessionStorage();
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  onOperationSelect(id: string): void {
    if (this.selectedOperationId === id) return;
    this.selectedOperationId = id;
    this.resetForm();
    if (id === 'suspend' || id === 'activate' || id === 'delete-running' || id === 'delete-finished') {
      this.loadInstances();
    }
    this.cdr.markForCheck();
    this.saveToSessionStorage();
  }

  onClearOperation(): void {
    this.selectedOperationId = null;
    this.resetForm();
    this.cdr.markForCheck();
    this.saveToSessionStorage();
  }

  setMode(m: 'instances' | 'query'): void {
    if (this.mode === m) return;
    this.mode = m;
    this.selectedIds = new Set();
    this.cdr.markForCheck();
    this.saveToSessionStorage();
  }

  private resetForm(): void {
    this.mode = 'instances';
    this.filterCriteria = [];
    this.vnIgnoreCase = false;
    this.vvIgnoreCase = false;
    this.hasActiveCriteria = false;
    this.instances = [];
    this.instancesTotal = 0;
    this.knownInstances = new Map();
    this.instancesPage = 1;
    this.selectedIds = new Set();
    this.deleteReason = '';
    this.skipCustomListeners = false;
    this.skipIoMappings = false;
  }

  onRowClick(id: string): void {
    if (this.mode === 'instances') this.toggleInstance(id);
  }

  private loadInstances(): void {
    this.instancesLoading = true;
    this.cdr.markForCheck();
    this.instanceLoad$.next();
  }

  onFilterChange(event: FilterPanelChange): void {
    this.filterCriteria = event.criteria;
    this.vnIgnoreCase = event.vnIgnoreCase;
    this.vvIgnoreCase = event.vvIgnoreCase;
    this.hasActiveCriteria = event.criteria.length > 0;
    this.instancesPage = 1;
    this.selectedIds = new Set();
    this.loadInstances();
    this.saveToSessionStorage();
  }

  toggleInstance(id: string): void {
    const next = new Set(this.selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds = next;
    this.cdr.markForCheck();
    this.saveToSessionStorage();
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  get isAllOnPageSelected(): boolean {
    return this.instances.length > 0 && this.instances.every(i => this.selectedIds.has(i.id));
  }

  get isIndeterminate(): boolean {
    const count = this.instances.filter(i => this.selectedIds.has(i.id)).length;
    return count > 0 && count < this.instances.length;
  }

  toggleSelectAll(): void {
    const next = new Set(this.selectedIds);
    if (this.isAllOnPageSelected) {
      this.instances.forEach(i => next.delete(i.id));
    } else {
      this.instances.forEach(i => next.add(i.id));
    }
    this.selectedIds = next;
    this.cdr.markForCheck();
    this.saveToSessionStorage();
  }

  get selectedOperation(): BatchOperationDef | undefined {
    return this.selectedOperationId
      ? this.operations.find(op => op.id === this.selectedOperationId)
      : undefined;
  }

  get canContinue(): boolean {
    if (this.mode === 'instances') return this.selectedIds.size > 0;
    return true;
  }

  onInstancesPageChange(event: PageChangeEvent): void {
    this.instancesPage = event.current;
    this.instancesPageSize = event.size;
    this.loadInstances();
  }

  continue(): void {
    if (!this.canContinue) return;
    this.currentStep = 2;
    this.showTechnicalDetails = false;
    window.scrollTo(0, 0);
    this.cdr.markForCheck();
    this.saveToSessionStorage();
  }

  get selectedCount(): number {
    return this.mode === 'instances' ? this.selectedIds.size : this.instancesTotal;
  }

  get confirmPayloadJson(): string {
    if (this.selectedOperationId === 'delete-running') {
      const base: Record<string, unknown> = {
        skipCustomListeners: this.skipCustomListeners,
        skipIoMappings: this.skipIoMappings
      };
      if (this.deleteReason.trim()) base['deleteReason'] = this.deleteReason.trim();
      if (this.mode === 'instances') {
        return JSON.stringify({ ...base, processInstanceIds: [...this.selectedIds] }, null, 2);
      }
      return JSON.stringify({ ...base, historicProcessInstanceQuery: this.buildHistoricQueryForBatch() }, null, 2);
    }
    if (this.selectedOperationId === 'delete-finished') {
      const base: Record<string, unknown> = {};
      if (this.deleteReason.trim()) base['deleteReason'] = this.deleteReason.trim();
      if (this.mode === 'instances') {
        return JSON.stringify({ ...base, historicProcessInstanceIds: [...this.selectedIds] }, null, 2);
      }
      return JSON.stringify({ ...base, historicProcessInstanceQuery: this.buildHistoricQueryForBatch() }, null, 2);
    }
    const suspended = this.selectedOperationId === 'suspend';
    if (this.mode === 'instances') {
      return JSON.stringify({ suspended, processInstanceIds: [...this.selectedIds] }, null, 2);
    }
    return JSON.stringify({ suspended, historicProcessInstanceQuery: this.buildHistoricQueryForBatch() }, null, 2);
  }

  get confirmEndpoint(): string {
    if (this.selectedOperationId === 'delete-running') {
      return `POST ${environment.engineUrl}/default/process-instance/delete`;
    }
    if (this.selectedOperationId === 'delete-finished') {
      return `POST ${environment.engineUrl}/default/history/process-instance/delete`;
    }
    return `POST ${environment.engineUrl}/default/process-instance/suspended-async`;
  }

  buildHistoricQueryForBatch(): Record<string, unknown> {
    let query: Record<string, unknown>;
    if (this.selectedOperationId === 'activate') {
      query = { suspended: true, unfinished: true };
    } else if (this.selectedOperationId === 'delete-running') {
      query = { unfinished: true };
    } else if (this.selectedOperationId === 'delete-finished') {
      query = { finished: true };
    } else {
      query = { active: true, unfinished: true };
    }
    for (const f of this.filterCriteria) {
      switch (f.field) {
        case 'instanceId':
          if (f.values.length === 1) query['processInstanceId'] = f.values[0];
          else query['processInstanceIdIn'] = f.values;
          break;
        case 'businessKey':
          query['processInstanceBusinessKeyLike'] = `%${f.values[0]}%`;
          break;
        case 'startedAfter':  query['startedAfter']  = f.values[0]; break;
        case 'startedBefore': query['startedBefore'] = f.values[0]; break;
        case 'finishedAfter':  query['finishedAfter']  = f.values[0]; break;
        case 'finishedBefore': query['finishedBefore'] = f.values[0]; break;
        case 'processDefinition':
          if (f.values.length > 0) query['processDefinitionKeyIn'] = f.values;
          break;
        case 'variables':
          if (f.variableLines?.length) {
            query['variables'] = f.variableLines.map(l => ({
              name: l.variableName,
              operator: l.variableOperator,
              value: l.values[0] ?? ''
            }));
          }
          break;
      }
    }
    if (this.vnIgnoreCase) query['variableNamesIgnoreCase'] = true;
    if (this.vvIgnoreCase) query['variableValuesIgnoreCase'] = true;
    return query;
  }

  toggleTechnicalDetails(): void {
    this.showTechnicalDetails = !this.showTechnicalDetails;
    this.cdr.markForCheck();
  }

  back(): void {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as 1 | 2;
      window.scrollTo(0, 0);
      this.cdr.markForCheck();
      this.saveToSessionStorage();
    }
  }

 execute(): void {
    if (this.executing) return;
    this.executing = true;
    this.currentStep = 3;
    window.scrollTo(0, 0);
    this.cdr.markForCheck();

    if (this.selectedOperationId === 'delete-running') {
      const deleteReason = this.deleteReason.trim() || undefined;
      const deletePayload = this.mode === 'instances'
        ? { deleteReason, skipCustomListeners: this.skipCustomListeners, skipIoMappings: this.skipIoMappings, processInstanceIds: [...this.selectedIds] }
        : { deleteReason, skipCustomListeners: this.skipCustomListeners, skipIoMappings: this.skipIoMappings, historicProcessInstanceQuery: this.buildHistoricQueryForBatch() };
      this.processInstanceService.deleteInstancesAsync(deletePayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: batch => {
            this.batchId = batch.id;
            this.executing = false;
            this.clearSessionStorage();
            this.cdr.markForCheck();
          },
          error: () => {
            this.batchError = true;
            this.executing = false;
            this.cdr.markForCheck();
          }
        });
      return;
    }

    if (this.selectedOperationId === 'delete-finished') {
      const deleteReason = this.deleteReason.trim() || undefined;
      const deleteFinishedPayload = this.mode === 'instances'
        ? { deleteReason, historicProcessInstanceIds: [...this.selectedIds] }
        : { deleteReason, historicProcessInstanceQuery: this.buildHistoricQueryForBatch() };
      this.processInstanceService.deleteFinishedInstancesAsync(deleteFinishedPayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: batch => {
            this.batchId = batch.id;
            this.executing = false;
            this.clearSessionStorage();
            this.cdr.markForCheck();
          },
          error: () => {
            this.batchError = true;
            this.executing = false;
            this.cdr.markForCheck();
          }
        });
      return;
    }

    const suspended = this.selectedOperationId === 'suspend';
    const payload = this.mode === 'instances'
      ? { suspended, processInstanceIds: [...this.selectedIds] }
      : { suspended, historicProcessInstanceQuery: this.buildHistoricQueryForBatch() };

    this.processInstanceService.suspendInstancesAsync(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: batch => {
          this.batchId = batch.id;
          this.executing = false;
          this.clearSessionStorage();
          this.cdr.markForCheck();
        },
        error: () => {
          this.batchError = true;
          this.executing = false;
          this.cdr.markForCheck();
        }
      });
  }

  reset(): void {
    this.clearSessionStorage();
    this.currentStep = 1;
    this.selectedOperationId = null;
    this.resetForm();
    this.batchId = null;
    this.batchError = false;
    this.executing = false;
    this.showTechnicalDetails = false;
    window.scrollTo(0, 0);
    this.cdr.markForCheck();
  }

  private saveToSessionStorage(): void {
    if (this.currentStep === 3) return;
    try {
      const state: WizardPersistedState = {
        operationId: this.selectedOperationId,
        mode: this.mode,
        step: this.currentStep as 1 | 2,
        filterCriteria: this.filterCriteria,
        vnIgnoreCase: this.vnIgnoreCase,
        vvIgnoreCase: this.vvIgnoreCase,
        selectedIds: [...this.selectedIds],
        deleteReason: this.deleteReason,
        skipCustomListeners: this.skipCustomListeners,
        skipIoMappings: this.skipIoMappings
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(state));
    } catch {
    }
  }

  private clearSessionStorage(): void {
    try {
      sessionStorage.removeItem(this.SESSION_KEY);
    } catch {
      // ignore
    }
  }

  private loadFromSessionStorage(): void {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      if (!raw) return;
      const state: WizardPersistedState = JSON.parse(raw);
      if (!state?.operationId) return;

      this.selectedOperationId = state.operationId;
      this.mode = state.mode ?? 'instances';
      this.filterCriteria = state.filterCriteria ?? [];
      this.vnIgnoreCase = state.vnIgnoreCase ?? false;
      this.vvIgnoreCase = state.vvIgnoreCase ?? false;
      this.hasActiveCriteria = this.filterCriteria.length > 0;
      this.selectedIds = new Set(state.selectedIds ?? []);
      this.deleteReason = state.deleteReason ?? '';
      this.skipCustomListeners = state.skipCustomListeners ?? false;
      this.skipIoMappings = state.skipIoMappings ?? false;
      // Never restore Results step — step 3 means a batch was submitted
      const restoredStep: number = state.step ?? 1;
      this.currentStep = restoredStep >= 3 ? 1 : restoredStep as 1 | 2;

      if (this.currentStep === 1 && (this.selectedOperationId === 'suspend' || this.selectedOperationId === 'activate' || this.selectedOperationId === 'delete-running' || this.selectedOperationId === 'delete-finished')) {
        this.loadInstances();
      }
      this.cdr.markForCheck();
    } catch {
    }
  }

  get lockedFilterState(): string | null {
    if (this.selectedOperationId === 'activate') return 'suspended';
    if (this.selectedOperationId === 'delete-running') return null;
    if (this.selectedOperationId === 'delete-finished') return 'finished';
    return 'active';
  }

  get operationOnlyNoteKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.activate.onlySuspendedNote';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.deleteRunning.onlyRunningNote';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.deleteFinished.onlyFinishedNote';
    return 'cockpit.batchOps.suspend.onlyRunningNote';
  }

  get operationNoInstancesKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.activate.noInstances';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.deleteRunning.noInstances';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.deleteFinished.noInstances';
    return 'cockpit.batchOps.suspend.noInstances';
  }

  get confirmInstancesSummaryKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.confirm.activateSummary';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.confirm.deleteRunningSummary';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.confirm.deleteFinishedSummary';
    return 'cockpit.batchOps.confirm.suspendSummary';
  }

  get confirmQuerySummaryKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.confirm.activateQuerySummary';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.confirm.deleteRunningQuerySummary';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.confirm.deleteFinishedQuerySummary';
    return 'cockpit.batchOps.confirm.querySummary';
  }

  get confirmInstancesBtnKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.confirm.activateBtn';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.confirm.deleteRunningBtn';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.confirm.deleteFinishedBtn';
    return 'cockpit.batchOps.confirm.suspendBtn';
  }

  get confirmQueryBtnKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.confirm.activateBtnQuery';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.confirm.deleteRunningBtnQuery';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.confirm.deleteFinishedBtnQuery';
    return 'cockpit.batchOps.confirm.suspendBtnQuery';
  }

  get showLargeVolumeWarning(): boolean {
    return (this.selectedOperationId === 'delete-running' || this.selectedOperationId === 'delete-finished')
      && this.mode === 'query' && this.instancesTotal > 1000;
  }

  get largeVolumeWarningKey(): string {
    return this.selectedOperationId === 'delete-finished'
      ? 'cockpit.batchOps.deleteFinished.largeVolumeWarning'
      : 'cockpit.batchOps.deleteRunning.largeVolumeWarning';
  }

  getDefinitionDisplay(inst: ProcessInstance): string {
    return inst.processDefinitionName || inst.processDefinitionKey || inst.processDefinitionId;
  }

  getInstanceStateClass(inst: ProcessInstance): string {
    switch (this.computeInstanceState(inst)) {
      case 'running':    return 'state-active';
      case 'suspended':  return 'state-suspended';
      case 'completed':  return 'state-completed';
      case 'terminated': return 'state-terminated';
      case 'incidents':  return 'state-error';
      default:           return '';
    }
  }

  getInstanceStateIcon(inst: ProcessInstance): any {
    switch (this.computeInstanceState(inst)) {
      case 'running':    return this.faPlayCircle;
      case 'suspended':  return this.faPauseCircle;
      case 'completed':  return this.faCheckCircle;
      case 'terminated': return this.faTimesCircle;
      case 'incidents':  return this.faExclamationTriangle;
      default:           return this.faPlayCircle;
    }
  }

  getInstanceStateLabel(inst: ProcessInstance): string {
    const t = (key: string) => this.translateService.instant(key);
    switch (this.computeInstanceState(inst)) {
      case 'running':    return t('cockpit.processes.globalSearch.instanceStateRunning');
      case 'suspended':  return t('cockpit.processes.filters.stateSuspended');
      case 'completed':  return t('cockpit.processes.filters.stateCompleted');
      case 'terminated': return t('cockpit.processes.filters.stateTerminated');
      case 'incidents':  return t('cockpit.processes.globalSearch.instanceStateWithIncidents');
      default:           return '';
    }
  }

  private computeInstanceState(inst: ProcessInstance): string {
    if (inst.state === 'SUSPENDED') return 'suspended';
    if (inst.state === 'COMPLETED') return 'completed';
    if (inst.state === 'EXTERNALLY_TERMINATED' || inst.state === 'INTERNALLY_TERMINATED') return 'terminated';
    if (inst.incidents && inst.incidents.length > 0) return 'incidents';
    return 'running';
  }
}
