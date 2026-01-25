import { createReducer, on } from '@ngrx/store';
import {
  TasksState,
  FiltersState,
  TaskDetailState,
  TasklistUIState,
  TasklistState,
  initialTasksState,
  initialFiltersState,
  initialTaskDetailState,
  initialUIState,
  initialTasklistState,
  tasksAdapter,
  filtersAdapter
} from './tasklist.state';
import { TasksActions, FiltersActions, TaskDetailActions, TasklistUIActions } from './tasklist.actions';

// ==================== TASKS REDUCER ====================

export const tasksReducer = createReducer(
  initialTasksState,

  // Load tasks
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

  // Select task
  on(TasksActions.selectTask, (state, { taskId }) => ({
    ...state,
    selectedTaskId: taskId
  })),

  on(TasksActions.clearSelection, (state) => ({
    ...state,
    selectedTaskId: null
  })),

  // Query params
  on(TasksActions.setQueryParams, (state, { params }) => ({
    ...state,
    queryParams: { ...state.queryParams, ...params }
  })),

  on(TasksActions.setPage, (state, { page }) => ({
    ...state,
    queryParams: {
      ...state.queryParams,
      firstResult: (page - 1) * (state.queryParams.maxResults || 15)
    }
  })),

  on(TasksActions.setPageSize, (state, { pageSize }) => ({
    ...state,
    queryParams: {
      ...state.queryParams,
      maxResults: pageSize,
      firstResult: 0
    }
  })),

  on(TasksActions.setSorting, (state, { sorting }) => ({
    ...state,
    queryParams: {
      ...state.queryParams,
      sorting
    }
  })),

  // Task actions
  on(TasksActions.claimTaskSuccess, TasksActions.unclaimTaskSuccess,
     TasksActions.updateTaskSuccess, TasksActions.setAssigneeSuccess,
     TasksActions.delegateTaskSuccess,
    (state, { task }) => tasksAdapter.updateOne(
      { id: task.id, changes: task },
      state
    )
  ),

  on(TasksActions.completeTaskSuccess, (state, { taskId }) =>
    tasksAdapter.removeOne(taskId, {
      ...state,
      total: state.total - 1,
      selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId
    })
  ),

  // Refresh
  on(TasksActions.refreshTasks, (state) => ({
    ...state,
    loading: true
  })),

  // Reset page when filter changes
  on(FiltersActions.selectFilter, (state) => ({
    ...state,
    queryParams: {
      ...state.queryParams,
      firstResult: 0
    }
  }))
);

// ==================== FILTERS REDUCER ====================

