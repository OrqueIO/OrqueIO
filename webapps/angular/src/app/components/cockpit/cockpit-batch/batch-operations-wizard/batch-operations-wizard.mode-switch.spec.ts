/**
 * Test: Mode switch scenario - Instances → Query
 *
 * Reproduces user scenario:
 * 1. User selects 2 instances in Instances mode
 * 2. User switches to Query mode
 * 3. User applies State filter
 * 4. User executes operation
 *
 * Expected: Only historicProcessInstanceQuery is sent (no ids)
 */

import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';

describe('BatchOperationsWizardComponent — Mode switch regression', () => {

  it('Query mode ignores selectedIds even if not empty (defensive)', async () => {
    const mockProcessInstanceService = {
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' }))
    };

    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.processInstanceService = mockProcessInstanceService;
    component.selectedOperationId = 'removal-time-process';

    // Step 1: Instances mode with 2 selected ids
    component.mode = 'instances';
    component.selectedIds = new Set(['pi-1', 'pi-2']);

    // Step 2: Switch to Query mode (should clear selectedIds via setMode, but test defensive code)
    component.mode = 'query';
    // Defensive: selectedIds NOT cleared (simulates bug or manual mode change)
    // component.selectedIds still has ['pi-1', 'pi-2']

    // Step 3: Apply State filter
    component.filterCriteria = [
      { field: 'state', values: ['active'] },
      { field: 'processDefinition', values: ['invoice'] }
    ];

    // Step 4: Execute
    component.removalTimeMode = 'calculated';
    component.removalTimeHierarchical = false;
    component.removalTimeUpdateInChunks = false;
    component.removalTimeAbsoluteDate = '';
    component.destroyRef = { onDestroy: vi.fn() };
    component.cdr = { markForCheck: vi.fn() };

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify: Only Query is sent, NOT ids
    const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];

    expect(payload.historicProcessInstanceIds).toBeUndefined();
    expect(payload.historicProcessInstanceQuery).toBeDefined();
    expect(payload.historicProcessInstanceQuery.active).toBe(true);
    expect(payload.historicProcessInstanceQuery.unfinished).toBe(true);
    expect(payload.historicProcessInstanceQuery.processDefinitionKeyIn).toEqual(['invoice']);
  });

  it('setMode() clears selectedIds when switching from Instances to Query', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.mode = 'instances';
    component.selectedIds = new Set(['pi-1', 'pi-2']);
    component.selectedDecisionIds = new Set(['di-1']);
    component.cdr = { markForCheck: vi.fn() };
    component.saveToSessionStorage = vi.fn();

    component.setMode('query');

    expect(component.mode).toBe('query');
    expect(component.selectedIds.size).toBe(0);
    expect(component.selectedDecisionIds.size).toBe(0);
  });
});