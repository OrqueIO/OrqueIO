import { of, lastValueFrom } from 'rxjs';
import { vi, describe, it, expect } from 'vitest';

import { CockpitService, MultiValueFilter, MultiStateCursor } from './cockpit.service';
import { ProcessInstance, ProcessInstanceService } from './process-instance.service';
import { DashboardService } from './dashboard.service';
import { ProcessDefinitionService } from './process-definition.service';
import { DecisionService } from './decision.service';
import { DeploymentService } from './deployment.service';
import { HttpClient } from '@angular/common/http';

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

describe('CockpitService — countPerState (via searchProcessInstancesGlobalCount)', () => {

  it('uses queryProcessInstancesCount + SUM when state is the only multi-value dimension (1 BK value)', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(3))
      .mockReturnValueOnce(of(5));
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

    for (const [body] of queryCount.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike', '%BK-001%');
      expect(body).not.toHaveProperty('orQueries');
    }
  });

  it('uses queryProcessInstancesCount + SUM for arbitrary multi-state combinations', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(10))
      .mockReturnValueOnce(of(4));
    const queryInstances = vi.fn();

    const svc = makeService({
      queryProcessInstancesCount: queryCount,
      queryProcessInstances: queryInstances,
    });

    const filters: MultiValueFilter[] = [
      { field: 'state', values: ['active', 'completed'] }, // arbitrary → countPerState
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(14);
    expect(queryCount).toHaveBeenCalledTimes(2);
    expect(queryInstances).not.toHaveBeenCalled();
  });

  it('uses queryProcessInstances (not queryCount) to count when BK has 2 values; deduplicates result', async () => {
    const i1 = makeInstance('inst-a1'); const i2 = makeInstance('inst-a2');
    const i3 = makeInstance('inst-b1');
    const i4 = makeInstance('inst-c1');

    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([i1, i2]))
      .mockReturnValueOnce(of([i3]))
      .mockReturnValueOnce(of([i4]))
      .mockReturnValueOnce(of([]));
    const queryCount = vi.fn();

    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: queryCount });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['a', 'b'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(4);
    expect(queryInstances).toHaveBeenCalledTimes(4);
    expect(queryCount).not.toHaveBeenCalled();

    for (const [body] of queryInstances.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      expect(body).not.toHaveProperty('orQueries');
    }

    expect(queryInstances.mock.calls[0][0]).toMatchObject({ active: true, unfinished: true });
    expect(queryInstances.mock.calls[1][0]).toMatchObject({ active: true, unfinished: true });
    expect(queryInstances.mock.calls[2][0]).toMatchObject({ completed: true, finished: true });
    expect(queryInstances.mock.calls[3][0]).toMatchObject({ completed: true, finished: true });
  });


  it('issues exactly 8 queryProcessInstances calls (2 states × 4 BK values); counts unique IDs', async () => {
    const queryInstances = vi.fn().mockImplementation((_body: any, _fr: number, _mr: number) => {
      const callIdx = queryInstances.mock.calls.length - 1;
      return of([makeInstance('u' + callIdx + '_1'), makeInstance('u' + callIdx + '_2')]);
    });
    const queryCount = vi.fn();

    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: queryCount });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'completed'] },
      { field: 'businessKey', values: ['a', 'b', 'c', 'd'] },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(queryInstances).toHaveBeenCalledTimes(8);
    expect(queryCount).not.toHaveBeenCalled();
    expect(count).toBe(16);

    for (const [body] of queryInstances.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      expect(body).not.toHaveProperty('orQueries');
    }
  });


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

  it('handles "terminated" state as 1 body with orQueries (not 2 separate bodies)', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(5))
      .mockReturnValueOnce(of(3));
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

    expect(count).toBe(8);
    expect(queryCount).toHaveBeenCalledTimes(2);
    expect(queryInstances).not.toHaveBeenCalled();

    const terminatedBody = queryCount.mock.calls[1][0];
    expect(terminatedBody).toMatchObject({
      processInstanceBusinessKeyLike: '%BK-Y%',
      finished: true,
      orQueries: [{ externallyTerminated: true }, { internallyTerminated: true }],
    });
    expect(terminatedBody).not.toHaveProperty('externallyTerminated');
    expect(terminatedBody).not.toHaveProperty('internallyTerminated');
  });

  it('issues one queryProcessInstancesCount per BK variant when state has single value', async () => {
    const queryCount = vi.fn()
      .mockReturnValueOnce(of(4))
      .mockReturnValueOnce(of(3))
      .mockReturnValueOnce(of(2));
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

    expect(count).toBe(9);
    expect(queryCount).toHaveBeenCalledTimes(3);
    expect(queryInstances).not.toHaveBeenCalled();

    for (const [body] of queryCount.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      expect(body).not.toHaveProperty('orQueries');
    }
  });
});


