import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BatchService } from './batch.service';
import { environment } from '../../environments/environment';
import { initTestEnvironment } from '../testing/test-utils';

/**
 * TEST REAL HTTP CALL for setRemovalTimeAsync
 *
 * This test uses HttpTestingController to verify:
 * - CORRECT URL: /history/batch/set-removal-time (NOT /batch/set-removal-time)
 * - CORRECT payload structure for each mode
 * - NO hierarchical parameter
 *
 * This test will be RED on the current bug (wrong URL), GREEN after fix.
 */
describe('BatchService - setRemovalTimeAsync HTTP call', () => {
  let service: BatchService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.engineUrl + '/default';

  beforeEach(() => {
    initTestEnvironment();

    TestBed.configureTestingModule({
      providers: [
        BatchService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(BatchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('[BUG TEST] URL must include /history', () => {
    it('should POST to /history/batch/set-removal-time (NOT /batch/set-removal-time)', () => {
      const payload = {
        historicBatchIds: ['batch-001', 'batch-002'],
        calculatedRemovalTime: true
      };

      service.setRemovalTimeAsync(payload).subscribe();

      // CRITICAL: URL must be /history/batch/set-removal-time
      // Current bug: URL is /batch/set-removal-time (missing /history)
      const req = httpMock.expectOne(`${baseUrl}/history/batch/set-removal-time`);

      expect(req.request.method).toBe('POST');
      expect(req.request.url).toBe(`${baseUrl}/history/batch/set-removal-time`);
      expect(req.request.url).toContain('/history/batch/');
      expect(req.request.url).not.toBe(`${baseUrl}/batch/set-removal-time`);

      req.flush({ id: 'batch-response-123' });
    });

    it('[MUTATION PROOF] should FAIL if URL is /batch/set-removal-time (without /history)', () => {
      const payload = {
        historicBatchIds: ['batch-001'],
        calculatedRemovalTime: true
      };

      service.setRemovalTimeAsync(payload).subscribe();

      // This expectOne will FAIL if the service uses wrong URL
      // If service uses /batch/set-removal-time, this line will throw
      const req = httpMock.expectOne(`${baseUrl}/history/batch/set-removal-time`);

      req.flush({ id: 'batch-123' });
    });
  });

  describe('Payload structure - Instances mode', () => {
    it('should send correct payload for CALCULATED mode with IDs', () => {
      const payload = {
        historicBatchIds: ['batch-001', 'batch-002'],
        calculatedRemovalTime: true
      };

      service.setRemovalTimeAsync(payload).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/history/batch/set-removal-time`);
      expect(req.request.body).toEqual(payload);
      expect(req.request.body.calculatedRemovalTime).toBe(true);
      expect(req.request.body.historicBatchIds).toEqual(['batch-001', 'batch-002']);
      expect(req.request.body.clearedRemovalTime).toBeUndefined();
      expect(req.request.body.absoluteRemovalTime).toBeUndefined();
      expect(req.request.body.hierarchical).toBeUndefined(); // Batch does NOT support hierarchical

      req.flush({ id: 'batch-123' });
    });

    it('should send correct payload for CLEARED mode with IDs', () => {
      const payload = {
        historicBatchIds: ['batch-001'],
        clearedRemovalTime: true
      };

      service.setRemovalTimeAsync(payload).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/history/batch/set-removal-time`);
      expect(req.request.body.clearedRemovalTime).toBe(true);
      expect(req.request.body.calculatedRemovalTime).toBeUndefined();
      expect(req.request.body.absoluteRemovalTime).toBeUndefined();

      req.flush({ id: 'batch-456' });
    });

    it('should send correct payload for ABSOLUTE mode with IDs', () => {
      const payload = {
        historicBatchIds: ['batch-001'],
        absoluteRemovalTime: '2024-12-31T23:59:59.000Z'
      };

      service.setRemovalTimeAsync(payload).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/history/batch/set-removal-time`);
      expect(req.request.body.absoluteRemovalTime).toBe('2024-12-31T23:59:59.000Z');
      expect(req.request.body.calculatedRemovalTime).toBeUndefined();
      expect(req.request.body.clearedRemovalTime).toBeUndefined();

      req.flush({ id: 'batch-789' });
    });
  });

  describe('Payload structure - Query mode', () => {
    it('should send correct payload for Query with historicBatchQuery', () => {
      const payload = {
        historicBatchQuery: {
          batchId: 'batch-001',
          type: 'suspend',
          completed: true
        },
        calculatedRemovalTime: true
      };

      service.setRemovalTimeAsync(payload).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/history/batch/set-removal-time`);
      expect(req.request.body.historicBatchQuery).toBeDefined();
      expect(req.request.body.historicBatchQuery.batchId).toBe('batch-001');
      expect(req.request.body.historicBatchQuery.type).toBe('suspend');
      expect(req.request.body.historicBatchQuery.completed).toBe(true);
      expect(req.request.body.historicBatchIds).toBeUndefined();

      req.flush({ id: 'batch-query-123' });
    });
  });

  describe('[MUTATION PROOF] No hierarchical parameter', () => {
    it('should NOT have hierarchical in payload (unlike decision/process)', () => {
      const payload = {
        historicBatchIds: ['batch-001'],
        calculatedRemovalTime: true
        // NO hierarchical parameter
      };

      service.setRemovalTimeAsync(payload).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/history/batch/set-removal-time`);

      // Verify NO hierarchical in request
      expect(req.request.body.hierarchical).toBeUndefined();
      expect(Object.keys(req.request.body)).not.toContain('hierarchical');

      req.flush({ id: 'batch-123' });
    });
  });

  describe('Comparison with decision/process services', () => {
    it('should use same URL pattern as decision service (/history/<type>/set-removal-time)', () => {
      const payload = {
        historicBatchIds: ['batch-001'],
        calculatedRemovalTime: true
      };

      service.setRemovalTimeAsync(payload).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/history/batch/set-removal-time`);

      // Pattern: /default/history/<entity-type>/set-removal-time
      // Decision: /default/history/decision-instance/set-removal-time
      // Process:  /default/history/process-instance/set-removal-time
      // Batch:    /default/history/batch/set-removal-time (CORRECT)
      // NOT:      /default/batch/set-removal-time (WRONG - current bug)

      expect(req.request.url).toMatch(/\/history\/[^\/]+\/set-removal-time$/);

      req.flush({ id: 'batch-123' });
    });
  });
});
