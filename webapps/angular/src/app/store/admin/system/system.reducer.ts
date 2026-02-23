import { createReducer, on } from '@ngrx/store';
import { initialSystemState } from './system.state';
import * as SystemActions from './system.actions';

export const systemReducer = createReducer(
  initialSystemState,

  // Process Engines

  on(SystemActions.loadEngines, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(SystemActions.loadEnginesSuccess, (state, { engines }) => ({
    ...state,
    engines,
    loading: false,
    error: null
  })),

  on(SystemActions.loadEnginesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(SystemActions.setCurrentEngine, (state, { engineName }) => ({
    ...state,
    currentEngine: engineName
  })),

  // Engine Info

  on(SystemActions.loadEngineInfo, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(SystemActions.loadEngineInfoSuccess, (state, { engineInfo }) => ({
    ...state,
    engineInfo,
    loading: false,
    error: null
  })),

  on(SystemActions.loadEngineInfoFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Job Executor

  on(SystemActions.loadJobExecutorStatus, (state) => ({
    ...state,
    jobExecutorLoading: true
  })),

  on(SystemActions.loadJobExecutorStatusSuccess, (state, { status }) => ({
    ...state,
    jobExecutor: status,
    jobExecutorLoading: false
  })),

  on(SystemActions.loadJobExecutorStatusFailure, (state, { error }) => ({
    ...state,
    jobExecutorLoading: false,
    error
  })),

  on(SystemActions.startJobExecutor, (state) => ({
    ...state,
    jobExecutorLoading: true
  })),

  on(SystemActions.startJobExecutorSuccess, (state) => ({
    ...state,
    jobExecutor: state.jobExecutor ? { ...state.jobExecutor, active: true } : { active: true },
    jobExecutorLoading: false
  })),

  on(SystemActions.startJobExecutorFailure, (state, { error }) => ({
    ...state,
    jobExecutorLoading: false,
    error
  })),

  on(SystemActions.stopJobExecutor, (state) => ({
    ...state,
    jobExecutorLoading: true
  })),

  on(SystemActions.stopJobExecutorSuccess, (state) => ({
    ...state,
    jobExecutor: state.jobExecutor ? { ...state.jobExecutor, active: false } : { active: false },
    jobExecutorLoading: false
  })),

  on(SystemActions.stopJobExecutorFailure, (state, { error }) => ({
    ...state,
    jobExecutorLoading: false,
    error
  })),

  // Metrics

  on(SystemActions.loadMonthlyMetrics, (state, { startDate, displayLegacy }) => ({
    ...state,
    metricsStartDate: startDate,
    displayLegacyMetrics: displayLegacy,
    monthlyLoadingState: 'LOADING' as const,
    monthlyError: null
  })),

  on(SystemActions.loadMonthlyMetricsSuccess, (state, { metrics }) => ({
    ...state,
    monthlyMetrics: metrics,
    monthlyLoadingState: 'LOADED' as const,
    monthlyError: null
  })),

  on(SystemActions.loadMonthlyMetricsFailure, (state, { error }) => ({
    ...state,
    monthlyLoadingState: 'ERROR' as const,
    monthlyError: error
  })),

  on(SystemActions.loadAnnualMetrics, (state, { startDate }) => ({
    ...state,
    metricsStartDate: startDate,
    annualLoadingState: 'LOADING' as const,
    annualError: null
  })),

  on(SystemActions.loadAnnualMetricsSuccess, (state, { metrics }) => ({
    ...state,
    annualMetrics: metrics,
    annualLoadingState: metrics.length === 0 ? 'EMPTY' as const : 'LOADED' as const,
    annualError: null
  })),

  on(SystemActions.loadAnnualMetricsFailure, (state, { error }) => ({
    ...state,
    annualLoadingState: 'ERROR' as const,
    annualError: error
  })),

  on(SystemActions.setMetricsStartDate, (state, { startDate }) => ({
    ...state,
    metricsStartDate: startDate
  })),

  on(SystemActions.setDisplayLegacyMetrics, (state, { display }) => ({
    ...state,
    displayLegacyMetrics: display
  })),

  // Telemetry

  on(SystemActions.loadTelemetryData, (state) => ({
    ...state,
    telemetryLoading: true,
    telemetryError: null
  })),

  on(SystemActions.loadTelemetryDataSuccess, (state, { data }) => ({
    ...state,
    telemetryData: data,
    telemetryLoading: false,
    telemetryError: null
  })),

  on(SystemActions.loadTelemetryDataFailure, (state, { error }) => ({
    ...state,
    telemetryLoading: false,
    telemetryError: error
  })),

  // Reset

  on(SystemActions.resetSystemState, () => initialSystemState)
);