describe('CockpitService — multi-BK single-state list path (searchProcessInstancesGlobal)', () => {

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

    expect(queryInstances).toHaveBeenCalledTimes(2);
    for (const [, callFirstResult, callMaxResults] of queryInstances.mock.calls) {
      expect(callFirstResult).toBe(0);
      expect(callMaxResults).toBe(60);
      expect(callMaxResults).not.toBe(2000);
    }
  });
});


describe('CockpitService — searchPerState (via searchProcessInstancesGlobal)', () => {

  function inst(id: string, startTime: string): ProcessInstance {
    return { ...makeInstance(id), startTime };
  }

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

    expect(queryInstances).toHaveBeenCalledTimes(4);

    for (const [body] of queryInstances.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      expect(body).not.toHaveProperty('orQueries');
    }

    expect(queryInstances.mock.calls[0][0]).toMatchObject({ active: true, unfinished: true });
    expect(queryInstances.mock.calls[1][0]).toMatchObject({ active: true, unfinished: true });
    expect(queryInstances.mock.calls[2][0]).toMatchObject({ completed: true, finished: true });
    expect(queryInstances.mock.calls[3][0]).toMatchObject({ completed: true, finished: true });
  });

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
      expect(callFirstResult).toBe(0);
      expect(callMaxResults).toBe(60);
      expect(callMaxResults).not.toBe(2000);
    }
  });

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
      .mockReturnValueOnce(of(activeInstances))
      .mockReturnValueOnce(of(completedInstances));

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
    expect(result[0].id).toBe('a3');
    expect(result[1].id).toBe('c3');
  });


  it('preserves startTime desc order across state group boundaries', async () => {
    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([
        inst('a1', '2024-01-10T00:00:00.000Z'),
        inst('a2', '2024-01-05T00:00:00.000Z'),
      ]))
      .mockReturnValueOnce(of([
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

describe('CockpitService — searchPerState incremental cache (via searchProcessInstancesGlobal)', () => {

  function inst(id: string, startTime: string): ProcessInstance {
    return { ...makeInstance(id), startTime };
  }

  const FILTERS: MultiValueFilter[] = [
    { field: 'state',       values: ['active', 'completed'] },
    { field: 'businessKey', values: ['q'] },
  ];


  it('fetches only the delta on page 2 when page 1 data is already cached', async () => {
    const page1Active    = Array.from({length: 20}, (_, i) => inst(`a${i}`,    `2024-02-${String(28-i).padStart(2,'0')}T00:00:00.000Z`));
    const page1Completed = Array.from({length: 20}, (_, i) => inst(`c${i}`,    `2024-02-${String(27-i).padStart(2,'0')}T00:00:00.000Z`));
    const deltaActive    = Array.from({length: 20}, (_, i) => inst(`a${20+i}`, `2024-01-${String(28-i).padStart(2,'0')}T00:00:00.000Z`));
    const deltaCompleted = Array.from({length: 20}, (_, i) => inst(`c${20+i}`, `2024-01-${String(27-i).padStart(2,'0')}T00:00:00.000Z`));

    const queryInstances = vi.fn()
      .mockReturnValueOnce(of(page1Active))
      .mockReturnValueOnce(of(page1Completed))
      .mockReturnValueOnce(of(deltaActive))
      .mockReturnValueOnce(of(deltaCompleted));

    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: vi.fn() });
    const cache = new Map<string, ProcessInstance[]>();

    await lastValueFrom(svc.searchProcessInstancesGlobal(FILTERS, false, false, 0, 20, cache));
    expect(queryInstances).toHaveBeenCalledTimes(2);
    for (const [, fetchFrom, fetchCount] of queryInstances.mock.calls) {
      expect(fetchFrom).toBe(0);
      expect(fetchCount).toBe(20);
    }

    queryInstances.mockClear();

    await lastValueFrom(svc.searchProcessInstancesGlobal(FILTERS, false, false, 20, 20, cache));
    expect(queryInstances).toHaveBeenCalledTimes(2);
    for (const [, fetchFrom, fetchCount] of queryInstances.mock.calls) {
      expect(fetchFrom).toBe(20);
      expect(fetchCount).toBe(20);
    }
  });


  it('triggers no HTTP call when navigating back to a page already covered by cache', async () => {
    const page1Active    = Array.from({length: 20}, (_, i) => inst(`a${i}`,    `2024-02-${String(28-i).padStart(2,'0')}T00:00:00.000Z`));
    const page1Completed = Array.from({length: 20}, (_, i) => inst(`c${i}`,    `2024-02-${String(27-i).padStart(2,'0')}T00:00:00.000Z`));
    const deltaActive    = Array.from({length: 20}, (_, i) => inst(`a${20+i}`, `2024-01-${String(28-i).padStart(2,'0')}T00:00:00.000Z`));
    const deltaCompleted = Array.from({length: 20}, (_, i) => inst(`c${20+i}`, `2024-01-${String(27-i).padStart(2,'0')}T00:00:00.000Z`));

    const queryInstances = vi.fn()
      .mockReturnValueOnce(of(page1Active))
      .mockReturnValueOnce(of(page1Completed))
      .mockReturnValueOnce(of(deltaActive))
      .mockReturnValueOnce(of(deltaCompleted));

    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: vi.fn() });
    const cache = new Map<string, ProcessInstance[]>();

    await lastValueFrom(svc.searchProcessInstancesGlobal(FILTERS, false, false, 0, 20, cache)); // page 1
    await lastValueFrom(svc.searchProcessInstancesGlobal(FILTERS, false, false, 20, 20, cache)); // page 2
    expect(queryInstances).toHaveBeenCalledTimes(4);

    queryInstances.mockClear();

    await lastValueFrom(svc.searchProcessInstancesGlobal(FILTERS, false, false, 0, 20, cache));
    expect(queryInstances).toHaveBeenCalledTimes(0);
  });

  it('falls back to fetch-from-zero on every call when no cache is provided', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: vi.fn() });

    await lastValueFrom(svc.searchProcessInstancesGlobal(FILTERS, false, false, 20, 20));
    await lastValueFrom(svc.searchProcessInstancesGlobal(FILTERS, false, false, 20, 20));

    expect(queryInstances).toHaveBeenCalledTimes(4);
    for (const [, fetchFrom] of queryInstances.mock.calls) {
      expect(fetchFrom).toBe(0);
    }
  });
});

