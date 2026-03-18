import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProcessInstanceService, ProcessInstance, ProcessInstanceDetail, Variable, Activity } from './process-instance.service';
import { initTestEnvironment } from '../testing/test-utils';

describe('ProcessInstanceService', () => {
  let service: ProcessInstanceService;
  let httpMock: HttpTestingController;
  const baseUrl = '/orqueio/api/engine/engine/default';
  const historyUrl = `${baseUrl}/history`;

  beforeAll(() => { initTestEnvironment(); });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProcessInstanceService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProcessInstanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // =============================================
  // Process Instance CRUD
  // =============================================

  describe('getProcessInstances', () => {
    const mockInstances: ProcessInstance[] = [
      {
        id: 'pi-1', processDefinitionId: 'pd-1', processDefinitionKey: 'invoice',
        startTime: '2026-01-01T00:00:00.000+0000', state: 'ACTIVE',
      },
    ];

    it('should fetch process instances from history API', () => {
      service.getProcessInstances().subscribe((instances) => {
        expect(instances).toEqual(mockInstances);
      });

      const req = httpMock.expectOne((r) => r.url === `${historyUrl}/process-instance`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('maxResults')).toBe('100');
      req.flush(mockInstances);
    });

    it('should apply query params', () => {
      service.getProcessInstances({
        processDefinitionKey: 'invoice',
        firstResult: 10,
        maxResults: 25,
        sortBy: 'startTime',
        sortOrder: 'desc',
      }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${historyUrl}/process-instance`);
      expect(req.request.params.get('processDefinitionKey')).toBe('invoice');
      expect(req.request.params.get('firstResult')).toBe('10');
      expect(req.request.params.get('maxResults')).toBe('25');
      expect(req.request.params.get('sortBy')).toBe('startTime');
      expect(req.request.params.get('sortOrder')).toBe('desc');
      req.flush([]);
    });

    it('should cap maxResults at 10000', () => {
      service.getProcessInstances({ maxResults: 99999 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${historyUrl}/process-instance`);
      expect(req.request.params.get('maxResults')).toBe('10000');
      req.flush([]);
    });

    it('should return empty array on error', () => {
      service.getProcessInstances().subscribe((instances) => {
        expect(instances).toEqual([]);
      });

      const req = httpMock.expectOne((r) => r.url === `${historyUrl}/process-instance`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should apply date filters', () => {
      service.getProcessInstances({
        startedAfter: '2026-01-01T00:00:00.000+0000',
        startedBefore: '2026-02-01T00:00:00.000+0000',
      }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${historyUrl}/process-instance`);
      expect(req.request.params.get('startedAfter')).toBe('2026-01-01T00:00:00.000+0000');
      expect(req.request.params.get('startedBefore')).toBe('2026-02-01T00:00:00.000+0000');
      req.flush([]);
    });
  });

  describe('getProcessInstancesCount', () => {
    it('should return count from history API', () => {
      service.getProcessInstancesCount({ processDefinitionKey: 'invoice' }).subscribe((count) => {
        expect(count).toBe(42);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${historyUrl}/process-instance/count` && r.params.get('processDefinitionKey') === 'invoice'
      );
      req.flush({ count: 42 });
    });

    it('should return 0 on error', () => {
      service.getProcessInstancesCount().subscribe((count) => {
        expect(count).toBe(0);
      });

      const req = httpMock.expectOne((r) => r.url === `${historyUrl}/process-instance/count`);
      req.error(new ProgressEvent('Error'));
    });
  });

  describe('getProcessInstance', () => {
    it('should fetch a single process instance by id', () => {
      const detail: ProcessInstanceDetail = {
        id: 'pi-1', processDefinitionId: 'pd-1', processDefinitionKey: 'invoice',
        startTime: '2026-01-01T00:00:00.000+0000', state: 'ACTIVE',
        variables: [], activities: [],
      };

      service.getProcessInstance('pi-1').subscribe((instance) => {
        expect(instance!.id).toBe('pi-1');
      });

      const req = httpMock.expectOne(`${historyUrl}/process-instance/pi-1`);
      expect(req.request.method).toBe('GET');
      req.flush(detail);
    });

    it('should return null on error', () => {
      service.getProcessInstance('missing').subscribe((instance) => {
        expect(instance).toBeNull();
      });

      const req = httpMock.expectOne(`${historyUrl}/process-instance/missing`);
      req.error(new ProgressEvent('Not found'));
    });
  });

  describe('queryProcessInstances', () => {
    it('should POST query body with pagination', () => {
      const body = { processDefinitionKey: 'invoice', sorting: [{ sortBy: 'startTime', sortOrder: 'desc' }] };

      service.queryProcessInstances(body, 10, 25).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${historyUrl}/process-instance` && r.method === 'POST'
      );
      expect(req.request.body).toEqual(body);
      expect(req.request.params.get('firstResult')).toBe('10');
      expect(req.request.params.get('maxResults')).toBe('25');
      req.flush([]);
    });

    it('should cap maxResults at 10000', () => {
      service.queryProcessInstances({}, 0, 50000).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${historyUrl}/process-instance` && r.method === 'POST'
      );
      expect(req.request.params.get('maxResults')).toBe('10000');
      req.flush([]);
    });
  });

  describe('queryProcessInstancesCount', () => {
    it('should POST count query and strip sorting', () => {
      const body = {
        processDefinitionKey: 'invoice',
        sorting: [{ sortBy: 'startTime', sortOrder: 'desc' }],
      };

      service.queryProcessInstancesCount(body).subscribe((count) => {
        expect(count).toBe(15);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${historyUrl}/process-instance/count` && r.method === 'POST'
      );
      expect(req.request.body.sorting).toBeUndefined();
      expect(req.request.body.processDefinitionKey).toBe('invoice');
      req.flush({ count: 15 });
    });
  });

  // =============================================
  // Variables
  // =============================================

  describe('getProcessInstanceVariables', () => {
    it('should fetch variables from history API', () => {
      const vars: Variable[] = [
        { name: 'amount', type: 'Double', value: 300, processInstanceId: 'pi-1' },
        { name: 'approved', type: 'Boolean', value: true, processInstanceId: 'pi-1' },
      ];

      service.getProcessInstanceVariables('pi-1').subscribe((result) => {
        expect(result.length).toBe(2);
        expect(result[0].name).toBe('amount');
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${historyUrl}/variable-instance` && r.params.get('processInstanceId') === 'pi-1'
      );
      req.flush(vars);
    });

    it('should return empty array on error', () => {
      service.getProcessInstanceVariables('pi-1').subscribe((result) => {
        expect(result).toEqual([]);
      });

      const req = httpMock.expectOne((r) => r.url === `${historyUrl}/variable-instance`);
      req.error(new ProgressEvent('Error'));
    });
  });

  describe('setProcessInstanceVariable', () => {
    it('should PUT variable value', () => {
      service.setProcessInstanceVariable('pi-1', 'amount', 500, 'Double').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/process-instance/pi-1/variables/amount`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ value: 500, type: 'Double' });
      req.flush(null);
    });
  });

  describe('deleteProcessInstanceVariable', () => {
    it('should DELETE variable', () => {
      service.deleteProcessInstanceVariable('pi-1', 'amount').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/process-instance/pi-1/variables/amount`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  // =============================================
  // Activities
  // =============================================

  describe('getProcessInstanceActivities', () => {
    it('should fetch activities sorted by startTime desc', () => {
      const activities: Activity[] = [
        {
          id: 'ai-1', activityId: 'UserTask_1', activityName: 'Approve',
          activityType: 'userTask', startTime: '2026-01-01T00:00:01.000+0000',
        },
      ];

      service.getProcessInstanceActivities('pi-1').subscribe((result) => {
        expect(result.length).toBe(1);
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${historyUrl}/activity-instance` &&
          r.params.get('processInstanceId') === 'pi-1' &&
          r.params.get('sortBy') === 'startTime'
      );
      req.flush(activities);
    });
  });

  describe('getActivityInstanceTree', () => {
    it('should fetch runtime activity instance tree', () => {
      const tree = {
        id: 'pi-1:1', activityId: 'invoice:1', activityType: 'processDefinition',
        processInstanceId: 'pi-1', processDefinitionId: 'pd-1',
        childActivityInstances: [], childTransitionInstances: [], executionIds: ['pi-1'],
      };

      service.getActivityInstanceTree('pi-1').subscribe((result) => {
        expect(result!.id).toBe('pi-1:1');
      });

      const req = httpMock.expectOne(`${baseUrl}/process-instance/pi-1/activity-instances`);
      req.flush(tree);
    });
  });

  // =============================================
  // Suspension & Cancellation
  // =============================================

  describe('cancelProcessInstance', () => {
    it('should DELETE process instance', () => {
      service.cancelProcessInstance('pi-1').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/process-instance/pi-1` && r.method === 'DELETE');
      req.flush(null);
    });

    it('should pass deleteReason as param', () => {
      service.cancelProcessInstance('pi-1', 'No longer needed').subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-instance/pi-1` && r.params.get('deleteReason') === 'No longer needed'
      );
      req.flush(null);
    });
  });

  describe('suspendProcessInstance', () => {
    it('should PUT suspended=true', () => {
      service.suspendProcessInstance('pi-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/process-instance/pi-1/suspended`);
      expect(req.request.body.suspended).toBe(true);
      req.flush(null);
    });
  });

  describe('resumeProcessInstance', () => {
    it('should PUT suspended=false', () => {
      service.resumeProcessInstance('pi-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/process-instance/pi-1/suspended`);
      expect(req.request.body.suspended).toBe(false);
      req.flush(null);
    });
  });

  // =============================================
  // Jobs
  // =============================================

  describe('getJobsByProcessInstance', () => {
    it('should fetch jobs for a process instance', () => {
      const jobs = [
        {
          id: 'job-1', processInstanceId: 'pi-1', processDefinitionId: 'pd-1',
          processDefinitionKey: 'invoice', executionId: 'ex-1', retries: 3,
          createTime: '2026-01-01T00:00:00.000+0000', suspended: false, priority: 0,
        },
      ];

      service.getJobsByProcessInstance('pi-1').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('job-1');
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/job` && r.params.get('processInstanceId') === 'pi-1'
      );
      req.flush(jobs);
    });
  });

  describe('retryJob', () => {
    it('should PUT retries on a job', () => {
      service.retryJob('job-1', 3).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/job/job-1/retries`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.retries).toBe(3);
      req.flush(null);
    });

    it('should default retries to 1', () => {
      service.retryJob('job-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/job/job-1/retries`);
      expect(req.request.body.retries).toBe(1);
      req.flush(null);
    });
  });

  describe('setJobRetriesByProcessInstance', () => {
    it('should POST bulk retries', () => {
      service.setJobRetriesByProcessInstance('pi-1', 1).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/job/retries`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.processInstanceQuery.processInstanceId).toBe('pi-1');
      expect(req.request.body.retries).toBe(1);
      req.flush(null);
    });
  });

  // =============================================
  // External Tasks
  // =============================================

  describe('getExternalTasksByProcessInstance', () => {
    it('should fetch external tasks', () => {
      const tasks = [
        {
          id: 'et-1', processInstanceId: 'pi-1', processDefinitionId: 'pd-1',
          processDefinitionKey: 'invoice', activityId: 'ExternalTask_1',
          activityInstanceId: 'ai-1', executionId: 'ex-1', topicName: 'payment',
          retries: 3, suspended: false, priority: 0,
        },
      ];

      service.getExternalTasksByProcessInstance('pi-1').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(result[0].topicName).toBe('payment');
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/external-task` && r.params.get('processInstanceId') === 'pi-1'
      );
      req.flush(tasks);
    });
  });

  describe('retryExternalTask', () => {
    it('should POST retries=1 on external task', () => {
      service.retryExternalTask('et-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/external-task/et-1/retries`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.retries).toBe(1);
      req.flush(null);
    });
  });

  // =============================================
  // User Tasks
  // =============================================

  describe('getUserTasksByProcessInstance', () => {
    it('should fetch user tasks from runtime API', () => {
      const tasks = [
        {
          id: 'task-1', taskDefinitionKey: 'UserTask_1', name: 'Approve Invoice',
          created: '2026-01-01T00:00:00.000+0000', priority: 50,
          processDefinitionId: 'pd-1', processInstanceId: 'pi-1', executionId: 'ex-1',
        },
      ];

      service.getUserTasksByProcessInstance('pi-1').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Approve Invoice');
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/task` && r.params.get('processInstanceId') === 'pi-1'
      );
      req.flush(tasks);
    });
  });

  describe('getHistoryUserTasksByProcessInstance', () => {
    it('should fetch history tasks and map startTime to created', () => {
      const historyTasks = [
        {
          id: 'task-1', taskDefinitionKey: 'UserTask_1', name: 'Approve',
          startTime: '2026-01-01T00:00:00.000+0000', priority: 50,
          processDefinitionId: 'pd-1', processInstanceId: 'pi-1', executionId: 'ex-1',
        },
      ];

      service.getHistoryUserTasksByProcessInstance('pi-1').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(result[0].created).toBe('2026-01-01T00:00:00.000+0000');
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${historyUrl}/task` && r.params.get('processInstanceId') === 'pi-1'
      );
      req.flush(historyTasks);
    });
  });

  describe('setTaskAssignee', () => {
    it('should POST new assignee', () => {
      service.setTaskAssignee('task-1', 'john').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/task/task-1/assignee`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.userId).toBe('john');
      req.flush(null);
    });

    it('should support clearing assignee with null', () => {
      service.setTaskAssignee('task-1', null).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/task/task-1/assignee`);
      expect(req.request.body.userId).toBeNull();
      req.flush(null);
    });
  });

  // =============================================
  // Called/Super Process Instances
  // =============================================

  describe('getCalledProcessInstances', () => {
    it('should fetch sub-process instances', () => {
      const subInstances: ProcessInstance[] = [
        {
          id: 'pi-sub-1', processDefinitionId: 'pd-sub', processDefinitionKey: 'sub-process',
          startTime: '2026-01-01T00:00:01.000+0000', state: 'ACTIVE',
        },
      ];

      service.getCalledProcessInstances('pi-1').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('pi-sub-1');
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${historyUrl}/process-instance` &&
          r.params.get('superProcessInstanceId') === 'pi-1'
      );
      req.flush(subInstances);
    });
  });
});
