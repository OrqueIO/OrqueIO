import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { DecisionService } from '../../../../services/decision.service';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { CockpitService } from '../../../../services/cockpit.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

/**
 * INTEGRATION TEST: Wizard + Filter Panel reopen + new HTTP requests
 *
 * Flow:
 * 1. User applies Batch ID filter → GET /history/batch?batchId=...
 * 2. User reopens pill, adds more values → clicks Apply
 * 3. New GET /history/batch?batchId=...,... with updated values
 * 4. Same for Type and Status
 *
 * Part of batch filter enhancements (#114)
 */
describe('BatchOperationsWizard + FilterPanel Reopen Integration', () => {
  let component: BatchOperationsWizardComponent;
  let fixture: ComponentFixture<BatchOperationsWizardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    initTestEnvironment();

    await TestBed.configureTestingModule({
      imports: [BatchOperationsWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: DecisionService,
          useValue: {
            setRemovalTimeAsync: vi.fn(),
            getDecisionInstancesCountFiltered: vi.fn(),
            deleteAsync: vi.fn(),
            getDecisionDefinitions: vi.fn().mockReturnValue({ subscribe: vi.fn() })
          }
        },
        {
          provide: ProcessInstanceService,
          useValue: { setRemovalTimeAsync: vi.fn() }
        },
        {
          provide: CockpitService,
          useValue: {
            getProcessDefinitions: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
            searchProcessInstancesGlobal: vi.fn(),
            searchProcessInstancesGlobalCount: vi.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchOperationsWizardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = {
      en: {
        'cockpit.batchOps.removalTimeBatch.filters.type': 'Type',
        'cockpit.batchOps.removalTimeBatch.filters.status': 'Status',
        'cockpit.batchOps.removalTimeBatch.filters.statusCompleted': 'Completed',
        'BATCH_TYPE_DECISION_SET_REMOVAL_TIME': 'Set Removal Time (Decisions)'
      }
    };

    component.currentStep = 1;
    component.mode = 'instances';
    fixture.detectChanges();

    // Trigger operation selection
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial load - use match() to handle potential multiple requests
    const initialRequests = httpMock.match(req => req.url.includes('/history/batch'));
    initialRequests.forEach(req => {
      if (req.request.url.includes('/count')) {
        req.flush({ count: 0 });
      } else {
        req.flush([]);
      }
    });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('[Integration] Batch ID: reopen, change value, Apply → new GET with updated value', async () => {
    // Apply Batch ID with value "batch-001"
    component.onBatchFilterChange({
      criteria: [{ field: 'batchId', values: ['batch-001'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // Should trigger 1 GET request for data and 1 for count
    const requests1 = httpMock.match(req => req.url.includes('/history/batch'));
    expect(requests1.length).toBe(2);

    const dataReq1 = requests1.find(r => !r.request.url.includes('/count'));
    const countReq1 = requests1.find(r => r.request.url.includes('/count'));

    expect(dataReq1!.request.params.get('batchId')).toBe('batch-001');
    expect(countReq1!.request.params.get('batchId')).toBe('batch-001');

    dataReq1!.flush([{ id: 'batch-001', type: 'process-set-removal-time', endTime: '2024-01-01T00:00:00.000Z' }]);
    countReq1!.flush({ count: 1 });

    // Reopen and change value to "batch-002" (simulating user editing text input)
    component.onBatchFilterChange({
      criteria: [{ field: 'batchId', values: ['batch-002'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // Should trigger 1 new GET request for data and 1 for count
    const requests2 = httpMock.match(req => req.url.includes('/history/batch'));
    expect(requests2.length).toBe(2);

    const dataReq2 = requests2.find(r => !r.request.url.includes('/count'));
    const countReq2 = requests2.find(r => r.request.url.includes('/count'));

    expect(dataReq2!.request.params.get('batchId')).toBe('batch-002');
    expect(countReq2!.request.params.get('batchId')).toBe('batch-002');

    dataReq2!.flush([
      { id: 'batch-002', type: 'decision-set-removal-time', startTime: '2024-01-02T00:00:00.000Z', endTime: '2024-01-02T00:03:00.000Z' }
    ]);
    countReq2!.flush({ count: 1 });

    expect(component.batchInstances.length).toBe(1);
    expect(component.batchInstances[0].id).toBe('batch-002');
  });

  it('[Integration] Type: reopen, change option, Apply → new GET with new type', async () => {
    // Apply Type filter
    component.onBatchFilterChange({
      criteria: [{ field: 'type', values: ['process-set-removal-time'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    let requests = httpMock.match(req => req.url.includes('/history/batch'));
    requests.forEach(r => r.flush(r.request.url.includes('/count') ? { count: 1 } : [{ id: 'b1', type: 'process-set-removal-time', endTime: '2024-01-01T00:00:00.000Z' }]));

    // Reopen and change to decision-set-removal-time
    component.onBatchFilterChange({
      criteria: [{ field: 'type', values: ['decision-set-removal-time'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // Should trigger NEW requests with new type
    requests = httpMock.match(req => req.url.includes('/history/batch'));
    const dataReq = requests.find(r => !r.request.url.includes('/count'));
    const countReq = requests.find(r => r.request.url.includes('/count'));

    expect(dataReq!.request.params.get('type')).toBe('decision-set-removal-time');
    expect(countReq!.request.params.get('type')).toBe('decision-set-removal-time');

    dataReq!.flush([{ id: 'b2', type: 'decision-set-removal-time', endTime: '2024-01-02T00:00:00.000Z' }]);
    countReq!.flush({ count: 1 });

    expect(component.batchInstances.length).toBe(1);
    expect(component.batchInstances[0].type).toBe('decision-set-removal-time');
  });

  it('[Integration] Status: reopen, toggle Completed/Running, Apply → new GET', async () => {
    // Apply Status Completed
    component.onBatchFilterChange({
      criteria: [{ field: 'completed', values: ['true'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    let requests = httpMock.match(req => req.url.includes('/history/batch'));
    requests.forEach(r => r.flush(r.request.url.includes('/count') ? { count: 5 } : []));

    // Reopen and switch to Running
    component.onBatchFilterChange({
      criteria: [{ field: 'completed', values: ['false'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // Should trigger NEW requests with completed=false
    requests = httpMock.match(req => req.url.includes('/history/batch'));
    const dataReq = requests.find(r => !r.request.url.includes('/count'));
    const countReq = requests.find(r => r.request.url.includes('/count'));

    expect(dataReq!.request.params.get('completed')).toBe('false');
    expect(countReq!.request.params.get('completed')).toBe('false');

    dataReq!.flush([{ id: 'b-running', type: 'process-set-removal-time', endTime: null }]);
    countReq!.flush({ count: 1 });

    expect(component.batchInstances.length).toBe(1);
  });

  it('[Integration] Page resets to 1 after reopening and changing filter', async () => {
    // Apply filter
    component.onBatchFilterChange({
      criteria: [{ field: 'type', values: ['process-set-removal-time'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();

    let requests = httpMock.match(req => req.url.includes('/history/batch'));
    requests.forEach(r => r.flush(r.request.url.includes('/count') ? { count: 20 } : []));

    // User goes to page 2
    component.batchInstancesPage = 2;

    // Reopen and change filter
    component.onBatchFilterChange({
      criteria: [{ field: 'type', values: ['decision-set-removal-time'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();

    // Page should reset to 1
    expect(component.batchInstancesPage).toBe(1);

    requests = httpMock.match(req => req.url.includes('/history/batch'));
    const dataReq = requests.find(r => !r.request.url.includes('/count'));
    expect(dataReq!.request.params.get('firstResult')).toBe('0'); // page 1

    requests.forEach(r => r.flush(r.request.url.includes('/count') ? { count: 10 } : []));
  });
});