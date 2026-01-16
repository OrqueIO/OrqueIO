import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faSearch,
  faTrash,
  faChevronLeft,
  faChevronRight,
  faFilter,
  faTimes,
  faSort,
  faSortUp,
  faSortDown,
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faBox,
  faRefresh,
  faFile,
  faFileCode,
  faDownload,
  faProjectDiagram,
  faTable,
  faPlay
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin } from 'rxjs';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { BpmnViewerComponent } from '../../../../shared/bpmn-viewer/bpmn-viewer';
import { CmmnViewerComponent } from '../../../../shared/cmmn-viewer/cmmn-viewer';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import {
  CockpitService,
  Deployment,
  DeploymentQueryParams,
  DeploymentResource,
  ProcessDefinition,
  DecisionDefinition
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { DeleteDeploymentModalComponent } from '../delete-deployment-modal/delete-deployment-modal';

interface SortConfig {
  column: 'id' | 'name' | 'deploymentTime';
  direction: 'asc' | 'desc';
}

interface FilterState {
  name: string;
  nameOperator: 'eq' | 'like';
  source: string;
  withoutSource: boolean;
  tenantId: string;
  withoutTenantId: boolean;
  deploymentBefore: string;
  deploymentAfter: string;
}

interface ResourceWithDefinitions extends DeploymentResource {
  processDefinitions?: ProcessDefinition[];
  decisionDefinitions?: DecisionDefinition[];
  caseDefinitions?: any[];
  instanceCounts?: Map<string, number>;
}

@Component({
  selector: 'app-deployment-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    BpmnViewerComponent,
    CmmnViewerComponent,
    TranslatePipe,
    DeleteDeploymentModalComponent
  ],
  templateUrl: './deployment-list.html',
  styleUrls: ['./deployment-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeploymentListComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cockpitService = inject(CockpitService);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  faSpinner = faSpinner;
  faSearch = faSearch;
  faTrash = faTrash;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faFilter = faFilter;
  faTimes = faTimes;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faAngleDoubleLeft = faAngleDoubleLeft;
  faAngleDoubleRight = faAngleDoubleRight;
  faBox = faBox;
  faRefresh = faRefresh;
  faFile = faFile;
  faFileCode = faFileCode;
  faDownload = faDownload;
  faProjectDiagram = faProjectDiagram;
  faTable = faTable;
  faPlay = faPlay;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Deployments', translateKey: 'cockpit.menu.deployments', route: '/cockpit/deployments' }
  ];

  // Deployments
  deployments: Deployment[] = [];
  loading = true;
  totalCount = 0;

  // Selected deployment
  selectedDeployment: Deployment | null = null;
  resources: ResourceWithDefinitions[] = [];
  loadingResources = false;

  // Selected resource
  selectedResource: ResourceWithDefinitions | null = null;
  resourceContent: string | null = null;
  loadingContent = false;

  // Definitions for selected deployment
  processDefinitions: ProcessDefinition[] = [];
  decisionDefinitions: DecisionDefinition[] = [];
  caseDefinitions: any[] = [];
  loadingDefinitions = false;
  instanceCounts: Record<string, number> = {};

  // Pagination
  currentPage = 1;
  pageSize = 25;
  pageSizeOptions = [10, 25, 50, 100];

  // Filters
  activeFiltersCount = 0;
  filters: FilterState = {
    name: '',
    nameOperator: 'like',
    source: '',
    withoutSource: false,
    tenantId: '',
    withoutTenantId: false,
    deploymentBefore: '',
    deploymentAfter: ''
  };

  // Sorting
  sortConfig: SortConfig = { column: 'deploymentTime', direction: 'desc' };
  sortableColumns: Array<'id' | 'name' | 'deploymentTime'> = ['id', 'name', 'deploymentTime'];

  // Delete modal
  showDeleteModal = false;
  deploymentToDelete: Deployment | null = null;

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadSavedPreferences();
    this.loadDeployments();
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
    this.savePreferences();
  }

  loadSavedPreferences(): void {
    const saved = localStorage.getItem('deploymentListPreferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.pageSize) this.pageSize = prefs.pageSize;
        if (prefs.sortConfig?.column && prefs.sortConfig?.direction) {
          const validColumns = ['id', 'name', 'deploymentTime'];
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
    localStorage.setItem('deploymentListPreferences', JSON.stringify({
      pageSize: this.pageSize,
      sortConfig: this.sortConfig
    }));
  }

  loadDeployments(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const queryParams = this.buildQueryParams();
    const firstResult = (this.currentPage - 1) * this.pageSize;

    forkJoin({
      count: this.cockpitService.getDeploymentsCountWithParams(queryParams),
      deployments: this.cockpitService.getDeployments({
        ...queryParams,
        firstResult,
        maxResults: this.pageSize
      })
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ count, deployments }) => {
          this.totalCount = count;
          this.deployments = deployments;
          this.loading = false;
          this.updateActiveFiltersCount();

          // Auto-select first deployment if none selected
          if (deployments.length > 0 && !this.selectedDeployment) {
            this.selectDeployment(deployments[0]);
          }

          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  buildQueryParams(): DeploymentQueryParams {
    const params: DeploymentQueryParams = {
      sortBy: this.sortConfig.column,
      sortOrder: this.sortConfig.direction
    };

    // Name filter
    if (this.filters.name.trim()) {
      if (this.filters.nameOperator === 'like') {
        params.nameLike = `%${this.filters.name}%`;
      } else {
        params.name = this.filters.name;
      }
    }

    // Source filter
    if (this.filters.source.trim()) {
      params.source = this.filters.source;
    }
    if (this.filters.withoutSource) {
      params.withoutSource = true;
    }

    // Tenant filter
    if (this.filters.tenantId.trim()) {
      params.tenantIdIn = [this.filters.tenantId];
    }
    if (this.filters.withoutTenantId) {
      params.withoutTenantId = true;
    }

    // Date filters
    if (this.filters.deploymentBefore) {
      params.deploymentBefore = new Date(this.filters.deploymentBefore).toISOString();
    }
    if (this.filters.deploymentAfter) {
      params.deploymentAfter = new Date(this.filters.deploymentAfter).toISOString();
    }

    return params;
  }

  updateActiveFiltersCount(): void {
    let count = 0;
    if (this.filters.name.trim()) count++;
    if (this.filters.source.trim()) count++;
    if (this.filters.withoutSource) count++;
    if (this.filters.tenantId.trim()) count++;
    if (this.filters.withoutTenantId) count++;
    if (this.filters.deploymentBefore) count++;
    if (this.filters.deploymentAfter) count++;
    this.activeFiltersCount = count;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.selectedDeployment = null;
    this.selectedResource = null;
    this.loadDeployments();
  }

  resetFilters(): void {
    this.filters = {
      name: '',
      nameOperator: 'like',
      source: '',
      withoutSource: false,
      tenantId: '',
      withoutTenantId: false,
      deploymentBefore: '',
      deploymentAfter: ''
    };
    this.currentPage = 1;
    this.selectedDeployment = null;
    this.selectedResource = null;
    this.loadDeployments();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadDeployments();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.savePreferences();
    this.loadDeployments();
  }

  onSort(column: 'id' | 'name' | 'deploymentTime'): void {
    if (!this.sortableColumns.includes(column)) return;

    if (this.sortConfig.column === column) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig = { column, direction: 'desc' };
    }

    this.currentPage = 1;
    this.savePreferences();
    this.loadDeployments();
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

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  getDisplayName(deployment: Deployment): string {
    return deployment.name || deployment.id;
  }

  // Select deployment and load its resources
  selectDeployment(deployment: Deployment): void {
    if (this.selectedDeployment?.id === deployment.id) return;

    this.selectedDeployment = deployment;
    this.selectedResource = null;
    this.resourceContent = null;
    this.loadResources(deployment.id);
    this.loadDefinitions(deployment.id);
    this.cdr.markForCheck();
  }

  loadResources(deploymentId: string): void {
    this.loadingResources = true;
    this.resources = [];
    this.cdr.markForCheck();

    this.cockpitService.getDeploymentResources(deploymentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resources) => {
          this.resources = resources;
          this.loadingResources = false;

          // Auto-select first resource if available
          if (resources.length > 0) {
            this.selectResource(resources[0]);
          }

          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingResources = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadDefinitions(deploymentId: string): void {
    this.loadingDefinitions = true;
    this.processDefinitions = [];
    this.decisionDefinitions = [];
    this.caseDefinitions = [];
    this.instanceCounts = {};
    this.cdr.markForCheck();

    forkJoin({
      processDefinitions: this.cockpitService.getProcessDefinitionsByDeployment(deploymentId),
      decisionDefinitions: this.cockpitService.getDecisionDefinitionsByDeployment(deploymentId),
      caseDefinitions: this.cockpitService.getCaseDefinitionsByDeployment(deploymentId)
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ processDefinitions, decisionDefinitions, caseDefinitions }) => {
          this.processDefinitions = processDefinitions;
          this.decisionDefinitions = decisionDefinitions;
          this.caseDefinitions = caseDefinitions;
          this.loadingDefinitions = false;

          // Load instance counts for process definitions
          this.loadInstanceCounts(processDefinitions);

          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingDefinitions = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadInstanceCounts(processDefinitions: ProcessDefinition[]): void {
    processDefinitions.forEach(def => {
      this.cockpitService.getRunningInstancesCount(def.key)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(count => {
          // Create new object reference to trigger change detection
          this.instanceCounts = { ...this.instanceCounts, [def.id]: count };
          this.cdr.markForCheck();
        });
    });
  }

  selectResource(resource: DeploymentResource): void {
    if (this.selectedResource?.id === resource.id) return;

    this.selectedResource = resource;
    this.resourceContent = null;

    // Load content for viewable resources
    if (this.isViewableResource(resource.name)) {
      this.loadResourceContent(resource);
    }

    this.cdr.markForCheck();
  }

  loadResourceContent(resource: DeploymentResource): void {
    if (!this.selectedDeployment) return;

    this.loadingContent = true;
    this.cdr.markForCheck();

    this.cockpitService.getDeploymentResourceText(this.selectedDeployment.id, resource.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (content) => {
          this.resourceContent = content;
          this.loadingContent = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingContent = false;
          this.cdr.markForCheck();
        }
      });
  }

  isViewableResource(filename: string): boolean {
    const ext = this.getFileExtension(filename).toLowerCase();
    return ['bpmn', 'bpmn20.xml', 'dmn', 'cmmn', 'xml', 'json', 'html', 'txt', 'js', 'css'].some(e =>
      filename.toLowerCase().endsWith(e) || ext === e
    );
  }

  isBpmnResource(filename: string): boolean {
    const lower = filename.toLowerCase();
    return lower.endsWith('.bpmn') || lower.endsWith('.bpmn20.xml');
  }

  isDmnResource(filename: string): boolean {
    return filename.toLowerCase().endsWith('.dmn');
  }

  isCmmnResource(filename: string): boolean {
    return filename.toLowerCase().endsWith('.cmmn');
  }

  isImageResource(filename: string): boolean {
    const ext = this.getFileExtension(filename).toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp'].includes(ext);
  }

  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  getResourceIcon(filename: string): any {
    if (this.isBpmnResource(filename)) return this.faProjectDiagram;
    if (this.isDmnResource(filename)) return this.faTable;
    if (this.isCmmnResource(filename)) return this.faProjectDiagram;
    return this.faFileCode;
  }

  getResourceTypeName(filename: string): string {
    if (this.isBpmnResource(filename)) return 'BPMN';
    if (this.isDmnResource(filename)) return 'DMN';
    if (this.isCmmnResource(filename)) return 'CMMN';
    const ext = this.getFileExtension(filename).toUpperCase();
    return ext || 'FILE';
  }

  downloadResource(resource: DeploymentResource, event: Event): void {
    event.stopPropagation();
    if (!this.selectedDeployment) return;

    const url = this.cockpitService.getResourceDownloadUrl(this.selectedDeployment.id, resource.id);
    const link = document.createElement('a');
    link.href = url;
    link.download = resource.name;
    link.click();
  }

  getImageUrl(resource: DeploymentResource): string {
    if (!this.selectedDeployment) return '';
    return this.cockpitService.getResourceDownloadUrl(this.selectedDeployment.id, resource.id);
  }

  getResourceVersion(): number | null {
    if (!this.selectedResource) return null;

    // Find matching process definition by resource name
    const resourceName = this.selectedResource.name;
    const matchingDef = this.processDefinitions.find(def => def.resource === resourceName);
    if (matchingDef) return matchingDef.version;

    // Find matching decision definition
    const matchingDecision = this.decisionDefinitions.find(def => def.resource === resourceName);
    if (matchingDecision) return matchingDecision.version;

    return null;
  }

  // Filtered definitions by selected resource
  get filteredProcessDefinitions(): ProcessDefinition[] {
    if (!this.selectedResource) return [];
    return this.processDefinitions.filter(def => def.resource === this.selectedResource!.name);
  }

  get filteredDecisionDefinitions(): DecisionDefinition[] {
    if (!this.selectedResource) return [];
    return this.decisionDefinitions.filter(def => def.resource === this.selectedResource!.name);
  }

  get filteredCaseDefinitions(): any[] {
    if (!this.selectedResource) return [];
    return this.caseDefinitions.filter(def => def.resource === this.selectedResource!.name);
  }

  get hasFilteredDefinitions(): boolean {
    return this.filteredProcessDefinitions.length > 0 ||
           this.filteredDecisionDefinitions.length > 0 ||
           this.filteredCaseDefinitions.length > 0;
  }

  // Delete modal
  openDeleteModal(deployment: Deployment, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.deploymentToDelete = deployment;
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deploymentToDelete = null;
    this.cdr.markForCheck();
  }

  onDeploymentDeleted(): void {
    this.closeDeleteModal();
    this.selectedDeployment = null;
    this.selectedResource = null;
    this.loadDeployments();
  }

  trackByDeployment(_index: number, deployment: Deployment): string {
    return deployment.id;
  }

  trackByResource(_index: number, resource: DeploymentResource): string {
    return resource.id;
  }

  trackByDefinition(_index: number, def: any): string {
    return def.id;
  }
}