describe('CockpitService — Fix 1: terminated uses orQueries in searchPerState', () => {

  it('sends 1 body for terminated state with orQueries combining both sub-types', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: vi.fn() });

    const filters: MultiValueFilter[] = [
      { field: 'state', values: ['active', 'terminated'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 0, 20));

    expect(queryInstances).toHaveBeenCalledTimes(2);

    const activebody = queryInstances.mock.calls[0][0];
    expect(activebody).toMatchObject({ active: true, unfinished: true });
    expect(activebody).not.toHaveProperty('orQueries');

    const terminatedBody = queryInstances.mock.calls[1][0];
    expect(terminatedBody).toMatchObject({
      finished: true,
      orQueries: [{ externallyTerminated: true }, { internallyTerminated: true }],
    });
    expect(terminatedBody).not.toHaveProperty('externallyTerminated');
    expect(terminatedBody).not.toHaveProperty('internallyTerminated');
  });

  it('places BK at root and orQueries for state sub-type when active+terminated + BK', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: vi.fn() });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ['active', 'terminated'] },
      { field: 'businessKey', values: ['BK-001'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 0, 20));

    expect(queryInstances).toHaveBeenCalledTimes(2);

    const terminatedBody = queryInstances.mock.calls[1][0];
    expect(terminatedBody).toHaveProperty('processInstanceBusinessKeyLike', '%BK-001%');
    expect(terminatedBody).toHaveProperty('finished', true);
    expect(terminatedBody).toHaveProperty('orQueries', [{ externallyTerminated: true }, { internallyTerminated: true }]);
    expect(terminatedBody).not.toHaveProperty('externallyTerminated');
    expect(terminatedBody).not.toHaveProperty('internallyTerminated');
  });
});

