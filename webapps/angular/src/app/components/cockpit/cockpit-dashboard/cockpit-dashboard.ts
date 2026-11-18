import { Component, OnInit, OnDestroy, DestroyRef, ElementRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { Store } from '@ngrx/store';
import { Observable, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faProjectDiagram,
  faExclamationTriangle,
  faTasks,
  faCubes,
  faArrowRight,
  faSync,
  faChevronUp,
  faChevronDown,
  faTable,
  faBriefcase,
  faCloudUploadAlt,
  faChartBar
} from '@fortawesome/free-solid-svg-icons';

import { CockpitHeaderComponent } from '../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../shared/cockpit-menu';
import { DashboardStats, ProcessDefinition, CockpitService } from '../../../services/cockpit.service';
import { NavMenuService } from '../../../services/nav-menu.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import * as DashboardActions from '../../../store/cockpit/dashboard/dashboard.actions';
import * as DashboardSelectors from '../../../store/cockpit/dashboard/dashboard.selectors';
import * as ProcessesActions from '../../../store/cockpit/processes/processes.actions';
import * as ProcessesSelectors from '../../../store/cockpit/processes/processes.selectors';
import { LLM_USAGE_LONGEST_PERIOD, LlmRecordSource, LlmUsageService } from '../../../shared/llm-task/llm-usage.service';
import { LlmTaskRecord } from '../../../shared/llm-task/llm-task-records';
import { LlmUsage, summarizeLlmUsage } from '../../../shared/llm-task/llm-usage';
import { BUBBLE_PATH, SPARK_PATH } from '../../../shared/bpmn-viewer/llm-task-renderer';

// Chart components
import {
  TasksChartComponent,
  TasksByGroupChartComponent,
  ProcessDistributionChartComponent,
  OpenIncidentsChartComponent,
  TimelineChartComponent,
  LlmUsageChartComponent
} from '../dashboard-charts';

interface DeployedStats {
  processDefinitions: number;
  decisionDefinitions: number;
  caseDefinitions: number;
  deployments: number;
  loading: boolean;
}

@Component({
  selector: 'app-cockpit-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    // Chart components
    TasksChartComponent,
    TasksByGroupChartComponent,
    ProcessDistributionChartComponent,
    OpenIncidentsChartComponent,
    TimelineChartComponent,
    LlmUsageChartComponent
  ],
  templateUrl: './cockpit-dashboard.html',
  styleUrls: ['./cockpit-dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LlmUsageService],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, height: 0, overflow: 'hidden' }),
        animate('200ms ease-out', style({ opacity: 1, height: '*' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, height: '*', overflow: 'hidden' }),
        animate('150ms ease-in', style({ opacity: 0, height: 0 }))
      ])
    ])
  ]
})
export class CockpitDashboardComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);
  private cockpitService = inject(CockpitService);
  private llmUsageService = inject(LlmUsageService);
  private host = inject(ElementRef<HTMLElement>);
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;

  /** The days the LLM figures of the stats cover. */
  readonly llmStatsDays = 7;
  readonly llmBubblePath = BUBBLE_PATH;
  readonly llmSparkPath = SPARK_PATH;

  /** What the LLM tasks used over the last days; null while no LLM task has run. */
  llmStats: LlmUsage | null = null;

  // Icons
  faSpinner = faSpinner;
  faArrowRight = faArrowRight;
  faSync = faSync;
  faChevronUp = faChevronUp;
  faChevronDown = faChevronDown;
  faProjectDiagram = faProjectDiagram;
  faExclamationTriangle = faExclamationTriangle;
  faTasks = faTasks;
  faCubes = faCubes;
  faTable = faTable;
  faBriefcase = faBriefcase;
  faCloudUploadAlt = faCloudUploadAlt;
  faChartBar = faChartBar;

  // Section visibility flags
  rightNowVisible = true;
  deployedVisible = true;
  chartsVisible = true;
  secondaryChartsVisible = false;

  // Deployed stats
  deployedStats: DeployedStats = {
    processDefinitions: 0,
    decisionDefinitions: 0,
    caseDefinitions: 0,
    deployments: 0,
    loading: true
  };

  // Observables from store
  stats$ = this.store.select(DashboardSelectors.selectDashboardStats);
  loading$ = this.store.select(DashboardSelectors.selectDashboardLoading);
  processDefinitions$ = this.store.select(ProcessesSelectors.selectProcessDefinitions);

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadDashboardData();
    this.loadDeployedStats();
    this.loadLlmStats();
  }

  private loadLlmStats(): void {
    this.llmUsageService.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        // Kept while reloading, so the cards do not flash; dropped when the records could
        // not be loaded, so no outdated figure stays on screen
        if (state.loadingState === 'success') {
          this.llmStats = this.llmStatsOf(state.records, state.source);
          this.cdr.markForCheck();
        } else if (state.loadingState === 'error') {
          this.llmStats = null;
          this.cdr.markForCheck();
        }
      });
    this.llmUsageService.ensureLoaded();
  }

  /**
   * The figures of the stats, or null when they would mislead: below history level full
   * only the latest record of each task is left, which cannot be counted as calls; and
   * the cards only show once an LLM task has run in the period the dashboard reads.
   */
  private llmStatsOf(records: LlmTaskRecord[], source: LlmRecordSource): LlmUsage | null {
    if (source !== 'updates' || summarizeLlmUsage(records, LLM_USAGE_LONGEST_PERIOD).calls === 0) {
      return null;
    }
    return summarizeLlmUsage(records, this.llmStatsDays);
  }

  /** Opens the charts section and shows the LLM tasks card, which details the figures. */
  showLlmUsage(): void {
    this.secondaryChartsVisible = true;
    this.cdr.markForCheck();
    // After the section's opening animation (200 ms), when the card is at its place
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    this.scrollTimer = setTimeout(() => {
      this.scrollTimer = null;
      const card = this.host.nativeElement.querySelector('app-llm-usage-chart') as HTMLElement | null;
      card?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, 250);
  }

  ngOnDestroy(): void {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    this.navMenuService.clearMenuItems();
  }

  private loadDashboardData(): void {
    // Dispatch actions to load stats and process definitions
    this.store.dispatch(DashboardActions.loadDashboardStats());
    this.store.dispatch(ProcessesActions.loadProcessDefinitions());

    // Load all chart data
    this.store.dispatch(DashboardActions.loadAllChartsData());
  }

  private loadDeployedStats(): void {
    this.deployedStats.loading = true;
    this.cdr.markForCheck();

    forkJoin({
      processDefinitions: this.cockpitService.getProcessDefinitionsCount(),
      decisionDefinitions: this.cockpitService.getDecisionDefinitionsCount(),
      caseDefinitions: this.cockpitService.getCaseDefinitionsCount(),
      deployments: this.cockpitService.getDeploymentsCount()
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (stats) => {
        this.deployedStats = {
          ...stats,
          loading: false
        };
        this.cdr.markForCheck();
      },
      error: () => {
        this.deployedStats.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  refresh(): void {
    this.store.dispatch(DashboardActions.refreshDashboard());
    this.store.dispatch(ProcessesActions.loadProcessDefinitions());
    // Refresh all charts
    this.store.dispatch(DashboardActions.refreshAllCharts());
    // Refresh deployed stats
    this.loadDeployedStats();
    this.cdr.markForCheck();
  }

  toggleRightNowSection(): void {
    this.rightNowVisible = !this.rightNowVisible;
    this.cdr.markForCheck();
  }

  toggleDeployedSection(): void {
    this.deployedVisible = !this.deployedVisible;
    this.cdr.markForCheck();
  }

  toggleCharts(): void {
    this.chartsVisible = !this.chartsVisible;
    this.cdr.markForCheck();
  }

  toggleSecondaryCharts(): void {
    this.secondaryChartsVisible = !this.secondaryChartsVisible;
    this.cdr.markForCheck();
  }
}
