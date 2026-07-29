import { of, lastValueFrom } from 'rxjs';
import { vi, describe, it, expect } from 'vitest';

import { CockpitService, MultiValueFilter } from './cockpit.service';
import { ProcessInstance, ProcessInstanceService } from './process-instance.service';
import { DashboardService } from './dashboard.service';
import { ProcessDefinitionService } from './process-definition.service';
import { DecisionService } from './decision.service';
import { DeploymentService } from './deployment.service';
import { HttpClient } from '@angular/common/http';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeInstance(id: string, startTime = '2024-01-01T00:00:00.000Z'): ProcessInstance {
  return {
    id,
    processDefinitionId: 'proc:1:abc',
    processDefinitionKey: 'proc',
    startTime,
    state: 'ACTIVE',
  };
}

function makeService(mockProcInstSvc: Partial<ProcessInstanceService>): CockpitService {
  return new CockpitService(
    {} as HttpClient,
    {} as DashboardService,
    {} as ProcessDefinitionService,
    mockProcInstSvc as ProcessInstanceService,
    {} as DecisionService,
    {} as DeploymentService
  );
}

// ─── countPerState — called via searchProcessInstancesGlobalCount ────────────
//
// countPerState uses buildPerStateBodies: one queryProcessInstancesCount call per
// state_fragment × variant body. States are mutually exclusive (exact count).
// BK/variable LIKE variants can overlap (slight overcount when one instance matches
// two patterns), but this avoids any hard instance-fetch limit.
//
// searchProcessInstancesGlobalCount routes to countPerState when state has 2+ values.
// For single state or no state with multiple variants, it calls queryProcessInstancesCount
// directly per variant.
//
describe('CockpitService — countPerState (via searchProcessInstancesGlobalCount)', () => {

  // ── Scenario 1: State × 1 BusinessKey ────────────────────────────────────────
  //
  // otherFilters has businessKey with 1 value → 1 variant.
  // Bodies: stateFragment(active) × 1  +  stateFragment(completed) × 1 = 2 bodies.
  // → queryProcessInstancesCount twice, SUM.
  //
  it('uses queryProcessInstancesCount + SUM when state is the only multi-value dimension (1 BK value)', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(3))   // active + BK=%BK-001%
      .mockReturnValueOnce(of(5));  // completed + BK=%BK-001%
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['BK-001'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(8);
    expect(queryCount).toHaveBeenCalledTimes(2);
    expect(queryInstances).not.toHaveBeenCalled();

    // BK is at the root of each body (not inside orQuery entries)
    for (const [body] of queryCount.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike', '%BK-001%');
      expect(body).not.toHaveProperty('orQueries');
    }
  });

  // ── Scenario 2: State only ────────────────────────────────────────────────────
  //
  // No BK, no variable → 1 variant (empty base). Bodies: active + completed = 2.
  //
  it('uses queryProcessInstancesCount + SUM when only state filter is present', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(10))
      .mockReturnValueOnce(of(4));
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state', values: ['active', 'suspended'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(14);
    expect(queryCount).toHaveBeenCalledTimes(2);
    expect(queryInstances).not.toHaveBeenCalled();
  });

  // ── Scenario 3: State × 2 BusinessKeys ───────────────────────────────────────
  //
  // businessKey with 2 values → 2 variants. Bodies: 2 states × 2 BK = 4 bodies.
  // Each body has BK at root level (not inside orQuery entries) — Camunda 7 does not
  // reliably support processInstanceBusinessKeyLike inside orQuery entries.
  //
  it('sends one queryProcessInstancesCount per state×BK body when businessKey has 2 values', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(2))   // active + BK '%a%'
      .mockReturnValueOnce(of(1))   // active + BK '%b%'
      .mockReturnValueOnce(of(1))   // completed + BK '%a%'
      .mockReturnValueOnce(of(0));  // completed + BK '%b%'
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['a', 'b'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(4);  // 2+1+1+0 — slight overcount if any instance matches both '%a%' and '%b%'
    expect(queryCount).toHaveBeenCalledTimes(4);  // 2 states × 2 BK
    expect(queryInstances).not.toHaveBeenCalled();

    // Each body must have BK at root, no orQueries
    for (const [body] of queryCount.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      expect(body).not.toHaveProperty('orQueries');
    }
    // State flags are correct per body
    expect(queryCount.mock.calls[0][0]).toMatchObject({ active: true, unfinished: true });
    expect(queryCount.mock.calls[1][0]).toMatchObject({ active: true, unfinished: true });
    expect(queryCount.mock.calls[2][0]).toMatchObject({ completed: true, finished: true });
    expect(queryCount.mock.calls[3][0]).toMatchObject({ completed: true, finished: true });
  });

  // ── Scenario 4: State × 4 BusinessKeys ───────────────────────────────────────
  //
  // 2 states × 4 BK values → 8 queryProcessInstancesCount calls.
  // This is the exact scenario from the original regression report.
  //
  it('issues exactly 8 count calls (2 states × 4 BK values), each with BK at root', async () => {
    const queryCount = vi.fn().mockReturnValue(of(2));
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['a', 'b', 'c', 'd'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(queryCount).toHaveBeenCalledTimes(8);  // 2 states × 4 BK
    expect(queryInstances).not.toHaveBeenCalled();
    expect(count).toBe(16);  // 8 × 2

    for (const [body] of queryCount.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      expect(body).not.toHaveProperty('orQueries');
    }
  });

  // ── Scenario 5: State × InstanceID → processInstanceIds at root ──────────────
  //
  // processInstanceIds comes from buildPayloadVariants base, appears at root of each
  // body naturally (no orQuery manipulation needed).
  //
  it('places processInstanceIds at root of each body when combined with state', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(2))
      .mockReturnValueOnce(of(1));
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const instanceIds = ['e28e0fdf-8991-11f1-bca3-48ea62940dbf', 'cd5b5849-893a-11f1-ab31-48ea62940dbf'];
    const filters: MultiValueFilter[] = [
      { field: 'state',      values: ['active', 'completed'] },
      { field: 'instanceId', values: instanceIds },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(3);
    expect(queryCount).toHaveBeenCalledTimes(2);
    for (const [body] of queryCount.mock.calls) {
      expect(body).toHaveProperty('processInstanceIds', instanceIds);
      expect(body).not.toHaveProperty('orQueries');
    }
  });

  // ── Scenario 6: finishedAfter at root of each body ───────────────────────────
  //
  // finishedAfter comes from buildPayloadVariants base, appears at root of each
  // body naturally. No special handling needed (dates are not in orQuery entries).
  //
  it('places finishedAfter at root of each body', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(1))
      .mockReturnValueOnce(of(1));
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',        values: ['active', 'completed'] },
      { field: 'businessKey',  values: ['BK-X'] },
      { field: 'finishedAfter', values: ['2026-07-08T00:00:00.000Z'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    for (const [body] of queryCount.mock.calls) {
      expect(body).toHaveProperty('finishedAfter', '2026-07-08T00:00:00.000Z');
      expect(body).not.toHaveProperty('orQueries');
    }
  });

  // ── Scenario 7: terminated state splits into 2 fragments ─────────────────────
  //
  // stateBodyFragment('terminated') returns [externallyTerminated, internallyTerminated].
  // With 1 BK value: bodies = [active, ext-term, int-term] = 3 bodies.
  //
  it('handles "terminated" state (2 Camunda fragments) correctly', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(5))   // active
      .mockReturnValueOnce(of(2))   // externallyTerminated
      .mockReturnValueOnce(of(1));  // internallyTerminated
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'terminated'] },
      { field: 'businessKey', values: ['BK-Y'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(8);   // 5 + 2 + 1
    expect(queryCount).toHaveBeenCalledTimes(3);
    expect(queryInstances).not.toHaveBeenCalled();
  });

  // ── Scenario 8: multi-BK without 2+ state (direct count path) ────────────────
  //
  // When state has 0 or 1 value, searchProcessInstancesGlobalCount builds variants
  // directly and calls queryProcessInstancesCount per variant + SUM.
  //
  it('issues one queryProcessInstancesCount per BK variant when state has single value', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(4))   // completed + BK '%BK-001%'
      .mockReturnValueOnce(of(3))   // completed + BK '%BK-002%'
      .mockReturnValueOnce(of(2));  // completed + BK '%BK-003%'
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['completed'] },
      { field: 'businessKey', values: ['BK-001', 'BK-002', 'BK-003'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(9);  // 4+3+2
    expect(queryCount).toHaveBeenCalledTimes(3);
    expect(queryInstances).not.toHaveBeenCalled();

    for (const [body] of queryCount.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      expect(body).not.toHaveProperty('orQueries');
    }
  });
});


