import { createAction, props } from '@ngrx/store';
import { DashboardStats } from '../../../services/cockpit.service';

// Load Dashboard Stats
export const loadDashboardStats = createAction(
  '[Dashboard] Load Dashboard Stats'
);

export const loadDashboardStatsSuccess = createAction(
  '[Dashboard] Load Dashboard Stats Success',
  props<{ stats: DashboardStats }>()
);

export const loadDashboardStatsFailure = createAction(
  '[Dashboard] Load Dashboard Stats Failure',
  props<{ error: any }>()
);

// Refresh Dashboard
export const refreshDashboard = createAction(
  '[Dashboard] Refresh Dashboard'
);
