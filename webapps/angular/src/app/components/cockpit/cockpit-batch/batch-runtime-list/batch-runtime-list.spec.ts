import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { of } from 'rxjs';

import { initTestEnvironment } from '../../../../testing/test-utils';
import { BatchRuntimeListComponent } from './batch-runtime-list';
import { TranslateService } from '../../../../i18n/translate.service';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';
import { initialBatchState } from '../../../../store/cockpit/batch/batch.state';

const mockTranslateService = {
  instant: (key: string) => key,
  currentLang$: of('en'),
};

function makeBatch(id: string) {
  return {
    id,
    type: 'aMigrationType',
    createUserId: null,
    startTime: '2024-01-01T00:00:00.000Z',
    failedJobs: 0,
    completedJobs: 5,
    remainingJobs: 5,
    totalJobs: 10,
    suspended: false,
    batchJobsPerSeed: 100,
    invocationsPerBatchJob: 1,
    jobDefinitionId: `jd-${id}`,
    monitorJobDefinitionId: `mjd-${id}`,
    seedJobDefinitionId: `sjd-${id}`,
  };
}

describe('BatchRuntimeListComponent — DOM rendering', () => {
  beforeAll(() => { initTestEnvironment(); });

  let fixture: ComponentFixture<BatchRuntimeListComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchRuntimeListComponent],
      providers: [
        provideMockStore({ initialState: { batch: initialBatchState } }),
        { provide: TranslateService, useValue: mockTranslateService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(BatchRuntimeListComponent);
  });

  it('renders .empty-state when no batches are running (loading=EMPTY)', async () => {
    store.overrideSelector(BatchSelectors.selectRuntimeBatches, []);
    store.overrideSelector(BatchSelectors.selectRuntimeCount, 0);
    store.overrideSelector(BatchSelectors.selectRuntimeLoading, 'EMPTY');
    store.overrideSelector(BatchSelectors.selectRuntimeCurrentPage, 1);
    store.overrideSelector(BatchSelectors.selectRuntimePageSize, 10);
    store.overrideSelector(BatchSelectors.selectRuntimeSorting, { sortBy: 'batchId', sortOrder: 'asc' });
    store.overrideSelector(BatchSelectors.selectRuntimeUsers, {});
    store.overrideSelector(BatchSelectors.selectSelectedBatch, null);
    store.refreshState();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.empty-state'), '.empty-state must be present').not.toBeNull();
    expect(el.querySelector('.table-container'), '.table-container must be absent').toBeNull();
  });

  it('renders all 6 rows when 6 batches are running — overflow contained in .table-container', async () => {
    const sixBatches = Array.from({ length: 6 }, (_, i) => makeBatch(`batch-${i + 1}`));

    store.overrideSelector(BatchSelectors.selectRuntimeBatches, sixBatches as any);
    store.overrideSelector(BatchSelectors.selectRuntimeCount, 6);
    store.overrideSelector(BatchSelectors.selectRuntimeLoading, 'LOADED');
    store.overrideSelector(BatchSelectors.selectRuntimeCurrentPage, 1);
    store.overrideSelector(BatchSelectors.selectRuntimePageSize, 10);
    store.overrideSelector(BatchSelectors.selectRuntimeSorting, { sortBy: 'batchId', sortOrder: 'asc' });
    store.overrideSelector(BatchSelectors.selectRuntimeUsers, {});
    store.overrideSelector(BatchSelectors.selectSelectedBatch, null);
    store.refreshState();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;

    const tableContainer = el.querySelector('.table-container');
    expect(tableContainer, '.table-container must be present').not.toBeNull();

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length, 'all 6 batches must render as rows').toBe(6);

    // No empty-state or loading-state visible alongside the table
    expect(el.querySelector('.empty-state'), '.empty-state must be absent').toBeNull();
    expect(el.querySelector('.loading-state'), '.loading-state must be absent').toBeNull();
  });

  it('batch-link and batch-type cells expose full value as appTooltip', async () => {
    const batch = makeBatch('uuid-full-id-1234');
    (batch as any).type = 'aMigrationTypeLong';

    store.overrideSelector(BatchSelectors.selectRuntimeBatches, [batch as any]);
    store.overrideSelector(BatchSelectors.selectRuntimeCount, 1);
    store.overrideSelector(BatchSelectors.selectRuntimeLoading, 'LOADED');
    store.overrideSelector(BatchSelectors.selectRuntimeCurrentPage, 1);
    store.overrideSelector(BatchSelectors.selectRuntimePageSize, 10);
    store.overrideSelector(BatchSelectors.selectRuntimeSorting, { sortBy: 'batchId', sortOrder: 'asc' });
    store.overrideSelector(BatchSelectors.selectRuntimeUsers, {});
    store.overrideSelector(BatchSelectors.selectSelectedBatch, null);
    store.refreshState();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;

    const link = el.querySelector('.batch-link');
    expect(link?.getAttribute('ng-reflect-app-tooltip'), 'batch-link must expose full id as tooltip').toBe('uuid-full-id-1234');
    expect(link?.getAttribute('ng-reflect-tooltip-only-if-truncated'), 'batch-link tooltip must be conditional on truncation').toBe('true');

    const typeCell = el.querySelector('.batch-type');
    expect(typeCell?.getAttribute('ng-reflect-app-tooltip'), 'batch-type must expose full type as tooltip').toBe('aMigrationTypeLong');
    expect(typeCell?.getAttribute('ng-reflect-tooltip-only-if-truncated'), 'batch-type tooltip must be conditional on truncation').toBe('true');
  });
});
