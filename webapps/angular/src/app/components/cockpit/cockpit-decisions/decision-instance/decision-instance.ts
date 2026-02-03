import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { forkJoin } from 'rxjs';
import {
  faSpinner,
  faTable,
  faInfoCircle,
  faCopy,
  faCheck,
  faDownload,
  faUpload,
  faExternalLinkAlt,
  faClock,
  faSitemap
} from '@fortawesome/free-solid-svg-icons';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import {
  CockpitService,
  DecisionDefinition,
  DecisionInstance,
  DecisionInput,
  DecisionOutput
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { DmnViewerComponent } from '../../../../shared/dmn-viewer/dmn-viewer';

type TabType = 'inputs' | 'outputs';

@Component({
  selector: 'app-decision-instance',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    DmnViewerComponent
  ],
  templateUrl: './decision-instance.html',
  styleUrls: ['./decision-instance.css']
})
export class DecisionInstanceComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  faSpinner = faSpinner;
  faTable = faTable;
  faInfoCircle = faInfoCircle;
  faCopy = faCopy;
  faCheck = faCheck;
  faDownload = faDownload;
  faUpload = faUpload;
  faExternalLinkAlt = faExternalLinkAlt;
  faClock = faClock;
  faSitemap = faSitemap;

  instanceId = '';
  loading = true;
  decisionInstance: DecisionInstance | null = null;
  decisionDefinition: DecisionDefinition | null = null;
  dmnXml: string | null = null;

  activeTab: TabType = 'inputs';
  breadcrumbs: BreadcrumbItem[] = [];
  isDmnExpanded = false;

  // Clipboard
  copiedField: string | null = null;

  tabs = [
    { id: 'inputs' as TabType, icon: this.faDownload, labelKey: 'cockpit.decisionInstance.tabs.inputs' },
    { id: 'outputs' as TabType, icon: this.faUpload, labelKey: 'cockpit.decisionInstance.tabs.outputs' }
  ];

  constructor(
    private route: ActivatedRoute,
    private cockpitService: CockpitService
  ) {}

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);

    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.instanceId = params['id'];
        this.breadcrumbs = [
          { translateKey: 'cockpit.menu.decisions', route: '/cockpit/decisions' },
          { label: this.instanceId }
        ];
        this.loadDecisionInstance();
      });
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  private loadDecisionInstance(): void {
    this.loading = true;

    this.cockpitService.getDecisionInstance(this.instanceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (instance) => {
          this.decisionInstance = instance;
          if (instance) {
            // Update breadcrumbs
            this.breadcrumbs = [
              { translateKey: 'cockpit.menu.decisions', route: '/cockpit/decisions' },
              { label: instance.decisionDefinitionName || instance.decisionDefinitionKey, route: `/cockpit/decisions/${instance.decisionDefinitionId}` },
              { label: this.truncateId(instance.id, 8) }
            ];
            // Load definition for additional info
            this.loadDecisionDefinition(instance.decisionDefinitionId);
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadDecisionDefinition(definitionId: string): void {
    this.cockpitService.getDecisionDefinition(definitionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (definition) => {
          this.decisionDefinition = definition;
          this.loadDmnXml(definitionId);
          this.cdr.detectChanges();
        }
      });
  }

  private loadDmnXml(definitionId: string): void {
    this.cockpitService.getDecisionXml(definitionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dmnXml = response?.dmnXml || null;
          this.cdr.detectChanges();
        },
        error: () => {
          // Silent fail - DMN viewer will show placeholder
        }
      });
  }

  setActiveTab(tab: TabType): void {
    this.activeTab = tab;
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

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  formatType(type: string | undefined): string {
    if (!type) return 'Unknown';
    // Simplify Java types
    const parts = type.split('.');
    return parts[parts.length - 1];
  }

  truncateId(id: string, length: number = 8): string {
    if (!id || id.length <= length) return id || '';
    return id.substring(0, length) + '...';
  }

  getProcessInstanceUrl(): string {
    if (!this.decisionInstance?.processInstanceId) return '#';
    return `/cockpit/processes/instance/${this.decisionInstance.processInstanceId}`;
  }

  getCaseInstanceUrl(): string {
    if (!this.decisionInstance?.caseInstanceId) return '#';
    return `/cockpit/case/instance/${this.decisionInstance.caseInstanceId}`;
  }

  getDefinitionUrl(): string {
    if (!this.decisionInstance?.decisionDefinitionId) return '#';
    return `/cockpit/decisions/${this.decisionInstance.decisionDefinitionId}`;
  }

  getDeploymentUrl(): string {
    if (!this.decisionDefinition?.deploymentId) return '#';
    return `/cockpit/repository?deployment=${this.decisionDefinition.deploymentId}`;
  }

  getDrdUrl(): string {
    if (!this.decisionInstance?.decisionRequirementsDefinitionId) return '#';
    return `/cockpit/decision-requirement/${this.decisionInstance.decisionRequirementsDefinitionId}`;
  }

  get inputs(): DecisionInput[] {
    return this.decisionInstance?.inputs || [];
  }

  get outputs(): DecisionOutput[] {
    return this.decisionInstance?.outputs || [];
  }

  get highlightedRules(): string[] {
    if (!this.decisionInstance?.outputs) return [];
    const ruleIds = this.decisionInstance.outputs
      .map(output => output.ruleId)
      .filter((id): id is string => !!id);
    return [...new Set(ruleIds)];
  }

  toggleDmnExpand(): void {
    this.isDmnExpanded = !this.isDmnExpanded;
    this.cdr.detectChanges();
  }
}
