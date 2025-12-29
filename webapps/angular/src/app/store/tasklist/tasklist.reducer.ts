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
    error: null
  })),

  on(TaskDetailActions.loadTaskDetailSuccess, (state, { task }) => ({
    ...state,
    task,
    loading: false,
    error: null
  })),

  on(TaskDetailActions.loadTaskDetailFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
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
  }))
);

// ==================== UI REDUCER ====================

export const uiReducer = createReducer(
  initialUIState,

  on(TasklistUIActions.toggleFiltersPanel, (state) => ({
    ...state,
    filtersCollapsed: !state.filtersCollapsed
  })),

  on(TasklistUIActions.toggleDetailPanel, (state) => ({
    ...state,
    detailCollapsed: !state.detailCollapsed
  })),

  on(TasklistUIActions.setFiltersCollapsed, (state, { collapsed }) => ({
    ...state,
    filtersCollapsed: collapsed
  })),

  on(TasklistUIActions.setDetailCollapsed, (state, { collapsed }) => ({
    ...state,
    detailCollapsed: collapsed
  })),

  on(TasklistUIActions.setSearchQuery, (state, { query }) => ({
    ...state,
    searchQuery: query
  })),

  on(TasklistUIActions.addSearchPill, (state, { pill }) => ({
    ...state,
    searchPills: [...state.searchPills, pill]
  })),

  on(TasklistUIActions.removeSearchPill, (state, { index }) => ({
    ...state,
    searchPills: state.searchPills.filter((_, i) => i !== index)
  })),

  on(TasklistUIActions.clearSearchPills, (state) => ({
    ...state,
    searchPills: []
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
