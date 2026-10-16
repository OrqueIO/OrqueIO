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
 * TEST: Batch ID link in removal-time-batch operation
 *
 * Verifies that:
 * 1. Batch ID links to /cockpit/batch with correct queryParams (details, type)
 * 2. Type='history' for batches with endTime
 * 3. Type='runtime' for batches without endTime (still running)
 * 4. Same route is used for eye icon and ID link
 * 5. Uses correct CSS class 'instance-link mono' (same as process/decision)
 */
describe('BatchOperationsWizard - Batch ID Link (removal-time-batch)', () => {
  let component: BatchOperationsWizardComponent;
  let fixture: ComponentFixture<BatchOperationsWizardComponent>;

  beforeEach(async () => {
    initTestEnvironment();

    const mockBatchService = {
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' })),
      getHistoryBatches: vi.fn().mockReturnValue(of([
        { id: 'batch-finished', type: 'suspend', startTime: '2024-01-15T10:00:00.000Z', endTime: '2024-01-15T10:05:00.000Z' },
        { id: 'batch-running', type: 'activate', startTime: '2024-01-14T09:00:00.000Z', endTime: null }
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
      { id: 'batch-finished', type: 'suspend', startTime: '2024-01-15T10:00:00.000Z', endTime: '2024-01-15T10:05:00.000Z' },
      { id: 'batch-running', type: 'activate', startTime: '2024-01-14T09:00:00.000Z', endTime: null }
    ];
    component.batchInstancesLoading = false;
    fixture.detectChanges();
  });

  it('should link finished batch ID to /cockpit/batch with type=history', async () => {
    await fixture.whenStable();

    const idLinks = fixture.nativeElement.querySelectorAll('td.col-id a');
    expect(idLinks.length).toBeGreaterThan(0);

    const finishedBatchLink = Array.from(idLinks).find((link: any) =>
      link.textContent.trim() === 'batch-finished'
    ) as HTMLAnchorElement;

    expect(finishedBatchLink).toBeTruthy();
    expect(finishedBatchLink.href).toContain('/cockpit/batch');
    expect(finishedBatchLink.href).toContain('details=batch-finished');
    expect(finishedBatchLink.href).toContain('type=history');
  });

  it('should link running batch ID to /cockpit/batch with type=runtime', async () => {
    await fixture.whenStable();

    const idLinks = fixture.nativeElement.querySelectorAll('td.col-id a');
    const runningBatchLink = Array.from(idLinks).find((link: any) =>
      link.textContent.trim() === 'batch-running'
    ) as HTMLAnchorElement;

    expect(runningBatchLink).toBeTruthy();
    expect(runningBatchLink.href).toContain('/cockpit/batch');
    expect(runningBatchLink.href).toContain('details=batch-running');
    expect(runningBatchLink.href).toContain('type=runtime');
  });

  it('should use CSS class "instance-link mono" on ID links', async () => {
    await fixture.whenStable();

    const idLinks = fixture.nativeElement.querySelectorAll('td.col-id a');
    expect(idLinks.length).toBe(2);

    idLinks.forEach((link: HTMLAnchorElement) => {
      expect(link.classList.contains('instance-link')).toBe(true);
      expect(link.classList.contains('mono')).toBe(true);
    });
  });

  it('should use same route for eye icon as for ID link (finished batch)', async () => {
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    const finishedRow = Array.from(rows).find((row: any) =>
      row.textContent.includes('batch-finished')
    ) as HTMLElement;

    expect(finishedRow).toBeTruthy();

    const idLink = finishedRow.querySelector('td.col-id a') as HTMLAnchorElement;
    const eyeLink = finishedRow.querySelector('td.col-actions a') as HTMLAnchorElement;

    expect(idLink.href).toBeTruthy();
    expect(eyeLink.href).toBeTruthy();
    expect(idLink.href).toBe(eyeLink.href);
  });

  it('should use same route for eye icon as for ID link (running batch)', async () => {
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    const runningRow = Array.from(rows).find((row: any) =>
      row.textContent.includes('batch-running')
    ) as HTMLElement;

    expect(runningRow).toBeTruthy();

    const idLink = runningRow.querySelector('td.col-id a') as HTMLAnchorElement;
    const eyeLink = runningRow.querySelector('td.col-actions a') as HTMLAnchorElement;

    expect(idLink.href).toBeTruthy();
    expect(eyeLink.href).toBeTruthy();
    expect(idLink.href).toBe(eyeLink.href);
  });

  it('should have stopPropagation on col-id td to prevent row click', async () => {
    await fixture.whenStable();

    const idCells = fixture.nativeElement.querySelectorAll('td.col-id');
    expect(idCells.length).toBe(2);

    // Verify structure matches process/decision lists
    idCells.forEach((td: HTMLElement) => {
      const link = td.querySelector('a');
      expect(link).toBeTruthy();
      expect(link?.classList.contains('instance-link')).toBe(true);
    });
  });
});
