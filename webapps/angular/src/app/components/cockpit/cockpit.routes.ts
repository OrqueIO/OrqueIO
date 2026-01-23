import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';
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

export const cockpitRoutes: Routes = [
  {
    path: 'cockpit',
    canActivate: [authGuard],
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
