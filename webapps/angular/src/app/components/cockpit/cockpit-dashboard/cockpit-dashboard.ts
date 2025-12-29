import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faProjectDiagram,
  faExclamationTriangle,
  faTasks,
  faCubes,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';

import { CockpitHeaderComponent } from '../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS } from '../../../shared/cockpit-menu';
import { DashboardStats, ProcessDefinition } from '../../../services/cockpit.service';
import { NavMenuService } from '../../../services/nav-menu.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import * as DashboardActions from '../../../store/cockpit/dashboard/dashboard.actions';
import * as DashboardSelectors from '../../../store/cockpit/dashboard/dashboard.selectors';
import * as ProcessesActions from '../../../store/cockpit/processes/processes.actions';
import * as ProcessesSelectors from '../../../store/cockpit/processes/processes.selectors';

interface StatCard {
  icon: any;
  titleKey: string;
  value: number;
  route: string;
  color: string;
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
    TranslatePipe
  ],
  templateUrl: './cockpit-dashboard.html',
  styleUrls: ['./cockpit-dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CockpitDashboardComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private store = inject(Store);

  // Icons
  faSpinner = faSpinner;
  faArrowRight = faArrowRight;

  // Observables from store
  stats$ = this.store.select(DashboardSelectors.selectDashboardStats);
  loading$ = this.store.select(DashboardSelectors.selectDashboardLoading);
  processDefinitions$ = this.store.select(ProcessesSelectors.selectProcessDefinitions);

  statCards: StatCard[] = [
    {
      icon: faProjectDiagram,
      titleKey: 'cockpit.dashboard.runningProcesses',
      value: 0,
      route: '/cockpit/processes',
      color: '#0f62fe',
      loading: true
    },
    {
      icon: faExclamationTriangle,
      titleKey: 'cockpit.dashboard.openIncidents',
      value: 0,
      route: '/cockpit/processes',
      color: '#da1e28',
      loading: true
    },
    {
      icon: faTasks,
      titleKey: 'cockpit.dashboard.openTasks',
      value: 0,
      route: '/cockpit/tasks',
      color: '#24a148',
      loading: true
    },
    {
      icon: faCubes,
      titleKey: 'cockpit.dashboard.deployedDefinitions',
      value: 0,
      route: '/cockpit/processes',
      color: '#ff8200',
      loading: true
    }
  ];

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS);
    this.loadDashboardData();

    // Subscribe to stats updates
    this.stats$.subscribe(stats => {
      if (stats) {
        this.updateStatCards(stats);
      }
    });
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  private loadDashboardData(): void {
    // Dispatch actions to load data
    this.store.dispatch(DashboardActions.loadDashboardStats());
    this.store.dispatch(ProcessesActions.loadProcessDefinitions());
  }

  private updateStatCards(stats: DashboardStats): void {
    this.statCards[0].value = stats.runningProcessInstances;
    this.statCards[0].loading = false;

    this.statCards[1].value = stats.openIncidents;
    this.statCards[1].loading = false;

    this.statCards[2].value = stats.openTasks;
    this.statCards[2].loading = false;

    this.statCards[3].value = stats.deployedDefinitions;
    this.statCards[3].loading = false;
  }

  refresh(): void {
    this.statCards.forEach(card => card.loading = true);
    this.store.dispatch(DashboardActions.refreshDashboard());
    this.store.dispatch(ProcessesActions.loadProcessDefinitions());
  }
}
