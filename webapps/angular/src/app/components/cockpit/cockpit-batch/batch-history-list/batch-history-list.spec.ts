import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { of } from 'rxjs';

import { initTestEnvironment } from '../../../../testing/test-utils';
import { BatchHistoryListComponent } from './batch-history-list';
import { TranslateService } from '../../../../i18n/translate.service';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';
import { initialBatchState } from '../../../../store/cockpit/batch/batch.state';
import { batchReducer } from '../../../../store/cockpit/batch/batch.reducer';
import * as BatchActions from '../../../../store/cockpit/batch/batch.actions';
import { HistoryBatch } from '../../../../models/cockpit/batch.model';

const mockTranslateService = {
  instant: (key: string) => key,
  currentLang$: of('en'),
};

describe('BatchHistoryListComponent — DOM rendering', () => {
  beforeAll(() => { initTestEnvironment(); });

  let fixture: ComponentFixture<BatchHistoryListComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchHistoryListComponent],
      providers: [
        provideMockStore({ initialState: { batch: initialBatchState } }),
        { provide: TranslateService, useValue: mockTranslateService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(BatchHistoryListComponent);
  });

  it('batch-link and batch-type cells expose full value as appTooltip', async () => {
    const batch: HistoryBatch = {
      id: 'hist-uuid-full-5678',
      type: 'aHistoryTypeLong',
      totalJobs: 10,
      batchJobsPerSeed: 10,
      invocationsPerBatchJob: 1,
      seedJobDefinitionId: 'seed-1',
      monitorJobDefinitionId: 'monitor-1',
      batchJobDefinitionId: 'def-1',
      startTime: '2024-01-01T00:00:00.000+0000',
      endTime: '2024-01-01T01:00:00.000+0000',
    };

    store.overrideSelector(BatchSelectors.selectHistoryBatches, [batch]);
    store.overrideSelector(BatchSelectors.selectHistoryCount, 1);
    store.overrideSelector(BatchSelectors.selectHistoryLoading, 'LOADED');
    store.overrideSelector(BatchSelectors.selectHistoryCurrentPage, 1);
    store.overrideSelector(BatchSelectors.selectHistoryPageSize, 10);
    store.overrideSelector(BatchSelectors.selectHistorySorting, { sortBy: 'batchId', sortOrder: 'asc' });
    store.overrideSelector(BatchSelectors.selectHistoryShouldLoad, true);
    store.overrideSelector(BatchSelectors.selectSelectedBatch, null);
    store.refreshState();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;

    const link = el.querySelector('.batch-link');
    expect(link?.getAttribute('ng-reflect-app-tooltip'), 'batch-link must expose full id as tooltip').toBe('hist-uuid-full-5678');
    expect(link?.getAttribute('ng-reflect-tooltip-only-if-truncated'), 'batch-link tooltip must be conditional on truncation').toBe('true');

    const typeCell = el.querySelector('.batch-type');
    expect(typeCell?.getAttribute('ng-reflect-app-tooltip'), 'batch-type must expose full type as tooltip').toBe('aHistoryTypeLong');
    expect(typeCell?.getAttribute('ng-reflect-tooltip-only-if-truncated'), 'batch-type tooltip must be conditional on truncation').toBe('true');
  });
});

function makeBatch(id: string): HistoryBatch {
  return {
    id,
    type: 'aBatchMigration',
    totalJobs: 10,
    batchJobsPerSeed: 10,
    invocationsPerBatchJob: 1,
    seedJobDefinitionId: 'seed-1',
    monitorJobDefinitionId: 'monitor-1',
    batchJobDefinitionId: 'def-1',
    startTime: '2024-01-01T00:00:00.000+0000',
    endTime: '2024-01-01T01:00:00.000+0000',
  };
}

/**
 * Regression guard for the paginated history list table.
 *
 * Bug: getHistoryBatches() had a silent catchError(() => of([])).
 * When the API call failed, forkJoin returned { batches: [], count: 11 }.
 * The reducer set loading='LOADED' (count > 0) with batches=[].
 * The template showed the pagination ("1-10 of 11") but zero rows and zero columns.
 *
 * These tests verify the reducer contract that the template relies on:
 * loading='LOADED' must only be reached when batches actually contains rows.
 */
describe('batch-history-list: paginated table contract', () => {

  it('page 1 of 2: batches has 10 rows and loading is LOADED', () => {
    const batches = Array.from({ length: 10 }, (_, i) => makeBatch(`batch-${i + 1}`));

    const state = batchReducer(
      initialBatchState,
      BatchActions.loadHistoryBatchesSuccess({ batches, count: 11 })
    );

    expect(state.history.loading).toBe('LOADED');
    expect(state.history.batches).toHaveLength(10);
    expect(state.history.count).toBe(11);
  });

  it('page 2 of 2: batches has 1 row and loading is LOADED', () => {
    const batches = [makeBatch('batch-11')];

    const state = batchReducer(
      initialBatchState,
      BatchActions.loadHistoryBatchesSuccess({ batches, count: 11 })
    );

    expect(state.history.loading).toBe('LOADED');
    expect(state.history.batches).toHaveLength(1);
    expect(state.history.batches[0].id).toBe('batch-11');
  });

  it('navigating to page 2 keeps existing batches until the new API response arrives', () => {
    const page1 = Array.from({ length: 10 }, (_, i) => makeBatch(`batch-${i + 1}`));

    const afterLoad = batchReducer(
      initialBatchState,
      BatchActions.loadHistoryBatchesSuccess({ batches: page1, count: 11 })
    );

    const afterPageChange = batchReducer(afterLoad, BatchActions.setHistoryPage({ page: 2 }));

    expect(afterPageChange.history.currentPage).toBe(2);
    expect(afterPageChange.history.loading).toBe('LOADED');
    expect(afterPageChange.history.batches).toHaveLength(10);
  });

  it('page 2 API response replaces batches with the new page data', () => {
    const page1 = Array.from({ length: 10 }, (_, i) => makeBatch(`batch-${i + 1}`));
    let state = batchReducer(
      initialBatchState,
      BatchActions.loadHistoryBatchesSuccess({ batches: page1, count: 11 })
    );
    state = batchReducer(state, BatchActions.setHistoryPage({ page: 2 }));
    state = batchReducer(
      state,
      BatchActions.loadHistoryBatchesSuccess({ batches: [makeBatch('batch-11')], count: 11 })
    );

    expect(state.history.batches).toHaveLength(1);
    expect(state.history.batches[0].id).toBe('batch-11');
    expect(state.history.loading).toBe('LOADED');
    expect(state.history.count).toBe(11);
  });

  it('zero results sets loading to EMPTY (genuinely no batches)', () => {
    const state = batchReducer(
      initialBatchState,
      BatchActions.loadHistoryBatchesSuccess({ batches: [], count: 0 })
    );

    expect(state.history.loading).toBe('EMPTY');
    expect(state.history.batches).toHaveLength(0);
  });
});
