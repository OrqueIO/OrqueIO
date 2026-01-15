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

export const cockpitRoutes: Routes = [
  {
    path: 'cockpit',
    canActivate: [authGuard],
    children: [
      { path: '', component: CockpitDashboardComponent },
      { path: 'processes', component: ProcessDefinitionsComponent },
      { path: 'processes/:key/instances', component: ProcessListComponent },
      { path: 'processes/instance/:id', component: ProcessDetailComponent },
      { path: 'decisions', component: DecisionListComponent },
      { path: 'decisions/:id', component: DecisionDetailComponent },
      { path: 'decision-instance/:id', component: DecisionInstanceComponent },
      { path: 'tasks', component: TaskDashboardComponent },
      { path: 'batch', component: BatchPageComponent }
    ]
  }
];