describe('CockpitService — Fix 2: all-states selection bypasses searchPerState', () => {

  const ALL_STATES = ['active', 'suspended', 'completed', 'terminated'];

  it('issues exactly 1 queryProcessInstances call with no state flags when all 4 states selected', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: vi.fn() });

    const filters: MultiValueFilter[] = [
      { field: 'state', values: ALL_STATES },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 0, 20));

    expect(queryInstances).toHaveBeenCalledTimes(1);
    const [body] = queryInstances.mock.calls[0];
    expect(body).not.toHaveProperty('active');
    expect(body).not.toHaveProperty('suspended');
    expect(body).not.toHaveProperty('completed');
    expect(body).not.toHaveProperty('finished');
    expect(body).not.toHaveProperty('unfinished');
    expect(body).not.toHaveProperty('externallyTerminated');
    expect(body).not.toHaveProperty('internallyTerminated');
    expect(body).not.toHaveProperty('orQueries');
  });

  it('issues exactly 1 queryProcessInstancesCount call with no state flags when all 4 states selected', async () => {
    const queryCount = vi.fn().mockReturnValue(of(42));
    const svc = makeService({ queryProcessInstances: vi.fn(), queryProcessInstancesCount: queryCount });

    const filters: MultiValueFilter[] = [
      { field: 'state', values: ALL_STATES },
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(42);
    expect(queryCount).toHaveBeenCalledTimes(1);
    const [body] = queryCount.mock.calls[0];
    expect(body).not.toHaveProperty('active');
    expect(body).not.toHaveProperty('finished');
    expect(body).not.toHaveProperty('unfinished');
    expect(body).not.toHaveProperty('orQueries');
  });

  it('issues 2 separate requests (one per BK) when all 4 states + 2 BK values', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: vi.fn() });

    const filters: MultiValueFilter[] = [
      { field: 'state',       values: ALL_STATES },
      { field: 'businessKey', values: ['bk1', 'bk2'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 0, 20));

    expect(queryInstances).toHaveBeenCalledTimes(2);
    const bodies = queryInstances.mock.calls.map(([b]: [any]) => b);
    expect(bodies.some((b: any) => b.processInstanceBusinessKeyLike === '%bk1%')).toBe(true);
    expect(bodies.some((b: any) => b.processInstanceBusinessKeyLike === '%bk2%')).toBe(true);
    expect(bodies.every((b: any) => !b.active && !b.finished && !b.unfinished)).toBe(true);
    expect(bodies.every((b: any) => !b.orQueries)).toBe(true);
  });

  it('triggers short-circuit regardless of state value order', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: vi.fn() });

    const filtersShuffled: MultiValueFilter[] = [
      { field: 'state', values: ['terminated', 'active', 'completed', 'suspended'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filtersShuffled, false, false, 0, 20));

    expect(queryInstances).toHaveBeenCalledTimes(1);
    const [body] = queryInstances.mock.calls[0];
    expect(body).not.toHaveProperty('finished');
    expect(body).not.toHaveProperty('unfinished');
  });

  it('does NOT short-circuit when only 3 of 4 states are selected', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances, queryProcessInstancesCount: vi.fn() });

    const filters: MultiValueFilter[] = [
      { field: 'state', values: ['active', 'suspended', 'completed'] },
    ];

    await lastValueFrom(svc.searchProcessInstancesGlobal(filters, false, false, 0, 20));

    expect(queryInstances).toHaveBeenCalledTimes(3);
  });
});


function makeItems(prefix: string, count: number, startTimeBase = '2024-01-'): ProcessInstance[] {
  return Array.from({ length: count }, (_, i) => {
    // Descending startTime so index 0 = newest
    const day = String(31 - (i % 28)).padStart(2, '0');
    const hour = String(23 - (i % 24)).padStart(2, '0');
    return makeInstance(`${prefix}-${i}`, `${startTimeBase}${day}T${hour}:00:00.000Z`);
  });
}

describe('CockpitService — searchPerStatePaged T1: deduplication', () => {
  it('deduplicates an instance that appears in both state query results', async () => {
    const shared   = makeInstance('shared-1', '2024-01-30T00:00:00.000Z');
    const onlyA    = makeInstance('only-a',   '2024-01-29T00:00:00.000Z');
    const onlyB    = makeInstance('only-b',   '2024-01-28T00:00:00.000Z');

    const queryInstances = vi.fn().mockImplementation((_body: any, _first: number, _max: number) => {
      if (_body.active) return of([shared, onlyA]);
      return of([shared, onlyB]);
    });
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];

    const result = await lastValueFrom(
      svc.searchPerStatePaged(filters, filters[0], false, false, 5, null)
    );

    // 'shared-1' must appear exactly once
    const ids = result.items.map(i => i.id);
    expect(ids.filter(id => id === 'shared-1').length).toBe(1);
    // Total unique: shared, onlyA, onlyB = 3
    expect(result.items.length).toBe(3);
  });

  it('advances BOTH body cursors past a deduplicated instance to prevent re-appearance', async () => {
    const shared   = makeInstance('shared-1', '2024-01-30T00:00:00.000Z');
    const onlyA    = makeInstance('only-a',   '2024-01-29T00:00:00.000Z');
    const onlyB    = makeInstance('only-b',   '2024-01-28T00:00:00.000Z');
    const nextA    = makeInstance('next-a',   '2024-01-27T00:00:00.000Z');
    const nextB    = makeInstance('next-b',   '2024-01-26T00:00:00.000Z');

    let callCount = 0;
    const queryInstances = vi.fn().mockImplementation((_body: any, firstResult: number, _max: number) => {
      callCount++;
      if (_body.active) {
        if (firstResult === 0) return of([shared, onlyA]);
        return of([nextA]);
      }
      if (firstResult === 0) return of([shared, onlyB]);
      return of([nextB]);
    });
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];

    const p1 = await lastValueFrom(
      svc.searchPerStatePaged(filters, filters[0], false, false, 3, null)
    );
    expect(p1.items.map(i => i.id)).not.toContain('next-a');
    expect(p1.items.map(i => i.id)).not.toContain('next-b');

    const p2 = await lastValueFrom(
      svc.searchPerStatePaged(filters, filters[0], false, false, 3, p1.nextCursor)
    );
    expect(p2.items.map(i => i.id)).not.toContain('shared-1');
  });
});

