import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { of } from 'rxjs';

import { initTestEnvironment } from '../../../../testing/test-utils';
import { BatchDetailComponent } from './batch-detail';
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
  getJobStacktrace: (_id: string) => of(''),
};

const mockRuntimeBatch = {
  id: 'batch-1',
  type: 'aMigrationType',
  suspended: false,
  failedJobs: 2,
  completedJobs: 8,
  remainingJobs: 2,
  totalJobs: 10,
  startTime: '2024-01-01T00:00:00.000Z',
  createUserId: null,
  batchJobDefinitionId: 'jd-1',
  monitorJobDefinitionId: 'jd-m',
  seedJobDefinitionId: 'jd-s',
};

describe('BatchDetailComponent — title attributes on header action buttons', () => {
  beforeAll(() => { initTestEnvironment(); });

  let fixture: ComponentFixture<BatchDetailComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchDetailComponent],
      providers: [
        provideMockStore({ initialState: { batch: initialBatchState } }),
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: BatchService, useValue: mockBatchService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(BatchDetailComponent);

    // Stub child BatchJobsListComponent selectors to keep it in EMPTY state
    store.overrideSelector(BatchSelectors.selectFailedJobs, []);
    store.overrideSelector(BatchSelectors.selectJobsCount, 0);
    store.overrideSelector(BatchSelectors.selectJobsLoading, 'EMPTY');
    store.overrideSelector(BatchSelectors.selectJobsCurrentPage, 1);
    store.overrideSelector(BatchSelectors.selectJobsPageSize, 10);
    store.overrideSelector(BatchSelectors.selectJobsSorting, { sortBy: 'jobId', sortOrder: 'asc' });
  });

  it('Suspend, Retry All and Delete buttons each have a non-empty title (runtime, not suspended, has failed jobs)', async () => {
    store.overrideSelector(BatchSelectors.selectSelectedBatch, mockRuntimeBatch as any);
    store.overrideSelector(BatchSelectors.selectSelectionType, 'runtime');
    store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
    store.overrideSelector(BatchSelectors.selectSelectionError, null);
    store.overrideSelector(BatchSelectors.selectIsSuspended, false);
    store.overrideSelector(BatchSelectors.selectHasFailedJobs, true);
    store.overrideSelector(BatchSelectors.selectBatchJobDefinitionId, 'jd-1');
    store.overrideSelector(BatchSelectors.selectRuntimeUsers, {});
    store.overrideSelector(BatchSelectors.selectSelectedBatch, mockRuntimeBatch as any);
    store.refreshState();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const actionBtns = el.querySelectorAll('.detail-actions button');

    expect(actionBtns.length, '3 action buttons must be rendered').toBe(3);

    actionBtns.forEach((btn, i) => {
      expect(btn.getAttribute('aria-label'), `button[${i}] must have a non-empty title`).toBeTruthy();
    });

    expect(actionBtns[0].getAttribute('aria-label')).toBe('BATCHES_PROGRESS_TOOLTIP_SUSPEND_BATCH');
    expect(actionBtns[1].getAttribute('aria-label')).toBe('BATCHES_PROGRESS_TOOLTIP_INCREMENT_NUMBER');
    expect(actionBtns[2].getAttribute('aria-label')).toBe('BATCHES_PROGRESS_TOOLTIP_DELETE_BATCH');
  });

  it('Suspend button shows Activate title when batch is suspended', async () => {
    store.overrideSelector(BatchSelectors.selectSelectedBatch, { ...mockRuntimeBatch, suspended: true } as any);
    store.overrideSelector(BatchSelectors.selectSelectionType, 'runtime');
    store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
    store.overrideSelector(BatchSelectors.selectSelectionError, null);
    store.overrideSelector(BatchSelectors.selectIsSuspended, true);
    store.overrideSelector(BatchSelectors.selectHasFailedJobs, false);
    store.overrideSelector(BatchSelectors.selectBatchJobDefinitionId, 'jd-1');
    store.overrideSelector(BatchSelectors.selectRuntimeUsers, {});
    store.refreshState();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const actionBtns = el.querySelectorAll('.detail-actions button');

    // 2 buttons: activate + delete (no retry-all since hasFailedJobs=false)
    expect(actionBtns.length, '2 action buttons must be rendered').toBe(2);
    expect(actionBtns[0].getAttribute('aria-label')).toBe('BATCHES_PROGRESS_TOOLTIP_ACTIVATE_BATCH');
    expect(actionBtns[1].getAttribute('aria-label')).toBe('BATCHES_PROGRESS_TOOLTIP_DELETE_BATCH');
  });

  it('Delete button has a title on a history batch', async () => {
    store.overrideSelector(BatchSelectors.selectSelectedBatch, mockRuntimeBatch as any);
    store.overrideSelector(BatchSelectors.selectSelectionType, 'history');
    store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
    store.overrideSelector(BatchSelectors.selectSelectionError, null);
    store.overrideSelector(BatchSelectors.selectIsSuspended, false);
    store.overrideSelector(BatchSelectors.selectHasFailedJobs, false);
    store.overrideSelector(BatchSelectors.selectBatchJobDefinitionId, 'jd-1');
    store.overrideSelector(BatchSelectors.selectRuntimeUsers, {});
    store.refreshState();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const actionBtns = el.querySelectorAll('.detail-actions button');

    expect(actionBtns.length, '1 action button (delete) for history batch').toBe(1);
    expect(actionBtns[0].getAttribute('aria-label')).toBe('BATCHES_PROGRESS_TOOLTIP_DELETE_BATCH');
  });
});
