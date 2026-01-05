import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AdminService } from './admin.service';
import {
  ProcessEngine,
  ProcessEngineInfo,
  JobExecutorStatus,
  MetricsQueryParams,
  MetricsAggregatedResult,
  TelemetryData,
  SystemHealth
} from '../../models/admin/system.model';

@Injectable({
  providedIn: 'root'
})
export class SystemService extends AdminService {
  private readonly pluginUrl = '/orqueio/api/admin/plugin/adminPlugins';

  // Current engine subject for engine switching
  private currentEngineSubject = new BehaviorSubject<string>('default');
  public currentEngine$ = this.currentEngineSubject.asObservable();

  /**
   * Get current engine name
   */
  getCurrentEngine(): string {
    return this.currentEngineSubject.value;
  }

  /**
   * Set current engine (for engine switching)
   */
  setCurrentEngine(engineName: string): void {
    this.currentEngineSubject.next(engineName);
  }

  /**
   * Get engine URL for current engine
   */
  private getEngineUrl(engineName?: string): string {
    const engine = engineName || this.getCurrentEngine();
    return `${this.baseUrl}/${engine}`;
  }

  /**
   * Get plugin URL for current engine
   */
  private getPluginUrl(engineName?: string): string {
    const engine = engineName || this.getCurrentEngine();
    return `${this.pluginUrl}/${engine}`;
  }

  /**
   * List all available process engines
   */
  getProcessEngines(): Observable<ProcessEngine[]> {
    return this.get<ProcessEngine[]>(this.baseUrl);
  }

  /**
   * Get process engine info by combining version and telemetry data
   */
  getProcessEngineInfo(engineName?: string): Observable<ProcessEngineInfo> {
    const engine = engineName || this.getCurrentEngine();
    return this.getVersion(engine).pipe(
      map(versionData => ({
        name: engine,
        version: versionData.version || 'unknown'
      })),
      catchError(() => of({
        name: engine,
        version: 'unknown'
      }))
    );
  }

  /**
   * Get system health status
   */
  getSystemHealth(engineName?: string): Observable<SystemHealth> {
    const engine = engineName || this.getCurrentEngine();
    return this.getProcessEngineInfo(engine).pipe(
      map(info => ({
        engineName: engine,
        status: 'running' as const,
        version: info.version
      })),
      catchError(() => of({
        engineName: engine,
        status: 'stopped' as const
      }))
    );
  }

  /**
   * Get job executor status
   */
  getJobExecutorStatus(engineName?: string): Observable<JobExecutorStatus> {
    const url = `${this.getEngineUrl(engineName)}/job-executor`;
    return this.get<JobExecutorStatus>(url).pipe(
      catchError(() => of({ active: false }))
    );
  }

  /**
   * Start job executor
   */
  startJobExecutor(engineName?: string): Observable<void> {
    const url = `${this.getEngineUrl(engineName)}/job-executor/start`;
    return this.post<void>(url, {});
  }

  /**
   * Stop job executor
   */
  stopJobExecutor(engineName?: string): Observable<void> {
    const url = `${this.getEngineUrl(engineName)}/job-executor/stop`;
    return this.post<void>(url, {});
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(params: MetricsQueryParams, engineName?: string): Observable<MetricsAggregatedResult[]> {
    const url = `${this.getPluginUrl(engineName)}/metrics/aggregated`;
    const httpParams = this.buildMetricsParams(params);
    return this.get<MetricsAggregatedResult[]>(url, httpParams);
  }

  /**
   * Build metrics query params
   */
  private buildMetricsParams(params: MetricsQueryParams): HttpParams {
    let httpParams = new HttpParams();

    httpParams = httpParams.set('subscriptionStartDate', params.subscriptionStartDate);
    httpParams = httpParams.set('groupBy', params.groupBy);

    if (params.metrics) {
      httpParams = httpParams.set('metrics', params.metrics);
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }

    return httpParams;
  }

  /**
   * Get telemetry/diagnostics data
   * Returns the complete raw data from the API without filtering
   */
  getTelemetryData(engineName?: string): Observable<TelemetryData> {
    const url = `${this.getEngineUrl(engineName)}/telemetry/data`;
    return this.get<TelemetryData>(url).pipe(
      catchError(error => {
        console.error('Failed to fetch telemetry data:', error);
        return of({} as TelemetryData);
      })
    );
  }

  /**
   * Get version info
   */
  getVersion(engineName?: string): Observable<{ version: string }> {
    const url = `${this.getEngineUrl(engineName)}/version`;
    return this.get<{ version: string }>(url);
  }
}
