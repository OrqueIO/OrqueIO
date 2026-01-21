import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DashboardState } from './dashboard.state';

// ============================================
// Feature Selector
// ============================================

export const selectDashboardState = createFeatureSelector<DashboardState>('cockpitDashboard');

// ============================================
// Basic Stats Selectors (existing)
// ============================================

export const selectDashboardStats = createSelector(
  selectDashboardState,
  (state) => state.stats
);

export const selectDashboardLoading = createSelector(
  selectDashboardState,
  (state) => state.loading
);

export const selectDashboardError = createSelector(
  selectDashboardState,
  (state) => state.error
);

// ============================================
// Charts State Selector
// ============================================

export const selectChartsState = createSelector(
  selectDashboardState,
  (state) => state.charts
);

// ============================================
// Task Stats Selectors
// ============================================

export const selectTaskStats = createSelector(
  selectChartsState,
  (charts) => charts.taskStats
);

export const selectTaskStatsLoading = createSelector(
  selectChartsState,
  (charts) => charts.taskStatsLoading
);

export const selectTaskStatsError = createSelector(
  selectChartsState,
  (charts) => charts.taskStatsError
);

// Computed selector for task stats total
export const selectTaskStatsTotal = createSelector(
  selectTaskStats,
  (stats) => stats ? stats.assigned + stats.unassigned : 0
);

// ============================================
// Incidents by Process Selectors
// ============================================

export const selectIncidentsByProcess = createSelector(
  selectChartsState,
  (charts) => charts.incidentsByProcess
);

export const selectIncidentsByProcessLoading = createSelector(
  selectChartsState,
  (charts) => charts.incidentsByProcessLoading
);

export const selectIncidentsByProcessError = createSelector(
  selectChartsState,
  (charts) => charts.incidentsByProcessError
);

// Top 10 processes by incidents
export const selectTopProcessesByIncidents = createSelector(
  selectIncidentsByProcess,
  (processes) => [...processes]
    .sort((a, b) => b.incidentCount - a.incidentCount)
    .slice(0, 10)
);

// ============================================
// Timeline Selectors
// ============================================

export const selectTimeline = createSelector(
  selectChartsState,
  (charts) => charts.timeline
);

export const selectTimelinePeriod = createSelector(
  selectChartsState,
  (charts) => charts.timelinePeriod
);

export const selectTimelineLoading = createSelector(
  selectChartsState,
  (charts) => charts.timelineLoading
);

export const selectTimelineError = createSelector(
  selectChartsState,
  (charts) => charts.timelineError
);

// Computed selector for timeline totals
export const selectTimelineTotals = createSelector(
  selectTimeline,
  (timeline) => ({
    totalStarted: timeline.reduce((sum, point) => sum + point.started, 0),
    totalCompleted: timeline.reduce((sum, point) => sum + point.completed, 0),
    totalFailed: timeline.reduce((sum, point) => sum + (point.failed || 0), 0)
  })
);

// ============================================
// Process Distribution Selectors
// ============================================

export const selectProcessDistribution = createSelector(
  selectChartsState,
  (charts) => charts.processDistribution
);

export const selectProcessDistributionLoading = createSelector(
  selectChartsState,
  (charts) => charts.processDistributionLoading
);

export const selectProcessDistributionError = createSelector(
  selectChartsState,
  (charts) => charts.processDistributionError
);

// Top 10 processes by instance count
export const selectTopProcessesByInstances = createSelector(
  selectProcessDistribution,
  (processes) => [...processes]
    .sort((a, b) => b.instanceCount - a.instanceCount)
    .slice(0, 10)
);

// ============================================
// Tasks by Group Selectors
// ============================================

export const selectTasksByGroup = createSelector(
  selectChartsState,
  (charts) => charts.tasksByGroup
);

export const selectTasksByGroupLoading = createSelector(
  selectChartsState,
  (charts) => charts.tasksByGroupLoading
);

export const selectTasksByGroupError = createSelector(
  selectChartsState,
  (charts) => charts.tasksByGroupError
);

// Top 10 groups by task count
export const selectTopGroupsByTasks = createSelector(
  selectTasksByGroup,
  (groups) => [...groups]
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 10)
);

// ============================================
// Charts Configuration Selectors
// ============================================

export const selectAutoRefreshEnabled = createSelector(
  selectChartsState,
  (charts) => charts.autoRefreshEnabled
);

export const selectRefreshInterval = createSelector(
  selectChartsState,
  (charts) => charts.refreshInterval
);

export const selectLastRefresh = createSelector(
  selectChartsState,
  (charts) => charts.lastRefresh
);

// ============================================
// Global Loading Selectors
// ============================================

export const selectAnyChartLoading = createSelector(
  selectChartsState,
  (charts) =>
    charts.taskStatsLoading === 'loading' ||
    charts.incidentsByProcessLoading === 'loading' ||
    charts.timelineLoading === 'loading' ||
    charts.processDistributionLoading === 'loading' ||
    charts.tasksByGroupLoading === 'loading'
);

export const selectAllChartsLoaded = createSelector(
  selectChartsState,
  (charts) =>
    charts.taskStatsLoading === 'success' &&
    charts.incidentsByProcessLoading === 'success' &&
    charts.timelineLoading === 'success' &&
    charts.processDistributionLoading === 'success' &&
    charts.tasksByGroupLoading === 'success'
);

export const selectAnyChartError = createSelector(
  selectChartsState,
  (charts) =>
    charts.taskStatsError ||
    charts.incidentsByProcessError ||
    charts.timelineError ||
    charts.processDistributionError ||
    charts.tasksByGroupError
);
