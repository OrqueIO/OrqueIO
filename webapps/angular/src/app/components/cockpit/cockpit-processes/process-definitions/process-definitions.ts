import {
  Component, OnInit, OnDestroy, DestroyRef, inject,
  ChangeDetectionStrategy, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner, faSearch, faCogs, faExclamationTriangle, faCheckCircle,
  faPlayCircle, faEye, faSort, faSortUp, faSortDown,
  faPlus, faTimes, faPauseCircle, faTimesCircle, faFilter,
  faChevronLeft, faChevronRight, faChevronDown,
  faKey, faHashtag, faCircleDot, faCalendarAlt, faCode, faRotateLeft, faCheck
} from '@fortawesome/free-solid-svg-icons';

interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

type VariableOperator = 'eq' | 'neq' | 'gt' | 'gteq' | 'lt' | 'lteq' | 'like';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import {
  CockpitService,
  ProcessDefinitionStatistics,
  ProcessInstance,
  MultiValueFilter,
  GlobalSearchField
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { ClipboardDirective } from '../../../../shared/clipboard-directive/clipboard.directive';

@Component({
  selector: 'app-process-definitions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    ClipboardDirective
  ],
  templateUrl: './process-definitions.html',
  styleUrls: ['./process-definitions.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessDefinitionsComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cockpitService = inject(CockpitService);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  faSpinner = faSpinner;
  faSearch = faSearch;
  faCogs = faCogs;
  faExclamationTriangle = faExclamationTriangle;
  faCheckCircle = faCheckCircle;
  faPlayCircle = faPlayCircle;
  faEye = faEye;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faPlus = faPlus;
  faTimes = faTimes;
  faPauseCircle = faPauseCircle;
  faTimesCircle = faTimesCircle;
  faFilter = faFilter;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faKey = faKey;
  faHashtag = faHashtag;
  faCircleDot = faCircleDot;
  faCalendarAlt = faCalendarAlt;
  faCode = faCode;
  faRotateLeft = faRotateLeft;
  faChevronDown = faChevronDown;
  faCheck = faCheck;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Processes', translateKey: 'cockpit.menu.processes' }
  ];

  // ===========================
  // Definitions state (existing)
  // ===========================
  processDefinitions: ProcessDefinitionStatistics[] = [];
  filteredDefinitions: ProcessDefinitionStatistics[] = [];
  totalCount = 0;
  loading = true;
  searchQuery = '';
  sortConfig: SortConfig = { sortBy: 'name', sortOrder: 'asc' };
  private readonly SORT_CONFIG_KEY = 'cockpit.processes.sortConfig';

  // ===========================
  // Global Search state
  // ===========================
  showCriteriaDropdown = false;
  showStateDropdown = false;
  activeEditorType: GlobalSearchField | null = null;
  activePills: MultiValueFilter[] = [];

  // Criterion editor inputs
  pendingValues: string[] = [];
  pendingInputText = '';
  pendingVariableName = '';
  pendingVariableOperator: VariableOperator = 'eq';
  pendingStateValue = 'active';
  pendingDateValue = '';

  // Case-sensitivity options (variable filters)
  variableNamesIgnoreCase = false;
  variableValuesIgnoreCase = false;

  // Search results
  searchResults: ProcessInstance[] = [];
  searchResultsCount = 0;
  searchLoading = false;
  searchExecuted = false;
  searchError = false;

  // Search pagination
  searchCurrentPage = 1;
  searchPageSize = 20;
  readonly searchPageSizeOptions = [10, 20, 50, 100];

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadSortConfig();
    this.loadProcessDefinitions();
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  // ===========================
  // Definitions methods (existing)
  // ===========================

  private loadSortConfig(): void {
    const saved = localStorage.getItem(this.SORT_CONFIG_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.sortBy && config.sortOrder) {
          this.sortConfig = config;
        }
      } catch { /* use default */ }
    }
  }

  private saveSortConfig(): void {
    localStorage.setItem(this.SORT_CONFIG_KEY, JSON.stringify(this.sortConfig));
  }

  onSort(columnId: string): void {
    if (this.sortConfig.sortBy === columnId) {
      this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.sortBy = columnId;
      this.sortConfig.sortOrder = 'asc';
    }
    this.saveSortConfig();
    this.applyFilter();
  }

  getSortIcon(columnId: string): any {
    if (this.sortConfig.sortBy !== columnId) return this.faSort;
    return this.sortConfig.sortOrder === 'asc' ? this.faSortUp : this.faSortDown;
  }

  loadProcessDefinitions(): void {
    this.loading = true;
    this.cdr.markForCheck();

    forkJoin({
      definitions: this.cockpitService.getProcessDefinitionsWithStatistics(),
      count: this.cockpitService.getProcessDefinitionsCount()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ definitions, count }) => {
          this.processDefinitions = definitions;
          this.totalCount = count;
          this.applyFilter();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredDefinitions = [...this.processDefinitions];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredDefinitions = this.processDefinitions.filter(def => {
        const name = (def.definition?.name || def.definition?.key || '').toLowerCase();
        const key = (def.definition?.key || '').toLowerCase();
        return name.includes(query) || key.includes(query);
      });
    }

    this.filteredDefinitions.sort((a, b) => {
      let valueA: any;
      let valueB: any;
      switch (this.sortConfig.sortBy) {
        case 'name':
          valueA = this.getDefinitionName(a).toLowerCase();
          valueB = this.getDefinitionName(b).toLowerCase();
          break;
        case 'key':
          valueA = this.getDefinitionKey(a).toLowerCase();
          valueB = this.getDefinitionKey(b).toLowerCase();
          break;
        case 'tenant':
          valueA = (a.definition?.tenantId || '').toLowerCase();
          valueB = (b.definition?.tenantId || '').toLowerCase();
          break;
        case 'instances':
          valueA = a.instances || 0;
          valueB = b.instances || 0;
          break;
        case 'incidents':
          valueA = this.getTotalIncidents(a);
          valueB = this.getTotalIncidents(b);
          break;
        default:
          valueA = this.getDefinitionName(a).toLowerCase();
          valueB = this.getDefinitionName(b).toLowerCase();
      }
      if (valueA < valueB) return this.sortConfig.sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortConfig.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.cdr.markForCheck();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  getDefinitionName(def: ProcessDefinitionStatistics): string {
    return def.definition?.name || def.definition?.key || def.id;
  }

  getDefinitionKey(def: ProcessDefinitionStatistics): string {
    return def.definition?.key || def.id;
  }

  getTotalIncidents(def: ProcessDefinitionStatistics): number {
    if (!def.incidents || def.incidents.length === 0) return 0;
    return def.incidents.reduce((sum, inc) => sum + inc.incidentCount, 0);
  }

  getStateClass(def: ProcessDefinitionStatistics): string {
    const incidents = this.getTotalIncidents(def);
    if (incidents > 0) return 'state-error';
    if (def.instances > 0) return 'state-running';
    return 'state-ok';
  }

  getStateIcon(def: ProcessDefinitionStatistics): any {
    const incidents = this.getTotalIncidents(def);
    if (incidents > 0) return this.faExclamationTriangle;
    if (def.instances > 0) return this.faPlayCircle;
    return this.faCheckCircle;
  }

  // ===========================
  // Global Search methods
  // ===========================

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    let changed = false;
    if (!target.closest('.criteria-dropdown-wrapper') && this.showCriteriaDropdown) {
      this.showCriteriaDropdown = false;
      changed = true;
    }
    if (!target.closest('.state-dropdown-wrapper') && this.showStateDropdown) {
      this.showStateDropdown = false;
      changed = true;
    }
    if (changed) this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    let changed = false;
    if (this.showCriteriaDropdown) { this.showCriteriaDropdown = false; changed = true; }
    if (this.showStateDropdown)    { this.showStateDropdown = false;    changed = true; }
    if (changed) this.cdr.markForCheck();
  }

  toggleCriteriaDropdown(event: Event): void {
    event.stopPropagation();
    this.showCriteriaDropdown = !this.showCriteriaDropdown;
    this.cdr.markForCheck();
  }

  toggleStateDropdown(event: Event): void {
    event.stopPropagation();
    this.showStateDropdown = !this.showStateDropdown;
    this.cdr.markForCheck();
  }

  selectState(value: string, event: Event): void {
    event.stopPropagation();
    this.pendingStateValue = value;
    this.showStateDropdown = false;
    this.cdr.markForCheck();
  }

  selectCriteriaType(type: GlobalSearchField): void {
    this.showCriteriaDropdown = false;

    if (type === 'withIncidents') {
      if (!this.activePills.some(p => p.field === 'withIncidents')) {
        this.activePills = [...this.activePills, { field: 'withIncidents', values: [] }];
        this.cdr.markForCheck();
      }
      return;
    }

    this.activeEditorType = type;
    this.pendingValues = [];
    this.pendingInputText = '';
    this.pendingVariableName = '';
    this.pendingVariableOperator = 'eq';
    this.pendingStateValue = 'active';
    this.pendingDateValue = '';
    this.cdr.markForCheck();
  }

  onPendingInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addPendingValue();
    }
  }

  onPendingInputPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    const parts = text.split(',').map(s => s.trim()).filter(s => s);
    const current = new Set(this.pendingValues);
    parts.forEach(p => current.add(p));
    this.pendingValues = Array.from(current);
    this.pendingInputText = '';
    this.cdr.markForCheck();
  }

  addPendingValue(): void {
    const val = this.pendingInputText.trim();
    if (val && !this.pendingValues.includes(val)) {
      this.pendingValues = [...this.pendingValues, val];
    }
    this.pendingInputText = '';
    this.cdr.markForCheck();
  }

  removePendingValue(index: number): void {
    this.pendingValues = this.pendingValues.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  confirmCriterion(): void {
    if (!this.activeEditorType) return;
    const type = this.activeEditorType;
    let pill: MultiValueFilter | null = null;

    switch (type) {
      case 'businessKey':
      case 'instanceId':
        this.addPendingValue();
        if (this.pendingValues.length === 0) return;
        pill = { field: type, values: [...this.pendingValues] };
        break;
      case 'state':
        if (!this.pendingStateValue) return;
        pill = { field: 'state', values: [this.pendingStateValue] };
        break;
      case 'startedAfter':
      case 'startedBefore':
      case 'finishedAfter':
      case 'finishedBefore': {
        if (!this.pendingDateValue) return;
        const formatted = this.formatDateForApi(this.pendingDateValue);
        if (!formatted) return;
        pill = { field: type, values: [formatted] };
        break;
      }
      case 'variable':
        this.addPendingValue();
        if (!this.pendingVariableName.trim() || this.pendingValues.length === 0) return;
        pill = {
          field: 'variable',
          values: [...this.pendingValues],
          variableName: this.pendingVariableName.trim(),
          variableOperator: this.pendingVariableOperator
        };
        break;
    }

    if (pill) {
      this.activePills = [...this.activePills, pill];
      this.activeEditorType = null;
      this.pendingValues = [];
      this.pendingInputText = '';
      this.cdr.markForCheck();
    }
  }

  cancelCriterion(): void {
    this.activeEditorType = null;
    this.pendingValues = [];
    this.pendingInputText = '';
    this.showStateDropdown = false;
    this.cdr.markForCheck();
  }

  removePill(index: number): void {
    this.activePills = this.activePills.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  getPillLabel(pill: MultiValueFilter): string {
    switch (pill.field) {
      case 'businessKey':    return `Business Key: ${pill.values.join(', ')}`;
      case 'instanceId':     return `Instance ID: ${pill.values.join(', ')}`;
      case 'state':          return `State: ${this.getStateDisplayLabel(pill.values[0])}`;
      case 'withIncidents':  return 'With incidents';
      case 'startedAfter':   return `Started after: ${this.formatDisplayDate(pill.values[0])}`;
      case 'startedBefore':  return `Started before: ${this.formatDisplayDate(pill.values[0])}`;
      case 'finishedAfter':  return `Finished after: ${this.formatDisplayDate(pill.values[0])}`;
      case 'finishedBefore': return `Finished before: ${this.formatDisplayDate(pill.values[0])}`;
      case 'variable': {
        const op = this.getOperatorLabel(pill.variableOperator || 'eq');
        return `${pill.variableName} ${op} ${pill.values.join(', ')}`;
      }
      default: return '';
    }
  }

  hasVariableFilter(): boolean {
    return this.activePills.some(p => p.field === 'variable');
  }

  executeSearch(): void {
    if (this.activePills.length === 0) return;
    this.searchLoading = true;
    this.searchExecuted = true;
    this.searchError = false;
    this.searchCurrentPage = 1;
    this.cdr.markForCheck();
    this.loadSearchResults();
  }

  private loadSearchResults(): void {
    const instanceIdPill = this.activePills.find(p => p.field === 'instanceId');
    const apiPills = instanceIdPill
      ? this.activePills.filter(p => p.field !== 'instanceId')
      : this.activePills;

    if (instanceIdPill) {
      // Camunda 7 history API has no LIKE operator for instance IDs, only exact match.
      // Fetch all results matching other criteria then filter client-side by substring.
      // When no other criteria exist, use an orQueries union of finished+unfinished to
      // guarantee Camunda returns all instances (empty {} body is unreliable in some configs).
      const fetch$ = apiPills.length > 0
        ? this.cockpitService.searchProcessInstancesGlobal(
            apiPills, this.variableNamesIgnoreCase, this.variableValuesIgnoreCase, 0, 2000
          )
        : this.cockpitService.queryProcessInstances({}, 0, 2000);

      fetch$
      .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: results => {
            const terms = instanceIdPill.values.map(t => t.toLowerCase());
            const filtered = results.filter(r => r.id && terms.some(t => r.id.toLowerCase().includes(t)));
            this.searchResultsCount = filtered.length;
            const start = (this.searchCurrentPage - 1) * this.searchPageSize;
            this.searchResults = filtered.slice(start, start + this.searchPageSize);
            this.searchLoading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.searchLoading = false;
            this.searchError = true;
            this.cdr.markForCheck();
          }
        });
    } else {
      const firstResult = (this.searchCurrentPage - 1) * this.searchPageSize;
      forkJoin({
        results: this.cockpitService.searchProcessInstancesGlobal(
          apiPills, this.variableNamesIgnoreCase, this.variableValuesIgnoreCase,
          firstResult, this.searchPageSize
        ),
        count: this.cockpitService.searchProcessInstancesGlobalCount(
          apiPills, this.variableNamesIgnoreCase, this.variableValuesIgnoreCase
        )
      }).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ results, count }) => {
            this.searchResults = results;
            this.searchResultsCount = count;
            this.searchLoading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.searchLoading = false;
            this.searchError = true;
            this.cdr.markForCheck();
          }
        });
    }
  }

  clearSearch(): void {
    this.activePills = [];
    this.searchResults = [];
    this.searchResultsCount = 0;
    this.searchExecuted = false;
    this.searchError = false;
    this.activeEditorType = null;
    this.showCriteriaDropdown = false;
    this.variableNamesIgnoreCase = false;
    this.variableValuesIgnoreCase = false;
    this.pendingValues = [];
    this.pendingInputText = '';
    this.cdr.markForCheck();
  }

  get searchTotalPages(): number {
    return Math.ceil(this.searchResultsCount / this.searchPageSize);
  }

  get searchStartIndex(): number {
    if (this.searchResultsCount === 0) return 0;
    return (this.searchCurrentPage - 1) * this.searchPageSize + 1;
  }

  get searchEndIndex(): number {
    return Math.min(this.searchCurrentPage * this.searchPageSize, this.searchResultsCount);
  }

  onSearchPageChange(page: number): void {
    this.searchCurrentPage = page;
    this.searchLoading = true;
    this.cdr.markForCheck();
    this.loadSearchResults();
  }

  onSearchPageSizeChange(): void {
    this.searchCurrentPage = 1;
    this.searchLoading = true;
    this.cdr.markForCheck();
    this.loadSearchResults();
  }

  // Instance state helpers — mirrors process-list patterns
  getInstanceStateClass(instance: ProcessInstance): string {
    switch (this.computeInstanceState(instance)) {
      case 'running':    return 'state-active';
      case 'suspended':  return 'state-suspended';
      case 'completed':  return 'state-completed';
      case 'terminated': return 'state-terminated';
      case 'incidents':  return 'state-error';
      default:           return '';
    }
  }

  getInstanceStateIcon(instance: ProcessInstance): any {
    switch (this.computeInstanceState(instance)) {
      case 'running':    return this.faPlayCircle;
      case 'suspended':  return this.faPauseCircle;
      case 'completed':  return this.faCheckCircle;
      case 'terminated': return this.faTimesCircle;
      case 'incidents':  return this.faExclamationTriangle;
      default:           return this.faCheckCircle;
    }
  }

  getInstanceStateLabel(instance: ProcessInstance): string {
    switch (this.computeInstanceState(instance)) {
      case 'running':    return 'Running';
      case 'suspended':  return 'Suspended';
      case 'completed':  return 'Completed';
      case 'terminated': return 'Terminated';
      case 'incidents':  return 'Incidents';
      default:           return '';
    }
  }

  private computeInstanceState(instance: ProcessInstance): string {
    if (instance.state === 'SUSPENDED') return 'suspended';
    if (instance.state === 'COMPLETED') return 'completed';
    if (instance.state === 'EXTERNALLY_TERMINATED' || instance.state === 'INTERNALLY_TERMINATED') return 'terminated';
    if (instance.incidents && instance.incidents.length > 0) return 'incidents';
    return 'running';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  }

  extractVersionNumber(processDefinitionId: string): number | null {
    if (!processDefinitionId) return null;
    const parts = processDefinitionId.split(':');
    if (parts.length >= 3) {
      const v = parseInt(parts[1], 10);
      return isNaN(v) ? null : v;
    }
    return null;
  }

  private getStateDisplayLabel(state: string): string {
    const labels: Record<string, string> = {
      active: 'Active', suspended: 'Suspended', completed: 'Completed', terminated: 'Terminated'
    };
    return labels[state] || state;
  }

  private getOperatorLabel(op: VariableOperator): string {
    const ops: Record<VariableOperator, string> = {
      eq: '=', neq: '≠', gt: '>', gteq: '≥', lt: '<', lteq: '≤', like: '~'
    };
    return ops[op] || '=';
  }

  formatDateForApi(dateStr: string): string | null {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOff = Math.abs(offset);
    const hh = String(Math.floor(absOff / 60)).padStart(2, '0');
    const mm = String(absOff % 60).padStart(2, '0');
    const year = d.getFullYear();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hrs = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${mon}-${day}T${hrs}:${min}:${sec}.000${sign}${hh}${mm}`;
  }

  private formatDisplayDate(isoStr: string): string {
    if (!isoStr) return '';
    try { return new Date(isoStr).toLocaleDateString(); }
    catch { return isoStr; }
  }
}
