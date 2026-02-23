import {
  BatchStatistics,
  HistoryBatch,
  BatchJob,
  BatchSorting,
  LoadingState
} from '../../../models/cockpit/batch.model';

export interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
}

export interface BatchState {
  // Runtime batches
  runtime: {
    batches: BatchStatistics[];
    count: number;
    loading: LoadingState;
    currentPage: number;
    pageSize: number;
    sorting: BatchSorting;
    query: Record<string, any>;
    users: Record<string, UserProfile>;
  };

  // History batches
  history: {
    batches: HistoryBatch[];
    count: number;
    loading: LoadingState;
    currentPage: number;
    pageSize: number;
    sorting: BatchSorting;
    shouldLoad: boolean;
  };

  // Selected batch details
  selection: {
    batch: BatchStatistics | HistoryBatch | null;
    type: 'runtime' | 'history' | null;
    loading: LoadingState;
    error: string | null;
  };

  // Failed jobs for selected batch
  jobs: {
    data: BatchJob[];
    count: number;
    loading: LoadingState;
    currentPage: number;
    pageSize: number;
    sorting: BatchSorting;
  };

  // Polling
  pollingEnabled: boolean;

  // Global error
  error: string | null;
}

export const initialBatchState: BatchState = {
  runtime: {
    batches: [],
    count: 0,
    loading: 'INITIAL',
    currentPage: 1,
    pageSize: 10,
    sorting: { sortBy: 'batchId', sortOrder: 'asc' },
    query: {},
    users: {}
  },

  history: {
    batches: [],
    count: 0,
    loading: 'INITIAL',
    currentPage: 1,
    pageSize: 10,
    sorting: { sortBy: 'startTime', sortOrder: 'desc' },
    shouldLoad: false
  },

  selection: {
    batch: null,
    type: null,
    loading: 'INITIAL',
    error: null
  },

  jobs: {
    data: [],
    count: 0,
    loading: 'INITIAL',
    currentPage: 1,
    pageSize: 10,
    sorting: { sortBy: 'jobId', sortOrder: 'asc' }
  },

  pollingEnabled: false,
  error: null
};
