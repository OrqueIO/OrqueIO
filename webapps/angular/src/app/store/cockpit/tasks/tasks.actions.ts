import { createAction, props } from '@ngrx/store';
import { Task, TaskQueryParams } from '../../../services/cockpit.service';

// Load Tasks
export const loadTasks = createAction(
  '[Tasks] Load Tasks',
  props<{ params?: TaskQueryParams }>()
);

export const loadTasksSuccess = createAction(
  '[Tasks] Load Tasks Success',
  props<{ tasks: Task[]; total: number }>()
);

export const loadTasksFailure = createAction(
  '[Tasks] Load Tasks Failure',
  props<{ error: any }>()
);

// Load Task Detail
export const loadTask = createAction(
  '[Tasks] Load Task',
  props<{ taskId: string }>()
);

export const loadTaskSuccess = createAction(
  '[Tasks] Load Task Success',
  props<{ task: Task }>()
);

export const loadTaskFailure = createAction(
  '[Tasks] Load Task Failure',
  props<{ error: any }>()
);

// Set Query Params
export const setTasksQueryParams = createAction(
  '[Tasks] Set Query Params',
  props<{ params: TaskQueryParams }>()
);

// Clear Selected Task
export const clearSelectedTask = createAction(
  '[Tasks] Clear Selected Task'
);