export const filtersReducer = createReducer(
  initialFiltersState,

  // Load filters
  on(FiltersActions.loadFilters, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(FiltersActions.loadFiltersSuccess, (state, { filters, canCreate }) =>
    filtersAdapter.setAll(filters, {
      ...state,
      loading: false,
      error: null,
      canCreate
    })
  ),

  on(FiltersActions.loadFiltersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select filter
  on(FiltersActions.selectFilter, (state, { filterId }) => ({
    ...state,
    selectedFilterId: filterId
  })),

  on(FiltersActions.updateFilterCount, (state, { count }) => ({
    ...state,
    selectedFilterCount: count
  })),

  // CRUD
  on(FiltersActions.createFilterSuccess, (state, { filter }) =>
    filtersAdapter.addOne(filter, state)
  ),

  on(FiltersActions.updateFilterSuccess, (state, { filter }) =>
    filtersAdapter.updateOne({ id: filter.id, changes: filter }, state)
  ),

  on(FiltersActions.deleteFilterSuccess, (state, { filterId }) =>
    filtersAdapter.removeOne(filterId, {
      ...state,
      selectedFilterId: state.selectedFilterId === filterId ? null : state.selectedFilterId
    })
  )
);

// ==================== TASK DETAIL REDUCER ====================

export const taskDetailReducer = createReducer(
  initialTaskDetailState,

  // Load detail
  on(TaskDetailActions.loadTaskDetail, (state) => ({
    ...state,
    loading: true,
    error: null,
    errorType: null
  })),

  on(TaskDetailActions.loadTaskDetailSuccess, (state, { task }) => ({
    ...state,
    task,
    loading: false,
    error: null,
    errorType: null,
    instanceSuspended: false
  })),

  on(TaskDetailActions.loadTaskDetailFailure, (state, { error, errorType }) => ({
    ...state,
    loading: false,
    error,
    errorType: errorType ?? 'GENERAL_ERROR'
  })),

  // Task not found (AngularJS TASK_NOT_EXIST)
  on(TaskDetailActions.taskNotFound, (state, { taskId }) => ({
    ...state,
    task: null,
    loading: false,
    error: `Task ${taskId} not found`,
    errorType: 'TASK_NOT_EXIST' as const
  })),

  // Instance suspended (AngularJS INSTANCE_SUSPENDED)
  on(TaskDetailActions.setInstanceSuspended, (state, { suspended }) => ({
    ...state,
    instanceSuspended: suspended
  })),

  on(TaskDetailActions.clearTaskDetail, () => initialTaskDetailState),

  // Form
  on(TaskDetailActions.loadTaskFormSuccess, (state, { form }) => ({
    ...state,
    form
  })),

  // Comments
  on(TaskDetailActions.loadCommentsSuccess, (state, { comments }) => ({
    ...state,
    comments
  })),

  on(TaskDetailActions.addCommentSuccess, (state, { comment }) => ({
    ...state,
    comments: [comment, ...state.comments]
  })),

  // History
  on(TaskDetailActions.loadHistorySuccess, (state, { history }) => ({
    ...state,
    history
  })),

  // Identity Links
  on(TaskDetailActions.loadIdentityLinksSuccess, (state, { identityLinks }) => ({
    ...state,
    identityLinks
  })),

  on(TaskDetailActions.addIdentityLinkSuccess, (state, { link }) => ({
    ...state,
    identityLinks: [...state.identityLinks, link]
  })),

  on(TaskDetailActions.removeIdentityLinkSuccess, (state, { link }) => ({
    ...state,
    identityLinks: state.identityLinks.filter(
      l => !(l.userId === link.userId && l.groupId === link.groupId && l.type === link.type)
    )
  })),

  // Tab
  on(TaskDetailActions.setActiveTab, (state, { tab }) => ({
    ...state,
    activeTab: tab
  })),

  // Sync task detail when task is updated via TasksActions
  // This ensures the task detail view updates reactively
  on(TasksActions.updateTaskSuccess, TasksActions.claimTaskSuccess,
     TasksActions.unclaimTaskSuccess, TasksActions.setAssigneeSuccess,
     TasksActions.delegateTaskSuccess,
    (state, { task }) => {
      // Only update if this is the currently viewed task
      if (state.task?.id === task.id) {
        return { ...state, task };
      }
      return state;
    }
  )
);

// ==================== UI REDUCER ====================

export const uiReducer = createReducer(
  initialUIState,

  // Panel collapse/expand
  on(TasklistUIActions.toggleFiltersPanel, (state) => ({
    ...state,
    filtersCollapsed: !state.filtersCollapsed,
    maximizedColumn: null // Reset maximize when toggling
  })),

  on(TasklistUIActions.toggleListPanel, (state) => ({
    ...state,
    listCollapsed: !state.listCollapsed,
    maximizedColumn: null
  })),

  on(TasklistUIActions.toggleDetailPanel, (state) => ({
    ...state,
    detailCollapsed: !state.detailCollapsed,
    maximizedColumn: null
  })),

  on(TasklistUIActions.setFiltersCollapsed, (state, { collapsed }) => ({
    ...state,
    filtersCollapsed: collapsed
  })),

  on(TasklistUIActions.setListCollapsed, (state, { collapsed }) => ({
    ...state,
    listCollapsed: collapsed
  })),

  on(TasklistUIActions.setDetailCollapsed, (state, { collapsed }) => ({
    ...state,
    detailCollapsed: collapsed
  })),

  // Column maximize (AngularJS parity)
  on(TasklistUIActions.maximizeColumn, (state, { column }) => ({
    ...state,
    maximizedColumn: state.maximizedColumn === column ? null : column // Toggle if same column
  })),

  on(TasklistUIActions.resetColumnSizes, (state) => ({
    ...state,
    maximizedColumn: null,
    filtersCollapsed: false,
    listCollapsed: false,
    detailCollapsed: false
  })),

  // Search query
  on(TasklistUIActions.setSearchQuery, (state, { query }) => ({
    ...state,
    searchQuery: query
  })),

  // Search pills - set all at once
  on(TasklistUIActions.setSearchPills, (state, { pills }) => ({
    ...state,
    searchPills: pills
  })),

  // Add single pill
  on(TasklistUIActions.addSearchPill, (state, { pill }) => ({
    ...state,
    searchPills: [...state.searchPills, pill]
  })),

  // Update pill by id
  on(TasklistUIActions.updateSearchPill, (state, { id, pill }) => ({
    ...state,
    searchPills: state.searchPills.map(p =>
      p.id === id ? { ...p, ...pill } : p
    )
  })),

  // Remove pill by id
  on(TasklistUIActions.removeSearchPill, (state, { id }) => ({
    ...state,
    searchPills: state.searchPills.filter(p => p.id !== id)
  })),

  // Clear all pills
  on(TasklistUIActions.clearSearchPills, (state) => ({
    ...state,
    searchPills: [],
    matchAny: false
  })),

  // OR query mode (AngularJS matchAny)
  on(TasklistUIActions.setMatchAny, (state, { matchAny }) => ({
    ...state,
    matchAny
  }))
);

// ==================== COMBINED TASKLIST REDUCER ====================

const combinedReducer = (state: TasklistState | undefined, action: any): TasklistState => {
  return {
    tasks: tasksReducer(state?.tasks, action),
    filters: filtersReducer(state?.filters, action),
    taskDetail: taskDetailReducer(state?.taskDetail, action),
    ui: uiReducer(state?.ui, action)
  };
};

export function tasklistReducer(state: TasklistState | undefined, action: any): TasklistState {
  return combinedReducer(state, action);
}
