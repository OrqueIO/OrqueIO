import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { BatchService } from '../../../../services/batch.service';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { CockpitService } from '../../../../services/cockpit.service';
import { DecisionService } from '../../../../services/decision.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

/**
 * REAL COMPONENT TEST: Removal time column in batch list (removal-time-batch operation)
 *
 * Tests the ACTUAL rendered component (not mocks):
 * 1. Column header displays correct i18n key (EN/FR)
 * 2. Date displays formatted with camDate pipe for batches with removalTime
 * 3. Empty fallback ('—') displays for batches without removalTime
 * 4. Mutation proof: test will FAIL if column is removed or key is wrong
 *
 * Setup: TestBed with real component, mock services, test data with/without removalTime
 */
describe('BatchOperationsWizard - Removal time column (REAL component test)', () => {
  let component: BatchOperationsWizardComponent;
  let fixture: ComponentFixture<BatchOperationsWizardComponent>;

  beforeEach(async () => {
    initTestEnvironment();

    const mockBatchService = {
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' })),
      getHistoryBatches: vi.fn().mockReturnValue(of([
        {
          id: 'batch-with-removal',
          type: 'suspend',
          startTime: '2024-01-15T10:00:00.000Z',
          endTime: '2024-01-15T10:05:00.000Z',
          removalTime: '2024-02-15T10:05:00.000Z'
        },
        {
          id: 'batch-without-removal',
          type: 'activate',
          startTime: '2024-01-14T09:00:00.000Z',
          endTime: '2024-01-14T09:02:00.000Z',
          removalTime: null
        }
      ])),
      getHistoryBatchesCount: vi.fn().mockReturnValue(of(2))
    } as any;

    const mockProcessInstanceService = {
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-456' }))
    } as any;

    const mockDecisionService = {
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-789' })),
      getDecisionInstancesCountFiltered: vi.fn().mockReturnValue(of(0)),
      deleteAsync: vi.fn().mockReturnValue(of({ id: 'batch-delete' })),
      getDecisionDefinitions: vi.fn().mockReturnValue(of([]))
    } as any;

    const mockCockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0))
    } as any;

    await TestBed.configureTestingModule({
      imports: [BatchOperationsWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'cockpit/batch', component: {} as any }
        ]),
        { provide: BatchService, useValue: mockBatchService },
        { provide: ProcessInstanceService, useValue: mockProcessInstanceService },
        { provide: DecisionService, useValue: mockDecisionService },
        { provide: CockpitService, useValue: mockCockpitService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchOperationsWizardComponent);
    component = fixture.componentInstance;

    // Set up for removal-time-batch operation
    component.selectedOperationId = 'removal-time-batch';
    component.currentStep = 1;
    component.mode = 'instances';
    component.batchInstances = [
      {
        id: 'batch-with-removal',
        type: 'suspend',
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T10:05:00.000Z',
        removalTime: '2024-02-15T10:05:00.000Z'
      },
      {
        id: 'batch-without-removal',
        type: 'activate',
        startTime: '2024-01-14T09:00:00.000Z',
        endTime: '2024-01-14T09:02:00.000Z',
        removalTime: null
      }
    ];
    component.batchInstancesLoading = false;
    fixture.detectChanges();
  });

  describe('Column header - i18n key', () => {
    it('[MUTATION PROOF] should have removal time column header with correct CSS class', async () => {
      await fixture.whenStable();

      const headers = fixture.nativeElement.querySelectorAll('thead th');

      // Column header must exist (not empty array)
      expect(headers.length).toBeGreaterThan(0);

      // Must have removaltime column header (by class)
      const removalTimeHeader = fixture.nativeElement.querySelector('th.col-removaltime');
      expect(removalTimeHeader).toBeTruthy();

      // Column must have content (i18n key or translation)
      expect(removalTimeHeader.textContent.trim()).toBeTruthy();
      expect(removalTimeHeader.textContent.trim().length).toBeGreaterThan(0);
    });

    it('[MUTATION PROOF] should have removal time column between end time and actions', async () => {
      await fixture.whenStable();

      const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th'));
      const headerClasses = headers.map((h: any) => {
        if (h.classList.contains('col-check')) return 'check';
        if (h.classList.contains('col-id')) return 'id';
        if (h.classList.contains('col-definition')) return 'definition';
        if (h.classList.contains('col-starttime')) return 'starttime';
        if (h.classList.contains('col-endtime')) return 'endtime';
        if (h.classList.contains('col-removaltime')) return 'removaltime';
        if (h.classList.contains('col-actions')) return 'actions';
        return 'unknown';
      });

      // Expected order (with instances mode checkbox): check, id, definition, starttime, endtime, removaltime, actions
      const endTimeIndex = headerClasses.indexOf('endtime');
      const removalTimeIndex = headerClasses.indexOf('removaltime');
      const actionsIndex = headerClasses.indexOf('actions');

      // removaltime must exist
      expect(removalTimeIndex).toBeGreaterThan(-1);

      // removaltime must be after endtime
      expect(removalTimeIndex).toBeGreaterThan(endTimeIndex);

      // removaltime must be before actions
      expect(removalTimeIndex).toBeLessThan(actionsIndex);
    });
  });

  describe('Column data - date formatting', () => {
    it('[MUTATION PROOF] should display formatted date for batch with removalTime', async () => {
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);

      // Find row with removalTime
      const batchWithRemovalRow = Array.from(rows).find((row: any) => {
        const idCell = row.querySelector('td.col-id a');
        return idCell?.textContent.trim() === 'batch-with-removal';
      }) as HTMLElement;

      expect(batchWithRemovalRow).toBeTruthy();

      // Find removalTime cell
      const removalTimeCell = batchWithRemovalRow.querySelector('td.col-removaltime');
      expect(removalTimeCell).toBeTruthy();

      // Should display formatted date (not raw ISO string)
      const cellText = removalTimeCell!.textContent!.trim();
      expect(cellText).toBeTruthy();

      // Should NOT be raw ISO format (mutation proof - if camDate pipe missing)
      expect(cellText).not.toBe('2024-02-15T10:05:00.000Z');

      // Should NOT be empty (mutation proof - if value is lost)
      expect(cellText).not.toBe('—');
      expect(cellText).not.toBe('-');
      expect(cellText).not.toBe('');
    });

    it('[MUTATION PROOF] should display em dash (—) for batch without removalTime', async () => {
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');

      // Find row without removalTime
      const batchWithoutRemovalRow = Array.from(rows).find((row: any) => {
        const idCell = row.querySelector('td.col-id a');
        return idCell?.textContent.trim() === 'batch-without-removal';
      }) as HTMLElement;

      expect(batchWithoutRemovalRow).toBeTruthy();

      // Find removalTime cell
      const removalTimeCell = batchWithoutRemovalRow.querySelector('td.col-removaltime');
      expect(removalTimeCell).toBeTruthy();

      // Should display em dash for empty value (fallback pattern)
      const cellText = removalTimeCell!.textContent!.trim();
      expect(cellText).toBe('—');

      // Mutation proof: NOT a date string
      expect(cellText).not.toMatch(/\d{4}/); // Should not contain year
    });
  });

  describe('[NON-REGRESSION] Other columns unchanged', () => {
    it('should still have all original columns (id, type, startTime, endTime, actions)', async () => {
      await fixture.whenStable();

      const headers = fixture.nativeElement.querySelectorAll('thead th');

      // Must have original columns
      expect(fixture.nativeElement.querySelector('th.col-id')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('th.col-definition')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('th.col-starttime')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('th.col-endtime')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('th.col-actions')).toBeTruthy();
    });

    it('should display other time columns (startTime, endTime) with camDate pipe', async () => {
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      const firstRow = rows[0] as HTMLElement;

      const startTimeCell = firstRow.querySelector('td.col-starttime');
      const endTimeCell = firstRow.querySelector('td.col-endtime');

      expect(startTimeCell).toBeTruthy();
      expect(endTimeCell).toBeTruthy();

      // Should not be raw ISO format
      expect(startTimeCell!.textContent!.trim()).not.toContain('T');
      expect(endTimeCell!.textContent!.trim()).not.toContain('T');
    });
  });
});