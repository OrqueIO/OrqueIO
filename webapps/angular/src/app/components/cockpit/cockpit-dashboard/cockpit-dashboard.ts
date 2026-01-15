import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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

// Chart components
import {
  TasksChartComponent,
  TasksByGroupChartComponent,
  ProcessDistributionChartComponent,
  OpenIncidentsChartComponent,
  TimelineChartComponent
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
    TimelineChartComponent
  ],
  templateUrl: './cockpit-dashboard.html',
  styleUrls: ['./cockpit-dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  }

  ngOnDestroy(): void {
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
