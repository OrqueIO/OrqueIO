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

function buildDecisionQuery(criteria: MultiValueFilter[]): Record<string, unknown> {
  const stub = { decisionFilterCriteria: criteria };
  return BatchOperationsWizardComponent.prototype.buildHistoricDecisionQueryForBatch.call(stub);
}

describe('BatchOperationsWizardComponent — buildHistoricDecisionQueryForBatch', () => {

  it('returns empty object when no criteria are set', () => {
    const result = buildDecisionQuery([]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('single decision definition key → decisionDefinitionKey (not In)', () => {
    const result = buildDecisionQuery([{ field: 'decisionDefinition', values: ['invoice-check'] }]);
    expect(result['decisionDefinitionKey']).toBe('invoice-check');
    expect(result['decisionDefinitionKeyIn']).toBeUndefined();
  });

  it('multiple decision definition keys → decisionDefinitionKeyIn array', () => {
    const result = buildDecisionQuery([{ field: 'decisionDefinition', values: ['invoice-check', 'credit-score'] }]);
    expect(result['decisionDefinitionKeyIn']).toEqual(['invoice-check', 'credit-score']);
    expect(result['decisionDefinitionKey']).toBeUndefined();
  });

  it('evaluatedAfter → passed through as-is (filter panel formats dates before emitting)', () => {
    const isoDate = '2025-03-01T00:00:00.000+0100';
    const result = buildDecisionQuery([{ field: 'evaluatedAfter', values: [isoDate] }]);
    expect(result['evaluatedAfter']).toBe(isoDate);
    expect(result['evaluatedBefore']).toBeUndefined();
  });

  it('evaluatedBefore → passed through as-is (filter panel formats end-of-day before emitting)', () => {
    const isoDate = '2025-03-31T23:59:59.000+0100';
    const result = buildDecisionQuery([{ field: 'evaluatedBefore', values: [isoDate] }]);
    expect(result['evaluatedBefore']).toBe(isoDate);
    expect(result['evaluatedAfter']).toBeUndefined();
  });

  it('combined: definition key + both dates', () => {
    const afterDate  = '2025-01-01T00:00:00.000+0100';
    const beforeDate = '2025-12-31T23:59:59.000+0100';
    const result = buildDecisionQuery([
      { field: 'decisionDefinition', values: ['invoice-check'] },
      { field: 'evaluatedAfter',  values: [afterDate] },
      { field: 'evaluatedBefore', values: [beforeDate] }
    ]);
    expect(result['decisionDefinitionKey']).toBe('invoice-check');
    expect(result['evaluatedAfter']).toBe(afterDate);
    expect(result['evaluatedBefore']).toBe(beforeDate);
  });

  it('no state field in decision query — decision instances have no state', () => {
    const result = buildDecisionQuery([{ field: 'decisionDefinition', values: ['invoice-check'] }]);
    expect(result['active']).toBeUndefined();
    expect(result['suspended']).toBeUndefined();
    expect(result['finished']).toBeUndefined();
    expect(result['unfinished']).toBeUndefined();
  });

  it('single decisionInstanceId → decisionInstanceId scalar (not In)', () => {
    const result = buildDecisionQuery([{ field: 'decisionInstanceId', values: ['abc-123'] }]);
    expect(result['decisionInstanceId']).toBe('abc-123');
    expect(result['decisionInstanceIdIn']).toBeUndefined();
  });

  it('multiple decisionInstanceIds → decisionInstanceIdIn array (OR semantics)', () => {
    const result = buildDecisionQuery([{ field: 'decisionInstanceId', values: ['abc-1', 'abc-2', 'abc-3'] }]);
    expect(result['decisionInstanceIdIn']).toEqual(['abc-1', 'abc-2', 'abc-3']);
    expect(result['decisionInstanceId']).toBeUndefined();
  });

  it('processInstanceId → mapped to scalar (Camunda API only supports single value)', () => {
    const result = buildDecisionQuery([{ field: 'processInstanceId', values: ['proc-99'] }]);
    expect(result['processInstanceId']).toBe('proc-99');
  });

  it('combined all 4 criteria — definition + dates + decisionInstanceId + processInstanceId', () => {
    const afterDate  = '2025-01-01T00:00:00.000+0100';
    const beforeDate = '2025-12-31T23:59:59.000+0100';
    const result = buildDecisionQuery([
      { field: 'decisionDefinition',  values: ['invoice-check', 'credit-score'] },
      { field: 'evaluatedAfter',      values: [afterDate] },
      { field: 'evaluatedBefore',     values: [beforeDate] },
      { field: 'decisionInstanceId',  values: ['di-1', 'di-2'] },
      { field: 'processInstanceId',   values: ['pi-42'] },
    ]);
    expect(result['decisionDefinitionKeyIn']).toEqual(['invoice-check', 'credit-score']);
    expect(result['evaluatedAfter']).toBe(afterDate);
    expect(result['evaluatedBefore']).toBe(beforeDate);
    expect(result['decisionInstanceIdIn']).toEqual(['di-1', 'di-2']);
    expect(result['processInstanceId']).toBe('pi-42');
    // No state fields
    expect(result['active']).toBeUndefined();
    expect(result['finished']).toBeUndefined();
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
