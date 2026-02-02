import { createAction, props } from '@ngrx/store';
import {
  BatchStatistics,
  HistoryBatch,
  BatchJob,
  BatchSorting,
  BatchQueryParams
} from '../../../models/cockpit/batch.model';
import { UserProfile } from './batch.state';


// RUNTIME BATCHES


export const loadRuntimeBatches = createAction(
  '[Batch] Load Runtime Batches'
);

export const loadRuntimeBatchesSuccess = createAction(
  '[Batch] Load Runtime Batches Success',
  props<{ batches: BatchStatistics[]; count: number; users: Record<string, UserProfile> }>()
);

export const loadRuntimeBatchesFailure = createAction(
  '[Batch] Load Runtime Batches Failure',
  props<{ error: string }>()
);

export const setRuntimePage = createAction(
  '[Batch] Set Runtime Page',
  props<{ page: number }>()
);

export const setRuntimeSorting = createAction(
  '[Batch] Set Runtime Sorting',
  props<{ sorting: BatchSorting }>()
);

export const setRuntimeQuery = createAction(
  '[Batch] Set Runtime Query',
  props<{ query: Record<string, any> }>()
);


// HISTORY BATCHES


export const loadHistoryBatches = createAction(
  '[Batch] Load History Batches'
);

export const loadHistoryBatchesSuccess = createAction(
  '[Batch] Load History Batches Success',
  props<{ batches: HistoryBatch[]; count: number }>()
);

export const loadHistoryBatchesFailure = createAction(
  '[Batch] Load History Batches Failure',
  props<{ error: string }>()
);

export const setHistoryPage = createAction(
  '[Batch] Set History Page',
  props<{ page: number }>()
);

export const setHistorySorting = createAction(
  '[Batch] Set History Sorting',
  props<{ sorting: BatchSorting }>()
);

export const enableHistoryLoading = createAction(
  '[Batch] Enable History Loading'
);


// BATCH DETAILS (Selection)


export const loadBatchDetails = createAction(
  '[Batch] Load Batch Details',
  props<{ id: string; batchType: 'runtime' | 'history' }>()
);

export const loadBatchDetailsSuccess = createAction(
  '[Batch] Load Batch Details Success',
  props<{ batch: BatchStatistics | HistoryBatch; batchType: 'runtime' | 'history' }>()
);

export const loadBatchDetailsFailure = createAction(
  '[Batch] Load Batch Details Failure',
  props<{ error: string }>()
);

export const switchToHistory = createAction(
  '[Batch] Switch To History',
  props<{ id: string }>()
);

export const clearSelection = createAction(
  '[Batch] Clear Selection'
);


// BATCH ACTIONS


export const toggleBatchSuspension = createAction(
  '[Batch] Toggle Batch Suspension',
  props<{ id: string; suspended: boolean }>()
);

export const toggleBatchSuspensionSuccess = createAction(
  '[Batch] Toggle Batch Suspension Success'
);

export const toggleBatchSuspensionFailure = createAction(
  '[Batch] Toggle Batch Suspension Failure',
  props<{ error: string }>()
);

export const deleteBatch = createAction(
  '[Batch] Delete Batch',
  props<{ id: string; batchType: 'runtime' | 'history'; cascade?: boolean }>()
);

export const deleteBatchSuccess = createAction(
  '[Batch] Delete Batch Success'
);

export const deleteBatchFailure = createAction(
  '[Batch] Delete Batch Failure',
  props<{ error: string }>()
);


// FAILED JOBS


export const loadFailedJobs = createAction(
  '[Batch] Load Failed Jobs',
  props<{ jobDefinitionId: string }>()
);

export const loadFailedJobsSuccess = createAction(
  '[Batch] Load Failed Jobs Success',
  props<{ jobs: BatchJob[]; count: number }>()
);

export const loadFailedJobsFailure = createAction(
  '[Batch] Load Failed Jobs Failure',
  props<{ error: string }>()
);

export const setJobsPage = createAction(
  '[Batch] Set Jobs Page',
  props<{ page: number }>()
);

export const setJobsSorting = createAction(
  '[Batch] Set Jobs Sorting',
  props<{ sorting: BatchSorting }>()
);


// JOB ACTIONS


export const retryJob = createAction(
  '[Batch] Retry Job',
  props<{ jobId: string }>()
);

export const retryJobSuccess = createAction(
  '[Batch] Retry Job Success'
);

export const retryJobFailure = createAction(
  '[Batch] Retry Job Failure',
  props<{ error: string }>()
);

export const retryAllJobs = createAction(
  '[Batch] Retry All Jobs',
  props<{ jobDefinitionId: string }>()
);

export const retryAllJobsSuccess = createAction(
  '[Batch] Retry All Jobs Success'
);

export const retryAllJobsFailure = createAction(
  '[Batch] Retry All Jobs Failure',
  props<{ error: string }>()
);

export const deleteJob = createAction(
  '[Batch] Delete Job',
  props<{ jobId: string }>()
);

export const deleteJobSuccess = createAction(
  '[Batch] Delete Job Success'
);

export const deleteJobFailure = createAction(
  '[Batch] Delete Job Failure',
  props<{ error: string }>()
);


// POLLING


export const startPolling = createAction(
  '[Batch] Start Polling'
);

export const stopPolling = createAction(
  '[Batch] Stop Polling'
);

export const pollTick = createAction(
  '[Batch] Poll Tick'
);


// GLOBAL


export const clearError = createAction(
  '[Batch] Clear Error'
);
