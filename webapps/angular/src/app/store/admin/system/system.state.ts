import {
  ProcessEngine,
  ProcessEngineInfo,
  JobExecutorStatus,
  ProcessedMetric,
  TelemetryData,
  LoadingState
} from '../../../models/admin/system.model';

export interface SystemState {
  // Process Engines
  engines: ProcessEngine[];
  currentEngine: string;
  engineInfo: ProcessEngineInfo | null;

  // Job Executor
  jobExecutor: JobExecutorStatus | null;
  jobExecutorLoading: boolean;

  // Metrics
  monthlyMetrics: ProcessedMetric[];
  annualMetrics: ProcessedMetric[];
  metricsStartDate: string;
  displayLegacyMetrics: boolean;
  monthlyLoadingState: LoadingState;
  annualLoadingState: LoadingState;
  monthlyError: string | null;
  annualError: string | null;

  // Telemetry/Diagnostics
  telemetryData: TelemetryData | null;
  telemetryLoading: boolean;
  telemetryError: string | null;

  // General loading state
  loading: boolean;
  error: any;
}

export const initialSystemState: SystemState = {
  // Process Engines
  engines: [],
  currentEngine: 'default',
  engineInfo: null,

  // Job Executor
  jobExecutor: null,
  jobExecutorLoading: false,

  // Metrics
  monthlyMetrics: [],
  annualMetrics: [],
  metricsStartDate: '',
  displayLegacyMetrics: false,
  monthlyLoadingState: 'INITIAL',
  annualLoadingState: 'INITIAL',
  monthlyError: null,
  annualError: null,

  // Telemetry
  telemetryData: null,
  telemetryLoading: false,
  telemetryError: null,

  // General
  loading: false,
  error: null
};