describe('CockpitService — searchPerStatePaged T2: full pages with state exhaustion', () => {
  it('delivers a full page even when state A is exhausted and only state B has items', async () => {
    const activeItems    = makeItems('a', 3,  '2024-02-');
    const completedItems = makeItems('c', 30, '2024-01-');

    const queryInstances = vi.fn().mockImplementation((_body: any, firstResult: number, maxResults: number) => {
      const pool = _body.active ? activeItems : completedItems;
      return of(pool.slice(firstResult, firstResult + maxResults));
    });
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];
    const pageSize = 5;

    let cursor: MultiStateCursor | null = null;
    for (let page = 0; page < 6; page++) {
      const result = await lastValueFrom(
        svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, cursor)
      );
      if (result.items.length === 0) break;
      if (page >= 1) {
        if (result.hasMore) {
          expect(result.items.length).toBe(pageSize);
        }
      }
      cursor = result.nextCursor;
    }
  });

  it('cursor for exhausted state does not advance beyond its total count', async () => {
    const activeItems    = makeItems('a', 2, '2024-02-');
    const completedItems = makeItems('c', 20, '2024-01-');

    const queryInstances = vi.fn().mockImplementation((_body: any, firstResult: number, maxResults: number) => {
      const pool = _body.active ? activeItems : completedItems;
      return of(pool.slice(firstResult, firstResult + maxResults));
    });
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];
    const pageSize = 5;

    const p1 = await lastValueFrom(
      svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, null)
    );
    const p2 = await lastValueFrom(
      svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, p1.nextCursor)
    );

    expect(p2.nextCursor.offsets['0']).toBeLessThanOrEqual(activeItems.length);
  });
});

describe('CockpitService — searchPerStatePaged T3: result size always ≤ pageSize', () => {
  it('never returns more than pageSize items regardless of how many bodies return data', async () => {
    const allItems = makeItems('x', 100, '2024-01-');
    const queryInstances = vi.fn().mockImplementation((_body: any, firstResult: number, maxResults: number) => {
      return of(allItems.slice(firstResult, firstResult + maxResults));
    });
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed', 'suspended'] }];
    const pageSize = 10;
    let cursor: MultiStateCursor | null = null;

    for (let i = 0; i < 5; i++) {
      const result = await lastValueFrom(
        svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, cursor)
      );
      expect(result.items.length).toBeLessThanOrEqual(pageSize);
      if (!result.hasMore) break;
      cursor = result.nextCursor;
    }
  });

  it('hasMore is false exactly when all bodies return fewer than fetchSize items', async () => {
    const items = makeItems('x', 5, '2024-01-');
    const queryInstances = vi.fn().mockReturnValue(of(items.slice(0, 3)));
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];

    const result = await lastValueFrom(
      svc.searchPerStatePaged(filters, filters[0], false, false, 10, null)
    );
    expect(result.hasMore).toBe(false);
  });
});

describe('CockpitService — searchPerStatePaged T4: bounded fetch size at any depth', () => {
  it('passes maxResults=pageSize+1 on page 1 (cursor=null)', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];
    const pageSize = 20;

    await lastValueFrom(svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, null));

    for (const [, , maxResults] of queryInstances.mock.calls) {
      expect(maxResults).toBe(pageSize + 1);
    }
  });

  it('passes maxResults=pageSize+1 even at simulated depth of 50 000 items (cursor deep)', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];
    const pageSize = 20;
    const deepCursor: MultiStateCursor = { offsets: { '0': 50_000, '1': 50_000 } };

    await lastValueFrom(svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, deepCursor));

    for (const [, , maxResults] of queryInstances.mock.calls) {
      expect(maxResults).toBe(pageSize + 1);
    }
  });

  it('uses cursor offset as firstResult, not 0', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];
    const pageSize = 10;
    const cursor: MultiStateCursor = { offsets: { '0': 150, '1': 200 } };

    await lastValueFrom(svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, cursor));

    const activeCall = queryInstances.mock.calls[0];
    expect(activeCall[1]).toBe(150);
    const completedCall = queryInstances.mock.calls[1];
    expect(completedCall[1]).toBe(200);
  });
});

