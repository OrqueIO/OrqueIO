import { decisionsReducer } from './decisions.reducer';
import { initialDecisionsState, DecisionsState, decisionsAdapter } from './decisions.state';
import * as DecisionsActions from './decisions.actions';
import { DecisionInstance, DecisionDefinition } from '../../../services/cockpit.service';

describe('Decisions Reducer', () => {
  const mockInstance: DecisionInstance = {
    id: 'di-1',
    decisionDefinitionId: 'dd-1',
    decisionDefinitionKey: 'approveInvoice',
    evaluationTime: '2026-01-01T10:00:00.000+0000',
  };

  const mockInstance2: DecisionInstance = {
    id: 'di-2',
    decisionDefinitionId: 'dd-1',
    decisionDefinitionKey: 'approveInvoice',
    evaluationTime: '2026-01-02T10:00:00.000+0000',
    processInstanceId: 'pi-1',
  };

  const mockDefinitions: DecisionDefinition[] = [
    { id: 'dd-1', key: 'approveInvoice', name: 'Approve Invoice', version: 1, deploymentId: 'dep-1' },
    { id: 'dd-2', key: 'denyInvoice', name: 'Deny Invoice', version: 1, deploymentId: 'dep-1' },
  ];

  // =============================================
  // Initial state
  // =============================================

  describe('initial state', () => {
    it('should return the initial state for unknown action', () => {
      const action = { type: '@@INIT_UNKNOWN' } as any;
      const state = decisionsReducer(undefined, action);
      expect(state).toEqual(initialDecisionsState);
    });

    it('initial state should have empty entities', () => {
      expect(initialDecisionsState.ids).toEqual([]);
      expect(initialDecisionsState.entities).toEqual({});
    });

    it('initial state should have correct defaults', () => {
      expect(initialDecisionsState.loading).toBe(false);
      expect(initialDecisionsState.loadingDefinitions).toBe(false);
      expect(initialDecisionsState.error).toBeNull();
      expect(initialDecisionsState.selectedDecision).toBeNull();
      expect(initialDecisionsState.decisionDefinitions).toEqual([]);
      expect(initialDecisionsState.total).toBe(0);
    });
  });

  // =============================================
  // loadDecisionDefinitions
  // =============================================

  describe('loadDecisionDefinitions', () => {
    it('should set loadingDefinitions to true and clear error', () => {
      const state = decisionsReducer(
        { ...initialDecisionsState, error: 'prev error' },
        DecisionsActions.loadDecisionDefinitions()
      );
      expect(state.loadingDefinitions).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should not change loading for instances', () => {
      const state = decisionsReducer(
        initialDecisionsState,
        DecisionsActions.loadDecisionDefinitions()
      );
      expect(state.loading).toBe(false);
    });
  });

  describe('loadDecisionDefinitionsSuccess', () => {
    it('should set decisionDefinitions and turn off loadingDefinitions', () => {
      const prev = decisionsReducer(initialDecisionsState, DecisionsActions.loadDecisionDefinitions());
      const state = decisionsReducer(prev, DecisionsActions.loadDecisionDefinitionsSuccess({ definitions: mockDefinitions }));
      expect(state.decisionDefinitions).toEqual(mockDefinitions);
      expect(state.loadingDefinitions).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should replace previously loaded definitions', () => {
      const initial = { ...initialDecisionsState, decisionDefinitions: mockDefinitions };
      const newDefs = [mockDefinitions[0]];
      const state = decisionsReducer(initial, DecisionsActions.loadDecisionDefinitionsSuccess({ definitions: newDefs }));
      expect(state.decisionDefinitions).toEqual(newDefs);
    });
  });

  describe('loadDecisionDefinitionsFailure', () => {
    it('should set error and turn off loadingDefinitions', () => {
      const error = { message: 'HTTP 500' };
      const prev = decisionsReducer(initialDecisionsState, DecisionsActions.loadDecisionDefinitions());
      const state = decisionsReducer(prev, DecisionsActions.loadDecisionDefinitionsFailure({ error }));
      expect(state.error).toEqual(error);
      expect(state.loadingDefinitions).toBe(false);
    });

    it('should not clear decisionDefinitions on failure', () => {
      const withDefs = { ...initialDecisionsState, decisionDefinitions: mockDefinitions };
      const state = decisionsReducer(withDefs, DecisionsActions.loadDecisionDefinitionsFailure({ error: 'err' }));
      expect(state.decisionDefinitions).toEqual(mockDefinitions);
    });
  });

  // =============================================
  // loadDecisionInstances
  // =============================================

  describe('loadDecisionInstances', () => {
    it('should set loading to true and clear error', () => {
      const state = decisionsReducer(
        { ...initialDecisionsState, error: 'old error' },
        DecisionsActions.loadDecisionInstances({})
      );
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadDecisionInstancesSuccess', () => {
    it('should replace all instances via setAll and update total', () => {
      const prev = decisionsReducer(initialDecisionsState, DecisionsActions.loadDecisionInstances({}));
      const state = decisionsReducer(
        prev,
        DecisionsActions.loadDecisionInstancesSuccess({ instances: [mockInstance, mockInstance2] })
      );
      const allIds = state.ids as string[];
      expect(allIds).toContain('di-1');
      expect(allIds).toContain('di-2');
      expect(state.total).toBe(2);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear previous instances when new list is loaded', () => {
      const withInstances = decisionsAdapter.setAll([mockInstance, mockInstance2], {
        ...initialDecisionsState, total: 2
      });
      const state = decisionsReducer(
        withInstances,
        DecisionsActions.loadDecisionInstancesSuccess({ instances: [mockInstance] })
      );
      expect((state.ids as string[]).length).toBe(1);
      expect(state.total).toBe(1);
    });
  });

  describe('loadDecisionInstancesFailure', () => {
    it('should set error and turn off loading', () => {
      const error = 'Network error';
      const state = decisionsReducer(
        { ...initialDecisionsState, loading: true },
        DecisionsActions.loadDecisionInstancesFailure({ error })
      );
      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });
  });

  // =============================================
  // loadDecisionInstance (detail)
  // =============================================

  describe('loadDecisionInstance', () => {
    it('should set loading to true and clear error', () => {
      const state = decisionsReducer(
        initialDecisionsState,
        DecisionsActions.loadDecisionInstance({ decisionId: 'di-1' })
      );
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadDecisionInstanceSuccess', () => {
    it('should set selectedDecision and turn off loading', () => {
      const prev = decisionsReducer(
        initialDecisionsState,
        DecisionsActions.loadDecisionInstance({ decisionId: 'di-1' })
      );
      const state = decisionsReducer(
        prev,
        DecisionsActions.loadDecisionInstanceSuccess({ decision: mockInstance })
      );
      expect(state.selectedDecision).toEqual(mockInstance);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadDecisionInstanceFailure', () => {
    it('should set error and turn off loading', () => {
      const state = decisionsReducer(
        { ...initialDecisionsState, loading: true },
        DecisionsActions.loadDecisionInstanceFailure({ error: 'Not found' })
      );
      expect(state.error).toBe('Not found');
      expect(state.loading).toBe(false);
    });
  });

  // =============================================
  // clearSelectedDecision
  // =============================================

  describe('clearSelectedDecision', () => {
    it('should set selectedDecision to null', () => {
      const withSelected = { ...initialDecisionsState, selectedDecision: mockInstance };
      const state = decisionsReducer(withSelected, DecisionsActions.clearSelectedDecision());
      expect(state.selectedDecision).toBeNull();
    });

    it('should not affect other state slices', () => {
      const withData = {
        ...decisionsAdapter.setAll([mockInstance], initialDecisionsState),
        decisionDefinitions: mockDefinitions,
        total: 1,
      };
      const state = decisionsReducer(withData, DecisionsActions.clearSelectedDecision());
      expect((state.ids as string[]).length).toBe(1);
      expect(state.decisionDefinitions).toEqual(mockDefinitions);
      expect(state.total).toBe(1);
    });
  });
});
