import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
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

  it('action buttons (retry, delete) each have a non-empty aria-label tooltip', async () => {
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

    const retryBtn = el.querySelector('.btn-retry');
    expect(retryBtn?.getAttribute('aria-label'), 'Retry button must have a title').toBe('BATCHES_RETRY_JOB');

    const deleteBtn = el.querySelector('.btn-delete');
    expect(deleteBtn?.getAttribute('aria-label'), 'Delete button must have a title').toBe('BATCHES_DELETE_JOB');

    expect(el.querySelector('.btn-force-failure-wrapper'), 'Force failure button must be absent').toBeNull();
  });

  it('exception preview shows full message without JS truncation and tooltip is conditional on truncation', async () => {
    const longMessage = 'x'.repeat(125);
    const mockJob = { id: 'job-1', exceptionMessage: longMessage };
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
    const preview = el.querySelector('.exception-preview');

    expect(preview?.textContent?.trim(), 'full message must be rendered, not JS-truncated').toBe(longMessage);
    expect(preview?.getAttribute('ng-reflect-app-tooltip'), 'tooltip must carry the full message').toBe(longMessage);
    expect(preview?.getAttribute('ng-reflect-tooltip-only-if-truncated'), 'tooltip must be conditional on visual truncation').toBe('true');
  });

  it('clicking Delete opens confirmation modal without dispatching deleteJob', async () => {
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

    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const el: HTMLElement = fixture.nativeElement;

    (el.querySelector('.btn-delete') as HTMLElement).click();
    fixture.detectChanges();

    expect(el.querySelector('app-confirm-dialog'), 'confirmation dialog must appear').not.toBeNull();
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('confirming delete dispatches deleteJob with the correct jobId', async () => {
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

    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const component = fixture.componentInstance;

    (fixture.nativeElement.querySelector('.btn-delete') as HTMLElement).click();
    fixture.detectChanges();

    component.onDeleteJobConfirm();
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1' })
    );
    expect(fixture.nativeElement.querySelector('app-confirm-dialog'), 'dialog must close after confirm').toBeNull();
  });

  it('cancelling delete closes modal without dispatching any action', async () => {
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

    (fixture.nativeElement.querySelector('.btn-delete') as HTMLElement).click();
    fixture.detectChanges();

    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const component = fixture.componentInstance;

    component.onDeleteJobCancel();
    fixture.detectChanges();

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-confirm-dialog'), 'dialog must close after cancel').toBeNull();
  });
});
