import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProcessesState, processesAdapter } from './processes.state';

export const selectProcessesState = createFeatureSelector<ProcessesState>('cockpitProcesses');

const { selectAll, selectEntities, selectIds, selectTotal } = processesAdapter.getSelectors();

export const selectAllProcessInstances = createSelector(
  selectProcessesState,
  selectAll
);

export const selectProcessInstanceEntities = createSelector(
  selectProcessesState,
  selectEntities
);

export const selectProcessInstanceIds = createSelector(
  selectProcessesState,
  selectIds
);

export const selectProcessesLoading = createSelector(
  selectProcessesState,
  (state) => state.loading
);

export const selectProcessesTotal = createSelector(
  selectProcessesState,
  (state) => state.total
);

export const selectProcessesQueryParams = createSelector(
  selectProcessesState,
  (state) => state.queryParams
);

export const selectProcessesError = createSelector(
  selectProcessesState,
  (state) => state.error
);

export const selectSelectedProcess = createSelector(
  selectProcessesState,
  (state) => state.selectedProcess
);

export const selectProcessesLoadingDetail = createSelector(
  selectProcessesState,
  (state) => state.loadingDetail
);

export const selectProcessDefinitions = createSelector(
  selectProcessesState,
  (state) => state.processDefinitions
);

export const selectProcessDefinitionsLoading = createSelector(
  selectProcessesState,
  (state) => state.loadingDefinitions
);
