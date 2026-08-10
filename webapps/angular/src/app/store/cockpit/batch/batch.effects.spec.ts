import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject, of, NEVER } from 'rxjs';
import { Action } from '@ngrx/store';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

import { initTestEnvironment } from '../../../testing/test-utils';
import { BatchEffects } from './batch.effects';
import * as BatchActions from './batch.actions';
import { initialBatchState } from './batch.state';
import { BatchService } from '../../../services/batch.service';
import { NotificationsService } from '../../../services/notifications.service';

const mockNotificationsService = { addError: () => {} } as any;

function makeRuntimeSuccess(count: number) {
  return BatchActions.loadRuntimeBatchesSuccess({ batches: [], count, users: {} });
}

// State with a selected runtime batch — required for loadFailedJobs$ filter to pass.
const stateWithSelection = {
  batch: {
    ...initialBatchState,
    selection: {
      ...initialBatchState.selection,
      batch: { id: 'b1', batchJobDefinitionId: 'jd1' } as any,
      type: 'runtime' as const,
      loading: 'LOADED' as const
    }
  }
};


describe('BatchEffects.detectBatchCompletion$', () => {
  beforeAll(() => initTestEnvironment());

  let actionsSubject: Subject<Action>;
  let effects: BatchEffects;

  beforeEach(() => {
    actionsSubject = new Subject<Action>();
    TestBed.configureTestingModule({
      providers: [
        BatchEffects,
        provideMockActions(actionsSubject),
        provideMockStore({ initialState: { batch: initialBatchState } }),
        { provide: BatchService, useValue: {} as any },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    });
    effects = TestBed.inject(BatchEffects);
  });

  it('does not dispatch on the very first success (pairwise requires 2 emissions)', () => {
    const dispatched: Action[] = [];
    effects.detectBatchCompletion$.subscribe(a => dispatched.push(a));

    actionsSubject.next(makeRuntimeSuccess(3));

    expect(dispatched).toHaveLength(0);
  });

  it('does not dispatch when count is unchanged between polls', () => {
    const dispatched: Action[] = [];
    effects.detectBatchCompletion$.subscribe(a => dispatched.push(a));

    actionsSubject.next(makeRuntimeSuccess(2));
    actionsSubject.next(makeRuntimeSuccess(2));

    expect(dispatched).toHaveLength(0);
  });

  it('does not dispatch when count increases (new batch started while polling)', () => {
    const dispatched: Action[] = [];
    effects.detectBatchCompletion$.subscribe(a => dispatched.push(a));

    actionsSubject.next(makeRuntimeSuccess(1));
    actionsSubject.next(makeRuntimeSuccess(2));

    expect(dispatched).toHaveLength(0);
  });

  it('dispatches loadHistoryBatches when count drops by one (batch completed)', () => {
    const dispatched: Action[] = [];
    effects.detectBatchCompletion$.subscribe(a => dispatched.push(a));

    actionsSubject.next(makeRuntimeSuccess(2));
    actionsSubject.next(makeRuntimeSuccess(1));

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual(BatchActions.loadHistoryBatches());
  });

  it('dispatches loadHistoryBatches when the last batch completes (count 1 → 0)', () => {
    const dispatched: Action[] = [];
    effects.detectBatchCompletion$.subscribe(a => dispatched.push(a));

    actionsSubject.next(makeRuntimeSuccess(1));
    actionsSubject.next(makeRuntimeSuccess(0));

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual(BatchActions.loadHistoryBatches());
  });

  it('dispatches once per completing batch across three consecutive polls', () => {
    const dispatched: Action[] = [];
    effects.detectBatchCompletion$.subscribe(a => dispatched.push(a));

    actionsSubject.next(makeRuntimeSuccess(3));
    actionsSubject.next(makeRuntimeSuccess(2));
    actionsSubject.next(makeRuntimeSuccess(2));
    actionsSubject.next(makeRuntimeSuccess(1));

    expect(dispatched).toHaveLength(2);
    expect(dispatched.every(a => a.type === BatchActions.loadHistoryBatches.type)).toBe(true);
  });
});

───────────────────────────────────────────────────────────────────────────
describe('BatchEffects.loadFailedJobs$ — exhaustMap behaviour', () => {
  beforeAll(() => initTestEnvironment());

  let actionsSubject: Subject<Action>;
  let effects: BatchEffects;
  let getFailedJobsSpy: ReturnType<typeof vi.fn>;
  let getFailedJobsCountSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    actionsSubject = new Subject<Action>();
    getFailedJobsSpy = vi.fn();
    getFailedJobsCountSpy = vi.fn();

    const mockBatchService = {
      getFailedJobs: getFailedJobsSpy,
      getFailedJobsCount: getFailedJobsCountSpy,
    } as any;

    TestBed.configureTestingModule({
      providers: [
        BatchEffects,
        provideMockActions(actionsSubject),
        provideMockStore({ initialState: stateWithSelection }),
        { provide: BatchService, useValue: mockBatchService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    });
    effects = TestBed.inject(BatchEffects);
  });

  it('dispatches loadFailedJobsSuccess when the HTTP call completes', () => {
    const mockJob = { id: 'job-1', exceptionMessage: 'err' } as any;
    getFailedJobsSpy.mockReturnValue(of([mockJob]));
    getFailedJobsCountSpy.mockReturnValue(of(1));

    const dispatched: Action[] = [];
    effects.loadFailedJobs$.subscribe(a => dispatched.push(a));

    actionsSubject.next(BatchActions.loadFailedJobs({ jobDefinitionId: 'jd1' }));

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual(
      BatchActions.loadFailedJobsSuccess({ jobs: [mockJob], count: 1 })
    );
  });

  it('ignores a second loadFailedJobs while the first is still in-flight (exhaustMap)', () => {
    getFailedJobsSpy.mockReturnValue(NEVER);
    getFailedJobsCountSpy.mockReturnValue(of(0));

    const dispatched: Action[] = [];
    effects.loadFailedJobs$.subscribe(a => dispatched.push(a));

    actionsSubject.next(BatchActions.loadFailedJobs({ jobDefinitionId: 'jd1' }));
    actionsSubject.next(BatchActions.loadFailedJobs({ jobDefinitionId: 'jd1' }));

    expect(getFailedJobsSpy).toHaveBeenCalledTimes(1);
    expect(dispatched).toHaveLength(0);
  });

  it('dispatches loadFailedJobsFailure on HTTP error', () => {
    getFailedJobsSpy.mockReturnValue(
      new (require('rxjs').Observable)((obs: any) => obs.error(new Error('network error')))
    );

    const dispatched: Action[] = [];
    effects.loadFailedJobs$.subscribe(a => dispatched.push(a));

    actionsSubject.next(BatchActions.loadFailedJobs({ jobDefinitionId: 'jd1' }));

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual(
      BatchActions.loadFailedJobsFailure({ error: 'network error' })
    );
  });

  it('accepts a new loadFailedJobs after the previous one completes', () => {
    const mockJob = { id: 'job-1', exceptionMessage: 'err' } as any;
    getFailedJobsSpy.mockReturnValue(of([mockJob]));
    getFailedJobsCountSpy.mockReturnValue(of(1));

    const dispatched: Action[] = [];
    effects.loadFailedJobs$.subscribe(a => dispatched.push(a));

    actionsSubject.next(BatchActions.loadFailedJobs({ jobDefinitionId: 'jd1' }));
    // First request completed synchronously (of()), so exhaustMap is free again.
    actionsSubject.next(BatchActions.loadFailedJobs({ jobDefinitionId: 'jd1' }));

    expect(getFailedJobsSpy).toHaveBeenCalledTimes(2);
    expect(dispatched).toHaveLength(2);
  });
});
