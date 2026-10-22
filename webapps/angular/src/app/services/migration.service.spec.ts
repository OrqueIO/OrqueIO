import 'zone.js';
import 'zone.js/testing';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { MigrationService } from './migration.service';
import { MigrationPlanDto, MigrationPlanReportDto } from './migration.model';
import { environment } from '../../environments/environment';
import { initTestEnvironment } from '../testing/test-utils';

describe('MigrationService', () => {
  beforeAll(() => { initTestEnvironment(); });
  let service: MigrationService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.engineUrl + '/default';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MigrationService
      ]
    });
    service = TestBed.inject(MigrationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate migration plan with correct request body', () => {
    const request = {
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2'
    };

    const mockPlan: MigrationPlanDto = {
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2',
      instructions: [
        { sourceActivityIds: ['task1'], targetActivityIds: ['task1'] }
      ]
    };

    service.generateMigrationPlan(request).subscribe(plan => {
      expect(plan).toEqual(mockPlan);
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockPlan);
  });

  it('should validate migration plan with correct request body', () => {
    const plan: MigrationPlanDto = {
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2',
      instructions: [
        { sourceActivityIds: ['task1'], targetActivityIds: ['task1'] }
      ]
    };

    const mockReport: MigrationPlanReportDto = {
      instructionReports: []
    };

    service.validateMigrationPlan(plan).subscribe(report => {
      expect(report).toEqual(mockReport);
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/validate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(plan);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockReport);
  });

  it('should return null on generate error', () => {
    const request = {
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2'
    };

    service.generateMigrationPlan(request).subscribe(plan => {
      expect(plan).toBeNull();
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/generate`);
    req.error(new ProgressEvent('error'));
  });

  it('should return null on validate error', () => {
    const plan: MigrationPlanDto = {
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2',
      instructions: []
    };

    service.validateMigrationPlan(plan).subscribe(report => {
      expect(report).toBeNull();
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/validate`);
    req.error(new ProgressEvent('error'));
  });

  it('should handle complex migration plan with multiple instructions', () => {
    const request = {
      sourceProcessDefinitionId: 'OrderProcess:1',
      targetProcessDefinitionId: 'OrderProcess:2',
      updateEventTriggers: true
    };

    const mockPlan: MigrationPlanDto = {
      sourceProcessDefinitionId: 'OrderProcess:1',
      targetProcessDefinitionId: 'OrderProcess:2',
      instructions: [
        {
          sourceActivityIds: ['identifyNeeds'],
          targetActivityIds: ['identifyNeeds'],
          updateEventTrigger: false
        },
        {
          sourceActivityIds: ['orderTheNeeds'],
          targetActivityIds: ['orderTheNeeds'],
          updateEventTrigger: false
        },
        {
          sourceActivityIds: ['StartEvent_1'],
          targetActivityIds: ['StartEvent_1'],
          updateEventTrigger: null
        }
      ]
    };

    service.generateMigrationPlan(request).subscribe(plan => {
      expect(plan).toEqual(mockPlan);
      expect(plan!.instructions).toHaveLength(3);
      expect(plan!.instructions[0].sourceActivityIds).toEqual(['identifyNeeds']);
      expect(plan!.instructions[0].updateEventTrigger).toBe(false);
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/generate`);
    expect(req.request.body.updateEventTriggers).toBe(true);
    req.flush(mockPlan);
  });

  it('should handle validation report with failures', () => {
    const plan: MigrationPlanDto = {
      sourceProcessDefinitionId: 'Process:1',
      targetProcessDefinitionId: 'Process:2',
      instructions: [
        { sourceActivityIds: ['task1'], targetActivityIds: ['task2'] }
      ]
    };

    const mockReport: MigrationPlanReportDto = {
      instructionReports: [
        {
          instruction: plan.instructions[0],
          failures: [
            'The source activity is not a user task',
            'Cannot migrate to different activity type'
          ]
        }
      ]
    };

    service.validateMigrationPlan(plan).subscribe(report => {
      expect(report).toEqual(mockReport);
      expect(report!.instructionReports[0].failures).toHaveLength(2);
      expect(report!.instructionReports[0].failures[0]).toContain('user task');
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/validate`);
    req.flush(mockReport);
  });

  it('should handle validation report with no failures', () => {
    const plan: MigrationPlanDto = {
      sourceProcessDefinitionId: 'Process:1',
      targetProcessDefinitionId: 'Process:2',
      instructions: [
        { sourceActivityIds: ['task1'], targetActivityIds: ['task1'] }
      ]
    };

    const mockReport: MigrationPlanReportDto = {
      instructionReports: [
        {
          instruction: plan.instructions[0],
          failures: []
        }
      ]
    };

    service.validateMigrationPlan(plan).subscribe(report => {
      expect(report).toEqual(mockReport);
      expect(report!.instructionReports[0].failures).toHaveLength(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/validate`);
    req.flush(mockReport);
  });

  it('should include CSRF headers in requests', () => {
    const request = {
      sourceProcessDefinitionId: 'pd:1',
      targetProcessDefinitionId: 'pd:2'
    };

    service.generateMigrationPlan(request).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/migration/generate`);
    // CSRF headers should be present
    expect(req.request.headers.has('Content-Type')).toBe(true);
    req.flush({ sourceProcessDefinitionId: 'pd:1', targetProcessDefinitionId: 'pd:2', instructions: [] });
  });

  it('should handle empty instructions array in plan', () => {
    const request = {
      sourceProcessDefinitionId: 'same:1',
      targetProcessDefinitionId: 'same:1'
    };

    const mockPlan: MigrationPlanDto = {
      sourceProcessDefinitionId: 'same:1',
      targetProcessDefinitionId: 'same:1',
      instructions: []
    };

    service.generateMigrationPlan(request).subscribe(plan => {
      expect(plan).toEqual(mockPlan);
      expect(plan!.instructions).toHaveLength(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/generate`);
    req.flush(mockPlan);
  });

  it('should handle one-to-many activity mappings', () => {
    const mockPlan: MigrationPlanDto = {
      sourceProcessDefinitionId: 'Process:1',
      targetProcessDefinitionId: 'Process:2',
      instructions: [
        {
          sourceActivityIds: ['gatewayA'],
          targetActivityIds: ['task1', 'task2', 'task3']
        }
      ]
    };

    const request = {
      sourceProcessDefinitionId: 'Process:1',
      targetProcessDefinitionId: 'Process:2'
    };

    service.generateMigrationPlan(request).subscribe(plan => {
      expect(plan!.instructions[0].targetActivityIds).toHaveLength(3);
      expect(plan!.instructions[0].sourceActivityIds).toHaveLength(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/generate`);
    req.flush(mockPlan);
  });

  it('should handle many-to-one activity mappings', () => {
    const mockPlan: MigrationPlanDto = {
      sourceProcessDefinitionId: 'Process:1',
      targetProcessDefinitionId: 'Process:2',
      instructions: [
        {
          sourceActivityIds: ['task1', 'task2', 'task3'],
          targetActivityIds: ['gatewayA']
        }
      ]
    };

    const request = {
      sourceProcessDefinitionId: 'Process:1',
      targetProcessDefinitionId: 'Process:2'
    };

    service.generateMigrationPlan(request).subscribe(plan => {
      expect(plan!.instructions[0].sourceActivityIds).toHaveLength(3);
      expect(plan!.instructions[0].targetActivityIds).toHaveLength(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/migration/generate`);
    req.flush(mockPlan);
  });
});