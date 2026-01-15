import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, interval } from 'rxjs';
import {
  switchMap,
  map,
  catchError,
  withLatestFrom,
  filter,
  takeUntil,
  exhaustMap
} from 'rxjs/operators';

import { BatchService } from '../../../services/batch.service';
import { NotificationsService } from '../../../services/notifications.service';
import * as BatchActions from './batch.actions';
import * as BatchSelectors from './batch.selectors';
import { BatchStatistics } from '../../../models/cockpit/batch.model';

@Injectable()
export class BatchEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private batchService = inject(BatchService);
  private notifications = inject(NotificationsService);

  // ============================================
  // RUNTIME BATCHES
  // ============================================

  loadRuntimeBatches$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        BatchActions.loadRuntimeBatches,
        BatchActions.setRuntimePage,
        BatchActions.setRuntimeSorting,
        BatchActions.setRuntimeQuery
      ),
      withLatestFrom(this.store.select(BatchSelectors.selectRuntimeState)),
      switchMap(([_, runtime]) => {
        const params = {
          firstResult: (runtime.currentPage - 1) * runtime.pageSize,
          maxResults: runtime.pageSize,
          sortBy: runtime.sorting.sortBy,
          sortOrder: runtime.sorting.sortOrder,
          ...runtime.query
        };

        return this.batchService.loadRuntimeBatches(params).pipe(
          map(({ batches, count, users }) => {
            const usersRecord: Record<string, { id: string; firstName?: string; lastName?: string }> = {};
            users.forEach((user, id) => {
              usersRecord[id] = user;
            });
            return BatchActions.loadRuntimeBatchesSuccess({ batches, count, users: usersRecord });
          }),
          catchError(error => of(BatchActions.loadRuntimeBatchesFailure({ error: error.message })))
        );
      })
    )
  );

  // ============================================
  // HISTORY BATCHES
  // ============================================

  loadHistoryBatches$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        BatchActions.loadHistoryBatches,
        BatchActions.setHistoryPage,
        BatchActions.setHistorySorting,
        BatchActions.enableHistoryLoading
      ),
      withLatestFrom(this.store.select(BatchSelectors.selectHistoryState)),
      filter(([_, history]) => history.shouldLoad),
      switchMap(([_, history]) => {
        const params = {
          firstResult: (history.currentPage - 1) * history.pageSize,
          maxResults: history.pageSize,
          sortBy: history.sorting.sortBy,
          sortOrder: history.sorting.sortOrder,
          completed: true
        };

        return this.batchService.loadHistoryBatches(params).pipe(
          map(({ batches, count }) => BatchActions.loadHistoryBatchesSuccess({ batches, count })),
          catchError(error => of(BatchActions.loadHistoryBatchesFailure({ error: error.message })))
        );
      })
    )
  );

  // ============================================
  // BATCH DETAILS
  // ============================================

  loadBatchDetails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.loadBatchDetails),
      switchMap(({ id, batchType }) =>
        this.batchService.loadBatchDetails(id, batchType).pipe(
          switchMap(batch => {
            if (!batch) {
              // If runtime batch not found, try history
              if (batchType === 'runtime') {
                return of(BatchActions.switchToHistory({ id }));
              }
              return of(BatchActions.loadBatchDetailsFailure({ error: 'Batch not found' }));
            }
            return of(BatchActions.loadBatchDetailsSuccess({ batch, batchType }));
          }),
          catchError(error => {
            // If runtime batch failed, try history
            if (batchType === 'runtime') {
              return of(BatchActions.switchToHistory({ id }));
            }
            return of(BatchActions.loadBatchDetailsFailure({ error: error.message }));
          })
        )
      )
    )
  );

  switchToHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.switchToHistory),
      map(({ id }) => BatchActions.loadBatchDetails({ id, batchType: 'history' }))
    )
  );

  // Load failed jobs after batch details loaded (runtime only)
  loadJobsAfterDetails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.loadBatchDetailsSuccess),
      filter(({ batchType }) => batchType === 'runtime'),
      map(({ batch }) => {
        const runtimeBatch = batch as BatchStatistics;
        return BatchActions.loadFailedJobs({ jobDefinitionId: runtimeBatch.batchJobDefinitionId });
      })
    )
  );

  // ============================================
  // BATCH ACTIONS
  // ============================================

  toggleBatchSuspension$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.toggleBatchSuspension),
      withLatestFrom(this.store.select(BatchSelectors.selectSelectedBatch)),
      switchMap(([{ id, suspended }, _]) =>
        this.batchService.updateBatchSuspensionState(id, suspended).pipe(
          switchMap(() => [
            BatchActions.toggleBatchSuspensionSuccess(),
            BatchActions.loadBatchDetails({ id, batchType: 'runtime' })
          ]),
          catchError(error => of(BatchActions.toggleBatchSuspensionFailure({ error: error.message })))
        )
      )
    )
  );

  deleteBatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.deleteBatch),
      switchMap(({ id, batchType, cascade }) => {
        const delete$ = batchType === 'runtime'
          ? this.batchService.deleteBatch(id, cascade)
          : this.batchService.deleteHistoryBatch(id);

        return delete$.pipe(
          switchMap(() => [
            BatchActions.deleteBatchSuccess(),
            BatchActions.loadRuntimeBatches(),
            BatchActions.loadHistoryBatches()
          ]),
          catchError(error => {
            this.notifications.addError({
              status: 'BATCH_DELETE_ERROR',
              message: error.message
            });
            return of(BatchActions.deleteBatchFailure({ error: error.message }));
          })
        );
      })
    )
  );

  // ============================================
  // FAILED JOBS
  // ============================================

  loadFailedJobs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.loadFailedJobs, BatchActions.setJobsPage, BatchActions.setJobsSorting),
      withLatestFrom(
        this.store.select(BatchSelectors.selectJobsState),
        this.store.select(BatchSelectors.selectSelectedBatch)
      ),
      filter(([_, __, batch]) => !!batch && 'batchJobDefinitionId' in batch),
      switchMap(([action, jobs, batch]) => {
        const runtimeBatch = batch as BatchStatistics;
        const jobDefinitionId = 'jobDefinitionId' in action
          ? action.jobDefinitionId
          : runtimeBatch.batchJobDefinitionId;

        const params = {
          firstResult: (jobs.currentPage - 1) * jobs.pageSize,
          maxResults: jobs.pageSize,
          sorting: [jobs.sorting]
        };

        return this.batchService.getFailedJobs(jobDefinitionId, params).pipe(
          switchMap(jobsData =>
            this.batchService.getFailedJobsCount(jobDefinitionId).pipe(
              map(count => BatchActions.loadFailedJobsSuccess({ jobs: jobsData, count }))
            )
          ),
          catchError(error => of(BatchActions.loadFailedJobsFailure({ error: error.message })))
        );
      })
    )
  );

  // ============================================
  // JOB ACTIONS
  // ============================================

  retryJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.retryJob),
      withLatestFrom(this.store.select(BatchSelectors.selectSelectedBatch)),
      switchMap(([{ jobId }, batch]) =>
        this.batchService.setJobRetries(jobId, 1).pipe(
          switchMap(() => {
            const runtimeBatch = batch as BatchStatistics;
            return [
              BatchActions.retryJobSuccess(),
              BatchActions.loadRuntimeBatches(),
              BatchActions.loadBatchDetails({ id: runtimeBatch.id, batchType: 'runtime' })
            ];
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'JOB_RETRY_ERROR',
              message: error.message
            });
            return of(BatchActions.retryJobFailure({ error: error.message }));
          })
        )
      )
    )
  );

  retryAllJobs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.retryAllJobs),
      withLatestFrom(this.store.select(BatchSelectors.selectSelectedBatch)),
      switchMap(([{ jobDefinitionId }, batch]) =>
        this.batchService.setJobDefinitionRetries(jobDefinitionId, 1).pipe(
          switchMap(() => {
            const runtimeBatch = batch as BatchStatistics;
            return [
              BatchActions.retryAllJobsSuccess(),
              BatchActions.loadRuntimeBatches(),
              BatchActions.loadBatchDetails({ id: runtimeBatch.id, batchType: 'runtime' })
            ];
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'JOB_RETRY_ALL_ERROR',
              message: error.message
            });
            return of(BatchActions.retryAllJobsFailure({ error: error.message }));
          })
        )
      )
    )
  );

  deleteJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.deleteJob),
      withLatestFrom(this.store.select(BatchSelectors.selectSelectedBatch)),
      switchMap(([{ jobId }, batch]) =>
        this.batchService.deleteJob(jobId).pipe(
          switchMap(() => {
            const runtimeBatch = batch as BatchStatistics;
            return [
              BatchActions.deleteJobSuccess(),
              BatchActions.loadRuntimeBatches(),
              BatchActions.loadBatchDetails({ id: runtimeBatch.id, batchType: 'runtime' })
            ];
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'JOB_DELETE_ERROR',
              message: error.message
            });
            return of(BatchActions.deleteJobFailure({ error: error.message }));
          })
        )
      )
    )
  );

  // ============================================
  // POLLING
  // ============================================

  startPolling$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.startPolling),
      switchMap(() =>
        interval(5000).pipe(
          takeUntil(this.actions$.pipe(ofType(BatchActions.stopPolling))),
          withLatestFrom(this.store.select(BatchSelectors.selectPollingEnabled)),
          filter(([_, enabled]) => enabled),
          map(() => BatchActions.pollTick())
        )
      )
    )
  );

  pollTick$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BatchActions.pollTick),
      withLatestFrom(
        this.store.select(BatchSelectors.selectSelectedBatch),
        this.store.select(BatchSelectors.selectSelectionType),
        this.store.select(BatchSelectors.selectJobsCount)
      ),
      exhaustMap(([_, batch, selectionType, jobsCount]) => {
        const actions: any[] = [BatchActions.loadRuntimeBatches()];

        // Also refresh selection if it's a runtime batch with no failed jobs
        if (batch && selectionType === 'runtime' && jobsCount === 0) {
          actions.push(BatchActions.loadBatchDetails({ id: batch.id, batchType: 'runtime' }));
        }

        return actions;
      })
    )
  );
}
