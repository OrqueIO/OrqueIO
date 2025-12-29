import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TasksState, tasksAdapter } from './tasks.state';

export const selectTasksState = createFeatureSelector<TasksState>('cockpitTasks');

const { selectAll, selectEntities, selectIds, selectTotal } = tasksAdapter.getSelectors();

export const selectAllTasks = createSelector(
  selectTasksState,
  selectAll
);

export const selectTaskEntities = createSelector(
  selectTasksState,
  selectEntities
);

export const selectTaskIds = createSelector(
  selectTasksState,
  selectIds
);

export const selectTasksLoading = createSelector(
  selectTasksState,
  (state) => state.loading
);

export const selectTasksTotal = createSelector(
  selectTasksState,
  (state) => state.total
);

export const selectTasksQueryParams = createSelector(
  selectTasksState,
  (state) => state.queryParams
);

export const selectTasksError = createSelector(
  selectTasksState,
  (state) => state.error
);

export const selectSelectedTask = createSelector(
  selectTasksState,
  (state) => state.selectedTask
);
