/**
 * Test de garde-fou : flux étape 1 → 2 → 3 pour TOUTES les opérations
 *
 * Objectif : Prouver que le rollback de la navigation n'a cassé aucune opération.
 * Vérifie pour chaque opération du wizard :
 * - Sélection de l'opération
 * - continue() : étape 1 → 2
 * - execute() : étape 2 → 3
 * - back() : retour à l'étape précédente
 *
 * SANS mock du routeur (code sans navigation URL).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { of } from 'rxjs';

describe('BatchOperationsWizardComponent — Step flow guard (ALL operations)', () => {

  let component: BatchOperationsWizardComponent;
  let mockProcessInstanceService: any;
  let mockDecisionInstanceService: any;

  beforeEach(() => {
    mockProcessInstanceService = {
      suspendInstancesAsync: vi.fn().mockReturnValue(of({ id: 'batch-suspend-or-activate' })),
      deleteInstancesAsync: vi.fn().mockReturnValue(of({ id: 'batch-delete-running' })),
      deleteFinishedInstancesAsync: vi.fn().mockReturnValue(of({ id: 'batch-delete-finished' })),
      setJobRetriesAsync: vi.fn().mockReturnValue(of({ id: 'batch-set-retries-jobs' })),
      setExternalTaskRetriesAsync: vi.fn().mockReturnValue(of({ id: 'batch-set-retries-external' })),
      setVariablesAsync: vi.fn().mockReturnValue(of({ id: 'batch-set-variables' })),
      correlateMessageAsync: vi.fn().mockReturnValue(of({ id: 'batch-correlate' })),
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-removal-time' }))
    };

    mockDecisionInstanceService = {
      deleteDecisionInstancesAsync: vi.fn().mockReturnValue(of({ id: 'batch-delete-decision' }))
    };

    component = Object.create(BatchOperationsWizardComponent.prototype);
    component.processInstanceService = mockProcessInstanceService;
    component.decisionService = mockDecisionInstanceService;
    component.cdr = { markForCheck: vi.fn() };
    component.destroyRef = { onDestroy: vi.fn() };
    component.currentStep = 1;
    component.executing = false;
    component.mode = 'instances';
  });

  describe('suspend operation', () => {
    it('step 1 → 2 → 3 → back to 2', async () => {
      component.selectedOperationId = 'suspend';
      component.selectedIds = new Set(['pi-1', 'pi-2']);
      expect(component.currentStep).toBe(1);

      // Step 1 → 2
      component.continue();
      expect(component.currentStep).toBe(2);

      // Step 2 → 3
      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.suspendInstancesAsync).toHaveBeenCalledTimes(1);

      // Back 3 → 2
      component.executing = false; // Reset after execution
      component.back();
      expect(component.currentStep).toBe(2);
    });
  });

  describe('activate operation', () => {
    it('step 1 → 2 → 3', async () => {
      component.selectedOperationId = 'activate';
      component.selectedIds = new Set(['pi-3', 'pi-4']);
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.suspendInstancesAsync).toHaveBeenCalledWith(
        expect.objectContaining({ suspended: false, processInstanceIds: ['pi-3', 'pi-4'] })
      );
    });
  });

  describe('delete-running operation', () => {
    it('step 1 → 2 → 3', async () => {
      component.selectedOperationId = 'delete-running';
      component.selectedIds = new Set(['pi-5']);
      component.deleteReason = 'Test deletion';
      component.skipCustomListeners = false;
      component.skipIoMappings = false;
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.deleteInstancesAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete-finished operation', () => {
    it('step 1 → 2 → 3', async () => {
      component.selectedOperationId = 'delete-finished';
      component.selectedIds = new Set(['pi-6', 'pi-7']);
      component.deleteReason = '';
      component.skipCustomListeners = false;
      component.skipIoMappings = false;
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.deleteFinishedInstancesAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('set-retries-jobs operation', () => {
    it('step 1 → 2 → 3', async () => {
      component.selectedOperationId = 'set-retries-jobs';
      component.selectedIds = new Set(['pi-8']);
      component.retries = 3;
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.setJobRetriesAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('set-retries-external operation', () => {
    it('step 1 → 2 → 3', async () => {
      component.selectedOperationId = 'set-retries-external';
      component.selectedIds = new Set(['pi-9', 'pi-10']);
      component.retries = 5;
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.setExternalTaskRetriesAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('set-variables operation', () => {
    it('step 1 → 2 → 3', async () => {
      component.selectedOperationId = 'set-variables';
      component.selectedIds = new Set(['pi-11']);
      // canContinue requires variableDefinitions with at least one valid variable
      component.variableDefinitions = [{ name: 'status', value: 'approved', type: 'String' }];
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      // execute() calls buildVariablesPayload(this.variableDefinitions)
      // Mock buildVariablesPayload to avoid parsing complexity
      component.buildVariablesPayload = vi.fn().mockReturnValue({
        status: { value: 'approved', type: 'String' }
      });

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.setVariablesAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('correlate operation', () => {
    it('step 1 → 2 → 3', async () => {
      component.selectedOperationId = 'correlate';
      component.selectedIds = new Set(['pi-12', 'pi-13']);
      // canContinue is true for correlate with selectedIds (no message name required for continue)
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      // execute() requires correlateMessageName and buildVariablesPayload
      component.correlateMessageName = 'MessageReceived';
      component.correlateVariableDefs = [];
      // Mock buildVariablesPayload to return empty object
      component.buildVariablesPayload = vi.fn().mockReturnValue({});

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.correlateMessageAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('removal-time-process operation', () => {
    it('step 1 → 2 → 3 with cleared mode', async () => {
      component.selectedOperationId = 'removal-time-process';
      component.selectedIds = new Set(['pi-14', 'pi-15', 'pi-16']);
      component.removalTimeMode = 'cleared';
      component.removalTimeHierarchical = false;
      component.removalTimeUpdateInChunks = false;
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.setRemovalTimeAsync).toHaveBeenCalledTimes(1);
    });

    it('step 1 → 2 → 3 with calculated mode', async () => {
      component.selectedOperationId = 'removal-time-process';
      component.selectedIds = new Set(['pi-17']);
      component.removalTimeMode = 'calculated';
      component.removalTimeHierarchical = true;
      component.removalTimeUpdateInChunks = false;
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.setRemovalTimeAsync).toHaveBeenCalledTimes(1);
    });

    it('step 1 → 2 → 3 with absolute mode', async () => {
      component.selectedOperationId = 'removal-time-process';
      component.selectedIds = new Set(['pi-18']);
      component.removalTimeMode = 'absolute';
      component.removalTimeAbsoluteDate = '2027-12-31T23:59:59.999+00:00';
      component.removalTimeHierarchical = false;
      component.removalTimeUpdateInChunks = true;
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockProcessInstanceService.setRemovalTimeAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete-decision operation', () => {
    it('step 1 → 2 → 3', async () => {
      component.selectedOperationId = 'delete-decision';
      component.selectedDecisionIds = new Set(['di-1', 'di-2']);
      component.deleteReason = '';
      expect(component.currentStep).toBe(1);

      component.continue();
      expect(component.currentStep).toBe(2);

      component.execute();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(component.currentStep).toBe(3);
      expect(mockDecisionInstanceService.deleteDecisionInstancesAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('back() behavior from step 2', () => {
    it('goes back to step 1 when at step 2', () => {
      component.selectedOperationId = 'suspend';
      component.selectedIds = new Set(['pi-99']);
      component.currentStep = 2;

      component.back();
      expect(component.currentStep).toBe(1);
    });

    it('does nothing when already at step 1', () => {
      component.currentStep = 1;
      component.back();
      expect(component.currentStep).toBe(1);
    });
  });
});