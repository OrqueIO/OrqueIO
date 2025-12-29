import { createReducer, on } from '@ngrx/store';
import { processesAdapter, initialProcessesState } from './processes.state';
import * as ProcessesActions from './processes.actions';

export const processesReducer = createReducer(
  initialProcessesState,

  // Load Process Definitions
  on(ProcessesActions.loadProcessDefinitions, (state) => ({
    ...state,
    loadingDefinitions: true,
    error: null
  })),

  on(ProcessesActions.loadProcessDefinitionsSuccess, (state, { definitions }) => ({
    ...state,
    processDefinitions: definitions,
    loadingDefinitions: false,
    error: null
  })),

  on(ProcessesActions.loadProcessDefinitionsFailure, (state, { error }) => ({
    ...state,
    loadingDefinitions: false,
    error
  })),

  // Load Process Instances
  on(ProcessesActions.loadProcessInstances, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ProcessesActions.loadProcessInstancesSuccess, (state, { instances, total }) =>
    processesAdapter.setAll(instances, {
      ...state,
      total,
      loading: false,
      error: null
    })
  ),

  on(ProcessesActions.loadProcessInstancesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Process Instance Detail
  on(ProcessesActions.loadProcessInstance, (state) => ({
    ...state,
    loadingDetail: true,
    error: null
  })),

  on(ProcessesActions.loadProcessInstanceSuccess, (state, { process }) => ({
    ...state,
    selectedProcess: process,
    loadingDetail: false,
    error: null
  })),

  on(ProcessesActions.loadProcessInstanceFailure, (state, { error }) => ({
    ...state,
    loadingDetail: false,
    error
  })),

  // Set Query Params
  on(ProcessesActions.setProcessesQueryParams, (state, { params }) => ({
    ...state,
    queryParams: params
  })),

  // Clear Selected Process
  on(ProcessesActions.clearSelectedProcess, (state) => ({
    ...state,
    selectedProcess: null
  }))
);
