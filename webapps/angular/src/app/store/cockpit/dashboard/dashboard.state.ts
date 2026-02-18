import { DashboardStats } from '../../../services/cockpit.service';
import {
  TaskChartStats,
  IncidentsByProcess,
  TimelineDataPoint,
  ProcessDistribution,
  TaskGroupData,
  ChartLoadingState,
  TimelinePeriod
} from '../../../models/cockpit/dashboard-charts.model';


// Charts State


export interface ChartsState {
  // Task statistics chart data
  taskStats: TaskChartStats | null;
  taskStatsLoading: ChartLoadingState;
  taskStatsError: string | null;

  // Incidents by process chart data
  incidentsByProcess: IncidentsByProcess[];
  incidentsByProcessLoading: ChartLoadingState;
  incidentsByProcessError: string | null;

  // Timeline chart data
  timeline: TimelineDataPoint[];
  timelinePeriod: TimelinePeriod;
  timelineLoading: ChartLoadingState;
  timelineError: string | null;

  // Process distribution chart data
  processDistribution: ProcessDistribution[];
  processDistributionLoading: ChartLoadingState;
  processDistributionError: string | null;

  // Tasks by group chart data
  tasksByGroup: TaskGroupData[];
  tasksByGroupLoading: ChartLoadingState;
  tasksByGroupError: string | null;

  // Global charts state
  lastRefresh: string | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number; // in milliseconds
}

export const initialChartsState: ChartsState = {
  taskStats: null,
  taskStatsLoading: 'idle',
  taskStatsError: null,

  incidentsByProcess: [],
  incidentsByProcessLoading: 'idle',
  incidentsByProcessError: null,

  timeline: [],
  timelinePeriod: '7d',
  timelineLoading: 'idle',
  timelineError: null,

  processDistribution: [],
  processDistributionLoading: 'idle',
  processDistributionError: null,

  tasksByGroup: [],
  tasksByGroupLoading: 'idle',
  tasksByGroupError: null,

  lastRefresh: null,
  autoRefreshEnabled: true,
  refreshInterval: 30000
};


// Main Dashboard State


export interface DashboardState {
  // Basic stats
  stats: DashboardStats | null;
  loading: boolean;
  error: any;

  // Charts state
  charts: ChartsState;
}

export const initialDashboardState: DashboardState = {
  stats: null,
  loading: false,
  error: null,
  charts: initialChartsState
};
