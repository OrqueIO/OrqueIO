import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
  DestroyRef, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faExchangeAlt } from '@fortawesome/free-solid-svg-icons';
import { forkJoin, switchMap, of } from 'rxjs';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { CockpitService, ActivityStatistics } from '../../../../services/cockpit.service';
import { ProcessDefinitionService, ProcessDefinition } from '../../../../services/process-definition.service';
import { MigrationService } from '../../../../services/migration.service';
import { MigrationPlanDto, MigrationPlanReportDto, MigrationInstructionDto } from '../../../../services/migration.model';
import { calculateMigrationBadges } from '../../../../services/migration-badge.utils';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { BatchWizardStepperComponent, WizardStep } from '../../cockpit-batch/batch-wizard-stepper/batch-wizard-stepper';
import { BpmnViewerComponent, ActivityBadge } from '../../../../shared/bpmn-viewer/bpmn-viewer';
import { MigrationArrowsComponent } from './migration-arrows.component';

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-process-migration-wizard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    BatchWizardStepperComponent,
    BpmnViewerComponent,
    MigrationArrowsComponent
  ],
  templateUrl: './process-migration-wizard.component.html',
  styleUrl: './process-migration-wizard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessMigrationWizardComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cockpitService = inject(CockpitService);
  private processDefinitionService = inject(ProcessDefinitionService);
  private migrationService = inject(MigrationService);
  private cdr = inject(ChangeDetectorRef);

  faExchangeAlt = faExchangeAlt;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Processes', translateKey: 'cockpit.menu.processes' }
  ];

  wizardSteps: WizardStep[] = [
    { number: 1, labelKey: 'migration.steps.defineMapping' },
    { number: 2, labelKey: 'migration.steps.setVariables' },
    { number: 3, labelKey: 'migration.steps.selectInstances' },
    { number: 4, labelKey: 'migration.steps.confirm' },
    { number: 5, labelKey: 'migration.steps.results' }
  ];

  currentStep = signal(1);
  loadingState = signal<LoadingState>('loading');
  errorMessage = signal<string | null>(null);

  // All process definitions loaded
  private allDefinitions = signal<ProcessDefinition[]>([]);

  // Available unique keys sorted
  availableKeys = computed(() => {
    const defs = this.allDefinitions();
    const keys = [...new Set(defs.map(d => d.key))];
    return keys.sort();
  });

  // Source selectors
  sourceKey = signal('');
  sourceVersion = signal<number | null>(null);
  sourceDefinitionId = signal<string | null>(null);

  sourceVersions = computed(() => {
    const key = this.sourceKey();
    if (!key) return [];
    const defs = this.allDefinitions().filter(d => d.key === key);
    return defs.sort((a, b) => b.version - a.version);
  });

  // Target selectors
  targetKey = signal('');
  targetVersion = signal<number | null>(null);
  targetDefinitionId = signal<string | null>(null);

  targetVersions = computed(() => {
    const key = this.targetKey();
    if (!key) return [];
    const defs = this.allDefinitions().filter(d => d.key === key);
    return defs.sort((a, b) => b.version - a.version);
  });

  // BPMN XML
  sourceXml = signal<string | null>(null);
  targetXml = signal<string | null>(null);
  sourceXmlLoading = signal(false);
  targetXmlLoading = signal(false);

  // Activity statistics for badges (source only)
  sourceActivityStats = signal<ActivityStatistics[]>([]);

  sourceActivityBadges = computed<ActivityBadge[]>(() => {
    const stats = this.sourceActivityStats();
    const plan = this.migrationPlan();
    const report = this.migrationReport();

    // Calculate instance badges (blue - hide when 0)
    const instanceBadges = stats
      .filter(stat => stat.instances > 0)
      .map(stat => ({
        activityId: stat.id,
        instances: stat.instances
      }));

    // Calculate migration status badges
    const migrationBadges = calculateMigrationBadges(plan, report, stats);
    const migrationBadgeMap = new Map(
      migrationBadges.sourceBadges.map(b => [b.activityId, b])
    );

    // Merge badges by activity ID
    const badgeMap = new Map<string, ActivityBadge>();

    // Add instance badges
    instanceBadges.forEach(badge => {
      badgeMap.set(badge.activityId, { ...badge });
    });

    // Add/merge migration badges
    migrationBadgeMap.forEach((migBadge, activityId) => {
      const existing = badgeMap.get(activityId);
      if (existing) {
        existing.migrationStatus = migBadge.type;
        existing.tooltip = migBadge.tooltip;
      } else {
        badgeMap.set(activityId, {
          activityId,
          migrationStatus: migBadge.type,
          tooltip: migBadge.tooltip
        });
      }
    });

    return Array.from(badgeMap.values());
  });

  targetActivityBadges = computed<ActivityBadge[]>(() => {
    const plan = this.migrationPlan();
    const report = this.migrationReport();
    const stats = this.sourceActivityStats(); // needed for calculation

    const migrationBadges = calculateMigrationBadges(plan, report, stats);

    return migrationBadges.targetBadges.map(b => ({
      activityId: b.activityId,
      migrationStatus: b.type,
      tooltip: b.tooltip
    }));
  });

  // Migration plan
  migrationPlan = signal<MigrationPlanDto | null>(null);
  migrationReport = signal<MigrationPlanReportDto | null>(null);
  planLoading = signal(false);

  // Plan is valid if report has no failures
  isPlanValid = computed(() => {
    const report = this.migrationReport();
    if (!report) return false;
    return !report.instructionReports || report.instructionReports.every(r => !r.failures || r.failures.length === 0);
  });

  // UI controls
  showMigrationPlan = true;
  linkDiagramsNavigation = false;

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadProcessDefinitions();
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  private loadProcessDefinitions(): void {
    this.loadingState.set('loading');
    this.cockpitService.getProcessDefinitionsWithStatistics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          const defs = stats.map(s => s.definition);
          this.allDefinitions.set(defs);
          this.loadingState.set('loaded');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.set('error');
          this.errorMessage.set(err.message || 'Failed to load process definitions');
          this.cdr.markForCheck();
        }
      });
  }

  onSourceKeyChange(key: string): void {
    this.sourceKey.set(key);
    this.sourceVersion.set(null);
    this.sourceDefinitionId.set(null);
    this.sourceXml.set(null);
    this.sourceActivityStats.set([]);

    // Auto-select most recent version and load diagram
    if (key) {
      const versions = this.sourceVersions();
      if (versions.length > 0) {
        const mostRecent = versions[0]; // Already sorted desc by version
        this.onSourceVersionChange(mostRecent.version);
      }
    }
  }

  onSourceVersionChange(version: number): void {
    this.sourceVersion.set(version);
    const def = this.sourceVersions().find(d => d.version === version);
    const defId = def?.id || null;
    this.sourceDefinitionId.set(defId);

    if (defId) {
      this.loadSourceDiagram(defId);
    } else {
      this.sourceXml.set(null);
      this.sourceActivityStats.set([]);
    }
  }

  private loadSourceDiagram(defId: string): void {
    this.sourceXmlLoading.set(true);
    forkJoin({
      xml: this.processDefinitionService.getBpmn20Xml(defId),
      stats: this.processDefinitionService.getActivityStatistics(defId, true)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ xml, stats }) => {
          this.sourceXml.set(xml?.bpmn20Xml || null);
          this.sourceActivityStats.set(stats);
          this.sourceXmlLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.sourceXmlLoading.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  onTargetKeyChange(key: string): void {
    this.targetKey.set(key);
    this.targetVersion.set(null);
    this.targetDefinitionId.set(null);
    this.targetXml.set(null);

    // Auto-select most recent version and load diagram
    if (key) {
      const versions = this.targetVersions();
      if (versions.length > 0) {
        const mostRecent = versions[0]; // Already sorted desc by version
        this.onTargetVersionChange(mostRecent.version);
      }
    }
  }

  onTargetVersionChange(version: number): void {
    this.targetVersion.set(version);
    const def = this.targetVersions().find(d => d.version === version);
    const defId = def?.id || null;
    this.targetDefinitionId.set(defId);

    if (defId) {
      this.loadTargetDiagram(defId);
    } else {
      this.targetXml.set(null);
    }
  }

  private loadTargetDiagram(defId: string): void {
    this.targetXmlLoading.set(true);
    this.processDefinitionService.getBpmn20Xml(defId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (xml) => {
          this.targetXml.set(xml?.bpmn20Xml || null);
          this.targetXmlLoading.set(false);
          this.generateMigrationPlan();
          this.cdr.markForCheck();
        },
        error: () => {
          this.targetXmlLoading.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  private generateMigrationPlan(): void {
    const sourceId = this.sourceDefinitionId();
    const targetId = this.targetDefinitionId();

    if (!sourceId || !targetId || sourceId === targetId) {
      this.migrationPlan.set(null);
      this.migrationReport.set(null);
      return;
    }

    this.planLoading.set(true);
    this.migrationService.generateMigrationPlan({ sourceProcessDefinitionId: sourceId, targetProcessDefinitionId: targetId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => {
          this.migrationPlan.set(plan);
          if (plan) {
            this.validateMigrationPlan(plan);
          } else {
            this.planLoading.set(false);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.planLoading.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  private validateMigrationPlan(plan: MigrationPlanDto): void {
    this.migrationService.validateMigrationPlan(plan)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.migrationReport.set(report);
          this.planLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.planLoading.set(false);
          this.cdr.markForCheck();
        }
      });
  }
}