describe('CockpitService — multi-BK single-state list path (searchProcessInstancesGlobal)', () => {

  // ── fetch limit is firstResult+maxResults, not 2000 ─────────────────────────
  it('passes firstResult+maxResults as fetch limit (not 2000) for multi-BK single state', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active'] },
      { field: 'businessKey', values: ['a', 'b'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 40, 20));

    expect(queryInstances).toHaveBeenCalledTimes(2);  // 1 state × 2 BK
    for (const [, callFirstResult, callMaxResults] of queryInstances.mock.calls) {
      expect(callFirstResult).toBe(0);
      expect(callMaxResults).toBe(60);      // needed = 40 + 20
      expect(callMaxResults).not.toBe(2000);
    }
  });
});

// ─── searchPerState — called via searchProcessInstancesGlobal ────────────────
//
// searchPerState sends one queryProcessInstances call per state_fragment × variant.
// Each call fetches at most `needed = firstResult + maxResults` items — no 2000 cap.
// Results are merged, deduped by ID, sorted by startTime desc, then sliced for the page.
//
describe('CockpitService — searchPerState (via searchProcessInstancesGlobal)', () => {

  function inst(id: string, startTime: string): ProcessInstance {
    return { ...makeInstance(id), startTime };
  }

  // ── Test 1: 2 states × 2 BK → 4 HTTP calls, BK at root ──────────────────────
  it('issues 4 queryProcessInstances calls for 2 states × 2 BK, each with BK at root', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['fir', 'sec'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 0, 10));

    expect(queryInstances).toHaveBeenCalledTimes(4);  // 2 states × 2 BK

    for (const [body] of queryInstances.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      expect(body).not.toHaveProperty('orQueries');
    }
    // State flags correct per body
    expect(queryInstances.mock.calls[0][0]).toMatchObject({ active: true, unfinished: true });
    expect(queryInstances.mock.calls[1][0]).toMatchObject({ active: true, unfinished: true });
    expect(queryInstances.mock.calls[2][0]).toMatchObject({ completed: true, finished: true });
    expect(queryInstances.mock.calls[3][0]).toMatchObject({ completed: true, finished: true });
  });

  // ── Test 2: fetch limit is firstResult+maxResults, not 2000 ──────────────────
  //
  // Each request fetches at most `needed = firstResult + maxResults` items.
  // Page 3 (firstResult=40, maxResults=20) → needed = 60. Not 2000.
  //
  it('passes firstResult+maxResults as fetch limit (not 2000) to each request', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['x', 'y'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 40, 20));

    for (const [, callFirstResult, callMaxResults] of queryInstances.mock.calls) {
      expect(callFirstResult).toBe(0);      // offset applied in-memory after merge
      expect(callMaxResults).toBe(60);      // needed = 40 + 20
      expect(callMaxResults).not.toBe(2000);
    }
  });

  // ── Test 3: pagination correctness — page 2 returns the right items ───────────
  //
  // Combined sorted (startTime desc): a1(10), c1(9), a2(8), c2(7), a3(6), c3(5), a4(4), c4(3)
  // Page 2 = firstResult=4, maxResults=2 → positions [4,5] → a3(Jan06), c3(Jan05)
  //
  it('returns the correct slice for page 2 after merging two state groups', async () => {
    const activeInstances = [
      inst('a1', '2024-01-10T00:00:00.000Z'),
      inst('a2', '2024-01-08T00:00:00.000Z'),
      inst('a3', '2024-01-06T00:00:00.000Z'),
      inst('a4', '2024-01-04T00:00:00.000Z'),
    ];
    const completedInstances = [
      inst('c1', '2024-01-09T00:00:00.000Z'),
      inst('c2', '2024-01-07T00:00:00.000Z'),
      inst('c3', '2024-01-05T00:00:00.000Z'),
      inst('c4', '2024-01-03T00:00:00.000Z'),
    ];

    // 2 states × 1 BK = 2 calls; we use 1 BK to get 2 calls (not 4)
    const queryInstances = vi.fn()
      .mockReturnValueOnce(of(activeInstances))    // active + BK
      .mockReturnValueOnce(of(completedInstances)); // completed + BK

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['p'] },
    ];

    const result = await lastValueFrom(
      svc.searchProcessInstancesGlobal(filters, false, false, 4, 2)
    );

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a3');  // position 4 — startTime Jan06
    expect(result[1].id).toBe('c3'); // position 5 — startTime Jan05
  });

  // ── Test 4: sort consistency across state group boundaries ────────────────────
  //
  // c1 (completed, Jan08) must appear before a2 (active, Jan05) in merged output,
  // even when the forkJoin delivers active results first.
  //
  it('preserves startTime desc order across state group boundaries', async () => {
    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([            // active state group (1 BK)
        inst('a1', '2024-01-10T00:00:00.000Z'),
        inst('a2', '2024-01-05T00:00:00.000Z'),
      ]))
      .mockReturnValueOnce(of([            // completed state group (1 BK)
        inst('c1', '2024-01-08T00:00:00.000Z'),
        inst('c2', '2024-01-03T00:00:00.000Z'),
      ]));

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['r'] },
    ];

    const result = await lastValueFrom(
      svc.searchProcessInstancesGlobal(filters, false, false, 0, 10)
    );

    expect(result.map(r => r.id)).toEqual(['a1', 'c1', 'a2', 'c2']);

    const idxC1 = result.findIndex(r => r.id === 'c1');
    const idxA2 = result.findIndex(r => r.id === 'a2');
    expect(idxC1).toBeLessThan(idxA2);
  });

  // ── Test 5: dedup across state groups ─────────────────────────────────────────
  //
  // Instance 'overlap' appears in both active and completed results (shouldn't happen
  // in practice but the Set dedup must handle it). Should appear once.
  //
  it('deduplicates instances that appear in multiple state group results', async () => {
    const overlap = inst('overlap', '2024-01-05T00:00:00.000Z');
    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([overlap, inst('a1', '2024-01-10T00:00:00.000Z')]))
      .mockReturnValueOnce(of([overlap, inst('c1', '2024-01-08T00:00:00.000Z')]));

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['q'] },
    ];

    const result = await lastValueFrom(
      svc.searchProcessInstancesGlobal(filters, false, false, 0, 10)
    );

    expect(result.map(r => r.id)).toEqual(['a1', 'c1', 'overlap']);
    expect(result.filter(r => r.id === 'overlap')).toHaveLength(1);
  });
});
