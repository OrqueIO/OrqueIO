import { createReducer, on } from '@ngrx/store';
import { initialDashboardState } from './dashboard.state';
import * as DashboardActions from './dashboard.actions';

export const dashboardReducer = createReducer(
  initialDashboardState,

  // Load Dashboard Stats
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
  }))
);
