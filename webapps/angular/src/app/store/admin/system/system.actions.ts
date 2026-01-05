import { createAction, props } from '@ngrx/store';
import {
  ProcessEngine,
  ProcessEngineInfo,
  JobExecutorStatus,
  ProcessedMetric,
  TelemetryData,
  LoadingState
} from '../../../models/admin/system.model';

// =====================
// Process Engines
// =====================

export const loadEngines = createAction('[System] Load Engines');

export const loadEnginesSuccess = createAction(
  '[System] Load Engines Success',
  props<{ engines: ProcessEngine[] }>()
);

export const loadEnginesFailure = createAction(
  '[System] Load Engines Failure',
  props<{ error: any }>()
);

export const setCurrentEngine = createAction(
  '[System] Set Current Engine',
  props<{ engineName: string }>()
);

// =====================
// Engine Info
// =====================

export const loadEngineInfo = createAction(
  '[System] Load Engine Info',
  props<{ engineName?: string }>()
);

export const loadEngineInfoSuccess = createAction(
  '[System] Load Engine Info Success',
  props<{ engineInfo: ProcessEngineInfo }>()
);

export const loadEngineInfoFailure = createAction(
  '[System] Load Engine Info Failure',
  props<{ error: any }>()
);

// =====================
// Job Executor
// =====================

export const loadJobExecutorStatus = createAction(
  '[System] Load Job Executor Status',
  props<{ engineName?: string }>()
);

export const loadJobExecutorStatusSuccess = createAction(
  '[System] Load Job Executor Status Success',
  props<{ status: JobExecutorStatus }>()
);

export const loadJobExecutorStatusFailure = createAction(
  '[System] Load Job Executor Status Failure',
  props<{ error: any }>()
);

export const startJobExecutor = createAction(
  '[System] Start Job Executor',
  props<{ engineName?: string }>()
);

export const startJobExecutorSuccess = createAction(
  '[System] Start Job Executor Success'
);

export const startJobExecutorFailure = createAction(
  '[System] Start Job Executor Failure',
  props<{ error: any }>()
);

export const stopJobExecutor = createAction(
  '[System] Stop Job Executor',
  props<{ engineName?: string }>()
);

export const stopJobExecutorSuccess = createAction(
  '[System] Stop Job Executor Success'
);

export const stopJobExecutorFailure = createAction(
  '[System] Stop Job Executor Failure',
  props<{ error: any }>()
);

// =====================
// Metrics
// =====================

export const loadMonthlyMetrics = createAction(
  '[System] Load Monthly Metrics',
  props<{ startDate: string; displayLegacy: boolean }>()
);

export const loadMonthlyMetricsSuccess = createAction(
  '[System] Load Monthly Metrics Success',
  props<{ metrics: ProcessedMetric[] }>()
);

export const loadMonthlyMetricsFailure = createAction(
  '[System] Load Monthly Metrics Failure',
  props<{ error: string }>()
);

export const loadAnnualMetrics = createAction(
  '[System] Load Annual Metrics',
  props<{ startDate: string }>()
);

export const loadAnnualMetricsSuccess = createAction(
  '[System] Load Annual Metrics Success',
  props<{ metrics: ProcessedMetric[] }>()
);

export const loadAnnualMetricsFailure = createAction(
  '[System] Load Annual Metrics Failure',
  props<{ error: string }>()
);

export const setMetricsStartDate = createAction(
  '[System] Set Metrics Start Date',
  props<{ startDate: string }>()
);

export const setDisplayLegacyMetrics = createAction(
  '[System] Set Display Legacy Metrics',
  props<{ display: boolean }>()
);

// =====================
// Telemetry/Diagnostics
// =====================

export const loadTelemetryData = createAction(
  '[System] Load Telemetry Data',
  props<{ engineName?: string }>()
);

export const loadTelemetryDataSuccess = createAction(
  '[System] Load Telemetry Data Success',
  props<{ data: TelemetryData }>()
);

export const loadTelemetryDataFailure = createAction(
  '[System] Load Telemetry Data Failure',
  props<{ error: string }>()
);

// =====================
// Reset
// =====================

export const resetSystemState = createAction('[System] Reset State');
