import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  TasklistState,
  TasksState,
  FiltersState,
  TaskDetailState,
  TasklistUIState,
  tasksAdapter,
  filtersAdapter
} from './tasklist.state';

// ==================== FEATURE SELECTOR ====================

export const selectTasklistState = createFeatureSelector<TasklistState>('tasklist');

// ==================== TASKS SELECTORS ====================

export const selectTasksState = createSelector(
  selectTasklistState,
  (state) => state.tasks
);

const { selectAll: selectAllTasksFromAdapter, selectEntities: selectTaskEntitiesFromAdapter } =
  tasksAdapter.getSelectors();

export const selectAllTasks = createSelector(
  selectTasksState,
  selectAllTasksFromAdapter
);

export const selectTaskEntities = createSelector(
  selectTasksState,
  selectTaskEntitiesFromAdapter
);

export const selectSelectedTaskId = createSelector(
  selectTasksState,
  (state) => state.selectedTaskId
);

export const selectSelectedTask = createSelector(
  selectTaskEntities,
  selectSelectedTaskId,
  (entities, selectedId) => selectedId ? entities[selectedId] ?? null : null
);

export const selectTasksLoading = createSelector(
  selectTasksState,
  (state) => state.loading
);

export const selectTasksError = createSelector(
  selectTasksState,
  (state) => state.error
);

export const selectTasksTotal = createSelector(
  selectTasksState,
  (state) => state.total
);

export const selectTasksQueryParams = createSelector(
  selectTasksState,
  (state) => state.queryParams
);

export const selectCurrentPage = createSelector(
  selectTasksQueryParams,
  (params) => {
    const firstResult = params.firstResult || 0;
    const maxResults = params.maxResults || 15;
    return Math.floor(firstResult / maxResults) + 1;
  }
);

export const selectPageSize = createSelector(
  selectTasksQueryParams,
  (params) => params.maxResults || 15
);

export const selectTasksSorting = createSelector(
  selectTasksQueryParams,
  (params) => params.sorting || []
);

// ==================== FILTERS SELECTORS ====================

export const selectFiltersState = createSelector(
  selectTasklistState,
  (state) => state.filters
);

const { selectAll: selectAllFiltersFromAdapter, selectEntities: selectFilterEntitiesFromAdapter } =
  filtersAdapter.getSelectors();

// Filters sorted by priority (ascending - lower priority number comes first)
export const selectAllFilters = createSelector(
  selectFiltersState,
  (state) => {
    const filters = selectAllFiltersFromAdapter(state);
    return [...filters].sort((a, b) => {
      const priorityA = a.properties?.priority ?? 0;
      const priorityB = b.properties?.priority ?? 0;
      return priorityA - priorityB;
    });
  }
);

export const selectFilterEntities = createSelector(
  selectFiltersState,
  selectFilterEntitiesFromAdapter
);

export const selectSelectedFilterId = createSelector(
  selectFiltersState,
  (state) => state.selectedFilterId
);

export const selectSelectedFilter = createSelector(
  selectFilterEntities,
  selectSelectedFilterId,
  (entities, selectedId) => selectedId ? entities[selectedId] ?? null : null
);

export const selectSelectedFilterCount = createSelector(
  selectFiltersState,
  (state) => state.selectedFilterCount
);

export const selectFiltersLoading = createSelector(
  selectFiltersState,
  (state) => state.loading
);

export const selectFiltersError = createSelector(
  selectFiltersState,
  (state) => state.error
);

export const selectCanCreateFilter = createSelector(
  selectFiltersState,
  (state) => state.canCreate
);

// ==================== TASK DETAIL SELECTORS ====================

export const selectTaskDetailState = createSelector(
  selectTasklistState,
  (state) => state.taskDetail
);

export const selectTaskDetail = createSelector(
  selectTaskDetailState,
  (state) => state.task
);

export const selectTaskForm = createSelector(
  selectTaskDetailState,
  (state) => state.form
);

export const selectTaskComments = createSelector(
  selectTaskDetailState,
  (state) => state.comments
);

export const selectTaskHistory = createSelector(
  selectTaskDetailState,
  (state) => state.history
);

export const selectTaskIdentityLinks = createSelector(
  selectTaskDetailState,
  (state) => state.identityLinks
);

export const selectTaskDetailLoading = createSelector(
  selectTaskDetailState,
  (state) => state.loading
);

export const selectTaskDetailError = createSelector(
  selectTaskDetailState,
  (state) => state.error
);

export const selectActiveTab = createSelector(
  selectTaskDetailState,
  (state) => state.activeTab
);

// Derived selectors for identity links
export const selectTaskCandidateGroups = createSelector(
  selectTaskIdentityLinks,
  (links) => links.filter(l => l.type === 'candidate' && l.groupId)
);

export const selectTaskCandidateUsers = createSelector(
  selectTaskIdentityLinks,
  (links) => links.filter(l => l.type === 'candidate' && l.userId)
);

// ==================== UI SELECTORS ====================

export const selectUIState = createSelector(
  selectTasklistState,
  (state) => state.ui
);

export const selectFiltersCollapsed = createSelector(
  selectUIState,
  (state) => state.filtersCollapsed
);

export const selectDetailCollapsed = createSelector(
  selectUIState,
  (state) => state.detailCollapsed
);

export const selectSearchQuery = createSelector(
  selectUIState,
  (state) => state.searchQuery
);

export const selectSearchPills = createSelector(
  selectUIState,
  (state) => state.searchPills
);

// ==================== COMBINED SELECTORS ====================

export const selectTasklistViewModel = createSelector(
  selectAllTasks,
  selectTasksTotal,
  selectTasksLoading,
  selectSelectedTaskId,
  selectCurrentPage,
  selectPageSize,
  selectAllFilters,
  selectSelectedFilterId,
  selectSelectedFilterCount,
  selectFiltersCollapsed,
  selectDetailCollapsed,
  (tasks, total, loading, selectedTaskId, page, pageSize, filters, selectedFilterId, filterCount, filtersCollapsed, detailCollapsed) => ({
    tasks,
    total,
    loading,
    selectedTaskId,
    page,
    pageSize,
    filters,
    selectedFilterId,
    filterCount,
    filtersCollapsed,
    detailCollapsed
  })
);