describe('CockpitService — searchPerStatePaged T5: fetch cost independent of depth', () => {
  it('fetches the same number of items per body at depth 0 and depth 500k', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed', 'suspended'] }];
    const pageSize = 20;

    queryInstances.mockClear();
    await lastValueFrom(svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, null));
    const shallowMaxResults = queryInstances.mock.calls.map((c: any[]) => c[2] as number);

    queryInstances.mockClear();
    const deepCursor: MultiStateCursor = { offsets: { '0': 500_000, '1': 500_000, '2': 500_000 } };
    await lastValueFrom(svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, deepCursor));
    const deepMaxResults = queryInstances.mock.calls.map((c: any[]) => c[2] as number);

    expect(shallowMaxResults).toEqual(deepMaxResults);
    for (const mr of shallowMaxResults) {
      expect(mr).toBe(pageSize + 1);
    }
  });

  it('cursor offsets advance monotonically and never reset to 0 after first page', async () => {
    const allItems = makeItems('x', 50, '2024-01-');
    const queryInstances = vi.fn().mockImplementation((_body: any, firstResult: number, maxResults: number) => {
      return of(allItems.slice(firstResult, firstResult + maxResults));
    });
    const svc = makeService({ queryProcessInstances: queryInstances });
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];
    const pageSize = 5;

    let cursor: MultiStateCursor | null = null;
    let prevOffsets: Record<string, number> = {};

    for (let page = 0; page < 5; page++) {
      const result = await lastValueFrom(
        svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, cursor)
      );
      // All offsets must be ≥ their previous values (monotonically non-decreasing)
      for (const [key, offset] of Object.entries(result.nextCursor.offsets)) {
        expect(offset).toBeGreaterThanOrEqual(prevOffsets[key] ?? 0);
      }
      prevOffsets = result.nextCursor.offsets;
      if (!result.hasMore) break;
      cursor = result.nextCursor;
    }
  });
});

describe('CockpitService — searchPerStatePaged T4b: fetchSize depends on BK cardinality', () => {

  it('uses CAMUNDA_QUERY_MAX (not pageSize+1) when BK has >1 value', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });

    const statePill: MultiValueFilter = { field: 'state', values: ['active', 'completed'] };
    const filters: MultiValueFilter[] = [
      statePill,
      { field: 'businessKey', values: ['alpha', 'beta'] },
    ];
    const pageSize = 20;

    await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, pageSize, null));

    for (const [, , maxResults] of queryInstances.mock.calls) {
      expect(maxResults).toBe(2000);
    }
  });

  it('uses pageSize+1 (not CAMUNDA_QUERY_MAX) when BK has exactly 1 value', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });

    const statePill: MultiValueFilter = { field: 'state', values: ['active', 'completed'] };
    const filters: MultiValueFilter[] = [
      statePill,
      { field: 'businessKey', values: ['alpha'] },
    ];
    const pageSize = 20;

    await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, pageSize, null));

    for (const [, , maxResults] of queryInstances.mock.calls) {
      expect(maxResults).toBe(pageSize + 1);
    }
  });

  it('uses pageSize+1 when there is no BK filter', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });

    const statePill: MultiValueFilter = { field: 'state', values: ['active', 'completed'] };
    const filters: MultiValueFilter[] = [statePill];
    const pageSize = 20;

    await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, pageSize, null));

    for (const [, , maxResults] of queryInstances.mock.calls) {
      expect(maxResults).toBe(pageSize + 1);
    }
  });
});


describe('CockpitService - searchPerStatePaged: maxResults always equals pageSize+1', () => {

  const filters: MultiValueFilter[] = [{ field: 'state', values: ['active', 'completed'] }];

  for (const pageSize of [10, 20, 50, 100, 200]) {
    it('pageSize=' + pageSize + ': maxResults must be ' + (pageSize + 1), async () => {
      const queryInstances = vi.fn().mockReturnValue(of([]));
      const svc = makeService({ queryProcessInstances: queryInstances });

      await lastValueFrom(svc.searchPerStatePaged(filters, filters[0], false, false, pageSize, null));

      for (const call of queryInstances.mock.calls) {
        const maxResults = call[2];
        expect(typeof maxResults).toBe('number');
        expect(maxResults).toBe(pageSize + 1);
      }
    });
  }

  it('coerces string "100" pageSize to number: maxResults=101 not 1001', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });

    await lastValueFrom(
      svc.searchPerStatePaged(filters, filters[0], false, false, '100' as unknown as number, null)
    );

    for (const call of queryInstances.mock.calls) {
      const maxResults = call[2];
      expect(typeof maxResults).toBe('number');
      expect(maxResults).toBe(101);
    }
  });

  it('items.length never exceeds pageSize when pageSize passed as string "20"', async () => {
    const pool = Array.from({ length: 50 }, function(_, i) {
      return makeInstance('x' + i, '2024-01-' + String(30 - i % 28).padStart(2, '0') + 'T00:00:00.000Z');
    });
    const queryInstances = vi.fn().mockImplementation(function(_b: any, fr: number, mr: number) {
      return of(pool.slice(fr, fr + mr));
    });
    const svc = makeService({ queryProcessInstances: queryInstances });

    const result = await lastValueFrom(
      svc.searchPerStatePaged(filters, filters[0], false, false, '20' as unknown as number, null)
    );
    expect(result.items.length).toBeLessThanOrEqual(20);
  });
});


