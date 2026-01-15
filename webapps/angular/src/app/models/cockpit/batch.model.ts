/**
 * Batch Model - Batch operations interfaces for Camunda 7
 */

/**
 * Runtime Batch Statistics - active batch operations
 */
export interface BatchStatistics {
  id: string;
  type: string;
  totalJobs: number;
  jobsCreated: number;
  batchJobsPerSeed: number;
  invocationsPerBatchJob: number;
  seedJobDefinitionId: string;
  monitorJobDefinitionId: string;
  batchJobDefinitionId: string;
  suspended: boolean;
  tenantId?: string;
  createUserId?: string;
  startTime?: string;
  executionStartTime?: string;
  // Statistics fields
  remainingJobs: number;
  completedJobs: number;
  failedJobs: number;
  // UI enrichment
  user?: string;
}

/**
 * History Batch - completed batch operations
 */
export interface HistoryBatch {
  id: string;
  type: string;
  totalJobs: number;
  batchJobsPerSeed: number;
  invocationsPerBatchJob: number;
  seedJobDefinitionId: string;
  monitorJobDefinitionId: string;
  batchJobDefinitionId: string;
  tenantId?: string;
  createUserId?: string;
  startTime: string;
  executionStartTime?: string;
  endTime: string;
  removalTime?: string;
  // UI enrichment
  user?: string;
}

/**
 * Job with exception - failed job in batch
 */
export interface BatchJob {
  id: string;
  jobDefinitionId: string;
  processInstanceId?: string;
  processDefinitionId?: string;
  processDefinitionKey?: string;
  executionId?: string;
  exceptionMessage?: string;
  failedActivityId?: string;
  retries: number;
  dueDate?: string;
  suspended: boolean;
  priority: number;
  tenantId?: string;
  createTime?: string;
}

/**
 * Query params for batch statistics
 */
export interface BatchQueryParams {
  // Pagination
  firstResult?: number;
  maxResults?: number;
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Filters
  batchId?: string;
  type?: string;
  tenantIdIn?: string[];
  withoutTenantId?: boolean;
  suspended?: boolean;
  createdBy?: string;
  startedBefore?: string;
  startedAfter?: string;
  withFailures?: boolean;
  withoutFailures?: boolean;
}

/**
 * Query params for history batches
 */
export interface HistoryBatchQueryParams {
  // Pagination
  firstResult?: number;
  maxResults?: number;
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Filters
  batchId?: string;
  type?: string;
  completed?: boolean;
  tenantIdIn?: string[];
  withoutTenantId?: boolean;
}

/**
 * Query params for failed jobs
 */
export interface JobQueryParams {
  // Pagination
  firstResult?: number;
  maxResults?: number;
  // Sorting
  sorting?: JobSorting[];
  // Filters
  jobDefinitionId?: string;
  withException?: boolean;
  noRetriesLeft?: boolean;
}

export interface JobSorting {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Batch delete params
 */
export interface BatchDeleteParams {
  id: string;
  cascade?: boolean;
}

/**
 * Count response
 */
export interface CountResult {
  count: number;
}

/**
 * Sorting configuration
 */
export interface BatchSorting {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Batch state types
 */
export type LoadingState = 'INITIAL' | 'LOADING' | 'LOADED' | 'EMPTY' | 'ERROR';

/**
 * Batch type labels mapping
 */
export const BATCH_TYPE_LABELS: Record<string, string> = {
  'instance-migration': 'BATCH_TYPE_MIGRATION',
  'instance-modification': 'BATCH_TYPE_MODIFICATION',
  'instance-deletion': 'BATCH_TYPE_DELETION',
  'instance-update-suspension-state': 'BATCH_TYPE_SUSPENSION',
  'set-job-retries': 'BATCH_TYPE_SET_JOB_RETRIES',
  'set-external-task-retries': 'BATCH_TYPE_SET_EXTERNAL_TASK_RETRIES',
  'process-set-removal-time': 'BATCH_TYPE_SET_REMOVAL_TIME',
  'decision-set-removal-time': 'BATCH_TYPE_DECISION_SET_REMOVAL_TIME',
  'batch-set-removal-time': 'BATCH_TYPE_BATCH_SET_REMOVAL_TIME',
  'set-variables': 'BATCH_TYPE_SET_VARIABLES',
  'correlate-message': 'BATCH_TYPE_CORRELATE_MESSAGE'
};

/**
 * Sortable keys for batch details
 */
export const BATCH_DETAIL_KEYS = [
  'id',
  'type',
  'startTime',
  'executionStartTime',
  'endTime',
  'totalJobs',
  'completedJobs',
  'remainingJobs',
  'failedJobs',
  'batchJobsPerSeed',
  'invocationsPerBatchJob',
  'tenantId',
  'batchJobDefinitionId',
  'monitorJobDefinitionId',
  'seedJobDefinitionId'
];
