import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Task, TaskQueryParams, TaskSorting } from '../../models/tasklist';
import { TaskFilter, SearchPill, SearchQuery } from '../../models/tasklist';

// ==================== TASKS STATE ====================

export interface TasksState extends EntityState<Task> {
  selectedTaskId: string | null;
  queryParams: TaskQueryParams;
  total: number;
  loading: boolean;
  error: string | null;
}

export const tasksAdapter: EntityAdapter<Task> = createEntityAdapter<Task>({
  selectId: (task) => task.id,
  sortComparer: false
});

export const initialTasksState: TasksState = tasksAdapter.getInitialState({
  selectedTaskId: null,
  queryParams: {
    firstResult: 0,
    maxResults: 15,
    sorting: [{ sortBy: 'created', sortOrder: 'desc' }]
  },
  total: 0,
  loading: false,
  error: null
});

// ==================== FILTERS STATE ====================

export interface FiltersState extends EntityState<TaskFilter> {
  selectedFilterId: string | null;
  selectedFilterCount: number;
  loading: boolean;
  error: string | null;
  canCreate: boolean;
}

export const filtersAdapter: EntityAdapter<TaskFilter> = createEntityAdapter<TaskFilter>({
  selectId: (filter) => filter.id,
  sortComparer: (a, b) => {
    // Sort by priority first, then by name
    const priorityA = a.properties?.priority ?? 0;
    const priorityB = b.properties?.priority ?? 0;
    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }
    return a.name.localeCompare(b.name);
  }
});

export const initialFiltersState: FiltersState = filtersAdapter.getInitialState({
  selectedFilterId: null,
  selectedFilterCount: 0,
  loading: false,
  error: null,
  canCreate: false
});

// ==================== TASK DETAIL STATE ====================

/**
 * Task error types matching AngularJS errorHandler
 */
export type TaskErrorType = 'TASK_NOT_EXIST' | 'INSTANCE_SUSPENDED' | 'GENERAL_ERROR' | null;

export interface TaskDetailState {
  task: Task | null;
  form: any | null;
  comments: any[];
  history: any[];
  identityLinks: any[];
  loading: boolean;
  error: string | null;
  errorType: TaskErrorType;
  activeTab: 'form' | 'history' | 'diagram' | 'description' | 'variables';
  // Instance suspended state (matching AngularJS)
  instanceSuspended: boolean;
}

export const initialTaskDetailState: TaskDetailState = {
  task: null,
  form: null,
  comments: [],
  history: [],
  identityLinks: [],
  loading: false,
  error: null,
  errorType: null,
  activeTab: 'form',
  instanceSuspended: false
};

// ==================== UI STATE ====================

/**
 * Column maximize mode - which column is maximized (null = none)
 * Matches AngularJS maximize-column-left/right functionality
 */
export type MaximizedColumn = 'filters' | 'list' | 'detail' | null;

export interface TasklistUIState {
  filtersCollapsed: boolean;
  listCollapsed: boolean;
  detailCollapsed: boolean;
  // Column maximize feature (AngularJS parity)
  maximizedColumn: MaximizedColumn;
  // Search state
  searchQuery: string;
  searchPills: SearchPill[];
  // OR query mode (AngularJS matchAny)
  matchAny: boolean;
}

// Re-export SearchPill from filter.model for convenience
export type { SearchPill } from '../../models/tasklist';

export const initialUIState: TasklistUIState = {
  filtersCollapsed: false,
  listCollapsed: false,
  detailCollapsed: false,
  maximizedColumn: null,
  searchQuery: '',
  searchPills: [],
  matchAny: false
};

// ==================== ROOT STATE ====================

export interface TasklistState {
  tasks: TasksState;
  filters: FiltersState;
  taskDetail: TaskDetailState;
  ui: TasklistUIState;
}

export const initialTasklistState: TasklistState = {
  tasks: initialTasksState,
  filters: initialFiltersState,
  taskDetail: initialTaskDetailState,
  ui: initialUIState
};
