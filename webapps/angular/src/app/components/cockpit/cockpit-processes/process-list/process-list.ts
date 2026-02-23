import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faSearch,
  faEye,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faChevronDown,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faPauseCircle,
  faPlayCircle,
  faFilter,
  faTimes,
  faSort,
  faSortUp,
  faSortDown,
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faCog,
  faHistory,
  faProjectDiagram,
  faExpand,
  faCompress,
  faPlus,
  faMinus,
  faSync
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin } from 'rxjs';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { CockpitService, ProcessInstance, ProcessDefinition, ProcessQueryParams, ActivityStatistics, Incident, JobDefinition, CalledProcessDefinition } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { BpmnViewerComponent, ActivityBadge } from '../../../../shared/bpmn-viewer/bpmn-viewer';

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface VariableFilter {
  name: string;
  value: string;
  operator: 'eq' | 'neq' | 'gt' | 'gteq' | 'lt' | 'lteq' | 'like';
}

interface FilterState {
  businessKey: string;
  businessKeyOperator: 'eq' | 'like';
  activityIds: string;
  startedAfter: string;
  startedBefore: string;
  finishedAfter: string;
  finishedBefore: string;
  state: 'all' | 'active' | 'suspended' | 'completed' | 'terminated';
  withIncidents: boolean;
  variables: VariableFilter[];
}

