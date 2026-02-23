import { ActionReducerMap } from '@ngrx/store';
import { DashboardState } from './dashboard/dashboard.state';
import { ProcessesState } from './processes/processes.state';
import { DecisionsState } from './decisions/decisions.state';
import { TasksState } from './tasks/tasks.state';
import { BatchState } from './batch/batch.state';
import { dashboardReducer } from './dashboard/dashboard.reducer';
import { processesReducer } from './processes/processes.reducer';
import { decisionsReducer } from './decisions/decisions.reducer';
import { tasksReducer } from './tasks/tasks.reducer';
import { batchReducer } from './batch/batch.reducer';

export interface CockpitState {
  cockpitDashboard: DashboardState;
  cockpitProcesses: ProcessesState;
  cockpitDecisions: DecisionsState;
  cockpitTasks: TasksState;
  batch: BatchState;
}

export const cockpitReducers: ActionReducerMap<CockpitState> = {
  cockpitDashboard: dashboardReducer,
  cockpitProcesses: processesReducer,
  cockpitDecisions: decisionsReducer,
  cockpitTasks: tasksReducer,
  batch: batchReducer
};

// Re-export all selectors for convenience
export * from './dashboard/dashboard.selectors';
export * from './processes/processes.selectors';
export * from './decisions/decisions.selectors';
export * from './tasks/tasks.selectors';
export * from './batch/batch.selectors';

// Re-export all actions for convenience
export * as DashboardActions from './dashboard/dashboard.actions';
export * as ProcessesActions from './processes/processes.actions';
export * as DecisionsActions from './decisions/decisions.actions';
export * as TasksActions from './tasks/tasks.actions';
export * as BatchActions from './batch/batch.actions';
