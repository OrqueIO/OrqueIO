import { describe, it, expect } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { MultiValueFilter } from '../../../../services/cockpit.service';

function getLockedFilterState(selectedOperationId: string): string | null {
  const desc = Object.getOwnPropertyDescriptor(BatchOperationsWizardComponent.prototype, 'lockedFilterState');
  return desc?.get?.call({ selectedOperationId }) as string | null;
}

/**
 * Tests for buildHistoricQueryForBatch() — verifies that the processDefinition
 * criterion combines correctly with the locked state for each operation.
 *
 * Uses prototype.call() so we can test the pure logic without Angular TestBed.
 */

function buildQuery(
  selectedOperationId: string,
  filterCriteria: MultiValueFilter[],
  vnIgnoreCase = false,
  vvIgnoreCase = false
): Record<string, unknown> {
  const stub = { selectedOperationId, filterCriteria, vnIgnoreCase, vvIgnoreCase };
  return BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch.call(stub);
}

describe('BatchOperationsWizardComponent — buildHistoricQueryForBatch processDefinition', () => {

  it('suspend: includes active+unfinished AND processDefinitionKeyIn', () => {
    const result = buildQuery('suspend', [
      { field: 'processDefinition', values: ['order-proc', 'invoice-val'] }
    ]);
    expect(result['active']).toBe(true);
    expect(result['unfinished']).toBe(true);
    expect(result['processDefinitionKeyIn']).toEqual(['order-proc', 'invoice-val']);
  });

  it('activate: includes suspended+unfinished AND processDefinitionKeyIn', () => {
    const result = buildQuery('activate', [
      { field: 'processDefinition', values: ['order-proc'] }
    ]);
    expect(result['suspended']).toBe(true);
    expect(result['unfinished']).toBe(true);
    expect(result['processDefinitionKeyIn']).toEqual(['order-proc']);
  });

  it('delete-running: includes unfinished AND processDefinitionKeyIn', () => {
    const result = buildQuery('delete-running', [
      { field: 'processDefinition', values: ['order-proc', 'invoice-val'] }
    ]);
    expect(result['unfinished']).toBe(true);
    expect(result['active']).toBeUndefined();
    expect(result['finished']).toBeUndefined();
    expect(result['processDefinitionKeyIn']).toEqual(['order-proc', 'invoice-val']);
  });

  it('delete-finished: includes finished AND processDefinitionKeyIn', () => {
    const result = buildQuery('delete-finished', [
      { field: 'processDefinition', values: ['report-gen'] }
    ]);
    expect(result['finished']).toBe(true);
    expect(result['unfinished']).toBeUndefined();
    expect(result['processDefinitionKeyIn']).toEqual(['report-gen']);
  });

  it('non-regression: businessKey still works alongside locked state', () => {
    const result = buildQuery('suspend', [
      { field: 'businessKey', values: ['ORDER-123'] }
    ]);
    expect(result['active']).toBe(true);
    expect(result['unfinished']).toBe(true);
    expect(result['processInstanceBusinessKeyLike']).toBe('%ORDER-123%');
    expect(result['processDefinitionKeyIn']).toBeUndefined();
  });

});

describe('BatchOperationsWizardComponent — lockedFilterState: State always hidden in all 4 batch operations', () => {

  it('suspend: lockedFilterState is non-null → State criterion hidden', () => {
    expect(getLockedFilterState('suspend')).not.toBeNull();
  });

  it('activate: lockedFilterState is non-null → State criterion hidden', () => {
    expect(getLockedFilterState('activate')).not.toBeNull();
  });

  it('delete-running: lockedFilterState returns unfinished sentinel → State criterion hidden', () => {
    // delete-running locks state via unfinished:true — must return a non-null sentinel
    // so InstanceFilterPanelComponent hides the State option from Add criteria.
    expect(getLockedFilterState('delete-running')).not.toBeNull();
    expect(getLockedFilterState('delete-running')).toBe('unfinished');
  });

  it('delete-finished: lockedFilterState is non-null → State criterion hidden', () => {
    expect(getLockedFilterState('delete-finished')).not.toBeNull();
  });

});