describe('CockpitService — buildPerStateBodies: BK multi-value stays at root (M×N bodies)', () => {

  it('3 states + 1 BK → 3 bodies, BK at root (no orQueries for BK)', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });

    const statePill: MultiValueFilter = { field: 'state', values: ['active', 'suspended', 'completed'] };
    const filters: MultiValueFilter[] = [statePill, { field: 'businessKey', values: ['KEY-1'] }];

    await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, 10, null));

    expect(queryInstances.mock.calls.length).toBe(3);

    for (const [body] of queryInstances.mock.calls) {
      expect(body.processInstanceBusinessKeyLike).toBe('%KEY-1%');
      const orQ: any[] = body.orQueries ?? [];
      const hasBkInOrQ = orQ.some((e: any) => 'processInstanceBusinessKeyLike' in e);
      expect(hasBkInOrQ).toBe(false);
    }
  });

  it('3 states + 2 BK → 6 bodies (M×N), BK at root per body', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });

    const statePill: MultiValueFilter = { field: 'state', values: ['active', 'suspended', 'completed'] };
    const filters: MultiValueFilter[] = [statePill, { field: 'businessKey', values: ['alpha', 'beta'] }];

    await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, 10, null));

    expect(queryInstances.mock.calls.length).toBe(6);

    for (const [body] of queryInstances.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      const orQ: any[] = body.orQueries ?? [];
      expect(orQ.some((e: any) => 'processInstanceBusinessKeyLike' in e)).toBe(false);
    }
  });

  it('terminated + 2 BK → 2 bodies (1 state-fragment × 2 BK); orQueries contains only termination sub-types', async () => {
    const queryInstances = vi.fn().mockReturnValue(of([]));
    const svc = makeService({ queryProcessInstances: queryInstances });

    const statePill: MultiValueFilter = { field: 'state', values: ['terminated'] };
    const filters: MultiValueFilter[] = [statePill, { field: 'businessKey', values: ['alpha', 'beta'] }];

    await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, 10, null));

    expect(queryInstances.mock.calls.length).toBe(2);

    for (const [body] of queryInstances.mock.calls) {
      expect(body).toHaveProperty('processInstanceBusinessKeyLike');
      expect(body.orQueries).toEqual([{ externallyTerminated: true }, { internallyTerminated: true }]);
    }
    expect(queryInstances.mock.calls[0][0].processInstanceBusinessKeyLike).toBe('%alpha%');
    expect(queryInstances.mock.calls[1][0].processInstanceBusinessKeyLike).toBe('%beta%');
  });

  it('returns matching instances when 3 states combined with multi-BK (regression: must not be empty)', async () => {
    const activeInst = makeInstance('a1', '2024-06-01T10:00:00.000Z');
    activeInst.state = 'ACTIVE';
    const completedInst = makeInstance('c1', '2024-05-01T10:00:00.000Z');
    completedInst.state = 'COMPLETED';

    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([activeInst]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([completedInst]))
      .mockReturnValueOnce(of([]));

    const svc = makeService({ queryProcessInstances: queryInstances });

    const statePill: MultiValueFilter = { field: 'state', values: ['active', 'suspended', 'completed'] };
    const filters: MultiValueFilter[] = [statePill, { field: 'businessKey', values: ['alpha', 'beta'] }];

    const result = await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, 10, null));

    expect(result.items.length).toBe(2);
    expect(result.items.map((i: any) => i.id).sort()).toEqual(['a1', 'c1']);
  });

  it('7 unique instances across 6 bodies (3 states × 2 BK), pageSize=100 → all 7 displayed', async () => {
    const I = (id: string, t: number) => makeInstance(id, `2024-0${t}-01T00:00:00.000Z`);
    const [i1, i2, i3, i4, i5, i6, i7] = [
      I('i1', 7), I('i2', 6), I('i3', 5), I('i4', 4), I('i5', 3), I('i6', 2), I('i7', 1)
    ];

    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([i1, i2]))
      .mockReturnValueOnce(of([i3]))
      .mockReturnValueOnce(of([i4]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([i5, i6]))
      .mockReturnValueOnce(of([i7]));

    const svc = makeService({ queryProcessInstances: queryInstances });
    const statePill: MultiValueFilter = { field: 'state', values: ['active', 'suspended', 'completed'] };
    const filters: MultiValueFilter[] = [statePill, { field: 'businessKey', values: ['alpha', 'beta'] }];

    const result = await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, 100, null));

    expect(result.items.length).toBe(7);
    expect(result.hasMore).toBe(false);
    expect(result.items.map((i: any) => i.id).sort()).toEqual(['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7']);
  });
});


