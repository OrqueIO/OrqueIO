import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SystemState } from './system.state';

export const selectSystemState = createFeatureSelector<SystemState>('system');


// Process Engines


export const selectEngines = createSelector(
  selectSystemState,
  (state) => state.engines
);

export const selectCurrentEngine = createSelector(
  selectSystemState,
  (state) => state.currentEngine
);

export const selectEngineInfo = createSelector(
  selectSystemState,
  (state) => state.engineInfo
);


// Job Executor


export const selectJobExecutor = createSelector(
  selectSystemState,
  (state) => state.jobExecutor
);

export const selectJobExecutorLoading = createSelector(
  selectSystemState,
  (state) => state.jobExecutorLoading
);

export const selectJobExecutorActive = createSelector(
  selectJobExecutor,
  (jobExecutor) => jobExecutor?.active ?? false
);


// Metrics


export const selectMonthlyMetrics = createSelector(
  selectSystemState,
  (state) => state.monthlyMetrics
);

export const selectAnnualMetrics = createSelector(
  selectSystemState,
  (state) => state.annualMetrics
);

export const selectMetricsStartDate = createSelector(
  selectSystemState,
  (state) => state.metricsStartDate
);

export const selectDisplayLegacyMetrics = createSelector(
  selectSystemState,
  (state) => state.displayLegacyMetrics
);

export const selectMonthlyLoadingState = createSelector(
  selectSystemState,
  (state) => state.monthlyLoadingState
);

export const selectAnnualLoadingState = createSelector(
  selectSystemState,
  (state) => state.annualLoadingState
);

export const selectMonthlyError = createSelector(
  selectSystemState,
  (state) => state.monthlyError
);

export const selectAnnualError = createSelector(
  selectSystemState,
  (state) => state.annualError
);

// Chart data selector - returns metrics in chronological order for charts
export const selectMonthlyMetricsForChart = createSelector(
  selectMonthlyMetrics,
  (metrics) => [...metrics].reverse()
);


// Telemetry


export const selectTelemetryData = createSelector(
  selectSystemState,
  (state) => state.telemetryData
);

export const selectTelemetryLoading = createSelector(
  selectSystemState,
  (state) => state.telemetryLoading
);

export const selectTelemetryError = createSelector(
  selectSystemState,
  (state) => state.telemetryError
);


// General


export const selectLoading = createSelector(
  selectSystemState,
  (state) => state.loading
);

export const selectError = createSelector(
  selectSystemState,
  (state) => state.error
);
