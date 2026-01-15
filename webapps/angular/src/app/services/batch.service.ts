import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  BatchStatistics,
  HistoryBatch,
  BatchJob,
  BatchQueryParams,
  HistoryBatchQueryParams,
  JobQueryParams,
  CountResult,
  BatchSorting
} from '../models/cockpit/batch.model';

interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BatchService {
  private readonly baseUrl = '/orqueio/api/engine/engine/default';

  constructor(private http: HttpClient) {}

  // ============================================
  // RUNTIME BATCHES (Active)
  // ============================================

  /**
   * Get batch statistics (runtime batches with progress info)
   */
  getBatchStatistics(params: BatchQueryParams = {}): Observable<BatchStatistics[]> {
    let httpParams = this.buildParams(params);

    return this.http.get<BatchStatistics[]>(
      `${this.baseUrl}/batch/statistics`,
      { params: httpParams }
    ).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Get batch statistics count
   */
  getBatchStatisticsCount(params: BatchQueryParams = {}): Observable<number> {
    let httpParams = this.buildParams(params, true);

    return this.http.get<CountResult>(
      `${this.baseUrl}/batch/statistics/count`,
      { params: httpParams }
    ).pipe(
      map(result => result.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get single batch by ID
   */
  getBatch(id: string): Observable<BatchStatistics | null> {
    return this.http.get<BatchStatistics[]>(
      `${this.baseUrl}/batch/statistics`,
      { params: new HttpParams().set('batchId', id).set('maxResults', '1') }
    ).pipe(
      map(batches => batches.length > 0 ? batches[0] : null),
      catchError(() => of(null))
    );
  }

  /**
   * Suspend or activate a batch
   */
  updateBatchSuspensionState(id: string, suspended: boolean): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/batch/${id}/suspended`,
      { suspended }
    );
  }

  /**
   * Delete a runtime batch
   */
  deleteBatch(id: string, cascade: boolean = false): Observable<void> {
    let params = new HttpParams();
    if (cascade) {
      params = params.set('cascade', 'true');
    }
    return this.http.delete<void>(
      `${this.baseUrl}/batch/${id}`,
      { params }
    );
  }

  // ============================================
  // HISTORY BATCHES (Completed)
  // ============================================

  /**
   * Get history batches (completed)
   */
  getHistoryBatches(params: HistoryBatchQueryParams = {}): Observable<HistoryBatch[]> {
    let httpParams = this.buildParams(params);

    return this.http.get<HistoryBatch[]>(
      `${this.baseUrl}/history/batch`,
      { params: httpParams }
    ).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Get history batches count
   */
  getHistoryBatchesCount(params: HistoryBatchQueryParams = {}): Observable<number> {
    let httpParams = this.buildParams(params, true);

    return this.http.get<CountResult>(
      `${this.baseUrl}/history/batch/count`,
      { params: httpParams }
    ).pipe(
      map(result => result.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get single history batch by ID
   */
  getHistoryBatch(id: string): Observable<HistoryBatch | null> {
    return this.http.get<HistoryBatch>(
      `${this.baseUrl}/history/batch/${id}`
    ).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Delete a history batch
   */
  deleteHistoryBatch(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/history/batch/${id}`
    );
  }

  // ============================================
  // JOBS (Failed jobs in batch)
  // ============================================

  /**
   * Get failed jobs for a batch
   */
  getFailedJobs(jobDefinitionId: string, params: JobQueryParams = {}): Observable<BatchJob[]> {
    const body = {
      jobDefinitionId,
      withException: true,
      noRetriesLeft: true,
      sorting: params.sorting || [{ sortBy: 'jobId', sortOrder: 'asc' }],
      ...params
    };

    return this.http.post<BatchJob[]>(
      `${this.baseUrl}/job`,
      body
    ).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Get failed jobs count
   */
  getFailedJobsCount(jobDefinitionId: string): Observable<number> {
    const body = {
      jobDefinitionId,
      withException: true,
      noRetriesLeft: true
    };

    return this.http.post<CountResult>(
      `${this.baseUrl}/job/count`,
      body
    ).pipe(
      map(result => result.count),
      catchError(() => of(0))
    );
  }

  /**
   * Set job retries (retry a failed job)
   */
  setJobRetries(jobId: string, retries: number = 1): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/job/${jobId}/retries`,
      { retries }
    );
  }

  /**
   * Set job definition retries (retry all jobs)
   */
  setJobDefinitionRetries(jobDefinitionId: string, retries: number = 1): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/job-definition/${jobDefinitionId}/retries`,
      { retries }
    );
  }

  /**
   * Delete a job
   */
  deleteJob(jobId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/job/${jobId}`
    );
  }

  /**
   * Get job stacktrace URL
   */
  getJobStacktraceUrl(jobId: string): string {
    return `${this.baseUrl}/job/${jobId}/stacktrace`;
  }

  /**
   * Get job log entries
   */
  getJobLog(jobId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/history/job-log`,
      { params: new HttpParams().set('jobId', jobId).set('sortBy', 'timestamp').set('sortOrder', 'desc') }
    ).pipe(
      catchError(() => of([]))
    );
  }

  // ============================================
  // USERS (for enrichment)
  // ============================================

  /**
   * Get user profiles for batch creators
   */
  getUserProfiles(userIds: string[]): Observable<Map<string, UserProfile>> {
    if (userIds.length === 0) {
      return of(new Map());
    }

    const uniqueIds = [...new Set(userIds)].filter(id => id);
    if (uniqueIds.length === 0) {
      return of(new Map());
    }

    return this.http.get<UserProfile[]>(
      `${this.baseUrl}/user`,
      { params: new HttpParams().set('idIn', uniqueIds.join(',')).set('maxResults', String(uniqueIds.length)) }
    ).pipe(
      map(users => {
        const userMap = new Map<string, UserProfile>();
        users.forEach(user => userMap.set(user.id, user));
        return userMap;
      }),
      catchError(() => of(new Map()))
    );
  }

  /**
   * Get single user profile
   */
  getUserProfile(userId: string): Observable<UserProfile | null> {
    return this.http.get<UserProfile>(
      `${this.baseUrl}/user/${userId}/profile`
    ).pipe(
      catchError(() => of(null))
    );
  }

  // ============================================
  // COMBINED LOADERS
  // ============================================

  /**
   * Load runtime batches with count and user enrichment
   */
  loadRuntimeBatches(params: BatchQueryParams = {}): Observable<{
    batches: BatchStatistics[];
    count: number;
    users: Map<string, UserProfile>;
  }> {
    return forkJoin({
      batches: this.getBatchStatistics(params),
      count: this.getBatchStatisticsCount(params)
    }).pipe(
      switchMap(({ batches, count }) => {
        const userIds = batches.map(b => b.createUserId).filter((id): id is string => !!id);
        return this.getUserProfiles(userIds).pipe(
          map(users => ({ batches, count, users }))
        );
      })
    );
  }

  /**
   * Load history batches with count
   */
  loadHistoryBatches(params: HistoryBatchQueryParams = {}): Observable<{
    batches: HistoryBatch[];
    count: number;
  }> {
    return forkJoin({
      batches: this.getHistoryBatches({ ...params, completed: true }),
      count: this.getHistoryBatchesCount({ ...params, completed: true })
    });
  }

  /**
   * Load batch details with user info
   */
  loadBatchDetails(id: string, type: 'runtime' | 'history'): Observable<BatchStatistics | HistoryBatch | null> {
    if (type === 'runtime') {
      return this.getBatch(id).pipe(
        switchMap(batch => {
          if (!batch || !batch.createUserId) {
            return of(batch);
          }
          return this.getUserProfile(batch.createUserId).pipe(
            map(user => {
              if (user) {
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                return { ...batch, user: fullName || user.id };
              }
              return { ...batch, user: batch.createUserId };
            })
          );
        })
      );
    } else {
      return this.getHistoryBatch(id).pipe(
        switchMap(batch => {
          if (!batch || !batch.createUserId) {
            return of(batch);
          }
          return this.getUserProfile(batch.createUserId).pipe(
            map(user => {
              if (user) {
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                return { ...batch, user: fullName || user.id };
              }
              return { ...batch, user: batch.createUserId };
            })
          );
        })
      );
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private buildParams(params: Record<string, any>, excludePagination: boolean = false): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (excludePagination && (key === 'firstResult' || key === 'maxResults' || key === 'sorting')) return;

      if (Array.isArray(value)) {
        httpParams = httpParams.set(key, value.join(','));
      } else if (typeof value === 'object') {
        // Skip complex objects for now
      } else {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }
}
