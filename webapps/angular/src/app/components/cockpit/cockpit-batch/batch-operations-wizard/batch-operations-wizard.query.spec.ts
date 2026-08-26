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

  it('set-retries-jobs: lockedFilterState is non-null (unfinished) → State criterion hidden', () => {
    expect(getLockedFilterState('set-retries-jobs')).not.toBeNull();
    expect(getLockedFilterState('set-retries-jobs')).toBe('unfinished');
  });

});

// ─── Helpers for canContinue and confirmPayloadJson ────────────────────────

function getCanContinue(stub: Record<string, unknown>): boolean {
  const desc = Object.getOwnPropertyDescriptor(BatchOperationsWizardComponent.prototype, 'canContinue');
  return desc?.get?.call(stub) as boolean;
}

function getConfirmPayloadJson(stub: Record<string, unknown>): string {
  const desc = Object.getOwnPropertyDescriptor(BatchOperationsWizardComponent.prototype, 'confirmPayloadJson');
  return desc?.get?.call(stub) as string;
}

function getConfirmEndpoint(stub: Record<string, unknown>): string {
  const desc = Object.getOwnPropertyDescriptor(BatchOperationsWizardComponent.prototype, 'confirmEndpoint');
  return desc?.get?.call(stub) as string;
}

// ─── set-retries-jobs: buildHistoricQueryForBatch ──────────────────────────

describe('BatchOperationsWizardComponent — set-retries-jobs: buildHistoricQueryForBatch', () => {

  it('uses unfinished base — includes active AND suspended, not limited to active only', () => {
    const result = buildQuery('set-retries-jobs', []);
    expect(result['unfinished']).toBe(true);
    expect(result['active']).toBeUndefined();
    expect(result['suspended']).toBeUndefined();
    expect(result['finished']).toBeUndefined();
  });

  it('combines unfinished with processDefinitionKeyIn filter — active not set', () => {
    const result = buildQuery('set-retries-jobs', [
      { field: 'processDefinition', values: ['order-proc', 'invoice'] }
    ]);
    expect(result['unfinished']).toBe(true);
    expect(result['active']).toBeUndefined();
    expect(result['processDefinitionKeyIn']).toEqual(['order-proc', 'invoice']);
  });

  it('combines active+unfinished with businessKey filter', () => {
    const result = buildQuery('set-retries-jobs', [
      { field: 'businessKey', values: ['ORD-99'] }
    ]);
    expect(result['processInstanceBusinessKeyLike']).toBe('%ORD-99%');
  });

});

// ─── set-retries-jobs: canContinue ─────────────────────────────────────────

describe('BatchOperationsWizardComponent — set-retries-jobs: canContinue validation', () => {

  it('returns false when no instances are selected (instances mode)', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'instances',
      retries: 3,
      setDueDate: false,
      retriesDueDate: '',
      selectedIds: new Set<string>()
    };
    expect(getCanContinue(stub)).toBe(false);
  });

  it('returns true when instances selected and retries is 0', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'instances',
      retries: 0,
      setDueDate: false,
      retriesDueDate: '',
      selectedIds: new Set(['inst-1'])
    };
    expect(getCanContinue(stub)).toBe(true);
  });

  it('returns true when instances selected and retries > 0', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'instances',
      retries: 3,
      setDueDate: false,
      retriesDueDate: '',
      selectedIds: new Set(['inst-1', 'inst-2'])
    };
    expect(getCanContinue(stub)).toBe(true);
  });

  it('returns false when retries is negative', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'instances',
      retries: -1,
      setDueDate: false,
      retriesDueDate: '',
      selectedIds: new Set(['inst-1'])
    };
    expect(getCanContinue(stub)).toBe(false);
  });

  it('returns false when setDueDate is true but retriesDueDate is empty', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'instances',
      retries: 3,
      setDueDate: true,
      retriesDueDate: '',
      selectedIds: new Set(['inst-1'])
    };
    expect(getCanContinue(stub)).toBe(false);
  });

  it('returns true when setDueDate is true and retriesDueDate is filled', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'instances',
      retries: 3,
      setDueDate: true,
      retriesDueDate: '2025-12-31',
      selectedIds: new Set(['inst-1'])
    };
    expect(getCanContinue(stub)).toBe(true);
  });

  it('returns true in query mode regardless of selectedIds', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'query',
      retries: 1,
      setDueDate: false,
      retriesDueDate: '',
      selectedIds: new Set<string>()
    };
    expect(getCanContinue(stub)).toBe(true);
  });

});

// ─── set-retries-jobs: confirmPayloadJson ──────────────────────────────────

describe('BatchOperationsWizardComponent — set-retries-jobs: confirmPayloadJson', () => {

  it('instances mode — body contains retries and jobQuery.processInstanceIds array', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'instances',
      retries: 5,
      setDueDate: false,
      retriesDueDate: '',
      selectedIds: new Set(['inst-a', 'inst-b']),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    expect(payload['retries']).toBe(5);
    expect(payload['jobQuery']['processInstanceIds']).toEqual(expect.arrayContaining(['inst-a', 'inst-b']));
    expect(payload['processInstances']).toBeUndefined();
    expect(payload['dueDate']).toBeUndefined();
    expect(payload['historicProcessInstanceQuery']).toBeUndefined();
  });

  it('instances mode — dueDate included when setDueDate is true', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'instances',
      retries: 3,
      setDueDate: true,
      retriesDueDate: '2025-06-15',
      selectedIds: new Set(['inst-x']),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    expect(payload['retries']).toBe(3);
    expect(payload['dueDate']).toMatch(/^2025-06-15T00:00:00\.000[+-]\d{4}$/);
  });

  it('query mode — body contains retries and historicProcessInstanceQuery', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'query',
      retries: 2,
      setDueDate: false,
      retriesDueDate: '',
      selectedIds: new Set<string>(),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    expect(payload['retries']).toBe(2);
    expect(payload['historicProcessInstanceQuery']).toBeDefined();
    expect(payload['jobQuery']).toBeUndefined();
  });

  it('query mode — dueDate absent when setDueDate is false', () => {
    const stub = {
      selectedOperationId: 'set-retries-jobs',
      mode: 'query',
      retries: 1,
      setDueDate: false,
      retriesDueDate: '',
      selectedIds: new Set<string>(),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    expect(payload['dueDate']).toBeUndefined();
  });

});

// ─── set-retries-jobs: confirmEndpoint ─────────────────────────────────────

describe('BatchOperationsWizardComponent — set-retries-jobs: confirmEndpoint', () => {

  it('instances mode → /job/retries', () => {
    const stub = { selectedOperationId: 'set-retries-jobs', mode: 'instances' };
    expect(getConfirmEndpoint(stub)).toContain('/job/retries');
    expect(getConfirmEndpoint(stub)).not.toContain('process-instance/job-retries');
    expect(getConfirmEndpoint(stub)).not.toContain('historic-query-based');
  });

  it('query mode → /process-instance/job-retries-historic-query-based', () => {
    const stub = { selectedOperationId: 'set-retries-jobs', mode: 'query' };
    expect(getConfirmEndpoint(stub)).toContain('/process-instance/job-retries-historic-query-based');
  });

});
