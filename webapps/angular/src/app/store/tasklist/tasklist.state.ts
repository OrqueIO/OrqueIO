import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Task, TaskQueryParams, TaskSorting } from '../../models/tasklist';
import { TaskFilter } from '../../models/tasklist';

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

export interface TaskDetailState {
  task: Task | null;
  form: any | null;
  comments: any[];
  history: any[];
  identityLinks: any[];
  loading: boolean;
  error: string | null;
  activeTab: 'form' | 'history' | 'diagram' | 'description';
}

export const initialTaskDetailState: TaskDetailState = {
  task: null,
  form: null,
  comments: [],
  history: [],
  identityLinks: [],
  loading: false,
  error: null,
  activeTab: 'form'
};

// ==================== UI STATE ====================

export interface TasklistUIState {
  filtersCollapsed: boolean;
  detailCollapsed: boolean;
  searchQuery: string;
  searchPills: SearchPill[];
}

export interface SearchPill {
  type: string;
  key: string;
  operator: string;
  value: string;
}

export const initialUIState: TasklistUIState = {
  filtersCollapsed: false,
  detailCollapsed: false,
  searchQuery: '',
  searchPills: []
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
