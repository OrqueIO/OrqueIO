import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators';
import { CockpitService } from '../../../services/cockpit.service';
import { TimelinePeriod } from '../../../models/cockpit/dashboard-charts.model';
import * as DashboardActions from './dashboard.actions';
import * as DashboardSelectors from './dashboard.selectors';

@Injectable()
export class DashboardEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private cockpitService = inject(CockpitService);

  // ============================================
  // Basic Dashboard Stats Effects (existing)
  // ============================================

  loadDashboardStats$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadDashboardStats, DashboardActions.refreshDashboard),
      switchMap(() =>
        this.cockpitService.getDashboardStats().pipe(
          map(stats => DashboardActions.loadDashboardStatsSuccess({ stats })),
          catchError(error => of(DashboardActions.loadDashboardStatsFailure({ error })))
        )
      )
    )
  );

  // ============================================
  // Load All Charts Data Effect
  // ============================================

  loadAllChartsData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadAllChartsData, DashboardActions.refreshAllCharts),
      withLatestFrom(this.store.select(DashboardSelectors.selectTimelinePeriod)),
      switchMap(([_, period]) => [
        DashboardActions.loadTaskStats(),
        DashboardActions.loadIncidentsByProcess(),
        DashboardActions.loadTimeline({ period }),
        DashboardActions.loadProcessDistribution(),
        DashboardActions.loadTasksByGroup(),
        DashboardActions.updateLastRefresh()
      ])
    )
  );

  // ============================================
  // Task Stats Chart Effect
  // ============================================

  loadTaskStats$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadTaskStats),
      switchMap(() =>
        this.cockpitService.getTaskStatsForChart().pipe(
          map(taskStats => DashboardActions.loadTaskStatsSuccess({ taskStats })),
          catchError(error => of(DashboardActions.loadTaskStatsFailure({
            error: error?.message || 'Failed to load task stats'
          })))
        )
      )
    )
  );

  // ============================================
  // Incidents by Process Chart Effect
  // ============================================

  loadIncidentsByProcess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadIncidentsByProcess),
      switchMap(() =>
        this.cockpitService.getIncidentsByProcess().pipe(
          map(incidentsByProcess => DashboardActions.loadIncidentsByProcessSuccess({ incidentsByProcess })),
          catchError(error => of(DashboardActions.loadIncidentsByProcessFailure({
            error: error?.message || 'Failed to load incidents by process'
          })))
        )
      )
    )
  );

  // ============================================
  // Timeline Chart Effect
  // ============================================

  loadTimeline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadTimeline),
      switchMap(({ period }) => {
        const days = this.getPeriodDays(period);
        return this.cockpitService.getProcessInstancesTimeline(days).pipe(
          map(timeline => DashboardActions.loadTimelineSuccess({ timeline, period })),
          catchError(error => of(DashboardActions.loadTimelineFailure({
            error: error?.message || 'Failed to load timeline data'
          })))
        );
      })
    )
  );

  // Effect to reload timeline when period changes
  setTimelinePeriod$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.setTimelinePeriod),
      map(({ period }) => DashboardActions.loadTimeline({ period }))
    )
  );

  // ============================================
  // Process Distribution Chart Effect
  // ============================================

  loadProcessDistribution$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadProcessDistribution),
      switchMap(() =>
        this.cockpitService.getProcessDistribution().pipe(
          map(processDistribution => DashboardActions.loadProcessDistributionSuccess({ processDistribution })),
          catchError(error => of(DashboardActions.loadProcessDistributionFailure({
            error: error?.message || 'Failed to load process distribution'
          })))
        )
      )
    )
  );

  // ============================================
  // Tasks by Group Chart Effect
  // ============================================

  loadTasksByGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadTasksByGroup),
      switchMap(() =>
        this.cockpitService.getTasksByGroupWithNames().pipe(
          map(tasksByGroup => DashboardActions.loadTasksByGroupSuccess({ tasksByGroup })),
          catchError(error => of(DashboardActions.loadTasksByGroupFailure({
            error: error?.message || 'Failed to load tasks by group'
          })))
        )
      )
    )
  );

  // ============================================
  // Helper Methods
  // ============================================

  private getPeriodDays(period: TimelinePeriod): number {
    switch (period) {
      case '7d': return 7;
      case '14d': return 14;
      case '30d': return 30;
      default: return 7;
    }
  }
}
