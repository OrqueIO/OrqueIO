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
  faMinus
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin } from 'rxjs';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { CockpitService, ProcessInstance, ProcessDefinition, ProcessQueryParams, ActivityStatistics } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { BpmnViewerComponent, ActivityBadge } from '../../../../shared/bpmn-viewer/bpmn-viewer';

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
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
  variableName: string;
  variableValue: string;
  variableOperator: 'eq' | 'neq' | 'gt' | 'lt' | 'like';
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

  @ViewChild('bpmnViewer') bpmnViewer!: BpmnViewerComponent;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Processes', translateKey: 'cockpit.menu.processes', route: '/cockpit/processes' }
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
    variableName: '',
    variableValue: '',
    variableOperator: 'eq'
  };

  // Sorting
  sortConfig: SortConfig = { column: 'startTime', direction: 'desc' };
  sortableColumns = ['startTime', 'endTime', 'businessKey'];

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS);
    this.loadSavedPreferences();

    // Get the process definition key from route params
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.processDefinitionKey = params['key'];
        if (this.processDefinitionKey) {
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
    const firstResult = (this.currentPage - 1) * this.pageSize;

    // Load count and instances in parallel
    forkJoin({
      count: this.cockpitService.queryProcessInstancesCount(queryBody),
      instances: this.cockpitService.queryProcessInstances(queryBody, firstResult, this.pageSize)
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ count, instances }) => {
          this.totalCount = count;
          this.processInstances = instances;
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

  buildQueryBody(): any {
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

    // Business key filter
    if (this.filters.businessKey.trim()) {
      if (this.filters.businessKeyOperator === 'like') {
        body.processInstanceBusinessKeyLike = `%${this.filters.businessKey}%`;
      } else {
        body.processInstanceBusinessKey = this.filters.businessKey;
      }
    }

    // Activity ID filter
    if (this.filters.activityIds.trim()) {
      body.activeActivityIdIn = this.filters.activityIds.split(',').map(s => s.trim()).filter(s => s);
    }

    // Date filters
    if (this.filters.startedAfter) {
      body.startedAfter = new Date(this.filters.startedAfter).toISOString();
    }
    if (this.filters.startedBefore) {
      body.startedBefore = new Date(this.filters.startedBefore).toISOString();
    }
    if (this.filters.finishedAfter) {
      body.finishedAfter = new Date(this.filters.finishedAfter).toISOString();
    }
    if (this.filters.finishedBefore) {
      body.finishedBefore = new Date(this.filters.finishedBefore).toISOString();
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
        break;
    }

    // Incidents filter
    if (this.filters.withIncidents) {
      body.withIncidents = true;
    }

    // Variable filter
    if (this.filters.variableName.trim() && this.filters.variableValue.trim()) {
      body.variables = [{
        name: this.filters.variableName,
        value: this.filters.variableValue,
        operator: this.filters.variableOperator
      }];
    }

    return body;
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
    if (this.filters.variableName.trim() && this.filters.variableValue.trim()) count++;
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
      variableName: '',
      variableValue: '',
      variableOperator: 'eq'
    };
    this.currentPage = 1;
    this.loadProcessInstances();
  }

  onVersionChange(): void {
    this.currentPage = 1;

    // Reload BPMN diagram for selected version
    const definitionId = this.selectedVersion === 'all'
      ? this.processDefinition?.id
      : this.selectedVersion;

    if (definitionId) {
      this.loadBpmnDiagram(definitionId);
      this.loadActivityStatistics(definitionId);
    }

    this.loadProcessInstances();
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

  getStateIcon(state: string): any {
    switch (state) {
      case 'ACTIVE':
        return this.faPlayCircle;
      case 'SUSPENDED':
        return this.faPauseCircle;
      case 'COMPLETED':
        return this.faCheckCircle;
      case 'EXTERNALLY_TERMINATED':
      case 'INTERNALLY_TERMINATED':
        return this.faTimesCircle;
      default:
        return this.faCheckCircle;
    }
  }

  getStateClass(state: string): string {
    switch (state) {
      case 'ACTIVE':
        return 'state-active';
      case 'SUSPENDED':
        return 'state-suspended';
      case 'COMPLETED':
        return 'state-completed';
      case 'EXTERNALLY_TERMINATED':
      case 'INTERNALLY_TERMINATED':
        return 'state-terminated';
      default:
        return '';
    }
  }

  getStateLabel(state: string): string {
    switch (state) {
      case 'ACTIVE': return 'Active';
      case 'SUSPENDED': return 'Suspended';
      case 'COMPLETED': return 'Completed';
      case 'EXTERNALLY_TERMINATED': return 'Terminated';
      case 'INTERNALLY_TERMINATED': return 'Terminated';
      default: return state;
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
}
