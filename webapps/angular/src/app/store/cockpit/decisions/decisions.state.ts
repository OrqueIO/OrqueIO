import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { DecisionInstance, DecisionDefinition } from '../../../services/cockpit.service';

export interface DecisionsState extends EntityState<DecisionInstance> {
  selectedDecision: DecisionInstance | null;
  decisionDefinitions: DecisionDefinition[];
  total: number;
  loading: boolean;
  loadingDefinitions: boolean;
  error: any;
}

export const decisionsAdapter: EntityAdapter<DecisionInstance> = createEntityAdapter<DecisionInstance>({
  selectId: (decision: DecisionInstance) => decision.id
});

export const initialDecisionsState: DecisionsState = decisionsAdapter.getInitialState({
  selectedDecision: null,
  decisionDefinitions: [],
  total: 0,
  loading: false,
  loadingDefinitions: false,
  error: null
});
