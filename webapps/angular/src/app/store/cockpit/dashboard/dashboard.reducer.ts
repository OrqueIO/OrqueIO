import { createReducer, on } from '@ngrx/store';
import { initialDashboardState } from './dashboard.state';
import * as DashboardActions from './dashboard.actions';

export const dashboardReducer = createReducer(
  initialDashboardState,

  
  // Load Dashboard Stats (existing)
  

  on(DashboardActions.loadDashboardStats, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DashboardActions.loadDashboardStatsSuccess, (state, { stats }) => ({
    ...state,
    stats,
    loading: false,
    error: null
  })),

  on(DashboardActions.loadDashboardStatsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Refresh Dashboard (same as load)
  on(DashboardActions.refreshDashboard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  
  // Task Stats Chart
  

  on(DashboardActions.loadTaskStats, (state) => ({
    ...state,
    charts: {
      ...state.charts,
      taskStatsLoading: 'loading' as const,
      taskStatsError: null
    }
  })),

  on(DashboardActions.loadTaskStatsSuccess, (state, { taskStats }) => ({
    ...state,
    charts: {
      ...state.charts,
      taskStats,
      taskStatsLoading: 'success' as const,
      taskStatsError: null
    }
  })),

  on(DashboardActions.loadTaskStatsFailure, (state, { error }) => ({
    ...state,
    charts: {
      ...state.charts,
      taskStatsLoading: 'error' as const,
      taskStatsError: error
    }
  })),

  
  // Incidents by Process Chart
  

  on(DashboardActions.loadIncidentsByProcess, (state) => ({
    ...state,
    charts: {
      ...state.charts,
      incidentsByProcessLoading: 'loading' as const,
      incidentsByProcessError: null
    }
  })),

  on(DashboardActions.loadIncidentsByProcessSuccess, (state, { incidentsByProcess }) => ({
    ...state,
    charts: {
      ...state.charts,
      incidentsByProcess,
      incidentsByProcessLoading: 'success' as const,
      incidentsByProcessError: null
    }
  })),

  on(DashboardActions.loadIncidentsByProcessFailure, (state, { error }) => ({
    ...state,
    charts: {
      ...state.charts,
      incidentsByProcessLoading: 'error' as const,
      incidentsByProcessError: error
    }
  })),

  
  // Timeline Chart
  

  on(DashboardActions.loadTimeline, (state) => ({
    ...state,
    charts: {
      ...state.charts,
      timelineLoading: 'loading' as const,
      timelineError: null
    }
  })),

  on(DashboardActions.loadTimelineSuccess, (state, { timeline, period }) => ({
    ...state,
    charts: {
      ...state.charts,
      timeline,
      timelinePeriod: period,
      timelineLoading: 'success' as const,
      timelineError: null
    }
  })),

  on(DashboardActions.loadTimelineFailure, (state, { error }) => ({
    ...state,
    charts: {
      ...state.charts,
      timelineLoading: 'error' as const,
      timelineError: error
    }
  })),

  on(DashboardActions.setTimelinePeriod, (state, { period }) => ({
    ...state,
    charts: {
      ...state.charts,
      timelinePeriod: period
    }
  })),

  
  // Process Distribution Chart
  

  on(DashboardActions.loadProcessDistribution, (state) => ({
    ...state,
    charts: {
      ...state.charts,
      processDistributionLoading: 'loading' as const,
      processDistributionError: null
    }
  })),

  on(DashboardActions.loadProcessDistributionSuccess, (state, { processDistribution }) => ({
    ...state,
    charts: {
      ...state.charts,
      processDistribution,
      processDistributionLoading: 'success' as const,
      processDistributionError: null
    }
  })),

  on(DashboardActions.loadProcessDistributionFailure, (state, { error }) => ({
    ...state,
    charts: {
      ...state.charts,
      processDistributionLoading: 'error' as const,
      processDistributionError: error
    }
  })),

  
  // Tasks by Group Chart
  

  on(DashboardActions.loadTasksByGroup, (state) => ({
    ...state,
    charts: {
      ...state.charts,
      tasksByGroupLoading: 'loading' as const,
      tasksByGroupError: null
    }
  })),

  on(DashboardActions.loadTasksByGroupSuccess, (state, { tasksByGroup }) => ({
    ...state,
    charts: {
      ...state.charts,
      tasksByGroup,
      tasksByGroupLoading: 'success' as const,
      tasksByGroupError: null
    }
  })),

  on(DashboardActions.loadTasksByGroupFailure, (state, { error }) => ({
    ...state,
    charts: {
      ...state.charts,
      tasksByGroupLoading: 'error' as const,
      tasksByGroupError: error
    }
  })),

  
  // Charts Configuration
  

  on(DashboardActions.setAutoRefresh, (state, { enabled }) => ({
    ...state,
    charts: {
      ...state.charts,
      autoRefreshEnabled: enabled
    }
  })),

  on(DashboardActions.setRefreshInterval, (state, { interval }) => ({
    ...state,
    charts: {
      ...state.charts,
      refreshInterval: interval
    }
  })),

  on(DashboardActions.updateLastRefresh, (state) => ({
    ...state,
    charts: {
      ...state.charts,
      lastRefresh: new Date().toISOString()
    }
  }))
);
