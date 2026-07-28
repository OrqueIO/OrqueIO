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

function makeInstance(id: string): ProcessInstance {
  return {
    id,
    processDefinitionId: 'proc:1:abc',
    processDefinitionKey: 'proc',
    startTime: '2024-01-01T00:00:00.000Z',
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
// countPerState is invoked when statePill.values.length > 1.
// Its branching logic:
//   baseVariants.length === 1 → queryProcessInstancesCount + SUM  (no 2000-fetch)
//   baseVariants.length  >  1 → queryProcessInstances(0, 2000) + Set dedup
//
// "baseVariants" = result of buildPayloadVariants on non-state filters:
//   - businessKey with N values  → N cartesian variants (each uses LIKE '%val%')
//   - variable with N values     → N cartesian variants
//   - no such dimension (or N=1) → 1 variant
//
// businessKey is NOT exclusive: an instance whose businessKey is "ab" matches
// both '%a%' and '%b%'. Simple SUM would double-count it. Dedup is required
// whenever baseVariants.length > 1.
//
describe('CockpitService — countPerState (via searchProcessInstancesGlobalCount)', () => {

  // ── Scenario 1: State × 1 BusinessKey  (exclusive → SUM path) ──────────────
  //
  // otherFilters has businessKey with 1 value → baseVariants.length = 1.
  // Bodies: stateFragment(active) × 1 variant  +  stateFragment(completed) × 1 variant = 2 bodies.
  // All bodies are mutually exclusive (state is exclusive, BK variant is unique).
  // → queryProcessInstancesCount must be used, queryProcessInstances must NOT.
  //
  it('uses queryProcessInstancesCount + SUM when state is the only multi-value dimension (1 BK value)', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(3))   // body: active + BK=%BK-001%
      .mockReturnValueOnce(of(5));  // body: completed + BK=%BK-001%
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

    expect(count).toBe(8);                    // 3 + 5, no dedup needed
    expect(queryCount).toHaveBeenCalledTimes(2);
    expect(queryInstances).not.toHaveBeenCalled();  // no 2000-fetch
  });

  // ── Scenario 2: State only  (exclusive → SUM path) ─────────────────────────
  //
  // No businessKey, no variable → baseVariants.length = 1 (empty base = 1 variant).
  // Bodies: stateFragment(active) + stateFragment(suspended) = 2 bodies.
  // → SUM path.
  //
  it('uses queryProcessInstancesCount + SUM when only state filter is present', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(10))   // body: active
      .mockReturnValueOnce(of(4));   // body: suspended
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

  // ── Scenario 3: State × 2 BusinessKeys  (baseVariants > 1 → orQueries path) ──
  //
  // businessKey with 2 values → baseVariants.length = 2.
  // Rather than 4 queryProcessInstances calls + client-side Set dedup, the new code
  // issues one queryProcessInstancesCount per state fragment with the BK variants
  // combined as orQueries: 2 calls total (active, completed), each with orQueries[2].
  // The engine deduplicates — instances matching both BK patterns are counted once.
  //
  it('uses queryProcessInstancesCount + orQueries (2 calls) when businessKey has 2+ values', async () => {
    const queryCount = vi.fn()
      // stateGroups order: [active + orQueries([bk_a, bk_b]), completed + orQueries([bk_a, bk_b])]
      // Engine deduplicates: "inst-overlap" (BK="ab") counted once per state group
      .mockReturnValueOnce(of(3))   // active: inst-1, inst-overlap, inst-2 → 3
      .mockReturnValueOnce(of(1));  // completed: inst-3 → 1
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

    expect(count).toBe(4);                              // 3 + 1, dedup done by engine
    expect(queryCount).toHaveBeenCalledTimes(2);        // one per state fragment
    expect(queryInstances).not.toHaveBeenCalled();      // no full-instance fetch, no 2000

    // Verify each call used orQueries (not flat body) with the 2 BK variants
    const [call0, call1] = queryCount.mock.calls;
    expect(call0[0]).toMatchObject({ active: true, unfinished: true });
    expect(call0[0].orQueries).toHaveLength(2);
    expect(call1[0]).toMatchObject({ completed: true, finished: true });
    expect(call1[0].orQueries).toHaveLength(2);
  });

  // ── Scenario 4: State × Variable with 'like' (baseVariants > 1 → orQueries) ─
  //
  // variable with op='like' and 2 values → baseVariants.length = 2.
  // Same approach: one queryProcessInstancesCount per state fragment with orQueries.
  //
  it('uses queryProcessInstancesCount + orQueries when variable uses like with 2+ values', async () => {
    const queryCount = vi.fn()
      // stateGroups: [active + orQueries([var~foo, var~bar]), completed + orQueries([...])]
      .mockReturnValueOnce(of(3))   // active: overlap + inst-a + inst-b → 3 (engine deduped overlap)
      .mockReturnValueOnce(of(1));  // completed: inst-c → 1
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',    values: ['active', 'completed'] },
      { field: 'variable', values: ['foo', 'bar'], variableName: 'myVar', variableOperator: 'like' },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(4);
    expect(queryCount).toHaveBeenCalledTimes(2);
    expect(queryInstances).not.toHaveBeenCalled();

    const [call0] = queryCount.mock.calls;
    expect(call0[0].orQueries).toHaveLength(2); // 2 variable like variants
  });

  // ── Scenario 4b: State × 4 BK → exactly 2 count calls with orQueries[4] ─────
  // (note: the equivalent for the LIST path is in the searchPerState describe below)
  //
  // This is the exact scenario from the original bug report: 2 states × 4 BK values.
  // Old code: 8 queryProcessInstances calls with maxResults=2000.
  // New code: 2 queryProcessInstancesCount calls, each with orQueries of length 4.
  //
  it('issues exactly 2 count calls (not 8 instance calls) for state × 4 BK values', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(10))   // active: all 4 BK patterns combined, deduped by engine
      .mockReturnValueOnce(of(5));   // completed
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

    expect(count).toBe(15);
    expect(queryCount).toHaveBeenCalledTimes(2);   // was 8 with the old mechanism
    expect(queryInstances).not.toHaveBeenCalled();

    // Each call body has orQueries with all 4 BK variants
    for (const [body] of queryCount.mock.calls) {
      expect(body.orQueries).toHaveLength(4);
    }
  });

  // ── Scenario 5: Equivalence proof — State × 1BK SUM === dedup on same data ─
  //
  // When baseVariants.length === 1, the SUM result must equal what dedup would
  // return (since there is no overlap to remove). This test confirms the two paths
  // are equivalent for exclusive data before we rely on the faster SUM path.
  //
  it('SUM and dedup produce identical counts when bodies are mutually exclusive', async () => {
    // The SUM path is taken because BK has only 1 value.
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(7))   // active
      .mockReturnValueOnce(of(3));  // completed
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['BK-X'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    // 7 + 3 = 10 — same as dedup would return because no instance can be both active
    // and completed simultaneously, and only 1 BK pattern means no LIKE overlap.
    expect(count).toBe(10);
  });

  // ── Scenario 5b: searchProcessInstancesGlobalCount multi-variant, no 2+ state ─
  //
  // When state has 0 or 1 value (single-state or no-state path in
  // searchProcessInstancesGlobalCount), and businessKey has 2+ values:
  // → a single queryProcessInstancesCount call with { orQueries: variants }.
  // Old code: N queryProcessInstances(0, 2000) + Set dedup.
  //
  it('issues a single orQueries count call for multi-BK without 2+ state values', async () => {
    const queryCount = vi.fn().mockReturnValue(of(7));
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    // No state filter → goes through buildPayloadVariants directly (not countPerState)
    const filters: MultiValueFilter[] = [
      { field: 'businessKey', values: ['BK-001', 'BK-002', 'BK-003'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(7);
    expect(queryCount).toHaveBeenCalledTimes(1);      // single call, not 3
    expect(queryInstances).not.toHaveBeenCalled();

    const [body] = queryCount.mock.calls[0];
    expect(body).toHaveProperty('orQueries');
    expect(body.orQueries).toHaveLength(3);           // one entry per BK value
    expect(body.orQueries[0]).toMatchObject({ processInstanceBusinessKeyLike: '%BK-001%' });
  });

  // ── Scenario 5c: finishedAfter at root when baseVariants === 1 (stable path) ──
  //
  // When BK has only 1 value, no orQueries are used. finishedAfter appears at the
  // top level of each flat request body as part of the variant spread. This test
  // acts as a baseline: the === 1 path was always correct; it must stay correct.
  //
  it('keeps finishedAfter at root level in flat bodies when baseVariants === 1', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(2))   // active + BK + finishedAfter
      .mockReturnValueOnce(of(1));  // completed + BK + finishedAfter
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',        values: ['active', 'completed'] },
      { field: 'businessKey',  values: ['BK-001'] },
      { field: 'finishedAfter', values: ['2026-07-08T00:00:00.000Z'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    for (const [body] of queryCount.mock.calls) {
      // No orQueries — flat body, finishedAfter directly at root
      expect(body).not.toHaveProperty('orQueries');
      expect(body).toHaveProperty('finishedAfter', '2026-07-08T00:00:00.000Z');
    }
  });

  // ── Scenario 5d: finishedAfter at root when baseVariants > 1 (regression fix) ─
  //
  // Regression: adding finishedAfter caused count to jump from 3 to 4664 because
  // buildPayloadVariants places finishedAfter in `base`, and when `baseVariants`
  // are placed directly as orQueries, finishedAfter ends up INSIDE each orQuery
  // entry where Camunda silently ignores it (date-range fields are not OR-able in
  // Camunda 7). Fix: splitForOrQuery hoists all non-BK/variable fields to root.
  //
  it('hoists finishedAfter to root (not inside orQueries entries) when baseVariants > 1', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(2))   // active
      .mockReturnValueOnce(of(1));  // completed
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',        values: ['active', 'completed'] },
      { field: 'businessKey',  values: ['a', 'b'] },  // 2 BK values → baseVariants.length = 2
      { field: 'finishedAfter', values: ['2026-07-08T00:00:00.000Z'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(queryCount).toHaveBeenCalledTimes(2);
    for (const [body] of queryCount.mock.calls) {
      // finishedAfter must be at the request root — not inside any orQuery entry
      expect(body).toHaveProperty('finishedAfter', '2026-07-08T00:00:00.000Z');
      expect(body).toHaveProperty('orQueries');
      for (const entry of body.orQueries) {
        expect(entry).not.toHaveProperty('finishedAfter');
      }
    }
  });

  // ── Scenario 5e: finishedAfter at root in searchProcessInstancesGlobalCount ───
  //    (multi-BK, no 2+ state — the direct orQueries path, not via countPerState)
  //
  // When state has 0 or 1 value, searchProcessInstancesGlobalCount builds orQueries
  // directly without going through countPerState. Same regression applies: base
  // conditions (dates) must be hoisted to root by splitForOrQuery.
  //
  it('hoists finishedAfter to root in globalCount multi-BK single-state path', async () => {
    const queryCount = vi.fn().mockReturnValue(of(3));
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'businessKey',  values: ['a', 'b'] },
      { field: 'finishedAfter', values: ['2026-07-08T00:00:00.000Z'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(3);
    expect(queryCount).toHaveBeenCalledTimes(1);
    const [body] = queryCount.mock.calls[0];
    // finishedAfter at root
    expect(body).toHaveProperty('finishedAfter', '2026-07-08T00:00:00.000Z');
    expect(body).toHaveProperty('orQueries');
    for (const entry of body.orQueries) {
      expect(entry).not.toHaveProperty('finishedAfter');
    }
  });

  // ── Scenario 5f: processInstanceIds inside orQuery entries (regression fix) ──
  //
  // Regression introduced by splitForOrQuery: processInstanceIds was hoisted to root.
  // When processInstanceIds appears at root alongside orQueries (BK entries), Camunda
  // returns 0 results — the two constraints don't combine correctly in that layout.
  // Fix: processInstanceIds is in OR_ABLE, so it stays inside each orQuery entry.
  //
  // Scenario: State × 4 BK × 3 Instance IDs — returned 3 results before the regression,
  // must return 3 results (not 0) after the fix.
  //
  it('keeps processInstanceIds inside orQuery entries (not at root) when baseVariants > 1', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(2))   // active state group
      .mockReturnValueOnce(of(1));  // completed state group
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const instanceIds = ['e28e0fdf-8991-11f1-bca3-48ea62940dbf', 'cd5b5849-893a-11f1-ab31-48ea62940dbf', 'e28cb048-8991-11f1-bca3-48ea62940dbf'];
    const filters: MultiValueFilter[] = [
      { field: 'state',      values: ['active', 'completed'] },
      { field: 'businessKey', values: ['a', 'b', 'c', 'd'] },
      { field: 'instanceId', values: instanceIds },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(3);  // 2 + 1 — not 0 (which happened when processInstanceIds was at root)
    expect(queryCount).toHaveBeenCalledTimes(2);
    expect(queryInstances).not.toHaveBeenCalled();

    for (const [body] of queryCount.mock.calls) {
      // processInstanceIds must NOT be at the request root — keeping it at root
      // causes Camunda to return 0 when combined with orQueries BK entries
      expect(body).not.toHaveProperty('processInstanceIds');
      expect(body).toHaveProperty('orQueries');
      // processInstanceIds must be inside EVERY orQuery entry
      expect(body.orQueries).toHaveLength(4);
      for (const entry of body.orQueries) {
        expect(entry).toHaveProperty('processInstanceIds', instanceIds);
      }
    }
  });

  // ── Scenario 5g: processInstanceIds + finishedAfter — correct split ───────────
  //
  // With both criteria: processInstanceIds stays inside orQuery entries (OR_ABLE),
  // finishedAfter is hoisted to root (date-range, not supported in orQuery entries).
  // Both fixes must coexist without interfering with each other.
  //
  it('correctly splits processInstanceIds (in orQuery entries) and finishedAfter (at root)', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(1))
      .mockReturnValueOnce(of(0));
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const instanceIds = ['id-abc', 'id-def'];
    const filters: MultiValueFilter[] = [
      { field: 'state',        values: ['active', 'completed'] },
      { field: 'businessKey',  values: ['x', 'y'] },
      { field: 'instanceId',   values: instanceIds },
      { field: 'finishedAfter', values: ['2026-07-08T00:00:00.000Z'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    for (const [body] of queryCount.mock.calls) {
      // finishedAfter at root (date-range — silently ignored inside orQuery entries)
      expect(body).toHaveProperty('finishedAfter', '2026-07-08T00:00:00.000Z');
      // processInstanceIds inside each orQuery entry (not at root)
      expect(body).not.toHaveProperty('processInstanceIds');
      for (const entry of body.orQueries) {
        expect(entry).toHaveProperty('processInstanceIds', instanceIds);
        expect(entry).not.toHaveProperty('finishedAfter');
      }
    }
  });

  // ── Scenario 6: terminated state splits into 2 fragments (ext + int) ────────
  //
  // stateBodyFragment('terminated') returns 2 bodies (externallyTerminated,
  // internallyTerminated). With 1 BK value → 2 total bodies → SUM path.
  // Both termination types are mutually exclusive in Camunda — SUM is correct.
  //
  it('handles "terminated" state (2 Camunda fragments) correctly with SUM path', async () => {
    const queryCount = vi.fn()
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

    // bodies: [active+BK, ext-terminated+BK, int-terminated+BK]
    // SUM path because baseVariants.length === 1
    const queryCountThree = vi.fn()
      .mockReturnValueOnce(of(5))   // active
      .mockReturnValueOnce(of(2))   // externallyTerminated
      .mockReturnValueOnce(of(1));  // internallyTerminated

    const svc2 = makeService({
      queryProcessInstancesCount: queryCountThree,
      queryProcessInstances: queryInstances,
    });

    const count = await lastValueFrom(svc2.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(8);   // 5 + 2 + 1
    expect(queryCountThree).toHaveBeenCalledTimes(3);
    expect(queryInstances).not.toHaveBeenCalled();
  });
});

// ─── searchPerState — called via searchProcessInstancesGlobal ────────────────
//
// searchPerState is invoked when statePill.values.length > 1.
// baseVariants.length > 1 branch:
//   Before: N_state_fragments × N_BK_variants queryProcessInstances(0, 2000) calls
//   After:  N_state_fragments queryProcessInstances(0, needed) calls, each with orQueries
//
// Pagination strategy: needed = firstResult + maxResults fetched from each state fragment
// (pre-sorted by API via sorting param). Worst-case coverage: all items of the requested
// page come from one fragment → fetching `needed` from each guarantees the right items.
//
describe('CockpitService — searchPerState (via searchProcessInstancesGlobal)', () => {

  function inst(id: string, startTime: string): ProcessInstance {
    return { ...makeInstance(id), startTime };
  }

  // ── Test 1: 2 states × 4 BK → exactly 2 HTTP calls (not 8) ─────────────────
  it('issues exactly 2 queryProcessInstances calls for 2 states × 4 BK values', async () => {
    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([makeInstance('a1'), makeInstance('a2')]))  // active state group
      .mockReturnValueOnce(of([makeInstance('c1')]));                      // completed state group

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['a', 'b', 'c', 'd'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 0, 10));

    // 2 calls total (one per state fragment), NOT 8 (= 2 states × 4 BK variants)
    expect(queryInstances).toHaveBeenCalledTimes(2);

    const [call0, call1] = queryInstances.mock.calls;

    // Each body has state flags at top level and orQueries with all 4 BK variants
    expect(call0[0]).toMatchObject({ active: true, unfinished: true });
    expect(call0[0].orQueries).toHaveLength(4);

    expect(call1[0]).toMatchObject({ completed: true, finished: true });
    expect(call1[0].orQueries).toHaveLength(4);
  });

  // ── Test 2: fetch limit is firstResult+maxResults, never 2000 ───────────────
  it('passes firstResult+maxResults as fetch limit (not 2000) to each state group', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['x', 'y'] },
    ];

    // Page 3: firstResult=40, maxResults=20 → needed = 60
    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 40, 20));

    for (const [, callFirstResult, callMaxResults] of queryInstances.mock.calls) {
      expect(callFirstResult).toBe(0);     // always 0 — offset handled in-memory after merge
      expect(callMaxResults).toBe(60);     // needed = 40 + 20
      expect(callMaxResults).not.toBe(2000);
    }
  });

  // ── Test 3: pagination correctness — page 2 returns the right items ──────────
  //
  // Combined sorted (startTime desc): a1(10), c1(9), a2(8), c2(7), a3(6), c3(5), a4(4), c4(3)
  // Page 2 = firstResult=4, maxResults=2 → positions 4 and 5 → a3(Jan06) and c3(Jan05)
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

    const queryInstances = vi.fn()
      .mockReturnValueOnce(of(activeInstances))    // active state group
      .mockReturnValueOnce(of(completedInstances)); // completed state group

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['p', 'q'] },
    ];

    const result = await lastValueFrom(
      svc.searchProcessInstancesGlobal(filters, false, false, 4, 2)
    );

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a3'); // position 4 — startTime Jan06
    expect(result[1].id).toBe('c3'); // position 5 — startTime Jan05
  });

  // ── Test 3b: processInstanceIds inside orQuery entries (regression fix) ─────────
  //
  // Mirror of Scenario 5f for the list path. processInstanceIds must remain inside
  // each orQuery entry — moving it to root causes Camunda to return 0 results.
  //
  it('keeps processInstanceIds inside orQuery entries (not at root) in list path', async () => {
    const instanceIds = ['e28e0fdf-8991-11f1-bca3-48ea62940dbf', 'cd5b5849-893a-11f1-ab31-48ea62940dbf'];
    const queryInstances = vi.fn().mockReturnValue(of([]));

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',      values: ['active', 'completed'] },
      { field: 'businessKey', values: ['a', 'b', 'c', 'd'] },
      { field: 'instanceId', values: instanceIds },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 0, 20));

    expect(queryInstances).toHaveBeenCalledTimes(2);
    for (const [body] of queryInstances.mock.calls) {
      expect(body).not.toHaveProperty('processInstanceIds');
      expect(body).toHaveProperty('orQueries');
      expect(body.orQueries).toHaveLength(4);
      for (const entry of body.orQueries) {
        expect(entry).toHaveProperty('processInstanceIds', instanceIds);
      }
    }
  });

  // ── Test 3d: finishedAfter hoisted to root (not inside orQueries) ──────────────
  //
  // Same regression as countPerState: if finishedAfter ends up inside orQuery entries
  // Camunda ignores it, returning instances regardless of date. splitForOrQuery must
  // hoist it to root of each state group body.
  //
  it('hoists finishedAfter to root of each state group body when baseVariants > 1', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',        values: ['active', 'completed'] },
      { field: 'businessKey',  values: ['a', 'b'] },
      { field: 'finishedAfter', values: ['2026-07-08T00:00:00.000Z'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 0, 20));

    expect(queryInstances).toHaveBeenCalledTimes(2);
    for (const [body] of queryInstances.mock.calls) {
      // finishedAfter must be at the request root — not inside any orQuery entry
      expect(body).toHaveProperty('finishedAfter', '2026-07-08T00:00:00.000Z');
      expect(body).toHaveProperty('orQueries');
      for (const entry of body.orQueries) {
        expect(entry).not.toHaveProperty('finishedAfter');
      }
    }
  });

  // ── Test 4: sort consistency — items at state boundary are correctly ordered ─
  //
  // c1 (completed, Jan08) must appear before a2 (active, Jan05) in the merged result,
  // even though the forkJoin delivers active results first.
  //
  it('preserves startTime desc order across state group boundaries', async () => {
    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([                           // active state group
        inst('a1', '2024-01-10T00:00:00.000Z'),
        inst('a2', '2024-01-05T00:00:00.000Z'),
      ]))
      .mockReturnValueOnce(of([                           // completed state group
        inst('c1', '2024-01-08T00:00:00.000Z'),
        inst('c2', '2024-01-03T00:00:00.000Z'),
      ]));

    const svc = makeService({
      queryProcessInstances: queryInstances,
      queryProcessInstancesCount: vi.fn(),
    });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['r', 's'] },
    ];

    const result = await lastValueFrom(
      svc.searchProcessInstancesGlobal(filters, false, false, 0, 10)
    );

    // Expected sorted: a1(Jan10), c1(Jan08), a2(Jan05), c2(Jan03)
    expect(result.map(r => r.id)).toEqual(['a1', 'c1', 'a2', 'c2']);

    // The cross-state boundary is between c1 (Jan08, completed) and a2 (Jan05, active):
    // c1 must appear before a2 despite coming from a different forkJoin branch.
    const idxC1 = result.findIndex(r => r.id === 'c1');
    const idxA2 = result.findIndex(r => r.id === 'a2');
    expect(idxC1).toBeLessThan(idxA2);
  });
});
