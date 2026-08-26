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
  faDatabase, faSyncAlt, faCodeBranch, faClock, faTag, faEnvelope,
  faCirclePlus
} from '@fortawesome/free-solid-svg-icons';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { ProcessInstanceService, ProcessInstance } from '../../../../services/process-instance.service';
import { CockpitService, MultiValueFilter } from '../../../../services/cockpit.service';
import { DecisionService, DecisionInstance } from '../../../../services/decision.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { CamDatePipe } from '../../../../pipes';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { InstanceFilterPanelComponent, FilterPanelChange } from '../../../../shared/instance-filter-panel/instance-filter-panel';
import { BatchWizardStepperComponent, WizardStep } from '../batch-wizard-stepper/batch-wizard-stepper';
import { BatchOperationListComponent, BatchOperationDef } from '../batch-operation-list/batch-operation-list';
import { environment } from '../../../../../environments/environment';
import { VariableDefinitionsModalComponent, VariableDef } from './variable-definitions-modal/variable-definitions-modal';


function formatDateForBatchApi(dateStr: string, endOfDay: boolean): string {
  const withTime = `${dateStr}${endOfDay ? 'T23:59:59' : 'T00:00:00'}`;
  const d = new Date(withTime);
  if (isNaN(d.getTime())) return dateStr;
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absOff = Math.abs(offset);
  const hh = String(Math.floor(absOff / 60)).padStart(2, '0');
  const mm = String(absOff % 60).padStart(2, '0');
  const year = d.getFullYear();
  const mon  = String(d.getMonth() + 1).padStart(2, '0');
  const day  = String(d.getDate()).padStart(2, '0');
  const hrs  = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  const sec  = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${mon}-${day}T${hrs}:${min}:${sec}.000${sign}${hh}${mm}`;
}

function formatDueDateForApi(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (isNaN(d.getTime())) return dateStr;
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absOff = Math.abs(offset);
  const hh = String(Math.floor(absOff / 60)).padStart(2, '0');
  const mm = String(absOff % 60).padStart(2, '0');
  const y = String(d.getFullYear()).padStart(4, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}T00:00:00.000${sign}${hh}${mm}`;
}

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
    available: true,
    actionBtnKey: 'cockpit.batchOps.deleteDecision.actionBtn',
    actionBtnQueryKey: 'cockpit.batchOps.deleteDecision.actionBtnQuery'
  },
  {
    id: 'set-retries-jobs',
    labelKey: 'cockpit.batchOps.setRetriesJobs.label',
    descKey: 'cockpit.batchOps.setRetriesJobs.desc',
    icon: faSyncAlt,
    badgeClass: 'badge--blue',
    available: true,
    actionBtnKey: 'cockpit.batchOps.setRetriesJobs.actionBtn',
    actionBtnQueryKey: 'cockpit.batchOps.setRetriesJobs.actionBtnQuery'
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
    available: true,
    actionBtnKey: 'cockpit.batchOps.setVariables.actionBtn',
    actionBtnQueryKey: 'cockpit.batchOps.setVariables.actionBtnQuery'
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
  decisionSelectedIds?: string[];
  decisionFilterCriteria?: MultiValueFilter[];
  retries?: number;
  setDueDate?: boolean;
  retriesDueDate?: string;
  variableDefinitions?: { name: string; type: string; value: string }[];
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
    BatchOperationListComponent,
    VariableDefinitionsModalComponent
  ],
  templateUrl: './batch-operations-wizard.html',
  styleUrl: './batch-operations-wizard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchOperationsWizardComponent implements OnInit, OnDestroy {
  private navMenuService = inject(NavMenuService);
  private processInstanceService = inject(ProcessInstanceService);
  private cockpitService = inject(CockpitService);
  private decisionService = inject(DecisionService);
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
  faCirclePlus = faCirclePlus;

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

  retries = 1;
  setDueDate = false;
  retriesDueDate = '';
  variableDefinitions: VariableDef[] = [];

  decisionFilterCriteria: MultiValueFilter[] = [];
  decisionHasActiveCriteria = false;
  decisionInstances: DecisionInstance[] = [];
  decisionInstancesTotal = 0;
  decisionInstancesLoading = false;
  decisionInstancesPage = 1;
  decisionInstancesPageSize = 10;
  selectedDecisionIds = new Set<string>();

  private knownInstances = new Map<string, ProcessInstance>();

  private readonly instanceLoad$ = new Subject<void>();
  private readonly decisionInstanceLoad$ = new Subject<void>();

  selectedIds = new Set<string>();

  showTechnicalDetails = false;
  showVariablesModal = false;

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
        } else if (this.selectedOperationId === 'delete-running' || this.selectedOperationId === 'set-retries-jobs') {
          injectedStatePill = { field: 'state', values: ['unfinished'] };
        } else if (this.selectedOperationId === 'delete-finished') {
          injectedStatePill = { field: 'state', values: ['finished'] };
        } else if (this.selectedOperationId === 'set-variables') {
          injectedStatePill = { field: 'state', values: ['unfinished'] };
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

    this.decisionInstanceLoad$.pipe(
      switchMap(() => {
        const params = this.buildDecisionInstanceQueryParams();
        const countParams = this.buildDecisionInstanceQueryParams(true);
        return forkJoin({
          results: this.decisionService.getDecisionInstancesPaginated(params),
          count: this.decisionService.getDecisionInstancesCountFiltered(countParams)
        }).pipe(
          catchError(() => {
            this.decisionInstances = [];
            this.decisionInstancesTotal = 0;
            this.decisionInstancesLoading = false;
            this.cdr.markForCheck();
            return EMPTY;
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ results, count }) => {
      this.decisionInstances = results;
      this.decisionInstancesTotal = Math.max(count, results.length);
      this.decisionInstancesLoading = false;
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
    if (id === 'suspend' || id === 'activate' || id === 'delete-running' || id === 'delete-finished' || id === 'set-retries-jobs' || id === 'set-variables') {
      this.loadInstances();
    } else if (id === 'delete-decision') {
      this.loadDecisionInstances();
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
    this.selectedDecisionIds = new Set();
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
    this.retries = 1;
    this.setDueDate = false;
    this.retriesDueDate = '';
    this.variableDefinitions = [];
    this.decisionFilterCriteria = [];
    this.decisionHasActiveCriteria = false;
    this.decisionInstances = [];
    this.decisionInstancesTotal = 0;
    this.decisionInstancesPage = 1;
    this.selectedDecisionIds = new Set();
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

  onDecisionFilterChange(event: FilterPanelChange): void {
    this.decisionFilterCriteria = event.criteria;
    this.decisionHasActiveCriteria = event.criteria.length > 0;
    this.decisionInstancesPage = 1;
    this.selectedDecisionIds = new Set();
    this.loadDecisionInstances();
    this.saveToSessionStorage();
  }

  private loadDecisionInstances(): void {
    this.decisionInstancesLoading = true;
    this.cdr.markForCheck();
    this.decisionInstanceLoad$.next();
  }

  private buildDecisionInstanceQueryParams(countOnly = false): import('../../../../services/decision.service').DecisionInstanceQueryParams {
    const params: import('../../../../services/decision.service').DecisionInstanceQueryParams = {};
    if (!countOnly) {
      params.sortBy = 'evaluationTime';
      params.sortOrder = 'desc';
      params.firstResult = (this.decisionInstancesPage - 1) * this.decisionInstancesPageSize;
      params.maxResults = this.decisionInstancesPageSize;
    }
    for (const f of this.decisionFilterCriteria) {
      switch (f.field) {
        case 'decisionDefinition':
          if (f.values.length === 1) params.decisionDefinitionKey = f.values[0];
          else if (f.values.length > 1) params.decisionDefinitionKeyIn = f.values;
          break;
        case 'decisionInstanceId':
          if (f.values.length === 1) params.decisionInstanceId = f.values[0];
          else if (f.values.length > 1) params.decisionInstanceIdIn = f.values;
          break;
        case 'processInstanceId':
          if (f.values[0]) params.processInstanceId = f.values[0];
          break;
        case 'evaluatedAfter':
          if (f.values[0]) params.evaluatedAfter = f.values[0];
          break;
        case 'evaluatedBefore':
          if (f.values[0]) params.evaluatedBefore = f.values[0];
          break;
      }
    }
    return params;
  }

  toggleDecisionInstance(id: string): void {
    const next = new Set(this.selectedDecisionIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedDecisionIds = next;
    this.cdr.markForCheck();
    this.saveToSessionStorage();
  }

  isDecisionSelected(id: string): boolean {
    return this.selectedDecisionIds.has(id);
  }

  get isAllDecisionOnPageSelected(): boolean {
    return this.decisionInstances.length > 0 && this.decisionInstances.every(d => this.selectedDecisionIds.has(d.id));
  }

  get isDecisionIndeterminate(): boolean {
    const count = this.decisionInstances.filter(d => this.selectedDecisionIds.has(d.id)).length;
    return count > 0 && count < this.decisionInstances.length;
  }

  toggleSelectAllDecision(): void {
    const next = new Set(this.selectedDecisionIds);
    if (this.isAllDecisionOnPageSelected) {
      this.decisionInstances.forEach(d => next.delete(d.id));
    } else {
      this.decisionInstances.forEach(d => next.add(d.id));
    }
    this.selectedDecisionIds = next;
    this.cdr.markForCheck();
    this.saveToSessionStorage();
  }

  onDecisionRowClick(id: string): void {
    if (this.mode === 'instances') this.toggleDecisionInstance(id);
  }

  onDecisionInstancesPageChange(event: PageChangeEvent): void {
    this.decisionInstancesPage = event.current;
    this.decisionInstancesPageSize = event.size;
    this.loadDecisionInstances();
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
    if (this.selectedOperationId === 'delete-decision') {
      return this.mode === 'instances' ? this.selectedDecisionIds.size > 0 : true;
    }
    if (this.selectedOperationId === 'set-retries-jobs') {
      const retriesValid = Number.isInteger(this.retries) && this.retries >= 0;
      const dueDateValid = !this.setDueDate || this.retriesDueDate.trim() !== '';
      if (!retriesValid || !dueDateValid) return false;
      return this.mode === 'instances' ? this.selectedIds.size > 0 : true;
    }
    if (this.selectedOperationId === 'set-variables') {
      const varsValid = this.variableDefinitions.length > 0 &&
        this.variableDefinitions.every(v => v.name.trim() !== '');
      if (!varsValid) return false;
      return this.mode === 'instances' ? this.selectedIds.size > 0 : true;
    }
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
    if (this.selectedOperationId === 'delete-decision') {
      return this.mode === 'instances' ? this.selectedDecisionIds.size : this.decisionInstancesTotal;
    }
    return this.mode === 'instances' ? this.selectedIds.size : this.instancesTotal;
  }

  get confirmPayloadJson(): string {
    if (this.selectedOperationId === 'set-variables') {
      const variables = this.buildVariablesPayload();
      if (this.mode === 'instances') {
        return JSON.stringify({ processInstanceIds: [...this.selectedIds], variables }, null, 2);
      }
      return JSON.stringify({ historicProcessInstanceQuery: this.buildHistoricQueryForBatch(), variables }, null, 2);
    }
    if (this.selectedOperationId === 'set-retries-jobs') {
      const base: Record<string, unknown> = { retries: this.retries };
      if (this.setDueDate && this.retriesDueDate) {
        base['dueDate'] = formatDueDateForApi(this.retriesDueDate);
      }
      if (this.mode === 'instances') {
        return JSON.stringify({ ...base, jobQuery: { processInstanceIds: [...this.selectedIds] } }, null, 2);
      }
      return JSON.stringify({ ...base, historicProcessInstanceQuery: this.buildHistoricQueryForBatch() }, null, 2);
    }
    if (this.selectedOperationId === 'delete-decision') {
      const base: Record<string, unknown> = {};
      if (this.deleteReason.trim()) base['deleteReason'] = this.deleteReason.trim();
      if (this.mode === 'instances') {
        return JSON.stringify({ ...base, historicDecisionInstanceIds: [...this.selectedDecisionIds] }, null, 2);
      }
      return JSON.stringify({ ...base, historicDecisionInstanceQuery: this.buildHistoricDecisionQueryForBatch() }, null, 2);
    }
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
    if (this.selectedOperationId === 'set-variables') {
      return `POST ${environment.engineUrl}/default/process-instance/variables-async`;
    }
    if (this.selectedOperationId === 'set-retries-jobs') {
      return this.mode === 'instances'
        ? `POST ${environment.engineUrl}/default/job/retries`
        : `POST ${environment.engineUrl}/default/process-instance/job-retries-historic-query-based`;
    }
    if (this.selectedOperationId === 'delete-decision') {
      return `POST ${environment.engineUrl}/default/history/decision-instance/delete`;
    }
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
    } else if (this.selectedOperationId === 'delete-running' || this.selectedOperationId === 'set-retries-jobs') {
      query = { unfinished: true };
    } else if (this.selectedOperationId === 'delete-finished') {
      query = { finished: true };
    } else if (this.selectedOperationId === 'set-variables') {
      // Engine forces .unfinished() on any historicProcessInstanceQuery in SetVariablesToProcessInstancesBatchCmd.
      // Variables cannot be set on completed instances — their execution context no longer exists.
      query = { unfinished: true };
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

  buildHistoricDecisionQueryForBatch(): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    for (const f of this.decisionFilterCriteria) {
      switch (f.field) {
        case 'decisionDefinition':
          if (f.values.length === 1) query['decisionDefinitionKey'] = f.values[0];
          else if (f.values.length > 1) query['decisionDefinitionKeyIn'] = [...f.values];
          break;
        case 'decisionInstanceId':
          if (f.values.length === 1) query['decisionInstanceId'] = f.values[0];
          else if (f.values.length > 1) query['decisionInstanceIdIn'] = [...f.values];
          break;
        case 'processInstanceId':
          if (f.values[0]) query['processInstanceId'] = f.values[0];
          break;
        case 'evaluatedAfter':
          if (f.values[0]) query['evaluatedAfter'] = f.values[0];
          break;
        case 'evaluatedBefore':
          if (f.values[0]) query['evaluatedBefore'] = f.values[0];
          break;
      }
    }
    return query;
  }

  buildVariablesPayload(): Record<string, { value: unknown; type: string }> {
    const vars: Record<string, { value: unknown; type: string }> = {};
    for (const v of this.variableDefinitions) {
      if (!v.name.trim()) continue;
      let parsed: unknown = v.value;
      if (v.type === 'Integer' || v.type === 'Long' || v.type === 'Short') {
        parsed = Number(v.value);
      } else if (v.type === 'Double') {
        parsed = parseFloat(v.value);
      } else if (v.type === 'Boolean') {
        parsed = v.value === 'true';
      }
      vars[v.name.trim()] = { value: parsed, type: v.type };
    }
    return vars;
  }

  openVariablesModal(): void {
    this.showVariablesModal = true;
    this.cdr.markForCheck();
  }

  onVariablesApplied(vars: VariableDef[]): void {
    this.variableDefinitions = vars;
    this.showVariablesModal = false;
    this.saveToSessionStorage();
    this.cdr.markForCheck();
  }

  closeVariablesModal(): void {
    this.showVariablesModal = false;
    this.cdr.markForCheck();
  }

  removeVariableDefinition(index: number): void {
    this.variableDefinitions = this.variableDefinitions.filter((_, i) => i !== index);
    this.saveToSessionStorage();
    this.cdr.markForCheck();
  }

  trackByIndex(index: number): number {
    return index;
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

    if (this.selectedOperationId === 'set-retries-jobs') {
      const base: { retries: number; dueDate?: string } = { retries: this.retries };
      if (this.setDueDate && this.retriesDueDate) {
        base.dueDate = formatDueDateForApi(this.retriesDueDate);
      }
      const retriesPayload = this.mode === 'instances'
        ? { ...base, processInstances: [...this.selectedIds] }
        : { ...base, historicProcessInstanceQuery: this.buildHistoricQueryForBatch() };
      this.processInstanceService.setJobRetriesAsync(retriesPayload)
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

    if (this.selectedOperationId === 'set-variables') {
      const variables = this.buildVariablesPayload();
      const setVarsPayload = this.mode === 'instances'
        ? { processInstanceIds: [...this.selectedIds], variables }
        : { historicProcessInstanceQuery: this.buildHistoricQueryForBatch(), variables };
      this.processInstanceService.setVariablesAsync(setVarsPayload)
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

    if (this.selectedOperationId === 'delete-decision') {
      const deleteReason = this.deleteReason.trim() || undefined;
      const payload = this.mode === 'instances'
        ? { deleteReason, historicDecisionInstanceIds: [...this.selectedDecisionIds] }
        : { deleteReason, historicDecisionInstanceQuery: this.buildHistoricDecisionQueryForBatch() };
      this.decisionService.deleteDecisionInstancesAsync(payload)
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
        skipIoMappings: this.skipIoMappings,
        decisionSelectedIds: [...this.selectedDecisionIds],
        decisionFilterCriteria: this.decisionFilterCriteria,
        retries: this.retries,
        setDueDate: this.setDueDate,
        retriesDueDate: this.retriesDueDate,
        variableDefinitions: this.variableDefinitions
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
      this.retries = state.retries ?? 1;
      this.setDueDate = state.setDueDate ?? false;
      this.retriesDueDate = state.retriesDueDate ?? '';
      this.variableDefinitions = state.variableDefinitions ?? [];
      this.selectedDecisionIds = new Set(state.decisionSelectedIds ?? []);
      this.decisionFilterCriteria = state.decisionFilterCriteria ?? [];
      this.decisionHasActiveCriteria = this.decisionFilterCriteria.length > 0;
      // Never restore Results step — step 3 means a batch was submitted
      const restoredStep: number = state.step ?? 1;
      this.currentStep = restoredStep >= 3 ? 1 : restoredStep as 1 | 2;

      if (this.currentStep === 1 && (this.selectedOperationId === 'suspend' || this.selectedOperationId === 'activate' || this.selectedOperationId === 'delete-running' || this.selectedOperationId === 'delete-finished' || this.selectedOperationId === 'set-retries-jobs' || this.selectedOperationId === 'set-variables')) {
        this.loadInstances();
      } else if (this.currentStep === 1 && this.selectedOperationId === 'delete-decision') {
        this.loadDecisionInstances();
      }
      this.cdr.markForCheck();
    } catch {
    }
  }

  get lockedFilterState(): string | null {
    if (this.selectedOperationId === 'activate') return 'suspended';
    if (this.selectedOperationId === 'delete-running') return 'unfinished';
    if (this.selectedOperationId === 'set-retries-jobs') return 'unfinished';
    if (this.selectedOperationId === 'delete-finished') return 'finished';
    // 'unfinished' (not null): SetVariablesToProcessInstancesBatchCmd forces .unfinished()
    // on historicProcessInstanceQuery and uses a runtime-only query for processInstanceIds.
    // Completed instances are excluded at the engine level — restricting the filter here
    // prevents selecting IDs that would produce an empty batch element list and a 400.
    if (this.selectedOperationId === 'set-variables') return 'unfinished';
    return 'active';
  }

  get operationOnlyNoteKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.activate.onlySuspendedNote';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.deleteRunning.onlyRunningNote';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.deleteFinished.onlyFinishedNote';
    if (this.selectedOperationId === 'set-retries-jobs') return 'cockpit.batchOps.setRetriesJobs.onlyActiveNote';
    if (this.selectedOperationId === 'set-variables') return 'cockpit.batchOps.setVariables.anyStateNote';
    return 'cockpit.batchOps.suspend.onlyRunningNote';
  }

  get operationNoInstancesKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.activate.noInstances';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.deleteRunning.noInstances';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.deleteFinished.noInstances';
    if (this.selectedOperationId === 'set-retries-jobs') return 'cockpit.batchOps.setRetriesJobs.noInstances';
    if (this.selectedOperationId === 'set-variables') return 'cockpit.batchOps.setVariables.noInstances';
    return 'cockpit.batchOps.suspend.noInstances';
  }

  get confirmInstancesSummaryKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.confirm.activateSummary';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.confirm.deleteRunningSummary';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.confirm.deleteFinishedSummary';
    if (this.selectedOperationId === 'delete-decision') return 'cockpit.batchOps.confirm.deleteDecisionSummary';
    if (this.selectedOperationId === 'set-retries-jobs') return 'cockpit.batchOps.confirm.setRetriesJobsSummary';
    if (this.selectedOperationId === 'set-variables') return 'cockpit.batchOps.confirm.setVariablesSummary';
    return 'cockpit.batchOps.confirm.suspendSummary';
  }

  get confirmQuerySummaryKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.confirm.activateQuerySummary';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.confirm.deleteRunningQuerySummary';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.confirm.deleteFinishedQuerySummary';
    if (this.selectedOperationId === 'delete-decision') return 'cockpit.batchOps.confirm.deleteDecisionQuerySummary';
    if (this.selectedOperationId === 'set-retries-jobs') return 'cockpit.batchOps.confirm.setRetriesJobsQuerySummary';
    if (this.selectedOperationId === 'set-variables') return 'cockpit.batchOps.confirm.setVariablesQuerySummary';
    return 'cockpit.batchOps.confirm.querySummary';
  }

  get confirmInstancesBtnKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.confirm.activateBtn';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.confirm.deleteRunningBtn';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.confirm.deleteFinishedBtn';
    if (this.selectedOperationId === 'delete-decision') return 'cockpit.batchOps.confirm.deleteDecisionBtn';
    if (this.selectedOperationId === 'set-retries-jobs') return 'cockpit.batchOps.confirm.setRetriesJobsBtn';
    if (this.selectedOperationId === 'set-variables') return 'cockpit.batchOps.confirm.setVariablesBtn';
    return 'cockpit.batchOps.confirm.suspendBtn';
  }

  get confirmQueryBtnKey(): string {
    if (this.selectedOperationId === 'activate') return 'cockpit.batchOps.confirm.activateBtnQuery';
    if (this.selectedOperationId === 'delete-running') return 'cockpit.batchOps.confirm.deleteRunningBtnQuery';
    if (this.selectedOperationId === 'delete-finished') return 'cockpit.batchOps.confirm.deleteFinishedBtnQuery';
    if (this.selectedOperationId === 'delete-decision') return 'cockpit.batchOps.confirm.deleteDecisionBtnQuery';
    if (this.selectedOperationId === 'set-retries-jobs') return 'cockpit.batchOps.confirm.setRetriesJobsBtnQuery';
    if (this.selectedOperationId === 'set-variables') return 'cockpit.batchOps.confirm.setVariablesBtnQuery';
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
