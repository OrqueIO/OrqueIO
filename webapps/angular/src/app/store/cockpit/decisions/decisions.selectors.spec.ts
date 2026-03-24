import { decisionsAdapter, DecisionsState, initialDecisionsState } from './decisions.state';
import {
  selectAllDecisionInstances,
  selectDecisionInstanceEntities,
  selectDecisionInstanceIds,
  selectDecisionsLoading,
  selectDecisionsTotal,
  selectDecisionsError,
  selectSelectedDecision,
  selectDecisionDefinitions,
  selectDecisionDefinitionsLoading,
} from './decisions.selectors';
import { DecisionInstance, DecisionDefinition } from '../../../services/cockpit.service';

describe('Decisions Selectors', () => {
  const mockInstance1: DecisionInstance = {
    id: 'di-1',
    decisionDefinitionId: 'dd-1',
    decisionDefinitionKey: 'approveInvoice',
    evaluationTime: '2026-01-01T10:00:00.000+0000',
  };

  const mockInstance2: DecisionInstance = {
    id: 'di-2',
    decisionDefinitionId: 'dd-2',
    decisionDefinitionKey: 'denyInvoice',
    evaluationTime: '2026-01-02T10:00:00.000+0000',
    processInstanceId: 'pi-99',
  };

  const mockDefinitions: DecisionDefinition[] = [
    { id: 'dd-1', key: 'approveInvoice', name: 'Approve Invoice', version: 1, deploymentId: 'dep-1' },
    { id: 'dd-2', key: 'denyInvoice', name: 'Deny Invoice', version: 2, deploymentId: 'dep-1' },
  ];

  // Build a feature state with two instances loaded
  const populatedState: { cockpitDecisions: DecisionsState } = {
    cockpitDecisions: {
      ...decisionsAdapter.setAll([mockInstance1, mockInstance2], initialDecisionsState),
      selectedDecision: mockInstance1,
      decisionDefinitions: mockDefinitions,
      total: 2,
      loading: false,
      loadingDefinitions: false,
      error: null,
    },
  };

  const emptyState: { cockpitDecisions: DecisionsState } = {
    cockpitDecisions: { ...initialDecisionsState },
  };

  const loadingState: { cockpitDecisions: DecisionsState } = {
    cockpitDecisions: {
      ...initialDecisionsState,
      loading: true,
      loadingDefinitions: true,
      error: { code: 500 },
    },
  };

  // =============================================
  // Entity selectors
  // =============================================

  describe('selectAllDecisionInstances', () => {
    it('should return all instances as array', () => {
      const result = selectAllDecisionInstances(populatedState);
      expect(result.length).toBe(2);
      expect(result).toContainEqual(mockInstance1);
      expect(result).toContainEqual(mockInstance2);
    });

    it('should return empty array when no instances', () => {
      expect(selectAllDecisionInstances(emptyState)).toEqual([]);
    });
  });

  describe('selectDecisionInstanceEntities', () => {
    it('should return entities map keyed by id', () => {
      const entities = selectDecisionInstanceEntities(populatedState);
      expect(entities['di-1']).toEqual(mockInstance1);
      expect(entities['di-2']).toEqual(mockInstance2);
    });

    it('should return empty map when no instances', () => {
      expect(selectDecisionInstanceEntities(emptyState)).toEqual({});
    });
  });

  describe('selectDecisionInstanceIds', () => {
    it('should return array of ids', () => {
      const ids = selectDecisionInstanceIds(populatedState) as string[];
      expect(ids).toContain('di-1');
      expect(ids).toContain('di-2');
    });

    it('should return empty array when no instances', () => {
      expect(selectDecisionInstanceIds(emptyState)).toEqual([]);
    });
  });

  // =============================================
  // Loading / error selectors
  // =============================================

  describe('selectDecisionsLoading', () => {
    it('should return false when not loading', () => {
      expect(selectDecisionsLoading(populatedState)).toBe(false);
    });

    it('should return true when loading', () => {
      expect(selectDecisionsLoading(loadingState)).toBe(true);
    });
  });

  describe('selectDecisionDefinitionsLoading', () => {
    it('should return false when not loading definitions', () => {
      expect(selectDecisionDefinitionsLoading(populatedState)).toBe(false);
    });

    it('should return true when loading definitions', () => {
      expect(selectDecisionDefinitionsLoading(loadingState)).toBe(true);
    });
  });

  describe('selectDecisionsError', () => {
    it('should return null when no error', () => {
      expect(selectDecisionsError(populatedState)).toBeNull();
    });

    it('should return the error object', () => {
      expect(selectDecisionsError(loadingState)).toEqual({ code: 500 });
    });
  });

  // =============================================
  // Business selectors
  // =============================================

  describe('selectDecisionsTotal', () => {
    it('should return total count', () => {
      expect(selectDecisionsTotal(populatedState)).toBe(2);
    });

    it('should return 0 for empty state', () => {
      expect(selectDecisionsTotal(emptyState)).toBe(0);
    });
  });

  describe('selectSelectedDecision', () => {
    it('should return the selected decision', () => {
      expect(selectSelectedDecision(populatedState)).toEqual(mockInstance1);
    });

    it('should return null when no decision is selected', () => {
      expect(selectSelectedDecision(emptyState)).toBeNull();
    });
  });

  describe('selectDecisionDefinitions', () => {
    it('should return the list of definitions', () => {
      const defs = selectDecisionDefinitions(populatedState);
      expect(defs).toEqual(mockDefinitions);
      expect(defs.length).toBe(2);
    });

    it('should return empty array when no definitions loaded', () => {
      expect(selectDecisionDefinitions(emptyState)).toEqual([]);
    });
  });
});
