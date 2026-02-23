/**
 * Process Engine Model
 */
export interface ProcessEngine {
  name: string;
}

/**
 * Process Engine Properties
 */
export interface ProcessEngineInfo {
  name: string;
  version: string;
  databaseType?: string;
  historyLevel?: string;
  authorizationEnabled?: boolean;
  jobExecutorActive?: boolean;
}

/**
 * Job Executor Status
 */
export interface JobExecutorStatus {
  active: boolean;
  acquisitionName?: string;
  maxJobsPerAcquisition?: number;
  lockTimeInMillis?: number;
  waitTimeInMillis?: number;
  maxWait?: number;
}

/**
 * Metric Types
 */
export type MetricType =
  | 'process-instances'
  | 'decision-instances'
  | 'task-users'
  | 'flow-node-instances'
  | 'executed-decision-elements';

export const METRIC_KEYS = {
  PI: 'process-instances' as MetricType,
  DI: 'decision-instances' as MetricType,
  TU: 'task-users' as MetricType,
  FNI: 'flow-node-instances' as MetricType,
  EDE: 'executed-decision-elements' as MetricType
};

export const METRIC_COLORS: Record<string, string> = {
  PI: 'hsl(230, 70%, 41%)',
  DI: 'hsl(302, 70%, 41%)',
  TU: 'hsl(14, 70%, 41%)',
  FNI: 'hsl(86, 70%, 41%)',
  EDE: 'hsl(158, 70%, 41%)'
};

/**
 * Aggregated Metrics Query Params
 */
export interface MetricsQueryParams {
  subscriptionStartDate: string;
  groupBy: 'month' | 'year';
  metrics?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Aggregated Metrics Result from API
 */
export interface MetricsAggregatedResult {
  subscriptionYear: number;
  subscriptionMonth?: number;
  metric: MetricType;
  sum: number;
}

/**
 * Processed Monthly/Annual Metric for display
 */
export interface ProcessedMetric {
  label: string;
  labelFmt: string;
  activeYear?: boolean;
  'process-instances': MetricValue;
  'decision-instances': MetricValue;
  'task-users': MetricValue;
  'flow-node-instances': MetricValue;
  'executed-decision-elements': MetricValue;
}

export interface MetricValue {
  sum: number;
  sumFmt: string;
}

/**
 * Telemetry Data
 */
export interface TelemetryData {
  installation?: string;
  product?: {
    name?: string;
    version?: string;
    edition?: string;
    internals?: {
      database?: {
        vendor?: string;
        version?: string;
      };
      applicationServer?: {
        vendor?: string;
        version?: string;
      };
      licenseKey?: {
        customer?: string;
        type?: string;
        validUntil?: string;
        unlimited?: boolean;
        features?: Record<string, string>;
        raw?: string;
      };
      telemetryEnabled?: boolean;
      jdk?: {
        version?: string;
        vendor?: string;
      };
      webapps?: string[];
      [key: string]: any;
    };
  };
}

/**
 * System Health Status
 */
export interface SystemHealth {
  engineName: string;
  status: 'running' | 'stopped' | 'unknown';
  version?: string;
  uptime?: number;
}

/**
 * Loading States
 */
export type LoadingState = 'INITIAL' | 'LOADING' | 'LOADED' | 'EMPTY' | 'ERROR';
