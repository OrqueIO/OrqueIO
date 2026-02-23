import { createAction, props } from '@ngrx/store';
import { DecisionInstance, DecisionDefinition } from '../../../services/cockpit.service';

// Load Decision Definitions
export const loadDecisionDefinitions = createAction(
  '[Decisions] Load Decision Definitions'
);

export const loadDecisionDefinitionsSuccess = createAction(
  '[Decisions] Load Decision Definitions Success',
  props<{ definitions: DecisionDefinition[] }>()
);

export const loadDecisionDefinitionsFailure = createAction(
  '[Decisions] Load Decision Definitions Failure',
  props<{ error: any }>()
);

// Load Decision Instances
export const loadDecisionInstances = createAction(
  '[Decisions] Load Decision Instances',
  props<{ definitionId?: string; maxResults?: number }>()
);

export const loadDecisionInstancesSuccess = createAction(
  '[Decisions] Load Decision Instances Success',
  props<{ instances: DecisionInstance[] }>()
);

export const loadDecisionInstancesFailure = createAction(
  '[Decisions] Load Decision Instances Failure',
  props<{ error: any }>()
);

// Load Decision Instance Detail
export const loadDecisionInstance = createAction(
  '[Decisions] Load Decision Instance',
  props<{ decisionId: string }>()
);

export const loadDecisionInstanceSuccess = createAction(
  '[Decisions] Load Decision Instance Success',
  props<{ decision: DecisionInstance }>()
);

export const loadDecisionInstanceFailure = createAction(
  '[Decisions] Load Decision Instance Failure',
  props<{ error: any }>()
);

// Clear Selected Decision
export const clearSelectedDecision = createAction(
  '[Decisions] Clear Selected Decision'
);
