import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DecisionsState, decisionsAdapter } from './decisions.state';

export const selectDecisionsState = createFeatureSelector<DecisionsState>('cockpitDecisions');

const { selectAll, selectEntities, selectIds, selectTotal } = decisionsAdapter.getSelectors();

export const selectAllDecisionInstances = createSelector(
  selectDecisionsState,
  selectAll
);

export const selectDecisionInstanceEntities = createSelector(
  selectDecisionsState,
  selectEntities
);

export const selectDecisionInstanceIds = createSelector(
  selectDecisionsState,
  selectIds
);

export const selectDecisionsLoading = createSelector(
  selectDecisionsState,
  (state) => state.loading
);

export const selectDecisionsTotal = createSelector(
  selectDecisionsState,
  (state) => state.total
);

export const selectDecisionsError = createSelector(
  selectDecisionsState,
  (state) => state.error
);

export const selectSelectedDecision = createSelector(
  selectDecisionsState,
  (state) => state.selectedDecision
);

export const selectDecisionDefinitions = createSelector(
  selectDecisionsState,
  (state) => state.decisionDefinitions
);

export const selectDecisionDefinitionsLoading = createSelector(
  selectDecisionsState,
  (state) => state.loadingDefinitions
);
