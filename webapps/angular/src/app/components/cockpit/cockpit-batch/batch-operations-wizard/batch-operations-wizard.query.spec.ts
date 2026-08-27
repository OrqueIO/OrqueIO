import { describe, it, expect } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { MultiValueFilter } from '../../../../services/cockpit.service';
import { VariableDef } from './variable-definitions-modal/variable-definitions-modal';

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

// ─── set-variables: buildHistoricQueryForBatch ─────────────────────────────

describe('BatchOperationsWizardComponent — set-variables: buildHistoricQueryForBatch', () => {

  it('includes unfinished:true — engine only sets variables on running instances', () => {
    const result = buildQuery('set-variables', []);
    expect(result['unfinished']).toBe(true);
    expect(result['active']).toBeUndefined();
    expect(result['suspended']).toBeUndefined();
    expect(result['finished']).toBeUndefined();
  });

  it('combines unfinished base with processDefinitionKeyIn filter', () => {
    const result = buildQuery('set-variables', [
      { field: 'processDefinition', values: ['order-proc', 'invoice'] }
    ]);
    expect(result['unfinished']).toBe(true);
    expect(result['active']).toBeUndefined();
    expect(result['processDefinitionKeyIn']).toEqual(['order-proc', 'invoice']);
  });

  it('businessKey filter works with empty base', () => {
    const result = buildQuery('set-variables', [
      { field: 'businessKey', values: ['ORD-99'] }
    ]);
    expect(result['processInstanceBusinessKeyLike']).toBe('%ORD-99%');
    expect(result['active']).toBeUndefined();
  });

});

// ─── set-variables: lockedFilterState ──────────────────────────────────────

describe('BatchOperationsWizardComponent — set-variables: lockedFilterState', () => {

  it('returns "unfinished" — only running instances can have variables set', () => {
    expect(getLockedFilterState('set-variables')).toBe('unfinished');
  });

});

// ─── set-variables: canContinue ────────────────────────────────────────────

describe('BatchOperationsWizardComponent — set-variables: canContinue', () => {

  it('returns false when no instances selected (instances mode)', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [{ name: 'myVar', type: 'String', value: 'hello' }],
      selectedIds: new Set<string>()
    };
    expect(getCanContinue(stub)).toBe(false);
  });

  it('returns false when variable name is empty', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [{ name: '', type: 'String', value: 'hello' }],
      selectedIds: new Set(['inst-1'])
    };
    expect(getCanContinue(stub)).toBe(false);
  });

  it('returns false when variable list is empty', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [],
      selectedIds: new Set(['inst-1'])
    };
    expect(getCanContinue(stub)).toBe(false);
  });

  it('returns true when instance selected and variable has name', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [{ name: 'myVar', type: 'String', value: 'hello' }],
      selectedIds: new Set(['inst-1'])
    };
    expect(getCanContinue(stub)).toBe(true);
  });

  it('returns true in query mode even without selectedIds', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'query',
      variableDefinitions: [{ name: 'myVar', type: 'String', value: 'hello' }],
      selectedIds: new Set<string>()
    };
    expect(getCanContinue(stub)).toBe(true);
  });

  it('returns false in query mode when variable name is empty', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'query',
      variableDefinitions: [{ name: '', type: 'String', value: 'hello' }],
      selectedIds: new Set<string>()
    };
    expect(getCanContinue(stub)).toBe(false);
  });

  it('returns true with multiple variables all having names', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [
        { name: 'var1', type: 'String', value: 'a' },
        { name: 'var2', type: 'Integer', value: '42' }
      ],
      selectedIds: new Set(['inst-1'])
    };
    expect(getCanContinue(stub)).toBe(true);
  });

  it('returns false if any variable in a multi-var list has an empty name', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [
        { name: 'var1', type: 'String', value: 'a' },
        { name: '', type: 'Integer', value: '42' }
      ],
      selectedIds: new Set(['inst-1'])
    };
    expect(getCanContinue(stub)).toBe(false);
  });

});

// ─── set-variables: buildVariablesPayload ──────────────────────────────────

