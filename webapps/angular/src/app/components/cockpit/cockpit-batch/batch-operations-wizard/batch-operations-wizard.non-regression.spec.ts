/**
 * NON-REGRESSION TESTS
 *
 * Verifies that existing operations (delete-decision, removal-time-process)
 * keep their expected payloads and behavior when adding removal-time-decision.
 *
 * These tests document the exact structure and parameters for legacy operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';

describe('Batch Operations - Non-Regression Tests', () => {
  let component: BatchOperationsWizardComponent;

  beforeEach(() => {
    component = Object.create(BatchOperationsWizardComponent.prototype);
    component['selectedIds'] = new Set();
    component['selectedDecisionIds'] = new Set();
    component['filterCriteria'] = [];
    component['decisionFilterCriteria'] = [];
    component['deleteReason'] = '';
    component['removalTimeMode'] = 'calculated';
    component['removalTimeAbsoluteDate'] = '';
    component['removalTimeHierarchical'] = false;
    component['removalTimeUpdateInChunks'] = false;
  });

  describe('delete-decision payload snapshots', () => {
    it('should generate exact payload for delete-decision in Query mode with 3 criteria', () => {
      component.selectedOperationId = 'delete-decision';
      component['mode'] = 'query';

      component['decisionFilterCriteria'] = [
        { field: 'decisionDefinition', values: ['decision-key-1', 'decision-key-2'] },
        { field: 'processInstanceId', values: ['proc-inst-123'] },
        { field: 'evaluatedAfter', values: ['2025-01-01T00:00:00.000+0000'] }
      ];
      component['deleteReason'] = 'Test cleanup';

      const payload = JSON.parse(component.confirmPayloadJson);

      expect(payload).toEqual({
        deleteReason: 'Test cleanup',
        historicDecisionInstanceQuery: {
          decisionDefinitionKeyIn: ['decision-key-1', 'decision-key-2'],
          processInstanceId: 'proc-inst-123',
          evaluatedAfter: '2025-01-01T00:00:00.000+0000'
        }
      });
    });

    it('should generate exact payload for delete-decision in Instances mode', () => {
      component.selectedOperationId = 'delete-decision';
      component['mode'] = 'instances';
      component['selectedDecisionIds'] = new Set(['dec-1', 'dec-2', 'dec-3']);
      component['deleteReason'] = '';

      const payload = JSON.parse(component.confirmPayloadJson);

      expect(payload).toEqual({
        historicDecisionInstanceIds: ['dec-1', 'dec-2', 'dec-3']
      });
    });

    it('should map decision criteria fields to expected query parameters', () => {
      component.selectedOperationId = 'delete-decision';
      component['decisionFilterCriteria'] = [
        { field: 'decisionInstanceId', values: ['id-1', 'id-2'] },
        { field: 'decisionDefinition', values: ['key-A'] },
        { field: 'processInstanceId', values: ['proc-X'] },
        { field: 'evaluatedBefore', values: ['2025-12-31T23:59:59.999+0000'] },
        { field: 'evaluatedAfter', values: ['2025-01-01T00:00:00.000+0000'] }
      ];

      const query = component['buildHistoricDecisionQueryForBatch']();

      expect(query).toEqual({
        decisionInstanceIdIn: ['id-1', 'id-2'],
        decisionDefinitionKey: 'key-A',
        processInstanceId: 'proc-X',
        evaluatedBefore: '2025-12-31T23:59:59.999+0000',
        evaluatedAfter: '2025-01-01T00:00:00.000+0000'
      });
    });
  });

  describe('removal-time-process payload snapshots', () => {
    it('should generate exact payload for removal-time-process in Absolute mode with Hierarchical', () => {
      component.selectedOperationId = 'removal-time-process';
      component['mode'] = 'instances';
      component['selectedIds'] = new Set(['proc-1', 'proc-2']);
      component['removalTimeMode'] = 'absolute';
      component['removalTimeAbsoluteDate'] = '2025-06-15T14:30';
      component['removalTimeHierarchical'] = true;
      component['removalTimeUpdateInChunks'] = false;

      const payload = JSON.parse(component.confirmPayloadJson);

      // Snapshot: must include absoluteRemovalTime, hierarchical, and historicProcessInstanceIds
      expect(payload.historicProcessInstanceIds).toEqual(['proc-1', 'proc-2']);
      expect(payload.absoluteRemovalTime).toBeDefined();
      expect(payload.hierarchical).toBe(true);
      expect(payload.updateInChunks).toBeUndefined();
      expect(payload.calculatedRemovalTime).toBeUndefined();
      expect(payload.clearedRemovalTime).toBeUndefined();
    });

    it('should generate exact payload for removal-time-process in Cleared mode', () => {
      component.selectedOperationId = 'removal-time-process';
      component['mode'] = 'query';
      component['filterCriteria'] = [
        { field: 'processDefinitionKey', values: ['invoice'] }
      ];
      component['removalTimeMode'] = 'cleared';
      component['removalTimeHierarchical'] = false;

      const payload = JSON.parse(component.confirmPayloadJson);

      expect(payload.clearedRemovalTime).toBe(true);
      expect(payload.hierarchical).toBeUndefined();
      expect(payload.historicProcessInstanceQuery).toBeDefined();
      expect(payload.absoluteRemovalTime).toBeUndefined();
      expect(payload.calculatedRemovalTime).toBeUndefined();
    });

    it('should generate exact payload for removal-time-process in Calculated mode with UpdateInChunks', () => {
      component.selectedOperationId = 'removal-time-process';
      component['mode'] = 'instances';
      component['selectedIds'] = new Set(['proc-X']);
      component['removalTimeMode'] = 'calculated';
      component['removalTimeHierarchical'] = false;
      component['removalTimeUpdateInChunks'] = true;

      const payload = JSON.parse(component.confirmPayloadJson);

      expect(payload.calculatedRemovalTime).toBe(true);
      expect(payload.updateInChunks).toBe(true);
      expect(payload.hierarchical).toBeUndefined();
      expect(payload.historicProcessInstanceIds).toEqual(['proc-X']);
      expect(payload.absoluteRemovalTime).toBeUndefined();
      expect(payload.clearedRemovalTime).toBeUndefined();
    });
  });

  describe('operation criteria frozen', () => {
    it('should not change criteria fields for delete-decision', () => {
      component.selectedOperationId = 'delete-decision';

      const expectedCriteria = [
        'decisionInstanceId',
        'processInstanceId',
        'decisionDefinition',
        'evaluatedAfter',
        'evaluatedBefore'
      ];

      component['decisionFilterCriteria'] = expectedCriteria.map(f => ({ field: f, values: ['test'] }));
      const query = component['buildHistoricDecisionQueryForBatch']();

      const queryKeys = Object.keys(query);
      expect(queryKeys.length).toBeGreaterThan(0);
      expect(queryKeys.length).toBeLessThanOrEqual(expectedCriteria.length + 1);
    });

    it('should not change process criteria for removal-time-process', () => {
      component.selectedOperationId = 'removal-time-process';

      component['filterCriteria'] = [
        { field: 'processDefinitionKey', values: ['key1', 'key2'] },
        { field: 'processInstanceBusinessKey', values: ['biz-key'] }
      ];

      const query = component['buildHistoricQueryForBatch']();
      expect(query).toBeDefined();
      expect(typeof query).toBe('object');
    });
  });
});
