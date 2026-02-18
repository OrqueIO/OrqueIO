import { createReducer, on } from '@ngrx/store';
import { BatchState, initialBatchState } from './batch.state';
import * as BatchActions from './batch.actions';

export const batchReducer = createReducer(
  initialBatchState,

  
  // RUNTIME BATCHES
  

  on(BatchActions.loadRuntimeBatches, (state): BatchState => ({
    ...state,
    runtime: {
      ...state.runtime,
      loading: state.runtime.batches.length === 0 ? 'LOADING' : state.runtime.loading
    }
  })),

  on(BatchActions.loadRuntimeBatchesSuccess, (state, { batches, count, users }): BatchState => ({
    ...state,
    runtime: {
      ...state.runtime,
      batches,
      count,
      users,
      loading: count > 0 ? 'LOADED' : 'EMPTY'
    },
    error: null
  })),

  on(BatchActions.loadRuntimeBatchesFailure, (state, { error }): BatchState => ({
    ...state,
    runtime: {
      ...state.runtime,
      loading: 'ERROR'
    },
    error
  })),

  on(BatchActions.setRuntimePage, (state, { page }): BatchState => ({
    ...state,
    runtime: {
      ...state.runtime,
      currentPage: page
    }
  })),

  on(BatchActions.setRuntimeSorting, (state, { sorting }): BatchState => ({
    ...state,
    runtime: {
      ...state.runtime,
      sorting
    }
  })),

  on(BatchActions.setRuntimeQuery, (state, { query }): BatchState => ({
    ...state,
    runtime: {
      ...state.runtime,
      query,
      currentPage: 1
    }
  })),

  
  // HISTORY BATCHES
  

  on(BatchActions.loadHistoryBatches, (state): BatchState => ({
    ...state,
    history: {
      ...state.history,
      loading: state.history.batches.length === 0 ? 'LOADING' : state.history.loading
    }
  })),

  on(BatchActions.loadHistoryBatchesSuccess, (state, { batches, count }): BatchState => ({
    ...state,
    history: {
      ...state.history,
      batches,
      count,
      loading: count > 0 ? 'LOADED' : 'EMPTY'
    },
    error: null
  })),

  on(BatchActions.loadHistoryBatchesFailure, (state, { error }): BatchState => ({
    ...state,
    history: {
      ...state.history,
      loading: 'ERROR'
    },
    error
  })),

  on(BatchActions.setHistoryPage, (state, { page }): BatchState => ({
    ...state,
    history: {
      ...state.history,
      currentPage: page
    }
  })),

  on(BatchActions.setHistorySorting, (state, { sorting }): BatchState => ({
    ...state,
    history: {
      ...state.history,
      sorting
    }
  })),

  on(BatchActions.enableHistoryLoading, (state): BatchState => ({
    ...state,
    history: {
      ...state.history,
      shouldLoad: true
    }
  })),

  
  // BATCH DETAILS (Selection)
  

  on(BatchActions.loadBatchDetails, (state, { batchType }): BatchState => ({
    ...state,
    selection: {
      ...state.selection,
      loading: 'LOADING',
      type: batchType,
      error: null
    }
  })),

  on(BatchActions.loadBatchDetailsSuccess, (state, { batch, batchType }): BatchState => ({
    ...state,
    selection: {
      batch,
      type: batchType,
      loading: 'LOADED',
      error: null
    }
  })),

  on(BatchActions.loadBatchDetailsFailure, (state, { error }): BatchState => ({
    ...state,
    selection: {
      ...state.selection,
      loading: 'ERROR',
      error
    }
  })),

  on(BatchActions.switchToHistory, (state): BatchState => ({
    ...state,
    selection: {
      ...state.selection,
      type: 'history',
      loading: 'LOADING'
    }
  })),

  on(BatchActions.clearSelection, (state): BatchState => ({
    ...state,
    selection: {
      batch: null,
      type: null,
      loading: 'INITIAL',
      error: null
    },
    jobs: {
      ...state.jobs,
      data: [],
      count: 0,
      loading: 'INITIAL'
    }
  })),

  
  // BATCH ACTIONS
  

  on(BatchActions.toggleBatchSuspension, (state): BatchState => ({
    ...state,
    selection: {
      ...state.selection,
      loading: 'LOADING'
    }
  })),

  on(BatchActions.toggleBatchSuspensionSuccess, (state): BatchState => ({
    ...state
  })),

  on(BatchActions.toggleBatchSuspensionFailure, (state, { error }): BatchState => ({
    ...state,
    error
  })),

  on(BatchActions.deleteBatchSuccess, (state): BatchState => ({
    ...state,
    selection: {
      batch: null,
      type: null,
      loading: 'INITIAL',
      error: null
    },
    jobs: {
      ...state.jobs,
      data: [],
      count: 0,
      loading: 'INITIAL'
    }
  })),

  on(BatchActions.deleteBatchFailure, (state, { error }): BatchState => ({
    ...state,
    error
  })),

  
  // FAILED JOBS
  

  on(BatchActions.loadFailedJobs, (state): BatchState => ({
    ...state,
    jobs: {
      ...state.jobs,
      loading: 'LOADING'
    }
  })),

  on(BatchActions.loadFailedJobsSuccess, (state, { jobs, count }): BatchState => ({
    ...state,
    jobs: {
      ...state.jobs,
      data: jobs,
      count,
      loading: count > 0 ? 'LOADED' : 'EMPTY'
    }
  })),

  on(BatchActions.loadFailedJobsFailure, (state, { error }): BatchState => ({
    ...state,
    jobs: {
      ...state.jobs,
      loading: 'ERROR'
    },
    error
  })),

  on(BatchActions.setJobsPage, (state, { page }): BatchState => ({
    ...state,
    jobs: {
      ...state.jobs,
      currentPage: page
    }
  })),

  on(BatchActions.setJobsSorting, (state, { sorting }): BatchState => ({
    ...state,
    jobs: {
      ...state.jobs,
      sorting
    }
  })),

  
  // JOB ACTIONS (no state changes, handled by effects)
  

  on(BatchActions.retryJobFailure, (state, { error }): BatchState => ({
    ...state,
    error
  })),

  on(BatchActions.retryAllJobsFailure, (state, { error }): BatchState => ({
    ...state,
    error
  })),

  on(BatchActions.deleteJobFailure, (state, { error }): BatchState => ({
    ...state,
    error
  })),

  
  // POLLING
  

  on(BatchActions.startPolling, (state): BatchState => ({
    ...state,
    pollingEnabled: true
  })),

  on(BatchActions.stopPolling, (state): BatchState => ({
    ...state,
    pollingEnabled: false
  })),

  
  // GLOBAL
  

  on(BatchActions.clearError, (state): BatchState => ({
    ...state,
    error: null
  }))
);
