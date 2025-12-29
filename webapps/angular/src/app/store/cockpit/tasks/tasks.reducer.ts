import { createReducer, on } from '@ngrx/store';
import { tasksAdapter, initialTasksState } from './tasks.state';
import * as TasksActions from './tasks.actions';

export const tasksReducer = createReducer(
  initialTasksState,

  // Load Tasks
  on(TasksActions.loadTasks, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TasksActions.loadTasksSuccess, (state, { tasks, total }) =>
    tasksAdapter.setAll(tasks, {
      ...state,
      total,
      loading: false,
      error: null
    })
  ),

  on(TasksActions.loadTasksFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Task Detail
  on(TasksActions.loadTask, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TasksActions.loadTaskSuccess, (state, { task }) => ({
    ...state,
    selectedTask: task,
    loading: false,
    error: null
  })),

  on(TasksActions.loadTaskFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Set Query Params
  on(TasksActions.setTasksQueryParams, (state, { params }) => ({
    ...state,
    queryParams: params
  })),

  // Clear Selected Task
  on(TasksActions.clearSelectedTask, (state) => ({
    ...state,
    selectedTask: null
  }))
);