function buildVariablesPayload(
  variableDefinitions: { name: string; type: string; value: string }[]
): Record<string, { value: unknown; type: string }> {
  return BatchOperationsWizardComponent.prototype.buildVariablesPayload.call({ variableDefinitions });
}

describe('BatchOperationsWizardComponent — set-variables: buildVariablesPayload', () => {

  it('String type — value stays as string', () => {
    const result = buildVariablesPayload([{ name: 'myStr', type: 'String', value: 'hello' }]);
    expect(result['myStr']).toEqual({ value: 'hello', type: 'String' });
  });

  it('Integer type — value parsed to number', () => {
    const result = buildVariablesPayload([{ name: 'myInt', type: 'Integer', value: '42' }]);
    expect(result['myInt']).toEqual({ value: 42, type: 'Integer' });
  });

  it('Long type — value parsed to number', () => {
    const result = buildVariablesPayload([{ name: 'myLong', type: 'Long', value: '1000000' }]);
    expect(result['myLong']).toEqual({ value: 1000000, type: 'Long' });
  });

  it('Double type — value parsed to float', () => {
    const result = buildVariablesPayload([{ name: 'myDouble', type: 'Double', value: '3.14' }]);
    expect(result['myDouble']).toEqual({ value: 3.14, type: 'Double' });
  });

  it('Boolean type — "true" string → boolean true', () => {
    const result = buildVariablesPayload([{ name: 'myBool', type: 'Boolean', value: 'true' }]);
    expect(result['myBool']).toEqual({ value: true, type: 'Boolean' });
  });

  it('Boolean type — "false" string → boolean false', () => {
    const result = buildVariablesPayload([{ name: 'myBool', type: 'Boolean', value: 'false' }]);
    expect(result['myBool']).toEqual({ value: false, type: 'Boolean' });
  });

  it('Date type — date-only value (yyyy-MM-dd) converts to midnight local time', () => {
    const result = buildVariablesPayload([{ name: 'myDate', type: 'Date', value: '2025-01-15' }]);
    const dateValue = result['myDate'].value as string;
    expect(dateValue).toMatch(/^2025-01-15T00:00:00\.000[+-]\d{4}$/);
    expect(result['myDate'].type).toBe('Date');
  });

  it('Date type — datetime-local value (yyyy-MM-ddTHH:mm) preserves the specified time', () => {
    const result = buildVariablesPayload([{ name: 'myDate', type: 'Date', value: '2025-01-15T14:30' }]);
    const dateValue = result['myDate'].value as string;
    expect(dateValue).toMatch(/^2025-01-15T14:30:00\.000[+-]\d{4}$/);
    expect(result['myDate'].type).toBe('Date');
  });

  it('Date type — datetime-local at midnight (yyyy-MM-ddT00:00) produces midnight output', () => {
    const result = buildVariablesPayload([{ name: 'myDate', type: 'Date', value: '2025-01-15T00:00' }]);
    const dateValue = result['myDate'].value as string;
    expect(dateValue).toMatch(/^2025-01-15T00:00:00\.000[+-]\d{4}$/);
    expect(result['myDate'].type).toBe('Date');
  });

  it('Date type — empty value (no date picked yet) is passed as-is without conversion', () => {
    const result = buildVariablesPayload([{ name: 'myDate', type: 'Date', value: '' }]);
    expect(result['myDate']).toEqual({ value: '', type: 'Date' });
  });

  it('skips entries with empty name', () => {
    const result = buildVariablesPayload([
      { name: 'valid', type: 'String', value: 'ok' },
      { name: '', type: 'String', value: 'skip-me' }
    ]);
    expect(Object.keys(result)).toHaveLength(1);
    expect(result['valid']).toBeDefined();
  });

  it('trims whitespace from variable name', () => {
    const result = buildVariablesPayload([{ name: '  myVar  ', type: 'String', value: 'v' }]);
    expect(result['myVar']).toBeDefined();
    expect(result['  myVar  ']).toBeUndefined();
  });

  it('multiple variables — all included', () => {
    const result = buildVariablesPayload([
      { name: 'a', type: 'String', value: 'alpha' },
      { name: 'b', type: 'Integer', value: '99' }
    ]);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['a'].value).toBe('alpha');
    expect(result['b'].value).toBe(99);
  });

});

