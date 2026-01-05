import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { SystemService } from '../../../services/admin/system.service';
import { NotificationsService } from '../../../services/notifications.service';
import * as SystemActions from './system.actions';
import * as SystemSelectors from './system.selectors';
import {
  ProcessedMetric,
  MetricValue,
  MetricType,
  METRIC_KEYS
} from '../../../models/admin/system.model';

@Injectable()
export class SystemEffects {
  private actions$ = inject(Actions);
  private systemService = inject(SystemService);
  private notifications = inject(NotificationsService);
  private store = inject(Store);

  // =====================
  // Process Engines
  // =====================

  loadEngines$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.loadEngines),
      switchMap(() =>
        this.systemService.getProcessEngines().pipe(
          map(engines => SystemActions.loadEnginesSuccess({ engines })),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.system.loadEnginesError',
              message: 'Failed to load process engines'
            });
            return of(SystemActions.loadEnginesFailure({ error }));
          })
        )
      )
    )
  );

  setCurrentEngine$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.setCurrentEngine),
      tap(({ engineName }) => {
        this.systemService.setCurrentEngine(engineName);
      })
    ),
    { dispatch: false }
  );

  // =====================
  // Engine Info
  // =====================

  loadEngineInfo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.loadEngineInfo),
      switchMap(({ engineName }) =>
        this.systemService.getProcessEngineInfo(engineName).pipe(
          map(engineInfo => SystemActions.loadEngineInfoSuccess({ engineInfo })),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.system.loadEngineInfoError',
              message: 'Failed to load engine info'
            });
            return of(SystemActions.loadEngineInfoFailure({ error }));
          })
        )
      )
    )
  );

  // =====================
  // Job Executor
  // =====================

  loadJobExecutorStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.loadJobExecutorStatus),
      switchMap(({ engineName }) =>
        this.systemService.getJobExecutorStatus(engineName).pipe(
          map(status => SystemActions.loadJobExecutorStatusSuccess({ status })),
          catchError(error => of(SystemActions.loadJobExecutorStatusFailure({ error })))
        )
      )
    )
  );

  startJobExecutor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.startJobExecutor),
      switchMap(({ engineName }) =>
        this.systemService.startJobExecutor(engineName).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.system.jobExecutorStarted',
              'Job executor started successfully'
            );
            return SystemActions.startJobExecutorSuccess();
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.system.startJobExecutorError',
              message: 'Failed to start job executor'
            });
            return of(SystemActions.startJobExecutorFailure({ error }));
          })
        )
      )
    )
  );

  stopJobExecutor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.stopJobExecutor),
      switchMap(({ engineName }) =>
        this.systemService.stopJobExecutor(engineName).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.system.jobExecutorStopped',
              'Job executor stopped successfully'
            );
            return SystemActions.stopJobExecutorSuccess();
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.system.stopJobExecutorError',
              message: 'Failed to stop job executor'
            });
            return of(SystemActions.stopJobExecutorFailure({ error }));
          })
        )
      )
    )
  );

  // Reload status after start/stop
  reloadJobExecutorStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.startJobExecutorSuccess, SystemActions.stopJobExecutorSuccess),
      map(() => SystemActions.loadJobExecutorStatus({}))
    )
  );

  // =====================
  // Metrics
  // =====================

  loadMonthlyMetrics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.loadMonthlyMetrics),
      switchMap(({ startDate, displayLegacy }) => {
        const activeYear = this.calculateActiveYear(startDate);
        const prevSubStart = this.formatDate(this.subtractYear(activeYear));
        const curSubStart = this.formatDate(activeYear);

        let requestMetrics = [METRIC_KEYS.PI, METRIC_KEYS.DI];
        if (displayLegacy) {
          requestMetrics.push(METRIC_KEYS.FNI, METRIC_KEYS.EDE);
        }

        return forkJoin([
          // Load regular metrics (non-TU)
          this.systemService.getAggregatedMetrics({
            subscriptionStartDate: startDate,
            groupBy: 'month',
            metrics: requestMetrics.join(','),
            startDate: prevSubStart
          }),
          // Load TU metrics for current subscription year
          this.systemService.getAggregatedMetrics({
            subscriptionStartDate: startDate,
            groupBy: 'month',
            metrics: METRIC_KEYS.TU,
            startDate: curSubStart
          }),
          // Load TU metrics for previous subscription year
          this.systemService.getAggregatedMetrics({
            subscriptionStartDate: startDate,
            groupBy: 'month',
            metrics: METRIC_KEYS.TU,
            startDate: prevSubStart,
            endDate: curSubStart
          })
        ]).pipe(
          map(([regularMetrics, tuMetricsCurrent, tuMetricsPrev]) => {
            const allMetrics = [...regularMetrics, ...tuMetricsCurrent, ...tuMetricsPrev];
            const processedMetrics = this.processMonthlyMetrics(allMetrics, startDate, activeYear);
            return SystemActions.loadMonthlyMetricsSuccess({ metrics: processedMetrics });
          }),
          catchError(error => {
            const errorMsg = this.getApiError(error);
            return of(SystemActions.loadMonthlyMetricsFailure({ error: errorMsg }));
          })
        );
      })
    )
  );

  loadAnnualMetrics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.loadAnnualMetrics),
      switchMap(({ startDate }) =>
        this.systemService.getAggregatedMetrics({
          subscriptionStartDate: startDate,
          groupBy: 'year'
        }).pipe(
          map(metrics => {
            const processedMetrics = this.processAnnualMetrics(metrics, startDate);
            return SystemActions.loadAnnualMetricsSuccess({ metrics: processedMetrics });
          }),
          catchError(error => {
            const errorMsg = this.getApiError(error);
            return of(SystemActions.loadAnnualMetricsFailure({ error: errorMsg }));
          })
        )
      )
    )
  );

  // =====================
  // Telemetry
  // =====================

  loadTelemetryData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SystemActions.loadTelemetryData),
      switchMap(({ engineName }) =>
        this.systemService.getTelemetryData(engineName).pipe(
          map(data => SystemActions.loadTelemetryDataSuccess({ data })),
          catchError(error => {
            const errorMsg = error?.message || 'Failed to fetch telemetry data';
            return of(SystemActions.loadTelemetryDataFailure({ error: errorMsg }));
          })
        )
      )
    )
  );

  // =====================
  // Helper Methods
  // =====================

  private calculateActiveYear(startDateStr: string): Date {
    const startDate = new Date(startDateStr);
    const now = new Date();
    let activeYear = new Date(startDate);

    while (this.addYear(new Date(activeYear)).getTime() < now.getTime()) {
      activeYear = this.addYear(activeYear);
    }

    return activeYear;
  }

  private calculateActiveMonth(startDateStr: string): Date {
    const startDate = new Date(startDateStr);
    const now = new Date();
    let activeMonth = new Date(startDate);

    while (this.addMonth(new Date(activeMonth)).getTime() < now.getTime()) {
      activeMonth = this.addMonth(activeMonth);
    }

    return activeMonth;
  }

  private addYear(date: Date): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + 1);
    return result;
  }

  private addMonth(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1);
    return result;
  }

  private subtractYear(date: Date): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() - 1);
    return result;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private createEmptyMetricValue(): MetricValue {
    return { sum: 0, sumFmt: '0' };
  }

  private processMonthlyMetrics(
    rawMetrics: any[],
    startDateStr: string,
    activeYear: Date
  ): ProcessedMetric[] {
    const metricsMap: Record<string, ProcessedMetric> = {};
    const startDate = new Date(startDateStr);
    const day = startDate.getDate();
    const activeMonth = this.calculateActiveMonth(startDateStr);

    // Pre-fill last 24 months
    let month = new Date(activeMonth);
    for (let i = 0; i < 24; i++) {
      const label = this.createGroupLabel(month.getFullYear(), month.getMonth() + 1, day);
      metricsMap[label] = {
        label,
        labelFmt: label,
        activeYear: month.getTime() >= activeYear.getTime(),
        'process-instances': this.createEmptyMetricValue(),
        'decision-instances': this.createEmptyMetricValue(),
        'task-users': this.createEmptyMetricValue(),
        'flow-node-instances': this.createEmptyMetricValue(),
        'executed-decision-elements': this.createEmptyMetricValue()
      };
      month.setMonth(month.getMonth() - 1);
    }

    // Fill with actual data
    for (const metric of rawMetrics) {
      const label = this.createGroupLabel(
        metric.subscriptionYear,
        metric.subscriptionMonth,
        day
      );
      if (metricsMap[label]) {
        const metricKey = metric.metric as MetricType;
        metricsMap[label][metricKey] = {
          sum: metric.sum,
          sumFmt: metric.sum.toLocaleString()
        };
      }
    }

    // Convert to array and sort descending
    const metricsArray = Object.values(metricsMap)
      .sort((a, b) => b.label.localeCompare(a.label));

    // Accumulate TU metrics within each subscription year
    for (let i = metricsArray.length - 1; i >= 0; i--) {
      const metric = metricsArray[i];
      if (i - 1 >= 0) {
        const nextMetric = metricsArray[i - 1];
        if (metric.activeYear === nextMetric.activeYear) {
          const sum = metric['task-users'].sum + nextMetric['task-users'].sum;
          nextMetric['task-users'] = {
            sum,
            sumFmt: sum.toLocaleString()
          };
        }
      }
    }

    // Return only the last 12 months
    return metricsArray.slice(0, 12);
  }

  private processAnnualMetrics(rawMetrics: any[], startDateStr: string): ProcessedMetric[] {
    const metricsMap: Record<string, ProcessedMetric> = {};
    const startDate = new Date(startDateStr);

    for (const metric of rawMetrics) {
      const label = String(metric.subscriptionYear);
      const labelFmt = this.formatSubscriptionYear(metric.subscriptionYear, startDateStr);

      if (!metricsMap[label]) {
        metricsMap[label] = {
          label,
          labelFmt,
          'process-instances': this.createEmptyMetricValue(),
          'decision-instances': this.createEmptyMetricValue(),
          'task-users': this.createEmptyMetricValue(),
          'flow-node-instances': this.createEmptyMetricValue(),
          'executed-decision-elements': this.createEmptyMetricValue()
        };
      }

      const metricKey = metric.metric as MetricType;
      metricsMap[label][metricKey] = {
        sum: metric.sum,
        sumFmt: metric.sum.toLocaleString()
      };
    }

    // Sort descending by year
    return Object.values(metricsMap).sort((a, b) => b.label.localeCompare(a.label));
  }

  private createGroupLabel(year: number, month?: number, day?: number): string {
    if (!month) {
      return String(year);
    }

    const date = new Date(year, month - 1, day || 1);
    const lastDayOfMonth = new Date(year, month, 0).getDate();

    if (day && day > lastDayOfMonth) {
      return `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}`;
  }

  private formatSubscriptionYear(year: number, startDateStr: string): string {
    const startDate = new Date(startDateStr);
    const yearStart = new Date(startDate);
    yearStart.setFullYear(year);

    const yearEnd = new Date(yearStart);
    yearEnd.setFullYear(yearEnd.getFullYear() + 1);

    const now = new Date();
    const isCurrent = yearEnd.getTime() > now.getTime();

    const fromStr = this.formatDate(yearStart);
    const toStr = this.formatDate(yearEnd);

    return isCurrent
      ? `${fromStr} - ${toStr} (current)`
      : `${fromStr} - ${toStr}`;
  }

  private getApiError(error: any): string {
    if (error?.data?.type) {
      let msg = error.data.type;
      if (error.data.message) {
        msg += ': ' + error.data.message;
      }
      return msg;
    }
    return error?.statusText || error?.message || 'Unknown error';
  }
}
