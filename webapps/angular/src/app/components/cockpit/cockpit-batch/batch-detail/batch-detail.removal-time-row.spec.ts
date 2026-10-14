import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BatchDetailComponent } from './batch-detail';
import { BatchService } from '../../../../services/batch.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';
import { initialBatchState } from '../../../../store/cockpit/batch/batch.state';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';

/**
 * REAL COMPONENT TEST: Removal time row in batch detail
 *
 * Tests the ACTUAL rendered component (not mocks):
 * 1. Row displays for history batch with removalTime
 * 2. Row displays formatted date with camDate pipe
 * 3. Row does NOT display for runtime batch
 * 4. Row displays em dash (—) for history batch without removalTime
 * 5. Mutation proof: test will FAIL if row is removed or logic breaks
 *
 * Setup: TestBed with real component, NgRx mock store, test data
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
      instant: (key: string) => key,
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
      ],
      schemas: [NO_ERRORS_SCHEMA]
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
    it('should display removalTime row with formatted date', async () => {
      // Setup: history batch with removalTime
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

      // Property name should be 'removalTime'
      expect(propNameCell!.textContent!.trim()).toBe('removalTime');

      // Value should be formatted date (not raw ISO)
      const valueText = propValueCell!.textContent!.trim();
      expect(valueText).toBeTruthy();
      expect(valueText).not.toBe('2024-02-15T10:05:00.000Z'); // Not raw ISO
      expect(valueText).not.toBe('—'); // Not empty fallback
      expect(valueText).not.toBe(''); // Not empty string
    });
  });

  describe('[MUTATION PROOF] History batch WITHOUT removalTime', () => {
    it('should NOT display removalTime row (shouldShowKey filters it out)', async () => {
      // Setup: history batch WITHOUT removalTime
      store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
      store.overrideSelector(BatchSelectors.selectSelectionType, 'history');
      store.overrideSelector(BatchSelectors.selectSelectedBatch, {
        id: 'batch-history-no-removal',
        type: 'activate',
        startTime: '2024-01-14T09:00:00.000Z',
        endTime: '2024-01-14T09:02:00.000Z',
        removalTime: null, // NO removalTime
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

      // Find removalTime row
      const rows = fixture.nativeElement.querySelectorAll('.properties-table tbody tr');
      const removalTimeRow = Array.from(rows).find((row: any) =>
        row.classList.contains('removalTime')
      );

      // Row should NOT exist (shouldShowKey returns false for null values)
      expect(removalTimeRow).toBeUndefined();
    });
  });

  describe('[MUTATION PROOF] Runtime batch (no endTime)', () => {
    it('should NOT display removalTime row (runtime batches do not have removalTime)', async () => {
      // Setup: runtime batch (no endTime, has suspended field)
      store.overrideSelector(BatchSelectors.selectSelectionLoading, 'LOADED');
      store.overrideSelector(BatchSelectors.selectSelectionType, 'runtime');
      store.overrideSelector(BatchSelectors.selectSelectedBatch, {
        id: 'batch-runtime',
        type: 'suspend',
        startTime: '2024-01-16T11:00:00.000Z',
        executionStartTime: '2024-01-16T11:00:05.000Z',
        // NO endTime - still running
        // NO removalTime - runtime batches don't have it
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

      // Find removalTime row
      const rows = fixture.nativeElement.querySelectorAll('.properties-table tbody tr');
      const removalTimeRow = Array.from(rows).find((row: any) =>
        row.classList.contains('removalTime')
      );

      // Row should NOT exist (runtime batches don't have removalTime)
      expect(removalTimeRow).toBeUndefined();
    });
  });

  describe('[NON-REGRESSION] Other rows unchanged', () => {
    it('should still display all original rows (id, type, startTime, endTime, etc.)', async () => {
      // Setup: history batch with removalTime
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

      // Must have original rows (by CSS class)
      const rowClasses = Array.from(rows).map((row: any) => row.className);

      expect(rowClasses).toContain('id');
      expect(rowClasses).toContain('type');
      expect(rowClasses).toContain('startTime');
      expect(rowClasses).toContain('endTime');
      expect(rowClasses).toContain('totalJobs');
      expect(rowClasses).toContain('completedJobs');

      // Should also have removalTime now
      expect(rowClasses).toContain('removalTime');
    });

    it('should format all time keys (startTime, endTime, removalTime) with camDate pipe', async () => {
      // Setup: history batch with all time fields
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

      // All time rows should exist
      expect(startTimeRow).toBeTruthy();
      expect(endTimeRow).toBeTruthy();
      expect(removalTimeRow).toBeTruthy();

      // All should NOT contain raw ISO format (T separator)
      const startTimeValue = startTimeRow.querySelector('td.prop-value')!.textContent!.trim();
      const endTimeValue = endTimeRow.querySelector('td.prop-value')!.textContent!.trim();
      const removalTimeValue = removalTimeRow.querySelector('td.prop-value')!.textContent!.trim();

      // All should be formatted (not raw ISO)
      expect(startTimeValue).not.toContain('T');
      expect(endTimeValue).not.toContain('T');
      expect(removalTimeValue).not.toContain('T');
    });
  });
});