// ─── set-variables: confirmPayloadJson ─────────────────────────────────────

describe('BatchOperationsWizardComponent — set-variables: confirmPayloadJson', () => {

  it('instances mode — payload has processInstanceIds and variables map', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [{ name: 'status', type: 'String', value: 'approved' }],
      selectedIds: new Set(['id-1', 'id-2']),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch,
      buildVariablesPayload: BatchOperationsWizardComponent.prototype.buildVariablesPayload
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    expect(payload['processInstanceIds']).toEqual(expect.arrayContaining(['id-1', 'id-2']));
    expect(payload['variables']['status']).toEqual({ value: 'approved', type: 'String' });
    expect(payload['historicProcessInstanceQuery']).toBeUndefined();
  });

  it('query mode — payload has historicProcessInstanceQuery and variables map', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'query',
      variableDefinitions: [{ name: 'count', type: 'Integer', value: '5' }],
      selectedIds: new Set<string>(),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch,
      buildVariablesPayload: BatchOperationsWizardComponent.prototype.buildVariablesPayload
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    expect(payload['historicProcessInstanceQuery']).toBeDefined();
    expect(payload['variables']['count']).toEqual({ value: 5, type: 'Integer' });
    expect(payload['processInstanceIds']).toBeUndefined();
  });

  it('multiple variables — all included in variables map', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [
        { name: 'strVar', type: 'String', value: 'hello' },
        { name: 'intVar', type: 'Integer', value: '42' },
        { name: 'boolVar', type: 'Boolean', value: 'true' }
      ],
      selectedIds: new Set(['inst-a']),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch,
      buildVariablesPayload: BatchOperationsWizardComponent.prototype.buildVariablesPayload
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    expect(payload['variables']['strVar']).toEqual({ value: 'hello', type: 'String' });
    expect(payload['variables']['intVar']).toEqual({ value: 42, type: 'Integer' });
    expect(payload['variables']['boolVar']).toEqual({ value: true, type: 'Boolean' });
  });

  it('query mode — historicProcessInstanceQuery includes unfinished:true', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'query',
      variableDefinitions: [{ name: 'x', type: 'String', value: 'y' }],
      selectedIds: new Set<string>(),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch,
      buildVariablesPayload: BatchOperationsWizardComponent.prototype.buildVariablesPayload
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    const hq = payload['historicProcessInstanceQuery'];
    // Engine forces unfinished — variables can only be set on running instances
    expect(hq['unfinished']).toBe(true);
    expect(hq['active']).toBeUndefined();
    expect(hq['finished']).toBeUndefined();
  });

});

// ─── set-variables: confirmEndpoint ────────────────────────────────────────

describe('BatchOperationsWizardComponent — set-variables: confirmEndpoint', () => {

  it('instances mode → /process-instance/variables-async', () => {
    const stub = { selectedOperationId: 'set-variables', mode: 'instances' };
    expect(getConfirmEndpoint(stub)).toContain('/process-instance/variables-async');
  });

  it('query mode → /process-instance/variables-async', () => {
    const stub = { selectedOperationId: 'set-variables', mode: 'query' };
    expect(getConfirmEndpoint(stub)).toContain('/process-instance/variables-async');
  });

});

// ─── set-variables: execute payload structure ───────────────────────────────

describe('BatchOperationsWizardComponent — set-variables: execute payload', () => {

  it('instances mode — payload structure has processInstanceIds array and variables map', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [{ name: 'orderStatus', type: 'String', value: 'shipped' }],
      selectedIds: new Set(['proc-id-1', 'proc-id-2']),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch,
      buildVariablesPayload: BatchOperationsWizardComponent.prototype.buildVariablesPayload
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    // Must have processInstanceIds with the selected IDs
    expect(Array.isArray(payload['processInstanceIds'])).toBe(true);
    expect(payload['processInstanceIds']).toContain('proc-id-1');
    expect(payload['processInstanceIds']).toContain('proc-id-2');
    // Must have variables as a map of { value, type } — not an array
    expect(typeof payload['variables']).toBe('object');
    expect(Array.isArray(payload['variables'])).toBe(false);
    expect(payload['variables']['orderStatus']).toEqual({ value: 'shipped', type: 'String' });
    // Must NOT include historicProcessInstanceQuery in instances mode
    expect(payload['historicProcessInstanceQuery']).toBeUndefined();
  });

  it('Integer variable — value is serialized as a number (not a string) in the payload', () => {
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [{ name: 'retryCount', type: 'Integer', value: '7' }],
      selectedIds: new Set(['proc-id-1']),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch,
      buildVariablesPayload: BatchOperationsWizardComponent.prototype.buildVariablesPayload
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    const variable = payload['variables']['retryCount'];
    expect(variable.type).toBe('Integer');
    // Camunda engine requires a JSON number for Integer, not the string "7"
    expect(typeof variable.value).toBe('number');
    expect(variable.value).toBe(7);
  });

});

