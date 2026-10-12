/**
 * Test: "With jobs retrying" filter support for removal-time-process operation
 *
 * Verifies that:
 * - The filter button is displayed in removal-time-process panel
 * - withJobsRetrying pill produces correct query parameter
 * - Combination with State filter works correctly
 * - Non-regression for other operations (delete-finished, set-retries-external, others)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';

describe('BatchOperationsWizardComponent — With jobs retrying filter for removal-time-process', () => {

  describe('buildHistoricQueryForBatch: withJobsRetrying support', () => {

    function buildQuery(operationId: string, pills: Array<{ field: string; values: string[] }>): Record<string, unknown> {
      const component = Object.create(BatchOperationsWizardComponent.prototype);
      component.selectedOperationId = operationId;
      component.filterCriteria = pills;
      component.vnIgnoreCase = false;
      component.vvIgnoreCase = false;
      return component.buildHistoricQueryForBatch();
    }

    it('removal-time-process: withJobsRetrying pill adds withJobsRetrying=true to query', () => {
      const result = buildQuery('removal-time-process', [{ field: 'withJobsRetrying', values: [] }]);
      expect(result['withJobsRetrying']).toBe(true);
    });

    it('removal-time-process: withJobsRetrying + State Running produces both parameters', () => {
      const result = buildQuery('removal-time-process', [
        { field: 'withJobsRetrying', values: [] },
        { field: 'state', values: ['active'] }
      ]);
      expect(result['withJobsRetrying']).toBe(true);
      expect(result['active']).toBe(true);
      expect(result['unfinished']).toBe(true);
    });

    it('removal-time-process: withJobsRetrying + State Completed produces both parameters', () => {
      const result = buildQuery('removal-time-process', [
        { field: 'withJobsRetrying', values: [] },
        { field: 'state', values: ['completed'] }
      ]);
      expect(result['withJobsRetrying']).toBe(true);
      expect(result['completed']).toBe(true);
      expect(result['finished']).toBe(true);
    });

    it('removal-time-process: withJobsRetrying + processDefinition produces both parameters', () => {
      const result = buildQuery('removal-time-process', [
        { field: 'withJobsRetrying', values: [] },
        { field: 'processDefinition', values: ['invoice'] }
      ]);
      expect(result['withJobsRetrying']).toBe(true);
      expect(result['processDefinitionKeyIn']).toEqual(['invoice']);
    });

    it('Non-regression: delete-finished excludes withJobsRetrying', () => {
      const result = buildQuery('delete-finished', [{ field: 'withJobsRetrying', values: [] }]);
      expect(result['withJobsRetrying']).toBeUndefined();
    });

    it('Non-regression: set-retries-external excludes withJobsRetrying', () => {
      const result = buildQuery('set-retries-external', [{ field: 'withJobsRetrying', values: [] }]);
      expect(result['withJobsRetrying']).toBeUndefined();
    });

    it('Non-regression: suspend includes withJobsRetrying', () => {
      const result = buildQuery('suspend', [{ field: 'withJobsRetrying', values: [] }]);
      expect(result['withJobsRetrying']).toBe(true);
    });

    it('Non-regression: activate includes withJobsRetrying', () => {
      const result = buildQuery('activate', [{ field: 'withJobsRetrying', values: [] }]);
      expect(result['withJobsRetrying']).toBe(true);
    });

    it('Non-regression: delete-running includes withJobsRetrying', () => {
      const result = buildQuery('delete-running', [{ field: 'withJobsRetrying', values: [] }]);
      expect(result['withJobsRetrying']).toBe(true);
    });

    it('Non-regression: set-retries-jobs includes withJobsRetrying', () => {
      const result = buildQuery('set-retries-jobs', [{ field: 'withJobsRetrying', values: [] }]);
      expect(result['withJobsRetrying']).toBe(true);
    });

    it('Non-regression: set-variables includes withJobsRetrying', () => {
      const result = buildQuery('set-variables', [{ field: 'withJobsRetrying', values: [] }]);
      expect(result['withJobsRetrying']).toBe(true);
    });

    it('Non-regression: correlate includes withJobsRetrying', () => {
      const result = buildQuery('correlate', [{ field: 'withJobsRetrying', values: [] }]);
      expect(result['withJobsRetrying']).toBe(true);
    });
  });

  describe('execute(): removal-time-process with withJobsRetrying in Query mode', () => {

    let component: BatchOperationsWizardComponent;
    let mockProcessInstanceService: any;

    beforeEach(() => {
      mockProcessInstanceService = {
        setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' }))
      };

      component = Object.create(BatchOperationsWizardComponent.prototype);
      component.processInstanceService = mockProcessInstanceService;
      component.selectedOperationId = 'removal-time-process';
      component.mode = 'query';
      component.filterCriteria = [{ field: 'withJobsRetrying', values: [] }];
      component.vnIgnoreCase = false;
      component.vvIgnoreCase = false;
      component.removalTimeMode = 'cleared';
      component.removalTimeHierarchical = false;
      component.removalTimeUpdateInChunks = false;
      component.removalTimeAbsoluteDate = '';
      component.destroyRef = { onDestroy: vi.fn() };
      component.cdr = { markForCheck: vi.fn() };
      component.clearSessionStorage = vi.fn();
    });

    it('Query mode: withJobsRetrying pill produces query with withJobsRetrying=true', async () => {
      component.execute();

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockProcessInstanceService.setRemovalTimeAsync).toHaveBeenCalledTimes(1);
      const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];

      expect(payload.historicProcessInstanceQuery).toBeDefined();
      expect(payload.historicProcessInstanceQuery['withJobsRetrying']).toBe(true);
      expect(payload.clearedRemovalTime).toBe(true);
    });

    it('Query mode: withJobsRetrying + State Running produces both parameters', async () => {
      component.filterCriteria = [
        { field: 'withJobsRetrying', values: [] },
        { field: 'state', values: ['active'] }
      ];

      component.execute();

      await new Promise(resolve => setTimeout(resolve, 20));

      const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];
      const query = payload.historicProcessInstanceQuery;

      expect(query['withJobsRetrying']).toBe(true);
      expect(query['active']).toBe(true);
      expect(query['unfinished']).toBe(true);
    });

    it('Query mode: withJobsRetrying + processDefinition produces both parameters', async () => {
      component.filterCriteria = [
        { field: 'withJobsRetrying', values: [] },
        { field: 'processDefinition', values: ['invoice', 'order'] }
      ];

      component.execute();

      await new Promise(resolve => setTimeout(resolve, 20));

      const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];
      const query = payload.historicProcessInstanceQuery;

      expect(query['withJobsRetrying']).toBe(true);
      expect(query['processDefinitionKeyIn']).toEqual(['invoice', 'order']);
    });
  });

  describe('Non-regression: step 1 → 2 → 3 flow for removal-time-process', () => {

    it('removal-time-process: step 1 → 2 → 3 flow with withJobsRetrying still works', async () => {
      const mockProcessInstanceService = {
        setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' }))
      };

      const component = Object.create(BatchOperationsWizardComponent.prototype);
      component.processInstanceService = mockProcessInstanceService;
      component.selectedOperationId = 'removal-time-process';
      component.mode = 'instances';
      component.selectedIds = new Set(['pi-1', 'pi-2']);
      component.filterCriteria = [{ field: 'withJobsRetrying', values: [] }];
      component.vnIgnoreCase = false;
      component.vvIgnoreCase = false;
      component.removalTimeMode = 'cleared';
      component.removalTimeHierarchical = false;
      component.removalTimeUpdateInChunks = false;
      component.removalTimeAbsoluteDate = '';
      component.destroyRef = { onDestroy: vi.fn() };
      component.cdr = { markForCheck: vi.fn() };
      component.clearSessionStorage = vi.fn();

      // Step 1: Select instances (already done above)
      expect(component.selectedIds.size).toBe(2);

      // Step 2: canContinue should be true
      component.currentStep = 1;
      expect(component.canContinue).toBe(true);

      // Step 3: Execute
      component.execute();

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockProcessInstanceService.setRemovalTimeAsync).toHaveBeenCalledTimes(1);
      expect(component.currentStep).toBe(3);
      expect(component.batchId).toBe('batch-123');
    });
  });
});
