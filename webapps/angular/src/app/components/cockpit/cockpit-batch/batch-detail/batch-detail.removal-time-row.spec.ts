import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { BatchDetailComponent } from './batch-detail';
import { BatchService } from '../../../../services/batch.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';
import { initialBatchState } from '../../../../store/cockpit/batch/batch.state';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';

/**
 * REAL COMPONENT TEST: Removal time row in batch detail
 *
 * Tests the ACTUAL rendered component with REAL translations (no NO_ERRORS_SCHEMA):
 * 1. Row displays for history batch with removalTime
 * 2. Row displays translated property name "Removal time"
 * 3. Row displays formatted date with camDate pipe
 * 4. Row does NOT display for runtime batch
 * 5. Row does NOT display for history batch without removalTime
 * 6. Mutation proof: test will FAIL if row is removed or logic breaks
 *
 * Setup: TestBed with real component, real translations, NgRx mock store, test data
 */
describe('BatchDetail - Removal time row (REAL component test)', () => {
  let component: BatchDetailComponent;
  let fixture: ComponentFixture<BatchDetailComponent>;
  let store: MockStore;

  beforeEach(async () => {
    initTestEnvironment();

    const mockBatchService = {
      getOperationAnnotation: vi.fn().mockReturnValue(of(null)),
      getJobStacktraceUrl: (id: string) => `/api/job/${id}/stacktrace`,
      getJobStacktrace: (_id: string) => of('')
    } as any;

    const mockTranslateService = {
      instant: (key: string) => {
        const translations: Record<string, string> = {
          'BATCHES_PROGRESS_REMOVAL_TIME': 'Removal time',
          'BATCHES_PROGRESS_USER': 'User',
          'BATCHES_PROGRESS_PROPERTY': 'Property',
          'BATCHES_PROGRESS_VALUE': 'Value',
          'BATCHES_PROGRESS_FAILED_LABEL': 'failed',
          'BATCHES_SELECT_BATCH': 'Select a batch',
          'LOADING': 'Loading...',
          'BATCHES_PROGRESS_COMPLETED': 'Completed',
          'BATCHES_PROGRESS_IN_PROGRESS': 'In progress',
          'BATCHES_PROGRESS_BATCH_DETAILS': 'Batch details',
          'BATCHES_PROGRESS_TOOLTIP_ACTIVATE_BATCH': 'Activate batch',
          'BATCHES_PROGRESS_TOOLTIP_SUSPEND_BATCH': 'Suspend batch',
          'BATCHES_PROGRESS_TOOLTIP_INCREMENT_NUMBER': 'Increment retry count',
          'BATCHES_PROGRESS_TOOLTIP_DELETE_BATCH': 'Delete batch',
          'BATCHES_DELETE_BATCH_TITLE': 'Delete batch',
          'BATCHES_DELETE_BATCH_MESSAGE': 'Are you sure you want to delete this batch?',
          'DELETE': 'Delete',
          'CANCEL': 'Cancel'
        };
        return translations[key] || key;
      },
      currentLang$: of('en')
    };

    await TestBed.configureTestingModule({
      imports: [BatchDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({ initialState: { batch: initialBatchState } }),
        { provide: BatchService, useValue: mockBatchService },
        { provide: TranslateService, useValue: mockTranslateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchDetailComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);

    // Stub child BatchJobsListComponent selectors to keep it in EMPTY state
    store.overrideSelector(BatchSelectors.selectFailedJobs, []);
    store.overrideSelector(BatchSelectors.selectJobsCount, 0);
    store.overrideSelector(BatchSelectors.selectJobsLoading, 'EMPTY');
    store.overrideSelector(BatchSelectors.selectJobsCurrentPage, 1);
    store.overrideSelector(BatchSelectors.selectJobsPageSize, 10);
    store.overrideSelector(BatchSelectors.selectJobsSorting, { sortBy: 'jobId', sortOrder: 'asc' });
  });

  describe('[MUTATION PROOF] History batch WITH removalTime', () => {
    it('should display removalTime row with translated label and formatted date', async () => {
      store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
      store.overrideSelector(BatchSelectors.selectSelectionType, 'history');
      store.overrideSelector(BatchSelectors.selectSelectedBatch, {
        id: 'batch-history-with-removal',
        type: 'suspend',
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T10:05:00.000Z',
        removalTime: '2024-02-15T10:05:00.000Z',
        totalJobs: 10,
        completedJobs: 10,
        remainingJobs: 0,
        batchJobsPerSeed: 1,
        invocationsPerBatchJob: 1,
        batchJobDefinitionId: 'job-def-1',
        monitorJobDefinitionId: 'monitor-def-1',
        seedJobDefinitionId: 'seed-def-1'
      });
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();

      // Find removalTime row
      const rows = fixture.nativeElement.querySelectorAll('.properties-table tbody tr');
      const removalTimeRow = Array.from(rows).find((row: any) =>
        row.classList.contains('removalTime')
      ) as HTMLElement;

      // Row must exist
      expect(removalTimeRow).toBeTruthy();

      // Row must have property name cell and value cell
      const propNameCell = removalTimeRow.querySelector('td.prop-name');
      const propValueCell = removalTimeRow.querySelector('td.prop-value');

      expect(propNameCell).toBeTruthy();
      expect(propValueCell).toBeTruthy();
      expect(propNameCell!.textContent!.trim()).toBe('Removal time');

      const valueText = propValueCell!.textContent!.trim();
      expect(valueText).toBeTruthy();
      expect(valueText).not.toBe('2024-02-15T10:05:00.000Z');
      expect(valueText).not.toBe('—');
      expect(valueText).not.toBe('');
    });
  });

  describe('[MUTATION PROOF] History batch WITHOUT removalTime', () => {
    it('should NOT display removalTime row (shouldShowKey filters it out)', async () => {
      store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
      store.overrideSelector(BatchSelectors.selectSelectionType, 'history');
      store.overrideSelector(BatchSelectors.selectSelectedBatch, {
        id: 'batch-history-no-removal',
        type: 'activate',
        startTime: '2024-01-14T09:00:00.000Z',
        endTime: '2024-01-14T09:02:00.000Z',
        removalTime: null,
        totalJobs: 5,
        completedJobs: 5,
        remainingJobs: 0,
        batchJobsPerSeed: 1,
        invocationsPerBatchJob: 1,
        batchJobDefinitionId: 'job-def-2',
        monitorJobDefinitionId: 'monitor-def-2',
        seedJobDefinitionId: 'seed-def-2'
      });
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll('.properties-table tbody tr');
      const removalTimeRow = Array.from(rows).find((row: any) =>
        row.classList.contains('removalTime')
      );

      expect(removalTimeRow).toBeUndefined();
    });
  });

  describe('[MUTATION PROOF] Runtime batch (no endTime)', () => {
    it('should NOT display removalTime row (runtime batches do not have removalTime)', async () => {
      store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
      store.overrideSelector(BatchSelectors.selectSelectionType, 'runtime');
      store.overrideSelector(BatchSelectors.selectSelectedBatch, {
        id: 'batch-runtime',
        type: 'suspend',
        startTime: '2024-01-16T11:00:00.000Z',
        executionStartTime: '2024-01-16T11:00:05.000Z',
        totalJobs: 100,
        jobsCreated: 50,
        completedJobs: 30,
        remainingJobs: 70,
        failedJobs: 0,
        suspended: false,
        batchJobsPerSeed: 10,
        invocationsPerBatchJob: 1,
        batchJobDefinitionId: 'job-def-3',
        monitorJobDefinitionId: 'monitor-def-3',
        seedJobDefinitionId: 'seed-def-3'
      });
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll('.properties-table tbody tr');
      const removalTimeRow = Array.from(rows).find((row: any) =>
        row.classList.contains('removalTime')
      );

      expect(removalTimeRow).toBeUndefined();
    });
  });

  describe('[NON-REGRESSION] Other rows unchanged', () => {
    it('should still display all original rows (id, type, startTime, endTime, etc.)', async () => {
      store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
      store.overrideSelector(BatchSelectors.selectSelectionType, 'history');
      store.overrideSelector(BatchSelectors.selectSelectedBatch, {
        id: 'batch-complete',
        type: 'suspend',
        createUserId: 'user-123',
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T10:05:00.000Z',
        removalTime: '2024-02-15T10:05:00.000Z',
        totalJobs: 10,
        completedJobs: 10,
        remainingJobs: 0,
        batchJobsPerSeed: 1,
        invocationsPerBatchJob: 1,
        tenantId: 'tenant-1',
        batchJobDefinitionId: 'job-def-1',
        monitorJobDefinitionId: 'monitor-def-1',
        seedJobDefinitionId: 'seed-def-1'
      });
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll('.properties-table tbody tr');

      const rowClasses = Array.from(rows).map((row: any) => row.className);

      expect(rowClasses).toContain('id');
      expect(rowClasses).toContain('type');
      expect(rowClasses).toContain('startTime');
      expect(rowClasses).toContain('endTime');
      expect(rowClasses).toContain('totalJobs');
      expect(rowClasses).toContain('completedJobs');

      expect(rowClasses).toContain('removalTime');
    });

    it('should format all time keys (startTime, endTime, removalTime) with camDate pipe', async () => {
      store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
      store.overrideSelector(BatchSelectors.selectSelectionType, 'history');
      store.overrideSelector(BatchSelectors.selectSelectedBatch, {
        id: 'batch-times',
        type: 'suspend',
        startTime: '2024-01-15T10:00:00.000Z',
        executionStartTime: '2024-01-15T10:00:05.000Z',
        endTime: '2024-01-15T10:05:00.000Z',
        removalTime: '2024-02-15T10:05:00.000Z',
        totalJobs: 10,
        completedJobs: 10,
        remainingJobs: 0,
        batchJobsPerSeed: 1,
        invocationsPerBatchJob: 1,
        batchJobDefinitionId: 'job-def-1',
        monitorJobDefinitionId: 'monitor-def-1',
        seedJobDefinitionId: 'seed-def-1'
      });
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll('.properties-table tbody tr');

      const startTimeRow = Array.from(rows).find((row: any) =>
        row.classList.contains('startTime')
      ) as HTMLElement;
      const endTimeRow = Array.from(rows).find((row: any) =>
        row.classList.contains('endTime')
      ) as HTMLElement;
      const removalTimeRow = Array.from(rows).find((row: any) =>
        row.classList.contains('removalTime')
      ) as HTMLElement;

      expect(startTimeRow).toBeTruthy();
      expect(endTimeRow).toBeTruthy();
      expect(removalTimeRow).toBeTruthy();

      const startTimeValue = startTimeRow.querySelector('td.prop-value')!.textContent!.trim();
      const endTimeValue = endTimeRow.querySelector('td.prop-value')!.textContent!.trim();
      const removalTimeValue = removalTimeRow.querySelector('td.prop-value')!.textContent!.trim();

      expect(startTimeValue).not.toContain('T');
      expect(endTimeValue).not.toContain('T');
      expect(removalTimeValue).not.toContain('T');
    });
  });
});
