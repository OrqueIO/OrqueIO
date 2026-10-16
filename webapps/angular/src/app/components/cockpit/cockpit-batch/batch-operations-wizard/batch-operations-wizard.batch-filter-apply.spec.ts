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
 * BUG TEST: Batch filters not applied
 *
 * This test MUST be RED before fix, GREEN after.
 *
 * When a user selects a batch filter criterion (type, completed, batchId) and applies it,
 * the batch list should reload with the filter params sent to the API.
 *
 * Current symptom: "rien n'est changé" - list doesn't reload with filters
 */
describe('BatchOperationsWizard — Batch filter application (BUGFIX)', () => {
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
    (translateService as any).translations = { en: {} };

    component.currentStep = 1;
    component.mode = 'instances';
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('[BUG] should send GET /history/batch with type filter when type criterion is applied', async () => {
    // Trigger initial load
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial load (no filter)
    const req1 = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    req1.flush([]);
    const req2 = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
    req2.flush({ count: 0 });

    // User applies type filter
    component.onBatchFilterChange({
      criteria: [{ field: 'type', values: ['process-set-removal-time'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // CRITICAL: Should trigger GET with type parameter (filter IS applied)
    // Get both requests
    const requests = httpMock.match(req => req.url.includes('/history/batch'));
    expect(requests.length).toBe(2);

    const dataReq = requests.find(r => !r.request.url.includes('/count'));
    const countReq = requests.find(r => r.request.url.includes('/count'));

    expect(dataReq).toBeDefined();
    expect(countReq).toBeDefined();

    // Verify filter parameters on data request
    expect(dataReq!.request.params.get('typeIn')).toBe('process-set-removal-time');
    expect(dataReq!.request.params.get('sortBy')).toBe('startTime');
    expect(dataReq!.request.params.get('firstResult')).toBe('0');
    dataReq!.flush([{ id: 'batch-123', type: 'process-set-removal-time', endTime: '2024-01-01T00:00:00.000Z' }]);

    // Verify filter parameters on count request
    expect(countReq!.request.params.get('typeIn')).toBe('process-set-removal-time');
    countReq!.flush({ count: 1 });

    // Verify list updated
    expect(component.batchInstances.length).toBe(1);
    expect(component.batchInstancesTotal).toBe(1);
  });

  it('[BUG] should send GET /history/batch with completed=true when Status:Completed is applied', async () => {
    // Trigger initial load
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial load
    const req1 = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    req1.flush([]);
    const req2 = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
    req2.flush({ count: 0 });

    // User applies completed=true filter
    component.onBatchFilterChange({
      criteria: [{ field: 'completed', values: ['true'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // CRITICAL: Should trigger GET with completed=true parameter (filter IS applied)
    const requests = httpMock.match(req => req.url.includes('/history/batch'));
    expect(requests.length).toBe(2);

    const dataReq = requests.find(r => !r.request.url.includes('/count'));
    const countReq = requests.find(r => r.request.url.includes('/count'));

    expect(dataReq).toBeDefined();
    expect(countReq).toBeDefined();

    expect(dataReq!.request.params.get('completed')).toBe('true');
    dataReq!.flush([]);

    expect(countReq!.request.params.get('completed')).toBe('true');
    countReq!.flush({ count: 0 });
  });

  it('[BUG] should send GET /history/batch with batchId when batchId criterion is applied', async () => {
    // Trigger initial load
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial load
    const req1 = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    req1.flush([]);
    const req2 = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
    req2.flush({ count: 0 });

    // User applies batchId filter
    component.onBatchFilterChange({
      criteria: [{ field: 'batchId', values: ['batch-abc-123'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // CRITICAL: Should trigger GET with batchId parameter (filter IS applied)
    const requests = httpMock.match(req => req.url.includes('/history/batch'));
    expect(requests.length).toBe(2);

    const dataReq = requests.find(r => !r.request.url.includes('/count'));
    const countReq = requests.find(r => r.request.url.includes('/count'));

    expect(dataReq).toBeDefined();
    expect(countReq).toBeDefined();

    expect(dataReq!.request.params.get('batchId')).toBe('batch-abc-123');
    dataReq!.flush([{ id: 'batch-abc-123', type: 'process-set-removal-time', endTime: '2024-01-01T00:00:00.000Z' }]);

    expect(countReq!.request.params.get('batchId')).toBe('batch-abc-123');
    countReq!.flush({ count: 1 });

    expect(component.batchInstances.length).toBe(1);
  });

  it('[BUG] should reset to page 1 when filter changes', async () => {
    // Trigger initial load
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial load
    const req1 = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    req1.flush([]);
    const req2 = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
    req2.flush({ count: 0 });

    // User goes to page 2
    component.batchInstancesPage = 2;

    // User applies filter
    component.onBatchFilterChange({
      criteria: [{ field: 'type', values: ['decision-set-removal-time'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });

    // Should reset to page 1
    expect(component.batchInstancesPage).toBe(1);

    const requests = httpMock.match(req => req.url.includes('/history/batch'));
    expect(requests.length).toBe(2);

    const dataReq = requests.find(r => !r.request.url.includes('/count'));
    const countReq = requests.find(r => r.request.url.includes('/count'));

    expect(dataReq).toBeDefined();
    expect(countReq).toBeDefined();

    expect(dataReq!.request.params.get('firstResult')).toBe('0'); // page 1 offset
    expect(dataReq!.request.params.get('typeIn')).toBe('decision-set-removal-time');
    dataReq!.flush([]);

    expect(countReq!.request.params.get('typeIn')).toBe('decision-set-removal-time');
    countReq!.flush({ count: 0 });
  });
});
