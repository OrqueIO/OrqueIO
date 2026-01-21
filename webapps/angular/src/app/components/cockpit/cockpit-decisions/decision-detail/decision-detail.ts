import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { forkJoin } from 'rxjs';
import {
  faSpinner,
  faTable,
  faInfoCircle,
  faHistory,
  faArrowRight,
  faArrowLeft,
  faCopy,
  faCheck,
  faChevronDown,
  faSort,
  faSortUp,
  faSortDown,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faExternalLinkAlt,
  faClock,
  faSitemap,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import {
  CockpitService,
  DecisionDefinition,
  DecisionInstance
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { DmnViewerComponent } from '../../../../shared/dmn-viewer/dmn-viewer';

type TabType = 'table' | 'instances';

interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-decision-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    DmnViewerComponent
  ],
  templateUrl: './decision-detail.html',
  styleUrls: ['./decision-detail.css']
})
export class DecisionDetailComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  faSpinner = faSpinner;
  faTable = faTable;
  faInfoCircle = faInfoCircle;
  faHistory = faHistory;
  faArrowRight = faArrowRight;
  faArrowLeft = faArrowLeft;
  faCopy = faCopy;
  faCheck = faCheck;
  faChevronDown = faChevronDown;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faAnglesLeft = faAnglesLeft;
  faAnglesRight = faAnglesRight;
  faExternalLinkAlt = faExternalLinkAlt;
  faClock = faClock;
  faSitemap = faSitemap;
  faLayerGroup = faLayerGroup;

  decisionId = '';
  loading = true;
  decisionDefinition: DecisionDefinition | null = null;
  allVersions: DecisionDefinition[] = [];
  decisionInstances: DecisionInstance[] = [];
  instancesCount = 0;
  dmnXml: string | null = null;

  activeTab: TabType = 'instances';
  versionDropdownOpen = false;

  breadcrumbs: BreadcrumbItem[] = [];

  // Clipboard
  copiedField: string | null = null;

  // Instances table pagination and sorting
  instancesCurrentPage = 1;
  instancesPageSize = 50;
  instancesPageSizeOptions = [25, 50, 100];
  instancesSortConfig: SortConfig = {
    sortBy: 'evaluationTime',
    sortOrder: 'desc'
  };

  // Instances table columns
  instanceColumns = [
    { id: 'id', label: 'cockpit.decisionDetail.instances.id', sortable: true },
    { id: 'evaluationTime', label: 'cockpit.decisionDetail.instances.evaluationTime', sortable: true },
    { id: 'processDefinitionKey', label: 'cockpit.decisionDetail.instances.processDefKey', sortable: false },
    { id: 'processInstanceId', label: 'cockpit.decisionDetail.instances.processInstanceId', sortable: false },
    { id: 'activityId', label: 'cockpit.decisionDetail.instances.activityId', sortable: false }
  ];

  tabs = [
    { id: 'instances' as TabType, icon: this.faHistory, labelKey: 'cockpit.decisionDetail.tabs.instances' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cockpitService: CockpitService
  ) {}

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadInstancesSortConfig();

    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.decisionId = params['id'];
        this.breadcrumbs = [
          { translateKey: 'cockpit.menu.decisions', route: '/cockpit/decisions' },
          { label: this.decisionId }
        ];
        this.loadDecisionData();
      });
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  private loadInstancesSortConfig(): void {
    const saved = localStorage.getItem('sortDecInstTable');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.sortBy && config.sortOrder) {
          this.instancesSortConfig = config;
        }
      } catch {
        // Use default
      }
    }
  }

  private saveInstancesSortConfig(): void {
    localStorage.setItem('sortDecInstTable', JSON.stringify(this.instancesSortConfig));
  }

  private loadDecisionData(): void {
    this.loading = true;

    // Load decision definition
    this.cockpitService.getDecisionDefinition(this.decisionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (definition) => {
          this.decisionDefinition = definition;
          if (definition) {
            this.breadcrumbs[1].label = definition.name || definition.key;
            // Load all versions
            this.loadAllVersions(definition.key, definition.tenantId);
            // Load DMN XML
            this.loadDmnXml();
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });

    // Load decision instances
    this.loadDecisionInstances();
  }

  private loadAllVersions(key: string, tenantId?: string): void {
    this.cockpitService.getDecisionDefinitionVersions(key, tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (versions) => {
          this.allVersions = versions;
          this.cdr.detectChanges();
        }
      });
  }

  private loadDmnXml(): void {
    this.cockpitService.getDecisionXml(this.decisionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.dmnXml = result?.dmnXml || null;
          this.cdr.detectChanges();
        }
      });
  }

  private loadDecisionInstances(): void {
    const countRequest = this.cockpitService.getDecisionInstancesCount(this.decisionId);
    const dataRequest = this.cockpitService.getDecisionInstancesPaginated({
      decisionDefinitionId: this.decisionId,
      firstResult: (this.instancesCurrentPage - 1) * this.instancesPageSize,
      maxResults: this.instancesPageSize,
      sortBy: this.instancesSortConfig.sortBy,
      sortOrder: this.instancesSortConfig.sortOrder
    });

    forkJoin({ count: countRequest, data: dataRequest })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ count, data }) => {
          this.instancesCount = count;
          this.decisionInstances = data;
          this.cdr.detectChanges();
        }
      });
  }

  setActiveTab(tab: TabType): void {
    this.activeTab = tab;
  }

  toggleVersionDropdown(): void {
    this.versionDropdownOpen = !this.versionDropdownOpen;
  }

  closeVersionDropdown(): void {
    this.versionDropdownOpen = false;
  }

  selectVersion(version: DecisionDefinition): void {
    this.closeVersionDropdown();
    this.router.navigate(['/cockpit/decisions', version.id]);
  }

  copyToClipboard(value: string, fieldName: string): void {
    navigator.clipboard.writeText(value).then(() => {
      this.copiedField = fieldName;
      setTimeout(() => {
        this.copiedField = null;
        this.cdr.detectChanges();
      }, 2000);
      this.cdr.detectChanges();
    });
  }

  isCopied(fieldName: string): boolean {
    return this.copiedField === fieldName;
  }

  // Instances table methods
  onInstancesSort(columnId: string): void {
    if (this.instancesSortConfig.sortBy === columnId) {
      this.instancesSortConfig.sortOrder = this.instancesSortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.instancesSortConfig.sortBy = columnId;
      this.instancesSortConfig.sortOrder = 'desc';
    }
    this.saveInstancesSortConfig();
    this.instancesCurrentPage = 1;
    this.loadDecisionInstances();
  }

  getInstancesSortIcon(columnId: string): any {
    if (this.instancesSortConfig.sortBy !== columnId) {
      return this.faSort;
    }
    return this.instancesSortConfig.sortOrder === 'asc' ? this.faSortUp : this.faSortDown;
  }

  onInstancesPageChange(page: number): void {
    if (page < 1 || page > this.instancesTotalPages) return;
    this.instancesCurrentPage = page;
    this.loadDecisionInstances();
  }

  onInstancesPageSizeChange(): void {
    this.instancesCurrentPage = 1;
    this.loadDecisionInstances();
  }

  get instancesTotalPages(): number {
    return Math.ceil(this.instancesCount / this.instancesPageSize);
  }

  get instancesStartIndex(): number {
    return (this.instancesCurrentPage - 1) * this.instancesPageSize + 1;
  }

  get instancesEndIndex(): number {
    return Math.min(this.instancesCurrentPage * this.instancesPageSize, this.instancesCount);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  getDeploymentUrl(): string {
    if (!this.decisionDefinition) return '#';
    return `/cockpit/repository?deployment=${this.decisionDefinition.deploymentId}`;
  }

  getProcessDefinitionUrl(instance: DecisionInstance): string {
    if (!instance.processDefinitionId) return '#';
    return `/cockpit/processes/${instance.processDefinitionKey}/instances`;
  }

  getProcessInstanceUrl(instance: DecisionInstance): string {
    if (!instance.processInstanceId) return '#';
    return `/cockpit/processes/instance/${instance.processInstanceId}`;
  }

  truncateId(id: string, length: number = 8): string {
    if (id.length <= length) return id;
    return id.substring(0, length) + '...';
  }
}
