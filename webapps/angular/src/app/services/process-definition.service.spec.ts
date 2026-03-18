import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProcessDefinitionService, ProcessDefinition, ProcessDefinitionStatistics } from './process-definition.service';
import { initTestEnvironment } from '../testing/test-utils';

describe('ProcessDefinitionService', () => {
  let service: ProcessDefinitionService;
  let httpMock: HttpTestingController;
  const baseUrl = '/orqueio/api/engine/engine/default';

  beforeAll(() => { initTestEnvironment(); });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProcessDefinitionService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProcessDefinitionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // =============================================
  // Process Definition CRUD
  // =============================================

  describe('getProcessDefinitions', () => {
    it('should fetch latest process definitions sorted by name', () => {
      const mockDefs: ProcessDefinition[] = [
        { id: 'pd-1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd1', suspended: false },
        { id: 'pd-2', key: 'order', name: 'Order', version: 1, deploymentId: 'd2', suspended: false },
      ];

      service.getProcessDefinitions().subscribe((defs) => {
        expect(defs).toEqual(mockDefs);
        expect(defs.length).toBe(2);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-definition` && r.params.get('latestVersion') === 'true'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('sortBy')).toBe('name');
      expect(req.request.params.get('sortOrder')).toBe('asc');
      expect(req.request.params.get('maxResults')).toBe('1000');
      req.flush(mockDefs);
    });

    it('should accept custom maxResults', () => {
      service.getProcessDefinitions(50).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-definition` && r.params.get('maxResults') === '50'
      );
      req.flush([]);
    });

    it('should return empty array on error', () => {
      service.getProcessDefinitions().subscribe((defs) => {
        expect(defs).toEqual([]);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/process-definition`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  describe('getProcessDefinition', () => {
    it('should fetch a single process definition by id', () => {
      const mockDef: ProcessDefinition = {
        id: 'pd-1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd1', suspended: false,
      };

      service.getProcessDefinition('pd-1').subscribe((def) => {
        expect(def).toEqual(mockDef);
      });

      const req = httpMock.expectOne(`${baseUrl}/process-definition/pd-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDef);
    });

    it('should return null on error', () => {
      service.getProcessDefinition('missing').subscribe((def) => {
        expect(def).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/process-definition/missing`);
      req.error(new ProgressEvent('Not found'));
    });
  });

  describe('getProcessDefinitionByKey', () => {
    it('should fetch the latest version by key', () => {
      const mockDef: ProcessDefinition = {
        id: 'pd-1', key: 'invoice', name: 'Invoice', version: 3, deploymentId: 'd1', suspended: false,
      };

      service.getProcessDefinitionByKey('invoice').subscribe((def) => {
        expect(def).toEqual(mockDef);
      });

      const req = httpMock.expectOne(`${baseUrl}/process-definition/key/invoice`);
      req.flush(mockDef);
    });

    it('should return null on error', () => {
      service.getProcessDefinitionByKey('unknown').subscribe((def) => {
        expect(def).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/process-definition/key/unknown`);
      req.error(new ProgressEvent('Not found'));
    });
  });

  describe('getProcessDefinitionVersions', () => {
    it('should fetch all versions sorted by version desc', () => {
      const versions: ProcessDefinition[] = [
        { id: 'pd-1:3', key: 'invoice', name: 'Invoice', version: 3, deploymentId: 'd3', suspended: false },
        { id: 'pd-1:2', key: 'invoice', name: 'Invoice', version: 2, deploymentId: 'd2', suspended: false },
        { id: 'pd-1:1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd1', suspended: false },
      ];

      service.getProcessDefinitionVersions('invoice').subscribe((defs) => {
        expect(defs.length).toBe(3);
        expect(defs[0].version).toBe(3);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-definition` && r.params.get('key') === 'invoice'
      );
      expect(req.request.params.get('sortBy')).toBe('version');
      expect(req.request.params.get('sortOrder')).toBe('desc');
      req.flush(versions);
    });
  });

  describe('getProcessDefinitionsCount', () => {
    it('should return count with latestVersion=true by default', () => {
      service.getProcessDefinitionsCount().subscribe((count) => {
        expect(count).toBe(5);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-definition/count` && r.params.get('latestVersion') === 'true'
      );
      req.flush({ count: 5 });
    });

    it('should return count without latestVersion filter', () => {
      service.getProcessDefinitionsCount(false).subscribe((count) => {
        expect(count).toBe(12);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-definition/count` && !r.params.has('latestVersion')
      );
      req.flush({ count: 12 });
    });

    it('should return 0 on error', () => {
      service.getProcessDefinitionsCount().subscribe((count) => {
        expect(count).toBe(0);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/process-definition/count`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  // =============================================
  // Statistics
  // =============================================

  describe('getProcessDefinitionsWithStatistics', () => {
    it('should fetch statistics with incidents and aggregate by key', () => {
      const rawStats: ProcessDefinitionStatistics[] = [
        {
          id: 'pd-1:1', key: 'invoice', name: 'Invoice', version: 1, suspended: false,
          instances: 3, failedJobs: 1, incidents: [{ incidentType: 'failedJob', incidentCount: 1 }],
          definition: { id: 'pd-1:1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd1', suspended: false },
        },
        {
          id: 'pd-1:2', key: 'invoice', name: 'Invoice', version: 2, suspended: false,
          instances: 5, failedJobs: 2, incidents: [{ incidentType: 'failedJob', incidentCount: 2 }],
          definition: { id: 'pd-1:2', key: 'invoice', name: 'Invoice', version: 2, deploymentId: 'd2', suspended: false },
        },
      ];

      service.getProcessDefinitionsWithStatistics().subscribe((stats) => {
        expect(stats.length).toBe(1);
        expect(stats[0].instances).toBe(8);
        expect(stats[0].failedJobs).toBe(3);
        expect(stats[0].incidents[0].incidentCount).toBe(3);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-definition/statistics` && r.params.get('incidents') === 'true'
      );
      req.flush(rawStats);
    });

    it('should aggregate different incident types separately', () => {
      const rawStats: ProcessDefinitionStatistics[] = [
        {
          id: 'pd-1:1', key: 'invoice', name: 'Invoice', version: 1, suspended: false,
          instances: 2, failedJobs: 1, incidents: [{ incidentType: 'failedJob', incidentCount: 1 }],
          definition: { id: 'pd-1:1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd1', suspended: false },
        },
        {
          id: 'pd-1:2', key: 'invoice', name: 'Invoice', version: 2, suspended: false,
          instances: 3, failedJobs: 0, incidents: [{ incidentType: 'failedExternalTask', incidentCount: 2 }],
          definition: { id: 'pd-1:2', key: 'invoice', name: 'Invoice', version: 2, deploymentId: 'd2', suspended: false },
        },
      ];

      service.getProcessDefinitionsWithStatistics().subscribe((stats) => {
        expect(stats.length).toBe(1);
        expect(stats[0].incidents.length).toBe(2);
        expect(stats[0].incidents.find((i) => i.incidentType === 'failedJob')!.incidentCount).toBe(1);
        expect(stats[0].incidents.find((i) => i.incidentType === 'failedExternalTask')!.incidentCount).toBe(2);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/process-definition/statistics`);
      req.flush(rawStats);
    });

    it('should sort aggregated results by name', () => {
      const rawStats: ProcessDefinitionStatistics[] = [
        {
          id: 'pd-2', key: 'order', name: 'Order', version: 1, suspended: false,
          instances: 1, failedJobs: 0, incidents: [],
          definition: { id: 'pd-2', key: 'order', name: 'Order', version: 1, deploymentId: 'd2', suspended: false },
        },
        {
          id: 'pd-1', key: 'invoice', name: 'Invoice', version: 1, suspended: false,
          instances: 2, failedJobs: 0, incidents: [],
          definition: { id: 'pd-1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd1', suspended: false },
        },
      ];

      service.getProcessDefinitionsWithStatistics().subscribe((stats) => {
        expect(stats[0].definition.name).toBe('Invoice');
        expect(stats[1].definition.name).toBe('Order');
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/process-definition/statistics`);
      req.flush(rawStats);
    });

    it('should return empty array on error', () => {
      service.getProcessDefinitionsWithStatistics().subscribe((stats) => {
        expect(stats).toEqual([]);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/process-definition/statistics`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  describe('getRunningInstancesCount', () => {
    it('should return running instance count for a process definition key', () => {
      service.getRunningInstancesCount('invoice').subscribe((count) => {
        expect(count).toBe(7);
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${baseUrl}/process-instance/count` &&
          r.params.get('processDefinitionKey') === 'invoice'
      );
      req.flush({ count: 7 });
    });

    it('should return 0 on error', () => {
      service.getRunningInstancesCount('invoice').subscribe((count) => {
        expect(count).toBe(0);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/process-instance/count`);
      req.error(new ProgressEvent('Error'));
    });
  });

  describe('getActivityStatistics', () => {
    it('should fetch activity statistics with incidents', () => {
      const stats = [
        { id: 'UserTask_1', instances: 3, failedJobs: 0, incidents: [] },
        { id: 'ServiceTask_1', instances: 1, failedJobs: 1, incidents: [{ incidentType: 'failedJob', incidentCount: 1 }] },
      ];

      service.getActivityStatistics('pd-1', true).subscribe((result) => {
        expect(result.length).toBe(2);
        expect(result[0].instances).toBe(3);
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${baseUrl}/process-definition/pd-1/statistics` &&
          r.params.get('incidents') === 'true'
      );
      req.flush(stats);
    });
  });

  // =============================================
  // BPMN XML
  // =============================================

  describe('getBpmn20Xml', () => {
    it('should fetch BPMN XML for a process definition', () => {
      const mockXml = { bpmn20Xml: '<bpmn:definitions>...</bpmn:definitions>' };

      service.getBpmn20Xml('pd-1').subscribe((result) => {
        expect(result).toEqual(mockXml);
      });

      const req = httpMock.expectOne(`${baseUrl}/process-definition/pd-1/xml`);
      expect(req.request.method).toBe('GET');
      req.flush(mockXml);
    });

    it('should return null on error', () => {
      service.getBpmn20Xml('pd-missing').subscribe((result) => {
        expect(result).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/process-definition/pd-missing/xml`);
      req.error(new ProgressEvent('Not found'));
    });
  });

  // =============================================
  // Incidents
  // =============================================

  describe('getIncidentsByProcessDefinitionKey', () => {
    it('should fetch incidents by process definition key', () => {
      const incidents = [
        {
          id: 'inc-1', processInstanceId: 'pi-1', activityId: 'ServiceTask_1',
          incidentType: 'failedJob', incidentMessage: 'Error', createTime: '2026-01-01T00:00:00.000+0000',
        },
      ];

      service.getIncidentsByProcessDefinitionKey('invoice').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('inc-1');
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${baseUrl}/incident` &&
          r.params.get('processDefinitionKey') === 'invoice'
      );
      req.flush(incidents);
    });
  });

  // =============================================
  // Job Definitions
  // =============================================

  describe('getJobDefinitionsByProcessDefinitionKey', () => {
    it('should fetch job definitions and count in parallel', () => {
      const jobDefs = [
        {
          id: 'jd-1', processDefinitionId: 'pd-1', processDefinitionKey: 'invoice',
          activityId: 'ServiceTask_1', jobType: 'async-continuation', suspended: false,
        },
      ];

      service.getJobDefinitionsByProcessDefinitionKey('invoice').subscribe((result) => {
        expect(result.jobDefinitions.length).toBe(1);
        expect(result.count).toBe(3);
      });

      const jobReq = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/job-definition` && r.params.get('processDefinitionKey') === 'invoice'
      );
      const countReq = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/job-definition/count` && r.params.get('processDefinitionKey') === 'invoice'
      );

      jobReq.flush(jobDefs);
      countReq.flush({ count: 3 });
    });
  });

  // =============================================
  // Called Process Definitions
  // =============================================

  describe('getCalledProcessDefinitions', () => {
    it('should merge running and static called process definitions', () => {
      const running = [
        { id: 'cpd-1', key: 'sub-process', name: 'Sub Process', version: 1, calledFromActivityIds: ['CallActivity_1'] },
      ];
      const staticDefs = [
        { id: 'cpd-1', key: 'sub-process', name: 'Sub Process', version: 1, calledFromActivityIds: ['CallActivity_2'] },
        { id: 'cpd-2', key: 'other', name: 'Other', version: 1, calledFromActivityIds: ['CallActivity_3'] },
      ];

      service.getCalledProcessDefinitions('pd-1').subscribe((result) => {
        expect(result.length).toBe(2);

        const merged = result.find((r) => r.id === 'cpd-1');
        expect(merged).toBeDefined();
        expect(merged!.state).toBe('running-and-referenced');
        expect(merged!.calledFromActivityIds).toContain('CallActivity_1');
        expect(merged!.calledFromActivityIds).toContain('CallActivity_2');

        const referenced = result.find((r) => r.id === 'cpd-2');
        expect(referenced).toBeDefined();
        expect(referenced!.state).toBe('referenced');
      });

      const runningReq = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-definition/pd-1/called-process-definitions` && r.method === 'POST'
      );
      const staticReq = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-definition/pd-1/static-called-process-definitions` && r.method === 'GET'
      );

      runningReq.flush(running);
      staticReq.flush(staticDefs);
    });
  });

  // =============================================
  // Suspension State
  // =============================================

  describe('suspendProcessDefinition', () => {
    it('should send PUT request to suspend', () => {
      service.suspendProcessDefinition('pd-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/process-definition/pd-1/suspended`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.suspended).toBe(true);
      expect(req.request.body.includeProcessInstances).toBe(true);
      req.flush(null);
    });

    it('should support excluding instances', () => {
      service.suspendProcessDefinition('pd-1', false).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/process-definition/pd-1/suspended`);
      expect(req.request.body.includeProcessInstances).toBe(false);
      req.flush(null);
    });
  });

  describe('activateProcessDefinition', () => {
    it('should send PUT request to activate', () => {
      service.activateProcessDefinition('pd-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/process-definition/pd-1/suspended`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.suspended).toBe(false);
      req.flush(null);
    });
  });

  describe('updateJobDefinitionSuspensionState', () => {
    it('should toggle job definition suspension', () => {
      service.updateJobDefinitionSuspensionState('jd-1', true).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/job-definition/jd-1/suspended`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.suspended).toBe(true);
      expect(req.request.body.includeJobs).toBe(true);
      req.flush(null);
    });
  });
});
