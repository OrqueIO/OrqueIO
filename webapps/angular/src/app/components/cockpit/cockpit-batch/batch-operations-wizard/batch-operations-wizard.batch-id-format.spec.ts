import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { initTestEnvironment } from '../../../../testing/test-utils';

/**
 * TEST: batchId parameter format validation
 *
 * Verifies that batchId is sent as a STRING (not array) in all API calls:
 * - GET /history/batch?batchId=<value> (list mode)
 * - GET /history/batch/count?batchId=<value> (count mode)
 * - POST /history/batch/set-removal-time with historicBatchQuery.batchId (query mode)
 *
 * This prevents the bug where f.values (array) is sent instead of f.values[0] (string).
 */
describe('BatchOperationsWizard - batchId format validation', () => {
  let httpMock: HttpTestingController;

  async function setupTest() {
    initTestEnvironment();

    await TestBed.configureTestingModule({
      imports: [BatchOperationsWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(BatchOperationsWizardComponent);
    const component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    return { component, fixture };
  }

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
    TestBed.resetTestingModule();
  });

  it('[LIST MODE] GET /history/batch should have batchId as STRING (not array)', async () => {
    const { component, fixture } = await setupTest();

    // Select removal-time-batch operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial load
    const initial = httpMock.match(req => req.url.includes('/history/batch'));
    initial.forEach(req => {
      if (req.request.url.includes('/count')) {
        req.flush({ count: 0 });
      } else {
        req.flush([]);
      }
    });

    // Apply batchId filter
    component.onBatchFilterChange({
      criteria: [{ field: 'batchId', values: ['batch-test-123'] }]
    });
    fixture.detectChanges();

    // Verify GET requests have batchId as STRING parameter
    const dataReq = httpMock.expectOne(req =>
      req.url.includes('/history/batch') && !req.url.includes('/count')
    );
    const countReq = httpMock.expectOne(req =>
      req.url.includes('/history/batch/count')
    );

    // CRITICAL: batchId must be a STRING, not an array or comma-separated
    const dataBatchId = dataReq.request.params.get('batchId');
    const countBatchId = countReq.request.params.get('batchId');

    expect(dataBatchId).toBe('batch-test-123');
    expect(countBatchId).toBe('batch-test-123');

    // Ensure it's not an array representation
    expect(dataBatchId).not.toContain(',');
    expect(dataBatchId).not.toContain('[');
    expect(countBatchId).not.toContain(',');
    expect(countBatchId).not.toContain('[');

    dataReq.flush([]);
    countReq.flush({ count: 0 });
  });

  it('[QUERY MODE] POST set-removal-time should have historicBatchQuery.batchId as STRING', async () => {
    const { component, fixture } = await setupTest();

    // Setup for query mode
    component.mode = 'query';
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial load
    const initial = httpMock.match(req => req.url.includes('/history/batch'));
    initial.forEach(req => {
      if (req.request.url.includes('/count')) {
        req.flush({ count: 0 });
      } else {
        req.flush([]);
      }
    });

    // Apply batchId filter and proceed to execution
    component.onBatchFilterChange({
      criteria: [{ field: 'batchId', values: ['batch-query-456'] }]
    });
    fixture.detectChanges();

    // Flush the filter change requests
    const filterDataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    const filterCountReq = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
    filterDataReq.flush([]);
    filterCountReq.flush({ count: 0 });

    component.currentStep = 2;
    component.removalTimeBatchMode = 'calculated';
    component.execute();
    fixture.detectChanges();

    // Verify POST request body
    const setRemovalTimeReq = httpMock.expectOne(req =>
      req.url.includes('/history/batch/set-removal-time') &&
      req.method === 'POST'
    );

    const body = setRemovalTimeReq.request.body;
    expect(body.historicBatchQuery).toBeDefined();
    expect(body.historicBatchQuery.batchId).toBeDefined();

    // CRITICAL: batchId in query must be STRING type
    expect(typeof body.historicBatchQuery.batchId).toBe('string');
    expect(body.historicBatchQuery.batchId).toBe('batch-query-456');

    // Should NOT be an array
    expect(Array.isArray(body.historicBatchQuery.batchId)).toBe(false);

    setRemovalTimeReq.flush({ id: 'batch-result-1', type: 'batch-set-removal-time' });
  });

  it('[INSTANCES MODE] POST set-removal-time should have historicBatchIds as ARRAY', async () => {
    const { component, fixture } = await setupTest();

    // Setup for instances mode with batch selection
    component.mode = 'instances';
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial load
    const initial = httpMock.match(req => req.url.includes('/history/batch'));
    initial.forEach(req => {
      if (req.request.url.includes('/count')) {
        req.flush({ count: 1 });
      } else {
        req.flush([{ id: 'batch-001', type: 'process-set-removal-time', createTime: '2026-01-01T00:00:00Z', completed: true }]);
      }
    });

    // Select a batch instance
    component.onBatchRowClick('batch-001');
    fixture.detectChanges();

    component.currentStep = 2;
    component.removalTimeBatchMode = 'calculated';
    component.execute();
    fixture.detectChanges();

    // Verify POST request body
    const setRemovalTimeReq = httpMock.expectOne(req =>
      req.url.includes('/history/batch/set-removal-time') &&
      req.method === 'POST'
    );

    const body = setRemovalTimeReq.request.body;

    // In instances mode, should have historicBatchIds (array), NOT historicBatchQuery
    expect(body.historicBatchIds).toBeDefined();
    expect(Array.isArray(body.historicBatchIds)).toBe(true);
    expect(body.historicBatchIds).toContain('batch-001');

    expect(body.historicBatchQuery).toBeUndefined();

    setRemovalTimeReq.flush({ id: 'batch-result-2', type: 'batch-set-removal-time' });
  });
});
