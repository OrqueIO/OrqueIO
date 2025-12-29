import { createAction, props } from '@ngrx/store';
import {
  ProcessInstance,
  ProcessInstanceDetail,
  ProcessDefinition,
  ProcessQueryParams
} from '../../../services/cockpit.service';

// Load Process Definitions
export const loadProcessDefinitions = createAction(
  '[Processes] Load Process Definitions'
);

export const loadProcessDefinitionsSuccess = createAction(
  '[Processes] Load Process Definitions Success',
  props<{ definitions: ProcessDefinition[] }>()
);

export const loadProcessDefinitionsFailure = createAction(
  '[Processes] Load Process Definitions Failure',
  props<{ error: any }>()
);

// Load Process Instances
export const loadProcessInstances = createAction(
  '[Processes] Load Process Instances',
  props<{ params?: ProcessQueryParams }>()
);

export const loadProcessInstancesSuccess = createAction(
  '[Processes] Load Process Instances Success',
  props<{ instances: ProcessInstance[]; total: number }>()
);

export const loadProcessInstancesFailure = createAction(
  '[Processes] Load Process Instances Failure',
  props<{ error: any }>()
);

// Load Process Instance Detail
export const loadProcessInstance = createAction(
  '[Processes] Load Process Instance',
  props<{ processId: string }>()
);

export const loadProcessInstanceSuccess = createAction(
  '[Processes] Load Process Instance Success',
  props<{ process: ProcessInstanceDetail }>()
);

export const loadProcessInstanceFailure = createAction(
  '[Processes] Load Process Instance Failure',
  props<{ error: any }>()
);

// Set Query Params
export const setProcessesQueryParams = createAction(
  '[Processes] Set Query Params',
  props<{ params: ProcessQueryParams }>()
);

// Clear Selected Process
export const clearSelectedProcess = createAction(
  '[Processes] Clear Selected Process'
);
