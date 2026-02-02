import { createAction, props } from '@ngrx/store';
import { DashboardStats } from '../../../services/cockpit.service';
import {
  TaskChartStats,
  IncidentsByProcess,
  TimelineDataPoint,
  ProcessDistribution,
  TaskGroupData,
  TimelinePeriod
} from '../../../models/cockpit/dashboard-charts.model';


// Load Dashboard Stats (existing)


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


// Load All Charts Data


export const loadAllChartsData = createAction(
  '[Dashboard Charts] Load All Charts Data'
);

export const refreshAllCharts = createAction(
  '[Dashboard Charts] Refresh All Charts'
);


// Task Stats Chart Actions


export const loadTaskStats = createAction(
  '[Dashboard Charts] Load Task Stats'
);

export const loadTaskStatsSuccess = createAction(
  '[Dashboard Charts] Load Task Stats Success',
  props<{ taskStats: TaskChartStats }>()
);

export const loadTaskStatsFailure = createAction(
  '[Dashboard Charts] Load Task Stats Failure',
  props<{ error: string }>()
);


// Incidents by Process Chart Actions


export const loadIncidentsByProcess = createAction(
  '[Dashboard Charts] Load Incidents By Process'
);

export const loadIncidentsByProcessSuccess = createAction(
  '[Dashboard Charts] Load Incidents By Process Success',
  props<{ incidentsByProcess: IncidentsByProcess[] }>()
);

export const loadIncidentsByProcessFailure = createAction(
  '[Dashboard Charts] Load Incidents By Process Failure',
  props<{ error: string }>()
);


// Timeline Chart Actions


export const loadTimeline = createAction(
  '[Dashboard Charts] Load Timeline',
  props<{ period: TimelinePeriod }>()
);

export const loadTimelineSuccess = createAction(
  '[Dashboard Charts] Load Timeline Success',
  props<{ timeline: TimelineDataPoint[]; period: TimelinePeriod }>()
);

export const loadTimelineFailure = createAction(
  '[Dashboard Charts] Load Timeline Failure',
  props<{ error: string }>()
);

export const setTimelinePeriod = createAction(
  '[Dashboard Charts] Set Timeline Period',
  props<{ period: TimelinePeriod }>()
);


// Process Distribution Chart Actions


export const loadProcessDistribution = createAction(
  '[Dashboard Charts] Load Process Distribution'
);

export const loadProcessDistributionSuccess = createAction(
  '[Dashboard Charts] Load Process Distribution Success',
  props<{ processDistribution: ProcessDistribution[] }>()
);

export const loadProcessDistributionFailure = createAction(
  '[Dashboard Charts] Load Process Distribution Failure',
  props<{ error: string }>()
);


// Tasks by Group Chart Actions


export const loadTasksByGroup = createAction(
  '[Dashboard Charts] Load Tasks By Group'
);

export const loadTasksByGroupSuccess = createAction(
  '[Dashboard Charts] Load Tasks By Group Success',
  props<{ tasksByGroup: TaskGroupData[] }>()
);

export const loadTasksByGroupFailure = createAction(
  '[Dashboard Charts] Load Tasks By Group Failure',
  props<{ error: string }>()
);


// Charts Configuration Actions


export const setAutoRefresh = createAction(
  '[Dashboard Charts] Set Auto Refresh',
  props<{ enabled: boolean }>()
);

export const setRefreshInterval = createAction(
  '[Dashboard Charts] Set Refresh Interval',
  props<{ interval: number }>()
);

export const updateLastRefresh = createAction(
  '[Dashboard Charts] Update Last Refresh'
);