// ─── set-variables: onVariablesApplied deduplication ──────────────────────

function applyVars(
  existing: VariableDef[],
  incoming: VariableDef[]
): VariableDef[] {
  const stub = {
    variableDefinitions: [...existing],
    showVariablesModal: true,
    saveToSessionStorage: () => {},
    cdr: { markForCheck: () => {} },
  };
  BatchOperationsWizardComponent.prototype.onVariablesApplied.call(stub, incoming);
  return stub.variableDefinitions;
}

describe('BatchOperationsWizardComponent — set-variables: onVariablesApplied deduplication', () => {

  it('same name appears twice in apply list → single chip with the new value (last wins)', () => {
    // Scenario: existing [amount=100], user opens modal and adds a second row [amount=200].
    // Apply emits both rows; only one chip should remain, with value 200.
    const result = applyVars(
      [{ name: 'amount', type: 'Integer', value: '100' }],
      [{ name: 'amount', type: 'Integer', value: '100' }, { name: 'amount', type: 'Integer', value: '200' }]
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('amount');
    expect(result[0].value).toBe('200');
  });

  it('two different names → both chips coexist — no false positive deduplication', () => {
    const result = applyVars(
      [],
      [{ name: 'amount', type: 'Integer', value: '100' }, { name: 'label', type: 'String', value: 'hello' }]
    );
    expect(result).toHaveLength(2);
    expect(result.map(v => v.name)).toEqual(['amount', 'label']);
  });

  it('deduplication is case-sensitive — "amount" and "Amount" are distinct Camunda variables', () => {
    const result = applyVars(
      [],
      [{ name: 'amount', type: 'Integer', value: '100' }, { name: 'Amount', type: 'Integer', value: '200' }]
    );
    expect(result).toHaveLength(2);
  });

  it('chip click — modal opens with all 3 existing variables, not just the clicked one', () => {
    const existing = [
      { name: 'montant', type: 'Integer', value: '100' },
      { name: 'label', type: 'String', value: 'ok' },
      { name: 'active', type: 'Boolean', value: false },
    ];
    const stub = { variableDefinitions: [...existing] };
    const get = Object.getOwnPropertyDescriptor(
      BatchOperationsWizardComponent.prototype, 'modalInitialVariables'
    )!.get!;
    const result: VariableDef[] = get.call(stub);
    expect(result).toHaveLength(3);
    expect(result.map((v: VariableDef) => v.name)).toEqual(['montant', 'label', 'active']);
  });

  it('rename a variable in the modal — total count unchanged, old name gone, new name present', () => {
    // Modal receives all vars. User renames "montant" → "montantTotal", keeps label unchanged.
    // Expect 2 vars total — no duplication, no ghost of the old name.
    const result = applyVars(
      [{ name: 'montant', type: 'Integer', value: '100' }, { name: 'label', type: 'String', value: 'ok' }],
      [{ name: 'montantTotal', type: 'Integer', value: '100' }, { name: 'label', type: 'String', value: 'ok' }]
    );
    expect(result).toHaveLength(2);
    expect(result.find(v => v.name === 'montantTotal')?.value).toBe('100');
    expect(result.find(v => v.name === 'montant')).toBeUndefined();
  });

  it('modify type or value without renaming — non-regression', () => {
    const result = applyVars(
      [{ name: 'amount', type: 'Integer', value: '100' }, { name: 'label', type: 'String', value: 'hello' }],
      [{ name: 'amount', type: 'Integer', value: '999' }, { name: 'label', type: 'String', value: 'hello' }]
    );
    expect(result).toHaveLength(2);
    expect(result.find(v => v.name === 'amount')?.value).toBe('999');
    expect(result.find(v => v.name === 'label')?.value).toBe('hello');
  });

  it('three rows with two duplicate names → deduplicated to two unique chips', () => {
    const result = applyVars(
      [],
      [
        { name: 'x', type: 'String', value: 'first' },
        { name: 'y', type: 'String', value: 'keep' },
        { name: 'x', type: 'String', value: 'second' },
      ]
    );
    expect(result).toHaveLength(2);
    expect(result.find(v => v.name === 'x')?.value).toBe('second');
    expect(result.find(v => v.name === 'y')?.value).toBe('keep');
  });

});

// ─── set-variables: engine constraint (unfinished only) ────────────────────
// SetVariablesToProcessInstancesBatchCmd (engine source, collectProcessInstanceIds):
//   processInstanceIds  → new ProcessInstanceQueryImpl() — RUNTIME table only
//   historicProcessInstanceQuery → forced .unfinished() before listDeploymentIdMappings()
// Variables CANNOT be set on completed/terminated instances. This is an engine-level
// constraint, not a client-side workaround. Compare: DeleteHistoricProcessInstancesBatchCmd
// does NOT force .unfinished(), which is why that operation supports completed instances.

describe('BatchOperationsWizardComponent — set-variables: engine constraint (unfinished only)', () => {

  it('lockedFilterState is "unfinished" — completed instances are excluded from selection', () => {
    // The filter must restrict to running instances to match the engine constraint.
    // Passing a completed-instance ID would produce an empty batch element list → 400.
    expect(getLockedFilterState('set-variables')).toBe('unfinished');
  });

  it('buildHistoricQueryForBatch includes unfinished:true — mirrors engine .unfinished() enforcement', () => {
    // Engine calls historicProcessInstanceQuery.unfinished() regardless of what we pass.
    // Setting it here explicitly documents the constraint and prevents accidental omission.
    const result = buildQuery('set-variables', []);
    expect(result['unfinished']).toBe(true);
    expect(result['finished']).toBeUndefined();
  });

  it('non-regression — active instances are targetable: processInstanceIds payload is correct', () => {
    // Active (unfinished) instances exist in the runtime table and are found by the engine.
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'instances',
      variableDefinitions: [{ name: 'status', type: 'String', value: 'active-ok' }],
      selectedIds: new Set(['running-id-1', 'running-id-2']),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch,
      buildVariablesPayload: BatchOperationsWizardComponent.prototype.buildVariablesPayload
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    expect(payload['processInstanceIds']).toContain('running-id-1');
    expect(payload['processInstanceIds']).toContain('running-id-2');
    expect(payload['variables']['status']).toEqual({ value: 'active-ok', type: 'String' });
    // historicProcessInstanceQuery must not be present in instances mode
    expect(payload['historicProcessInstanceQuery']).toBeUndefined();
  });

  it('non-regression — suspended instances targetable via query mode: unfinished:true included', () => {
    // Suspended instances are "unfinished" — the engine finds them.
    // Query mode sends historicProcessInstanceQuery, engine adds .unfinished() on its side too.
    const stub = {
      selectedOperationId: 'set-variables',
      mode: 'query',
      variableDefinitions: [{ name: 'reason', type: 'String', value: 'maintenance' }],
      selectedIds: new Set<string>(),
      filterCriteria: [],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      buildHistoricQueryForBatch: BatchOperationsWizardComponent.prototype.buildHistoricQueryForBatch,
      buildVariablesPayload: BatchOperationsWizardComponent.prototype.buildVariablesPayload
    };
    const payload = JSON.parse(getConfirmPayloadJson(stub));
    expect(payload['historicProcessInstanceQuery']['unfinished']).toBe(true);
    expect(payload['variables']['reason']).toEqual({ value: 'maintenance', type: 'String' });
    expect(payload['processInstanceIds']).toBeUndefined();
  });

});
