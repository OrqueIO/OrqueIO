/**
 * Test: Set removal time (processes) batch operation
 *
 * Covers:
 * - buildHistoricQueryForBatch: state criterion mapping for all states
 * - execute(): payload construction for all modes (absolute/cleared/calculated)
 * - execute(): multi-batch logic for multiple states and "terminated"
 * - Consistency between displayed instances and batch queries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, forkJoin } from 'rxjs';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { MultiValueFilter } from '../../../../services/cockpit.service';

function getLockedFilterState(selectedOperationId: string): string | null {
  const desc = Object.getOwnPropertyDescriptor(BatchOperationsWizardComponent.prototype, 'lockedFilterState');
  return desc?.get?.call({ selectedOperationId }) as string | null;
}

function buildQuery(
  selectedOperationId: string,
  filterCriteria: MultiValueFilter[]
): Record<string, unknown> {
  const stub = {
    selectedOperationId,
    filterCriteria,
    vnIgnoreCase: false,
    vvIgnoreCase: false,
    lockedFilterState: getLockedFilterState(selectedOperationId)
  };
  return BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch.call(stub);
}

describe('BatchOperationsWizardComponent — removal-time-process: buildHistoricQueryForBatch state mapping', () => {

  it('single state: active → active=true, unfinished=true', () => {
    const result = buildQuery('removal-time-process', [
      { field: 'state', values: ['active'] }
    ]);

    expect(result['active']).toBe(true);
    expect(result['unfinished']).toBe(true);
    expect(result['suspended']).toBeUndefined();
    expect(result['completed']).toBeUndefined();
    expect(result['finished']).toBeUndefined();
  });

  it('single state: suspended → suspended=true, unfinished=true', () => {
    const result = buildQuery('removal-time-process', [
      { field: 'state', values: ['suspended'] }
    ]);

    expect(result['suspended']).toBe(true);
    expect(result['unfinished']).toBe(true);
    expect(result['active']).toBeUndefined();
    expect(result['completed']).toBeUndefined();
    expect(result['finished']).toBeUndefined();
  });

  it('single state: completed → completed=true, finished=true', () => {
    const result = buildQuery('removal-time-process', [
      { field: 'state', values: ['completed'] }
    ]);

    expect(result['completed']).toBe(true);
    expect(result['finished']).toBe(true);
    expect(result['active']).toBeUndefined();
    expect(result['suspended']).toBeUndefined();
    expect(result['unfinished']).toBeUndefined();
  });

  it('single state: terminated → finished=true, internallyTerminated=true', () => {
    const result = buildQuery('removal-time-process', [
      { field: 'state', values: ['terminated'] }
    ]);

    expect(result['finished']).toBe(true);
    expect(result['internallyTerminated']).toBe(true);
    expect(result['externallyTerminated']).toBeUndefined();
    expect(result['completed']).toBeUndefined();
    expect(result['active']).toBeUndefined();
    expect(result['suspended']).toBeUndefined();
  });

  it('no state criterion → no state restrictions in query', () => {
    const result = buildQuery('removal-time-process', [
      { field: 'processDefinition', values: ['invoice'] }
    ]);

    expect(result['active']).toBeUndefined();
    expect(result['suspended']).toBeUndefined();
    expect(result['completed']).toBeUndefined();
    expect(result['finished']).toBeUndefined();
    expect(result['unfinished']).toBeUndefined();
    expect(result['processDefinitionKeyIn']).toEqual(['invoice']);
  });

  it('multiple states in single pill → only first value processed (multi-batch strategy handles rest)', () => {
    const result = buildQuery('removal-time-process', [
      { field: 'state', values: ['active', 'suspended'] }
    ]);

    // buildHistoricQueryForBatch only processes length===1 for state
    // Multi-state is handled by execute() creating multiple batches
    expect(result['active']).toBeUndefined();
    expect(result['suspended']).toBeUndefined();
  });

  it('state + processDefinition → both criteria applied', () => {
    const result = buildQuery('removal-time-process', [
      { field: 'state', values: ['active'] },
      { field: 'processDefinition', values: ['invoice', 'order'] }
    ]);

    expect(result['active']).toBe(true);
    expect(result['unfinished']).toBe(true);
    expect(result['processDefinitionKeyIn']).toEqual(['invoice', 'order']);
  });

  it('state + businessKey → both criteria applied', () => {
    const result = buildQuery('removal-time-process', [
      { field: 'state', values: ['completed'] },
      { field: 'businessKey', values: ['BK-001'] }
    ]);

    expect(result['completed']).toBe(true);
    expect(result['finished']).toBe(true);
    expect(result['processInstanceBusinessKeyLike']).toBe('%BK-001%');
  });
});

describe('BatchOperationsWizardComponent — removal-time-process: execute() payload construction', () => {

  let component: BatchOperationsWizardComponent;
  let mockProcessInstanceService: any;

  beforeEach(() => {
    mockProcessInstanceService = {
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' }))
    };

    component = Object.create(BatchOperationsWizardComponent.prototype);
    component.processInstanceService = mockProcessInstanceService;
    component.selectedOperationId = 'removal-time-process';
    component.mode = 'instances';
    component.selectedIds = new Set(['pi-1', 'pi-2']);
    component.filterCriteria = [];
    component.removalTimeMode = 'cleared';
    component.removalTimeAbsoluteDate = '';
    component.removalTimeHierarchical = false;
    component.removalTimeUpdateInChunks = false;
    component.destroyRef = { onDestroy: vi.fn() };
    component.cdr = { markForCheck: vi.fn() };
  });

  it('Instances mode + cleared → clearedRemovalTime=true', async () => {
    component.removalTimeMode = 'cleared';

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(mockProcessInstanceService.setRemovalTimeAsync).toHaveBeenCalledTimes(1);
    const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];

    expect(payload.historicProcessInstanceIds).toEqual(['pi-1', 'pi-2']);
    expect(payload.clearedRemovalTime).toBe(true);
    expect(payload.calculatedRemovalTime).toBeUndefined();
    expect(payload.absoluteRemovalTime).toBeUndefined();
    expect(payload.hierarchical).toBeUndefined();
    expect(payload.updateInChunks).toBeUndefined();
  });

  it('Instances mode + calculated → calculatedRemovalTime=true', async () => {
    component.removalTimeMode = 'calculated';

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 20));

    const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];

    expect(payload.calculatedRemovalTime).toBe(true);
    expect(payload.clearedRemovalTime).toBeUndefined();
    expect(payload.absoluteRemovalTime).toBeUndefined();
  });

  it('Instances mode + absolute → absoluteRemovalTime with ISO8601 date', async () => {
    component.removalTimeMode = 'absolute';
    component.removalTimeAbsoluteDate = '2027-12-31T23:59:59.999+00:00';

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 20));

    const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];

    expect(payload.absoluteRemovalTime).toBeDefined();
    expect(payload.absoluteRemovalTime).toContain('2027-12-31');
    expect(payload.clearedRemovalTime).toBeUndefined();
    expect(payload.calculatedRemovalTime).toBeUndefined();
  });

  it('hierarchical=true → hierarchical in payload', async () => {
    component.removalTimeHierarchical = true;

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 20));

    const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];
    expect(payload.hierarchical).toBe(true);
  });

  it('updateInChunks=true → updateInChunks in payload', async () => {
    component.removalTimeUpdateInChunks = true;

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 20));

    const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];
    expect(payload.updateInChunks).toBe(true);
  });
});

describe('BatchOperationsWizardComponent — removal-time-process: multi-batch execution', () => {

  let component: BatchOperationsWizardComponent;
  let mockProcessInstanceService: any;

  beforeEach(() => {
    mockProcessInstanceService = {
      setRemovalTimeAsync: vi.fn((payload) => of({ id: `batch-${Date.now()}` }))
    };

    component = Object.create(BatchOperationsWizardComponent.prototype);
    component.processInstanceService = mockProcessInstanceService;
    component.selectedOperationId = 'removal-time-process';
    component.mode = 'query';
    component.selectedIds = new Set(); // Empty in query mode
    component.removalTimeMode = 'calculated';
    component.removalTimeAbsoluteDate = '';
    component.removalTimeHierarchical = false;
    component.removalTimeUpdateInChunks = false;
    component.destroyRef = { onDestroy: vi.fn() };
    component.cdr = { markForCheck: vi.fn() };
  });

  it('Query mode + single state → historicProcessInstanceQuery only (no ids)', async () => {
    component.filterCriteria = [
      { field: 'state', values: ['active'] },
      { field: 'processDefinition', values: ['invoice'] }
    ];

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 20));

    const payload = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];

    expect(payload.historicProcessInstanceIds).toBeUndefined();
    expect(payload.historicProcessInstanceQuery).toBeDefined();
    expect(payload.historicProcessInstanceQuery.active).toBe(true);
    expect(payload.historicProcessInstanceQuery.unfinished).toBe(true);
    expect(payload.historicProcessInstanceQuery.processDefinitionKeyIn).toEqual(['invoice']);
  });

  it('Query mode + multiple states (active + suspended) → 2 batches created', async () => {
    component.filterCriteria = [
      { field: 'state', values: ['active', 'suspended'] },
      { field: 'processDefinition', values: ['invoice'] }
    ];

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 30));

    const calls = mockProcessInstanceService.setRemovalTimeAsync.mock.calls;
    expect(calls.length).toBe(2);

    // First batch: active
    expect(calls[0][0].historicProcessInstanceQuery.active).toBe(true);
    expect(calls[0][0].historicProcessInstanceQuery.unfinished).toBe(true);
    expect(calls[0][0].historicProcessInstanceQuery.processDefinitionKeyIn).toEqual(['invoice']);

    // Second batch: suspended
    expect(calls[1][0].historicProcessInstanceQuery.suspended).toBe(true);
    expect(calls[1][0].historicProcessInstanceQuery.unfinished).toBe(true);
    expect(calls[1][0].historicProcessInstanceQuery.processDefinitionKeyIn).toEqual(['invoice']);
  });

  it('Query mode + "terminated" state → 2 batches (externallyTerminated + internallyTerminated)', async () => {
    component.filterCriteria = [
      { field: 'state', values: ['terminated'] },
      { field: 'processDefinition', values: ['order'] }
    ];

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 30));

    expect(mockProcessInstanceService.setRemovalTimeAsync).toHaveBeenCalledTimes(2);

    const call1 = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[0][0];
    const call2 = mockProcessInstanceService.setRemovalTimeAsync.mock.calls[1][0];

    // First batch: externallyTerminated
    expect(call1.historicProcessInstanceQuery.finished).toBe(true);
    expect(call1.historicProcessInstanceQuery.externallyTerminated).toBe(true);
    expect(call1.historicProcessInstanceQuery.processDefinitionKeyIn).toEqual(['order']);

    // Second batch: internallyTerminated
    expect(call2.historicProcessInstanceQuery.finished).toBe(true);
    expect(call2.historicProcessInstanceQuery.internallyTerminated).toBe(true);
    expect(call2.historicProcessInstanceQuery.processDefinitionKeyIn).toEqual(['order']);
  });

  it('Query mode + 3 states (active + completed + terminated) → 4 batches total', async () => {
    component.filterCriteria = [
      { field: 'state', values: ['active', 'completed', 'terminated'] }
    ];

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 30));

    const calls = mockProcessInstanceService.setRemovalTimeAsync.mock.calls;

    expect(calls.length).toBe(4);

    // Batch 1: active
    expect(calls[0][0].historicProcessInstanceQuery.active).toBe(true);
    expect(calls[0][0].historicProcessInstanceQuery.unfinished).toBe(true);

    // Batch 2: completed
    expect(calls[1][0].historicProcessInstanceQuery.completed).toBe(true);
    expect(calls[1][0].historicProcessInstanceQuery.finished).toBe(true);

    // Batch 3: externallyTerminated
    expect(calls[2][0].historicProcessInstanceQuery.externallyTerminated).toBe(true);
    expect(calls[2][0].historicProcessInstanceQuery.finished).toBe(true);

    // Batch 4: internallyTerminated
    expect(calls[3][0].historicProcessInstanceQuery.internallyTerminated).toBe(true);
    expect(calls[3][0].historicProcessInstanceQuery.finished).toBe(true);
  });

  it('Instances mode (no multi-state fan-out) → 1 batch regardless of filter', async () => {
    component.mode = 'instances';
    component.selectedIds = new Set(['pi-1', 'pi-2', 'pi-3']);
    component.filterCriteria = [];

    component.execute();

    await new Promise(resolve => setTimeout(resolve, 20));

    const calls = mockProcessInstanceService.setRemovalTimeAsync.mock.calls;
    expect(calls.length).toBe(1);

    const payload = calls[0][0];
    expect(payload.historicProcessInstanceIds).toEqual(['pi-1', 'pi-2', 'pi-3']);
    expect(payload.historicProcessInstanceQuery).toBeUndefined();
  });
});

describe('BatchOperationsWizardComponent — removal-time-process: consistency checks', () => {

  it('buildDisplayStatePill returns generic state pill for removal-time-process', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'removal-time-process';

    const filterCriteria: MultiValueFilter[] = [
      { field: 'state', values: ['active', 'suspended'] },
      { field: 'processDefinition', values: ['invoice'] }
    ];

    const result = component.buildDisplayStatePill('removal-time-process', filterCriteria);

    expect(result).toBeDefined();
    expect(result?.field).toBe('state');
    expect(result?.values).toEqual(['active', 'suspended']);
  });

  it('buildDisplayStatePill returns null when no state criterion', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'removal-time-process';

    const filterCriteria: MultiValueFilter[] = [
      { field: 'processDefinition', values: ['invoice'] }
    ];

    const result = component.buildDisplayStatePill('removal-time-process', filterCriteria);

    expect(result).toBeNull();
  });

  it('buildDisplayStatePill returns active state pill for suspend operation', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);

    const filterCriteria: MultiValueFilter[] = [];

    const result = component.buildDisplayStatePill('suspend', filterCriteria);

    expect(result).toBeDefined();
    expect(result?.field).toBe('state');
    expect(result?.values).toEqual(['active']);
  });
});