@Component({
  selector: 'app-process-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    BpmnViewerComponent
  ],
  templateUrl: './process-list.html',
  styleUrls: ['./process-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessListComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cockpitService = inject(CockpitService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  // Expose Math for template
  Math = Math;

  // Icons
  faSpinner = faSpinner;
  faSearch = faSearch;
  faEye = faEye;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faChevronUp = faChevronUp;
  faChevronDown = faChevronDown;
  faExclamationTriangle = faExclamationTriangle;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faPauseCircle = faPauseCircle;
  faPlayCircle = faPlayCircle;
  faFilter = faFilter;
  faTimes = faTimes;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faAngleDoubleLeft = faAngleDoubleLeft;
  faAngleDoubleRight = faAngleDoubleRight;
  faCog = faCog;
  faHistory = faHistory;
  faProjectDiagram = faProjectDiagram;
  faExpand = faExpand;
  faCompress = faCompress;
  faPlus = faPlus;
  faMinus = faMinus;
  faSync = faSync;

  @ViewChild('bpmnViewer') bpmnViewer!: BpmnViewerComponent;

  breadcrumbs: BreadcrumbItem[] = [
    { translateKey: 'cockpit.menu.processes', route: '/cockpit/processes' }
  ];

  // Process definition info
  processDefinitionKey = '';
  processDefinition: ProcessDefinition | null = null;
  processDefinitionVersions: ProcessDefinition[] = [];
  selectedVersion: string = 'all'; // 'all' or specific version ID

  // BPMN diagram
  bpmnXml: string | null = null;
  loadingDiagram = false;
  activityStatistics: ActivityStatistics[] = [];
  diagramMaximized = false;
  tableMaximized = false;

  // Process instances
  processInstances: ProcessInstance[] = [];
  loading = true;
  totalCount = 0;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50, 100];

  // Filters (always visible)
  activeFiltersCount = 0;
  filters: FilterState = {
    businessKey: '',
    businessKeyOperator: 'like',
    activityIds: '',
    startedAfter: '',
    startedBefore: '',
    finishedAfter: '',
    finishedBefore: '',
    state: 'all',
    withIncidents: false,
    variables: [{ name: '', value: '', operator: 'eq' }]
  };

  // Sorting
  sortConfig: SortConfig = { column: 'startTime', direction: 'desc' };
  sortableColumns = ['startTime', 'endTime', 'businessKey'];

  // Tabs
  activeTab: 'instances' | 'incidents' | 'called-definitions' | 'job-definitions' = 'instances';

  // Tab data - Incidents
  incidents: Incident[] = [];
  incidentsLoading = false;
  incidentsCount = 0;

  // Tab data - Job Definitions
  jobDefinitions: JobDefinition[] = [];
  jobDefinitionsLoading = false;
  jobDefinitionsCount = 0;
  jobDefinitionsPage = 1;
  jobDefinitionsPageSize = 50;

  // Tab data - Called Process Definitions
  calledProcessDefinitions: CalledProcessDefinition[] = [];
  calledProcessDefinitionsLoading = false;

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadSavedPreferences();

    // Get the process definition key from route params
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.processDefinitionKey = params['key'];
        if (this.processDefinitionKey) {
          this.currentPage = 1;
          this.loadProcessDefinition();
          this.loadProcessDefinitionVersions();
          this.loadProcessInstances();
        }
      });
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
    this.savePreferences();
  }

  loadSavedPreferences(): void {
    const saved = localStorage.getItem('processListPreferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.pageSize) this.pageSize = prefs.pageSize;
        // Validate sortConfig before applying - only accept valid Camunda sort columns
        if (prefs.sortConfig?.column && prefs.sortConfig?.direction) {
          const validColumns = ['startTime', 'endTime', 'businessKey'];
          if (validColumns.includes(prefs.sortConfig.column)) {
            this.sortConfig = prefs.sortConfig;
          }
        }
      } catch (e) {
        // Ignore invalid saved preferences
      }
    }
  }

  savePreferences(): void {
    localStorage.setItem('processListPreferences', JSON.stringify({
      pageSize: this.pageSize,
      sortConfig: this.sortConfig
    }));
  }

  loadProcessDefinition(): void {
    this.cockpitService.getProcessDefinitionByKey(this.processDefinitionKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (definition) => {
          this.processDefinition = definition;
          // Initialize selectedVersion to the latest version (current definition ID)
          if (definition?.id) {
            this.selectedVersion = definition.id;
          }
          const name = definition?.name || this.processDefinitionKey;
          this.breadcrumbs = [
            { label: 'Processes', translateKey: 'cockpit.menu.processes', route: '/cockpit/processes' },
            { label: name }
          ];
          this.cdr.markForCheck();

          // Load BPMN diagram
          if (definition?.id) {
            this.loadBpmnDiagram(definition.id);
            this.loadActivityStatistics(definition.id);
          }
        }
      });
  }

  loadBpmnDiagram(definitionId: string): void {
    this.loadingDiagram = true;
    this.cdr.markForCheck();

    this.cockpitService.getBpmn20Xml(definitionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.bpmnXml = response?.bpmn20Xml || null;
          this.loadingDiagram = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingDiagram = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadActivityStatistics(definitionId: string): void {
    this.cockpitService.getActivityStatistics(definitionId, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.activityStatistics = stats;
          this.cdr.markForCheck();
        }
      });
  }

  get activityBadges(): ActivityBadge[] {
    return this.activityStatistics.map(stat => ({
      activityId: stat.id,
      instances: stat.instances,
      incidents: stat.incidents.reduce((sum, inc) => sum + inc.incidentCount, 0)
    }));
  }

  loadProcessDefinitionVersions(): void {
    this.cockpitService.getProcessDefinitionVersions(this.processDefinitionKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (versions) => {
          this.processDefinitionVersions = versions;
          this.cdr.markForCheck();
        }
      });
  }

  loadProcessInstances(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const queryBody = this.buildQueryBody();

    if (this.filterErrors.length > 0) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    const firstResult = (this.currentPage - 1) * this.pageSize;

    // Load count, instances and incidents in parallel
    // Use processDefinitionId when a specific version is selected, otherwise use processDefinitionKey
    const incidentsObservable = this.selectedVersion === 'all'
      ? this.cockpitService.getIncidentsByProcessDefinitionKey(this.processDefinitionKey)
      : this.cockpitService.getIncidentsByProcessDefinitionId(this.selectedVersion);

    forkJoin({
      count: this.cockpitService.queryProcessInstancesCount(queryBody),
      instances: this.cockpitService.queryProcessInstances(queryBody, firstResult, this.pageSize),
      incidents: incidentsObservable
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ count, instances, incidents }) => {
          this.totalCount = count;
          // Associate incidents with process instances
          this.processInstances = instances.map(instance => {
            const instanceIncidents = incidents.filter(inc => inc.processInstanceId === instance.id);
            return { ...instance, incidents: instanceIncidents };
          });
          this.loading = false;
          this.updateActiveFiltersCount();
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  filterErrors: string[] = [];

  buildQueryBody(): any {
    this.filterErrors = [];

    const body: any = {
      sorting: [{
        sortBy: this.sortConfig.column,
        sortOrder: this.sortConfig.direction
      }]
    };

    // Process definition filter
    if (this.selectedVersion === 'all') {
      body.processDefinitionKey = this.processDefinitionKey;
    } else {
      body.processDefinitionId = this.selectedVersion;
    }

    // Business key filter — escape SQL wildcard characters before wrapping
    if (this.filters.businessKey.trim()) {
      if (this.filters.businessKeyOperator === 'like') {
        const escaped = this.filters.businessKey.replace(/[%_]/g, '\\$&');
        body.processInstanceBusinessKeyLike = `%${escaped}%`;
      } else {
        body.processInstanceBusinessKey = this.filters.businessKey;
      }
    }

    // Activity ID filter
    if (this.filters.activityIds.trim()) {
      body.activeActivityIdIn = this.filters.activityIds.split(',').map(s => s.trim()).filter(s => s);
    }

    // Date filters — validate coherence and guard against invalid dates
    // Format: yyyy-MM-ddTHH:mm:ss.SSS+0000 (Camunda expected format with timezone offset)
    if (this.filters.startedAfter) {
      const formatted = this.formatDateForApi(this.filters.startedAfter);
      if (formatted) { body.startedAfter = formatted; }
      else { this.filterErrors.push('Invalid "Started after" date'); }
    }
    if (this.filters.startedBefore) {
      const formatted = this.formatDateForApi(this.filters.startedBefore);
      if (formatted) { body.startedBefore = formatted; }
      else { this.filterErrors.push('Invalid "Started before" date'); }
    }
    if (this.filters.finishedAfter) {
      const formatted = this.formatDateForApi(this.filters.finishedAfter);
      if (formatted) { body.finishedAfter = formatted; }
      else { this.filterErrors.push('Invalid "Finished after" date'); }
    }
    if (this.filters.finishedBefore) {
      const formatted = this.formatDateForApi(this.filters.finishedBefore);
      if (formatted) { body.finishedBefore = formatted; }
      else { this.filterErrors.push('Invalid "Finished before" date'); }
    }

    // Validate date range coherence
    if (body.startedAfter && body.startedBefore && body.startedAfter >= body.startedBefore) {
      this.filterErrors.push('"Started after" must be before "Started before"');
    }
    if (body.finishedAfter && body.finishedBefore && body.finishedAfter >= body.finishedBefore) {
      this.filterErrors.push('"Finished after" must be before "Finished before"');
    }

    // State filter
    switch (this.filters.state) {
      case 'active':
        body.active = true;
        body.unfinished = true;
        break;
      case 'suspended':
        body.suspended = true;
        body.unfinished = true;
        break;
      case 'completed':
        body.completed = true;
        body.finished = true;
        break;
      case 'terminated':
        body.externallyTerminated = true;
        body.finished = true;
        break;
    }

    // Incidents filter
    if (this.filters.withIncidents) {
      body.withIncidents = true;
    }

    // Variable filters — support multiple variables with type coercion
    const variables: any[] = [];
    for (const v of this.filters.variables) {
      if (!v.name.trim() || !v.value.trim()) continue;
      const value = this.parseVariableValue(v.value, v.operator);
      variables.push({ name: v.name, value, operator: v.operator });
    }
    if (variables.length > 0) {
      body.variables = variables;
    }

    return body;
  }

  /**
   * Format a date string from datetime-local input to Camunda API format.
   * Camunda expects: yyyy-MM-ddTHH:mm:ss.SSS+0000 (with timezone offset)
   * Legacy uses moment.js format 'YYYY-MM-DDTHH:mm:ss.SSSZZ'
   */
  private formatDateForApi(dateStr: string): string | null {
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
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${year}-${mon}-${day}T${hrs}:${min}:${sec}.${ms}${sign}${hh}${mm}`;
  }

  /**
   * Parse a variable value string into the appropriate type.
   * Matches Legacy behavior: auto-detects numbers, booleans, null.
   * For 'like' operator, wraps value with % if no wildcards are present.
   */
  private parseVariableValue(raw: string, operator: string): any {
    let value: string = raw;

    // Like operator: auto-wrap with % if no wildcards present
    if (operator === 'like') {
      if (!value.includes('%')) {
        value = `%${value}%`;
      }
      return value;
    }

    // Boolean detection
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Null detection
    if (value === 'NULL') return null;

    // Number detection
    const trimmed = value.trim();
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (!isNaN(parsed)) return parsed;
    }

    return value;
  }

  addVariableFilter(): void {
    this.filters.variables.push({ name: '', value: '', operator: 'eq' });
  }

  removeVariableFilter(index: number): void {
    this.filters.variables.splice(index, 1);
    if (this.filters.variables.length === 0) {
      this.filters.variables.push({ name: '', value: '', operator: 'eq' });
    }
  }

  updateActiveFiltersCount(): void {
    let count = 0;
    if (this.filters.businessKey.trim()) count++;
    if (this.filters.activityIds.trim()) count++;
    if (this.filters.startedAfter) count++;
    if (this.filters.startedBefore) count++;
    if (this.filters.finishedAfter) count++;
    if (this.filters.finishedBefore) count++;
    if (this.filters.state !== 'all') count++;
    if (this.filters.withIncidents) count++;
    count += this.filters.variables.filter(v => v.name.trim() && v.value.trim()).length;
    this.activeFiltersCount = count;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadProcessInstances();
  }

  resetFilters(): void {
    this.filters = {
      businessKey: '',
      businessKeyOperator: 'like',
      activityIds: '',
      startedAfter: '',
      startedBefore: '',
      finishedAfter: '',
      finishedBefore: '',
      state: 'all',
      withIncidents: false,
      variables: [{ name: '', value: '', operator: 'eq' }]
    };
    this.currentPage = 1;
    this.loadProcessInstances();
  }

  onVersionChange(): void {
    this.currentPage = 1;

    // Reset tab data so it gets reloaded with new version filter
    this.incidents = [];
    this.incidentsCount = 0;
    this.jobDefinitions = [];
    this.jobDefinitionsCount = 0;
    this.calledProcessDefinitions = [];

    // Reload BPMN diagram for selected version
    const definitionId = this.selectedVersion === 'all'
      ? this.processDefinition?.id
      : this.selectedVersion;

    if (definitionId) {
      this.loadBpmnDiagram(definitionId);
      this.loadActivityStatistics(definitionId);
    }

    this.loadProcessInstances();

    // Reload current tab data if not on instances tab
    if (this.activeTab === 'incidents') {
      this.loadIncidents();
    } else if (this.activeTab === 'job-definitions') {
      this.loadJobDefinitions();
    } else if (this.activeTab === 'called-definitions') {
      this.loadCalledProcessDefinitions();
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadProcessInstances();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.savePreferences();
    this.loadProcessInstances();
  }

  onSort(column: string): void {
    if (!this.sortableColumns.includes(column)) return;

    if (this.sortConfig.column === column) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig = { column, direction: 'desc' };
    }

    this.currentPage = 1;
    this.savePreferences();
    this.loadProcessInstances();
  }

  getSortIcon(column: string): any {
    if (this.sortConfig.column !== column) return this.faSort;
    return this.sortConfig.direction === 'asc' ? this.faSortUp : this.faSortDown;
  }

  isSortActive(column: string): boolean {
    return this.sortConfig.column === column;
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    const end = Math.min(this.totalPages, start + maxVisiblePages - 1);
    start = Math.max(1, end - maxVisiblePages + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  /**
   * Compute the visual state of a process instance like AngularJS
   * Priority: incidents > suspended > running/completed based on endTime
   */
  getComputedState(instance: ProcessInstance): 'running' | 'completed' | 'suspended' | 'incidents' | 'terminated' {
    // Check for incidents first (highest priority)
    if (instance.incidents && instance.incidents.length > 0) {
      return 'incidents';
    }

    // Check API state field
    if (instance.state === 'SUSPENDED') {
      return 'suspended';
    }

    if (instance.state === 'EXTERNALLY_TERMINATED' || instance.state === 'INTERNALLY_TERMINATED') {
      return 'terminated';
    }

    // Check if still running (no endTime) or completed (has endTime)
    if (!instance.endTime) {
      return 'running';
    }

    return 'completed';
  }

  getStateIcon(instance: ProcessInstance): any {
    const computedState = this.getComputedState(instance);
    switch (computedState) {
      case 'running':
        return this.faPlayCircle;
      case 'suspended':
        return this.faPauseCircle;
      case 'completed':
        return this.faCheckCircle;
      case 'incidents':
        return this.faExclamationTriangle;
      case 'terminated':
        return this.faTimesCircle;
      default:
        return this.faCheckCircle;
    }
  }

  getStateClass(instance: ProcessInstance): string {
    const computedState = this.getComputedState(instance);
    switch (computedState) {
      case 'running':
        return 'state-active';
      case 'suspended':
        return 'state-suspended';
      case 'completed':
        return 'state-completed';
      case 'incidents':
        return 'state-error';
      case 'terminated':
        return 'state-terminated';
      default:
        return '';
    }
  }

  getStateLabel(instance: ProcessInstance): string {
    const computedState = this.getComputedState(instance);
    switch (computedState) {
      case 'running': return 'Running';
      case 'suspended': return 'Suspended';
      case 'completed': return 'Completed';
      case 'incidents': return 'Incidents';
      case 'terminated': return 'Terminated';
      default: return '';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  getVersionLabel(def: ProcessDefinition): string {
    return `v${def.version}${def.tenantId ? ` (${def.tenantId})` : ''}`;
  }

  toggleDiagramMaximize(): void {
    this.diagramMaximized = !this.diagramMaximized;
    this.cdr.markForCheck();
    // Resize diagram after CSS transition
    setTimeout(() => {
      this.bpmnViewer?.resize();
    }, 350);
  }

  toggleTableMaximize(): void {
    this.tableMaximized = !this.tableMaximized;
    this.cdr.markForCheck();

    // If showing diagram again, resize it after DOM updates
    if (!this.tableMaximized) {
      setTimeout(() => {
        this.bpmnViewer?.resize();
      }, 100);
    }
  }

  scrollToActivity(activityId: string): void {
    if (this.bpmnViewer && activityId) {
      this.bpmnViewer.scrollToElement(activityId);
    }
  }

  switchTab(tab: 'instances' | 'incidents' | 'called-definitions' | 'job-definitions'): void {
    this.activeTab = tab;

    // Load data for the tab if not already loaded
    switch (tab) {
      case 'incidents':
        if (this.incidents.length === 0 && !this.incidentsLoading) {
          this.loadIncidents();
        }
        break;
      case 'job-definitions':
        if (this.jobDefinitions.length === 0 && !this.jobDefinitionsLoading) {
          this.loadJobDefinitions();
        }
        break;
      case 'called-definitions':
        if (this.calledProcessDefinitions.length === 0 && !this.calledProcessDefinitionsLoading) {
          this.loadCalledProcessDefinitions();
        }
        break;
    }

    this.cdr.markForCheck();
  }

  private loadIncidents(): void {
    this.incidentsLoading = true;
    this.cdr.markForCheck();

    // Use processDefinitionId when a specific version is selected, otherwise use processDefinitionKey
    const incidentsObservable = this.selectedVersion === 'all'
      ? this.cockpitService.getIncidentsByProcessDefinitionKey(this.processDefinitionKey)
      : this.cockpitService.getIncidentsByProcessDefinitionId(this.selectedVersion);

    incidentsObservable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (incidents) => {
          this.incidents = incidents;
          this.incidentsCount = incidents.length;
          this.incidentsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.incidentsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadJobDefinitions(): void {
    this.jobDefinitionsLoading = true;
    this.cdr.markForCheck();

    const firstResult = (this.jobDefinitionsPage - 1) * this.jobDefinitionsPageSize;

    // Use processDefinitionId when a specific version is selected, otherwise use processDefinitionKey
    const jobDefinitionsObservable = this.selectedVersion === 'all'
      ? this.cockpitService.getJobDefinitionsByProcessDefinitionKey(
          this.processDefinitionKey,
          firstResult,
          this.jobDefinitionsPageSize
        )
      : this.cockpitService.getJobDefinitionsByProcessDefinitionId(
          this.selectedVersion,
          firstResult,
          this.jobDefinitionsPageSize
        );

    jobDefinitionsObservable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobDefinitions, count }) => {
          this.jobDefinitions = jobDefinitions;
          this.jobDefinitionsCount = count;
          this.jobDefinitionsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.jobDefinitionsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onJobDefinitionsPageChange(page: number): void {
    this.jobDefinitionsPage = page;
    this.loadJobDefinitions();
  }

  toggleJobDefinitionSuspension(jobDef: JobDefinition): void {
    const newState = !jobDef.suspended;
    this.cockpitService.updateJobDefinitionSuspensionState(jobDef.id, newState)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          jobDef.suspended = newState;
          this.cdr.markForCheck();
        },
        error: () => {
          // Handle error - could show a notification
          this.cdr.markForCheck();
        }
      });
  }

  getCalledDefStateLabel(state?: string): string {
    switch (state) {
      case 'running': return 'Running';
      case 'referenced': return 'Referenced';
      case 'running-and-referenced': return 'Running and Referenced';
      default: return '-';
    }
  }

  getCalledDefStateClass(state?: string): string {
    switch (state) {
      case 'running': return 'state-active';
      case 'referenced': return 'state-info';
      case 'running-and-referenced': return 'state-warning';
      default: return '';
    }
  }

  private loadCalledProcessDefinitions(): void {
    // Use selected version or default process definition id
    const processDefinitionId = this.selectedVersion === 'all'
      ? this.processDefinition?.id
      : this.selectedVersion;

    if (!processDefinitionId) return;

    this.calledProcessDefinitionsLoading = true;
    this.cdr.markForCheck();

    this.cockpitService.getCalledProcessDefinitions(processDefinitionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (calledDefs) => {
          this.calledProcessDefinitions = calledDefs;
          this.calledProcessDefinitionsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.calledProcessDefinitionsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }
}
