import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { CockpitDashboardComponent } from './cockpit-dashboard/cockpit-dashboard';
import { ProcessDefinitionsComponent } from './cockpit-processes/process-definitions/process-definitions';
import { ProcessListComponent } from './cockpit-processes/process-list/process-list';
import { ProcessDetailComponent } from './cockpit-processes/process-detail/process-detail';
import { DecisionListComponent } from './cockpit-decisions/decision-list/decision-list';
import { DecisionDetailComponent } from './cockpit-decisions/decision-detail/decision-detail';
import { DecisionInstanceComponent } from './cockpit-decisions/decision-instance/decision-instance';
import { TaskDashboardComponent } from './cockpit-tasks/task-dashboard/task-dashboard';
import { BatchPageComponent } from './cockpit-batch/batch-page/batch-page';
import { DeploymentListComponent } from './cockpit-deployments/deployment-list/deployment-list';

// Cockpit NgRx State - lazy loaded with this module
import { dashboardReducer } from '../../store/cockpit/dashboard/dashboard.reducer';
import { processesReducer } from '../../store/cockpit/processes/processes.reducer';
import { decisionsReducer } from '../../store/cockpit/decisions/decisions.reducer';
import { tasksReducer } from '../../store/cockpit/tasks/tasks.reducer';
import { batchReducer } from '../../store/cockpit/batch/batch.reducer';
import { DashboardEffects } from '../../store/cockpit/dashboard/dashboard.effects';
import { ProcessesEffects } from '../../store/cockpit/processes/processes.effects';
import { DecisionsEffects } from '../../store/cockpit/decisions/decisions.effects';
import { TasksEffects } from '../../store/cockpit/tasks/tasks.effects';
import { BatchEffects } from '../../store/cockpit/batch/batch.effects';

/**
 * Cockpit module routes - lazy loaded from app.routes.ts
 * NgRx state is registered here and loaded only when this module is accessed
 * Guards are applied at the parent route level in app.routes.ts
 */
export const COCKPIT_ROUTES: Routes = [
  {
    path: '',
    providers: [
      // Register cockpit state slices
      provideState('cockpitDashboard', dashboardReducer),
      provideState('cockpitProcesses', processesReducer),
      provideState('cockpitDecisions', decisionsReducer),
      provideState('cockpitTasks', tasksReducer),
      provideState('batch', batchReducer),
      // Register cockpit effects
      provideEffects(DashboardEffects, ProcessesEffects, DecisionsEffects, TasksEffects, BatchEffects)
    ],
    children: [
      { path: '', component: CockpitDashboardComponent, title: 'PAGE_TITLE_COCKPIT' },
      { path: 'processes', component: ProcessDefinitionsComponent, title: 'PAGE_TITLE_COCKPIT_PROCESSES' },
      { path: 'processes/:key/instances', component: ProcessListComponent, title: 'PAGE_TITLE_COCKPIT_PROCESS_INSTANCES' },
      { path: 'processes/instance/:id', component: ProcessDetailComponent, title: 'PAGE_TITLE_COCKPIT_PROCESS_DETAIL' },
      { path: 'decisions', component: DecisionListComponent, title: 'PAGE_TITLE_COCKPIT_DECISIONS' },
      { path: 'decisions/:id', component: DecisionDetailComponent, title: 'PAGE_TITLE_COCKPIT_DECISION_DETAIL' },
      { path: 'decision-instance/:id', component: DecisionInstanceComponent, title: 'PAGE_TITLE_COCKPIT_DECISION_INSTANCE' },
      { path: 'tasks', component: TaskDashboardComponent, title: 'PAGE_TITLE_COCKPIT_TASKS' },
      { path: 'batch', component: BatchPageComponent, title: 'PAGE_TITLE_COCKPIT_BATCH' },
      { path: 'deployments', component: DeploymentListComponent, title: 'PAGE_TITLE_COCKPIT_DEPLOYMENTS' }
    ]
  }
];

// Default export for lazy loading
export default COCKPIT_ROUTES;
