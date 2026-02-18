import { createReducer, on } from '@ngrx/store';
import { decisionsAdapter, initialDecisionsState } from './decisions.state';
import * as DecisionsActions from './decisions.actions';

export const decisionsReducer = createReducer(
  initialDecisionsState,

  // Load Decision Definitions
  on(DecisionsActions.loadDecisionDefinitions, (state) => ({
    ...state,
    loadingDefinitions: true,
    error: null
  })),

  on(DecisionsActions.loadDecisionDefinitionsSuccess, (state, { definitions }) => ({
    ...state,
    decisionDefinitions: definitions,
    loadingDefinitions: false,
    error: null
  })),

  on(DecisionsActions.loadDecisionDefinitionsFailure, (state, { error }) => ({
    ...state,
    loadingDefinitions: false,
    error
  })),

  // Load Decision Instances
  on(DecisionsActions.loadDecisionInstances, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DecisionsActions.loadDecisionInstancesSuccess, (state, { instances }) =>
    decisionsAdapter.setAll(instances, {
      ...state,
      total: instances.length,
      loading: false,
      error: null
    })
  ),

  on(DecisionsActions.loadDecisionInstancesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Decision Instance Detail
  on(DecisionsActions.loadDecisionInstance, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DecisionsActions.loadDecisionInstanceSuccess, (state, { decision }) => ({
    ...state,
    selectedDecision: decision,
    loading: false,
    error: null
  })),

  on(DecisionsActions.loadDecisionInstanceFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear Selected Decision
  on(DecisionsActions.clearSelectedDecision, (state) => ({
    ...state,
    selectedDecision: null
  }))
);
