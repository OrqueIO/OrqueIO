import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { of } from 'rxjs';

import { initTestEnvironment } from '../../../../testing/test-utils';
import { BatchJobsListComponent } from './batch-jobs-list';
import { TranslateService } from '../../../../i18n/translate.service';
import { BatchService } from '../../../../services/batch.service';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';
import { initialBatchState } from '../../../../store/cockpit/batch/batch.state';

const mockTranslateService = {
  instant: (key: string) => key,
  currentLang$: of('en'),
};

const mockBatchService = {
  getJobStacktraceUrl: (id: string) => `/api/job/${id}/stacktrace`,
};

describe('BatchJobsListComponent — DOM rendering', () => {
  beforeAll(() => { initTestEnvironment(); });

  let fixture: ComponentFixture<BatchJobsListComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchJobsListComponent],
      providers: [
        provideMockStore({ initialState: { batch: initialBatchState } }),
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: BatchService, useValue: mockBatchService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(BatchJobsListComponent);
  });

  it('renders .empty-state with BATCHES_NO_FAILED_JOBS when there are no failed jobs (loading=EMPTY)', async () => {
    store.overrideSelector(BatchSelectors.selectFailedJobs, []);
    store.overrideSelector(BatchSelectors.selectJobsCount, 0);
    store.overrideSelector(BatchSelectors.selectJobsLoading, 'EMPTY');
    store.overrideSelector(BatchSelectors.selectJobsCurrentPage, 1);
    store.overrideSelector(BatchSelectors.selectJobsPageSize, 10);
    store.overrideSelector(BatchSelectors.selectJobsSorting, { sortBy: 'jobId', sortOrder: 'asc' });
    store.refreshState();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;

    const emptyState = el.querySelector('.empty-state');
    expect(emptyState, '.empty-state must be present in the DOM').not.toBeNull();
    expect(emptyState!.textContent!.trim()).toBe('BATCHES_NO_FAILED_JOBS');

    expect(el.querySelector('.table-container'), '.table-container must be absent').toBeNull();
  });

  it('renders .table-container with one row when a failed job exists (loading=LOADED)', async () => {
    const mockJob = { id: 'job-1', exceptionMessage: 'NullPointerException' };
    store.overrideSelector(BatchSelectors.selectFailedJobs, [mockJob as any]);
    store.overrideSelector(BatchSelectors.selectJobsCount, 1);
    store.overrideSelector(BatchSelectors.selectJobsLoading, 'LOADED');
    store.overrideSelector(BatchSelectors.selectJobsCurrentPage, 1);
    store.overrideSelector(BatchSelectors.selectJobsPageSize, 10);
    store.overrideSelector(BatchSelectors.selectJobsSorting, { sortBy: 'jobId', sortOrder: 'asc' });
    store.refreshState();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;

    const tableContainer = el.querySelector('.table-container');
    expect(tableContainer, '.table-container must be present in the DOM').not.toBeNull();

    expect(el.querySelector('.empty-state'), '.empty-state must be absent').toBeNull();

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector('.job-id code')!.textContent).toBe('job-1');
  });
});
