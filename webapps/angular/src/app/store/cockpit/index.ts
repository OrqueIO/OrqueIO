import { ActionReducerMap } from '@ngrx/store';
import { DashboardState } from './dashboard/dashboard.state';
import { ProcessesState } from './processes/processes.state';
import { DecisionsState } from './decisions/decisions.state';
import { TasksState } from './tasks/tasks.state';
import { dashboardReducer } from './dashboard/dashboard.reducer';
import { processesReducer } from './processes/processes.reducer';
import { decisionsReducer } from './decisions/decisions.reducer';
import { tasksReducer } from './tasks/tasks.reducer';

export interface CockpitState {
  cockpitDashboard: DashboardState;
  cockpitProcesses: ProcessesState;
  cockpitDecisions: DecisionsState;
  cockpitTasks: TasksState;
}

export const cockpitReducers: ActionReducerMap<CockpitState> = {
  cockpitDashboard: dashboardReducer,
  cockpitProcesses: processesReducer,
  cockpitDecisions: decisionsReducer,
  cockpitTasks: tasksReducer
};

// Re-export all selectors for convenience
export * from './dashboard/dashboard.selectors';
export * from './processes/processes.selectors';
export * from './decisions/decisions.selectors';
export * from './tasks/tasks.selectors';

// Re-export all actions for convenience
export * as DashboardActions from './dashboard/dashboard.actions';
export * as ProcessesActions from './processes/processes.actions';
export * as DecisionsActions from './decisions/decisions.actions';
export * as TasksActions from './tasks/tasks.actions';
