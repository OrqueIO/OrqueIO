import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BatchState } from './batch.state';
import { BatchStatistics } from '../../../models/cockpit/batch.model';

export const selectBatchState = createFeatureSelector<BatchState>('batch');

// ============================================
// RUNTIME BATCHES
// ============================================

export const selectRuntimeState = createSelector(
  selectBatchState,
  (state) => state.runtime
);

export const selectRuntimeBatches = createSelector(
  selectRuntimeState,
  (runtime) => runtime.batches
);

export const selectRuntimeCount = createSelector(
  selectRuntimeState,
  (runtime) => runtime.count
);

export const selectRuntimeLoading = createSelector(
  selectRuntimeState,
  (runtime) => runtime.loading
);

export const selectRuntimeCurrentPage = createSelector(
  selectRuntimeState,
  (runtime) => runtime.currentPage
);

export const selectRuntimePageSize = createSelector(
  selectRuntimeState,
  (runtime) => runtime.pageSize
);

export const selectRuntimeSorting = createSelector(
  selectRuntimeState,
  (runtime) => runtime.sorting
);

export const selectRuntimeUsers = createSelector(
  selectRuntimeState,
  (runtime) => runtime.users
);

// ============================================
// HISTORY BATCHES
// ============================================

export const selectHistoryState = createSelector(
  selectBatchState,
  (state) => state.history
);

export const selectHistoryBatches = createSelector(
  selectHistoryState,
  (history) => history.batches
);

export const selectHistoryCount = createSelector(
  selectHistoryState,
  (history) => history.count
);

export const selectHistoryLoading = createSelector(
  selectHistoryState,
  (history) => history.loading
);

export const selectHistoryCurrentPage = createSelector(
  selectHistoryState,
  (history) => history.currentPage
);

export const selectHistoryPageSize = createSelector(
  selectHistoryState,
  (history) => history.pageSize
);

export const selectHistorySorting = createSelector(
  selectHistoryState,
  (history) => history.sorting
);

export const selectHistoryShouldLoad = createSelector(
  selectHistoryState,
  (history) => history.shouldLoad
);

// ============================================
// SELECTION (Batch Details)
// ============================================

export const selectSelectionState = createSelector(
  selectBatchState,
  (state) => state.selection
);

export const selectSelectedBatch = createSelector(
  selectSelectionState,
  (selection) => selection.batch
);

export const selectSelectionType = createSelector(
  selectSelectionState,
  (selection) => selection.type
);

export const selectSelectionLoading = createSelector(
  selectSelectionState,
  (selection) => selection.loading
);

export const selectSelectionError = createSelector(
  selectSelectionState,
  (selection) => selection.error
);

export const selectIsRuntimeSelection = createSelector(
  selectSelectionType,
  (type) => type === 'runtime'
);

export const selectIsSuspended = createSelector(
  selectSelectedBatch,
  selectIsRuntimeSelection,
  (batch, isRuntime) => {
    if (!batch || !isRuntime) return false;
    return (batch as BatchStatistics).suspended;
  }
);

// ============================================
// FAILED JOBS
// ============================================

export const selectJobsState = createSelector(
  selectBatchState,
  (state) => state.jobs
);

export const selectFailedJobs = createSelector(
  selectJobsState,
  (jobs) => jobs.data
);

export const selectJobsCount = createSelector(
  selectJobsState,
  (jobs) => jobs.count
);

export const selectJobsLoading = createSelector(
  selectJobsState,
  (jobs) => jobs.loading
);

export const selectJobsCurrentPage = createSelector(
  selectJobsState,
  (jobs) => jobs.currentPage
);

export const selectJobsPageSize = createSelector(
  selectJobsState,
  (jobs) => jobs.pageSize
);

export const selectJobsSorting = createSelector(
  selectJobsState,
  (jobs) => jobs.sorting
);

export const selectHasFailedJobs = createSelector(
  selectJobsCount,
  (count) => count > 0
);

// ============================================
// POLLING
// ============================================

export const selectPollingEnabled = createSelector(
  selectBatchState,
  (state) => state.pollingEnabled
);

// ============================================
// GLOBAL
// ============================================

export const selectError = createSelector(
  selectBatchState,
  (state) => state.error
);

// ============================================
// COMPUTED / HELPERS
// ============================================

export const selectBatchJobDefinitionId = createSelector(
  selectSelectedBatch,
  selectIsRuntimeSelection,
  (batch, isRuntime) => {
    if (!batch || !isRuntime) return null;
    return (batch as BatchStatistics).batchJobDefinitionId;
  }
);

/**
 * Calculate progress percentage for a batch
 */
export const selectBatchProgress = createSelector(
  selectSelectedBatch,
  selectIsRuntimeSelection,
  (batch, isRuntime) => {
    if (!batch || !isRuntime) return null;
    const runtimeBatch = batch as BatchStatistics;
    const total = runtimeBatch.completedJobs + runtimeBatch.remainingJobs;
    if (total === 0) return { success: 0, failed: 0, remaining: 100 };

    return {
      success: (100 * runtimeBatch.completedJobs) / total,
      failed: (100 * runtimeBatch.failedJobs) / total,
      remaining: (100 * (runtimeBatch.remainingJobs - runtimeBatch.failedJobs)) / total
    };
  }
);

/**
 * Get user display name for a batch
 */
export const selectUserDisplayName = (userId: string | undefined) =>
  createSelector(selectRuntimeUsers, (users) => {
    if (!userId) return null;
    const user = users[userId];
    if (!user) return userId;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return fullName || user.id;
  });
