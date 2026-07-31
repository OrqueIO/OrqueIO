import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { initTestEnvironment } from '../testing/test-utils';
import { BatchService } from './batch.service';
import { environment } from '../../environments/environment';

describe('BatchService — /job pagination params', () => {
  beforeAll(() => { initTestEnvironment(); });

  let service: BatchService;
  let http: HttpTestingController;
  const base = `${environment.engineUrl}/default`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BatchService],
    });
    service = TestBed.inject(BatchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); });

  it('getFailedJobs — firstResult and maxResults are URL query params, not body fields', () => {
    service.getFailedJobs('job-def-1', { firstResult: 0, maxResults: 10 }).subscribe();

    const req = http.expectOne(r => r.url === `${base}/job`);
    expect(req.request.method).toBe('POST');

    // Pagination must be in URL params
    expect(req.request.params.get('firstResult')).toBe('0');
    expect(req.request.params.get('maxResults')).toBe('10');

    // Pagination must NOT appear in the request body
    const body = req.request.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('firstResult');
    expect(body).not.toHaveProperty('maxResults');

    // Required filter fields must remain in body
    expect(body['jobDefinitionId']).toBe('job-def-1');
    expect(body['withException']).toBe(true);
    expect(body['noRetriesLeft']).toBe(true);

    req.flush([]);
  });

  it('getFailedJobs — default firstResult=0 and maxResults=10 when params omitted', () => {
    service.getFailedJobs('job-def-2').subscribe();

    const req = http.expectOne(r => r.url === `${base}/job`);
    expect(req.request.params.get('firstResult')).toBe('0');
    expect(req.request.params.get('maxResults')).toBe('10');

    req.flush([]);
  });
});
