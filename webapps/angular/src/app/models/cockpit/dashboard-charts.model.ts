/**
 * Dashboard Charts Data Models
 * Models for the enhanced Cockpit dashboard with visual charts
 */

// ============================================
// Process Instance Statistics
// ============================================

export interface ProcessChartStats {
  active: number;
  suspended: number;
  completed: number;
}

// ============================================
// Task Statistics
// ============================================

export interface TaskChartStats {
  assigned: number;
  unassigned: number;
  withCandidateGroups: number;
  withoutCandidateGroups: number;
}

// ============================================
// Incident Statistics
// ============================================

export interface IncidentTypeCount {
  type: string;
  count: number;
}

export interface IncidentsByProcess {
  processKey: string;
  processName: string;
  incidentCount: number;
  instances: number;
}

// ============================================
// Timeline Data
// ============================================

export interface TimelineDataPoint {
  date: string;
  started: number;
  completed: number;
  failed?: number;
}

export type TimelinePeriod = '7d' | '14d' | '30d';

// ============================================
// Process Distribution
// ============================================

export interface ProcessDistribution {
  key: string;
  name: string;
  instanceCount: number;
  percentage: number;
}

// ============================================
// Tasks by Group
// ============================================

export interface TaskGroupData {
  groupId: string;
  groupName: string;
  taskCount: number;
}

// ============================================
// Aggregated Dashboard Charts Data
// ============================================

export interface DashboardChartsData {
  processStats: ProcessChartStats;
  incidentsByType: IncidentTypeCount[];
  incidentsByProcess: IncidentsByProcess[];
  taskStats: TaskChartStats;
  tasksByGroup: TaskGroupData[];
  timeline: TimelineDataPoint[];
  processDistribution: ProcessDistribution[];
}

// ============================================
// Chart Configuration
// ============================================

export interface ChartConfig {
  refreshInterval: number; // in milliseconds
  animationDuration: number;
  showLegend: boolean;
  showTooltips: boolean;
  responsive: boolean;
}

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  refreshInterval: 30000, // 30 seconds
  animationDuration: 300,
  showLegend: true,
  showTooltips: true,
  responsive: true
};

// ============================================
// Chart Color Palette
// ============================================

export const CHART_COLORS = {
  // Status colors
  active: '#0f62fe',      // IBM Blue
  completed: '#24a148',   // Green
  suspended: '#ff8200',   // Orange
  failed: '#da1e28',      // Red
  pending: '#8d8d8d',     // Gray

  // Task colors
  assigned: '#0f62fe',
  unassigned: '#8a3ffc',  // Purple
  withGroups: '#007d79',  // Teal

  // Chart series colors (for multi-series charts) - Color wheel palette
  series: [
    '#45b5aa', // Teal
    '#3a9faa', // Blue-teal
    '#2d89a8', // Medium blue
    '#2373a0', // Blue
    '#1a5d8a', // Dark blue
    '#134872', // Navy
    '#c84b42', // Red/terracotta
    '#d96339', // Orange-red
    '#e87d2e', // Orange
    '#f49622', // Yellow-orange
    '#f9af18', // Gold
    '#7ab87a'  // Sage green
  ],

  // Incident type colors
  incidentTypes: {
    'failedJob': '#da1e28',
    'failedExternalTask': '#fa4d56',
    'default': '#ff8389'
  } as Record<string, string>
} as const;

// ============================================
// Chart Loading State
// ============================================

export type ChartLoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ChartState<T> {
  data: T | null;
  loading: ChartLoadingState;
  error: string | null;
  lastUpdated: string | null;
}

// ============================================
// Utility Types
// ============================================

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  borderRadius?: number;
}

export interface ChartLabeledData {
  labels: string[];
  datasets: ChartDataset[];
}