describe('CockpitService — root cause: overcounting when instance BK matches multiple patterns', () => {

  it('3 unique instances matching broad patterns: count must be 3, not 7 (overcounted sum)', async () => {
    const [I1, I2, I3] = [makeInstance('aB'), makeInstance('a-first'), makeInstance('a-second')];

    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([I1, I2, I3]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([I3]))
      .mockReturnValueOnce(of([I3]))
      .mockReturnValueOnce(of([I2]))
      .mockReturnValueOnce(of([I3]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([]));

    const svc = makeService({ queryProcessInstances: queryInstances });

    const statePill: MultiValueFilter = { field: 'state', values: ['active', 'suspended', 'completed'] };
    const filters: MultiValueFilter[] = [statePill, { field: 'businessKey', values: ['a', 'b', 'c', 'd', 'first', 'sec'] }];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(3);
    expect(queryInstances).toHaveBeenCalledTimes(18);
  });

  it('list also shows 3 unique rows (not 7) when instances match multiple patterns', async () => {
    const [I1, I2, I3] = [
      makeInstance('aB',       '2024-06-01T00:00:00.000Z'),
      makeInstance('a-first',  '2024-05-01T00:00:00.000Z'),
      makeInstance('a-second', '2024-04-01T00:00:00.000Z'),
    ];

    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([I1, I2, I3]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([I3]))
      .mockReturnValueOnce(of([I3]))
      .mockReturnValueOnce(of([I2]))
      .mockReturnValueOnce(of([I3]))
      .mockReturnValueOnce(of([])).mockReturnValueOnce(of([])).mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([])).mockReturnValueOnce(of([])).mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([])).mockReturnValueOnce(of([])).mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([])).mockReturnValueOnce(of([])).mockReturnValueOnce(of([]));

    const svc = makeService({ queryProcessInstances: queryInstances });

    const statePill: MultiValueFilter = { field: 'state', values: ['active', 'suspended', 'completed'] };
    const filters: MultiValueFilter[] = [statePill, { field: 'businessKey', values: ['a', 'b', 'c', 'd', 'first', 'sec'] }];

    const result = await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, 100, null));

    expect(result.items.length).toBe(3);
    expect(result.items.map((i: any) => i.id).sort()).toEqual(['a-first', 'a-second', 'aB']);
    expect(queryInstances).toHaveBeenCalledTimes(18);
  });
});


describe('CockpitService — countPerState: no double-count when BK matches multiple patterns', () => {

  it('3 states + 2 BK, no BK overlap → count equals unique instance count (no overcounting)', async () => {
    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([makeInstance('i1'), makeInstance('i2')]))
      .mockReturnValueOnce(of([makeInstance('i3')]))
      .mockReturnValueOnce(of([makeInstance('i4')]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([makeInstance('i5'), makeInstance('i6')]))
      .mockReturnValueOnce(of([makeInstance('i7')]));

    const svc = makeService({ queryProcessInstances: queryInstances });

    const filters: MultiValueFilter[] = [
      { field: 'state', values: ['active', 'suspended', 'completed'] },
      { field: 'businessKey', values: ['alpha', 'beta'] }
    ];

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));

    expect(count).toBe(7);
    expect(queryInstances).toHaveBeenCalledTimes(6);
  });

  it('3 states + 2 BK, instance whose BK matches BOTH patterns → count must not double-count it', async () => {
    const I = (id: string, t: number) => makeInstance(id, `2024-0${t}-01T00:00:00.000Z`);
    const [i1, i3_overlap, i2, i4, i5, i6, i7] = [
      I('i1', 7), I('i3', 6), I('i2', 5), I('i4', 4), I('i5', 3), I('i6', 2), I('i7', 1)
    ];

    const queryInstances = vi.fn()
      .mockReturnValueOnce(of([i1, i3_overlap]))
      .mockReturnValueOnce(of([i2, i3_overlap]))
      .mockReturnValueOnce(of([i4]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([i5, i6]))
      .mockReturnValueOnce(of([i7]))
      .mockReturnValueOnce(of([i1, i3_overlap]))
      .mockReturnValueOnce(of([i2, i3_overlap]))
      .mockReturnValueOnce(of([i4]))
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(of([i5, i6]))
      .mockReturnValueOnce(of([i7]));

    const svc = makeService({ queryProcessInstances: queryInstances });

    const filters: MultiValueFilter[] = [
      { field: 'state', values: ['active', 'suspended', 'completed'] },
      { field: 'businessKey', values: ['alpha', 'beta'] }
    ];

    const statePill = filters[0];
    const listResult = await lastValueFrom(svc.searchPerStatePaged(filters, statePill, false, false, 100, null));
    expect(listResult.items.length).toBe(7);
    expect(listResult.items.filter((i: any) => i.id === 'i3').length).toBe(1);

    const count = await lastValueFrom(svc.searchProcessInstancesGlobalCount(filters));
    expect(count).toBe(7);
    expect(queryInstances).toHaveBeenCalledTimes(12);
  });
});
