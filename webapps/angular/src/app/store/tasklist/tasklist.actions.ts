import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Task, TaskQueryParams, TaskComment, UserOperationLogEntry, IdentityLink } from '../../models/tasklist';
import { TaskFilter } from '../../models/tasklist';
import { SearchPill } from './tasklist.state';

// ==================== TASKS ACTIONS ====================

export const TasksActions = createActionGroup({
  source: 'Tasklist Tasks',
  events: {
    // Load tasks
    'Load Tasks': emptyProps(),
    'Load Tasks Success': props<{ tasks: Task[]; total: number }>(),
    'Load Tasks Failure': props<{ error: string }>(),

    // Select task
    'Select Task': props<{ taskId: string | null }>(),
    'Clear Selection': emptyProps(),

    // Query params
    'Set Query Params': props<{ params: Partial<TaskQueryParams> }>(),
    'Set Page': props<{ page: number }>(),
    'Set Page Size': props<{ pageSize: number }>(),
    'Set Sorting': props<{ sorting: { sortBy: string; sortOrder: 'asc' | 'desc' }[] }>(),

    // Task actions
    'Claim Task': props<{ taskId: string; userId: string }>(),
    'Claim Task Success': props<{ task: Task }>(),
    'Claim Task Failure': props<{ error: string }>(),

    'Unclaim Task': props<{ taskId: string }>(),
    'Unclaim Task Success': props<{ task: Task }>(),
    'Unclaim Task Failure': props<{ error: string }>(),

    'Complete Task': props<{ taskId: string; variables?: Record<string, any> }>(),
    'Complete Task Success': props<{ taskId: string }>(),
    'Complete Task Failure': props<{ error: string }>(),

    'Update Task': props<{ taskId: string; updates: Partial<Task> }>(),
    'Update Task Success': props<{ task: Task }>(),
    'Update Task Failure': props<{ error: string }>(),

    'Set Assignee': props<{ taskId: string; userId: string | null }>(),
    'Set Assignee Success': props<{ task: Task }>(),
    'Set Assignee Failure': props<{ error: string }>(),

    // Refresh
    'Refresh Tasks': emptyProps()
  }
});

// ==================== FILTERS ACTIONS ====================

export const FiltersActions = createActionGroup({
  source: 'Tasklist Filters',
  events: {
    // Load filters
    'Load Filters': emptyProps(),
    'Load Filters Success': props<{ filters: TaskFilter[]; canCreate: boolean }>(),
    'Load Filters Failure': props<{ error: string }>(),

    // Select filter
    'Select Filter': props<{ filterId: string | null }>(),
    'Update Filter Count': props<{ count: number }>(),

    // CRUD
    'Create Filter': props<{ filter: Omit<TaskFilter, 'id'> }>(),
    'Create Filter Success': props<{ filter: TaskFilter }>(),
    'Create Filter Failure': props<{ error: string }>(),

    'Update Filter': props<{ filterId: string; filter: Partial<TaskFilter> }>(),
    'Update Filter Success': props<{ filter: TaskFilter }>(),
    'Update Filter Failure': props<{ error: string }>(),

    'Delete Filter': props<{ filterId: string }>(),
    'Delete Filter Success': props<{ filterId: string }>(),
    'Delete Filter Failure': props<{ error: string }>()
  }
});

// ==================== TASK DETAIL ACTIONS ====================

export const TaskDetailActions = createActionGroup({
  source: 'Tasklist Task Detail',
  events: {
    // Load detail
    'Load Task Detail': props<{ taskId: string }>(),
    'Load Task Detail Success': props<{ task: Task }>(),
    'Load Task Detail Failure': props<{ error: string }>(),
    'Clear Task Detail': emptyProps(),

    // Form
    'Load Task Form': props<{ taskId: string }>(),
    'Load Task Form Success': props<{ form: any }>(),
    'Load Task Form Failure': props<{ error: string }>(),

    // Comments
    'Load Comments': props<{ taskId: string }>(),
    'Load Comments Success': props<{ comments: TaskComment[] }>(),
    'Load Comments Failure': props<{ error: string }>(),

    'Add Comment': props<{ taskId: string; message: string }>(),
    'Add Comment Success': props<{ comment: TaskComment }>(),
    'Add Comment Failure': props<{ error: string }>(),

    // History
    'Load History': props<{ taskId: string; params?: { firstResult?: number; maxResults?: number } }>(),
    'Load History Success': props<{ history: UserOperationLogEntry[] }>(),
    'Load History Failure': props<{ error: string }>(),

    // Identity Links
    'Load Identity Links': props<{ taskId: string }>(),
    'Load Identity Links Success': props<{ identityLinks: IdentityLink[] }>(),
    'Load Identity Links Failure': props<{ error: string }>(),

    'Add Identity Link': props<{ taskId: string; link: IdentityLink }>(),
    'Add Identity Link Success': props<{ link: IdentityLink }>(),
    'Add Identity Link Failure': props<{ error: string }>(),

    'Remove Identity Link': props<{ taskId: string; link: IdentityLink }>(),
    'Remove Identity Link Success': props<{ link: IdentityLink }>(),
    'Remove Identity Link Failure': props<{ error: string }>(),

    // Tab
    'Set Active Tab': props<{ tab: 'form' | 'history' | 'diagram' | 'description' }>()
  }
});

// ==================== UI ACTIONS ====================

export const TasklistUIActions = createActionGroup({
  source: 'Tasklist UI',
  events: {
    'Toggle Filters Panel': emptyProps(),
    'Toggle Detail Panel': emptyProps(),
    'Set Filters Collapsed': props<{ collapsed: boolean }>(),
    'Set Detail Collapsed': props<{ collapsed: boolean }>(),
    'Set Search Query': props<{ query: string }>(),
    'Add Search Pill': props<{ pill: SearchPill }>(),
    'Remove Search Pill': props<{ index: number }>(),
    'Clear Search Pills': emptyProps()
  }
});
