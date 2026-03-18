import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ProcessDetailComponent } from './process-detail';
import {
  CockpitService,
  ProcessInstanceDetail,
  ProcessDefinition,
  Variable,
  Activity,
  Incident,
  Job,
  UserTask,
  ExternalTask,
  ActivityInstanceTree,
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('ProcessDetailComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: ProcessDetailComponent;
  let fixture: ComponentFixture<ProcessDetailComponent>;
  let cockpitService: any;
  let navMenuService: any;
  let routeParams$: Subject<any>;
  let router: Router;

  const mockVariables: Variable[] = [
    { name: 'amount', type: 'Double', value: 300.0, processInstanceId: 'pi-1' },
    { name: 'approved', type: 'Boolean', value: true, processInstanceId: 'pi-1' },
    { name: 'customer', type: 'String', value: 'Acme', processInstanceId: 'pi-1' },
  ];

  const mockActivities: Activity[] = [
    {
      id: 'ai-1', activityId: 'UserTask_1', activityName: 'Approve Invoice',
      activityType: 'userTask', startTime: '2026-01-01T00:00:01.000+0000',
    },
    {
      id: 'ai-2', activityId: 'StartEvent_1', activityName: 'Start',
      activityType: 'startEvent', startTime: '2026-01-01T00:00:00.000+0000',
      endTime: '2026-01-01T00:00:00.500+0000',
    },
  ];

  const mockInstance: ProcessInstanceDetail = {
    id: 'pi-1', processDefinitionId: 'pd-1', processDefinitionKey: 'invoice',
    startTime: '2026-01-01T00:00:00.000+0000', state: 'ACTIVE',
    variables: mockVariables, activities: mockActivities,
  };

  const mockDefinition: ProcessDefinition = {
    id: 'pd-1', key: 'invoice', name: 'Invoice Process', version: 1, deploymentId: 'd1', suspended: false,
  };

  const mockIncidents: Incident[] = [
    {
      id: 'inc-1', processInstanceId: 'pi-1', activityId: 'ServiceTask_1',
      incidentType: 'failedJob', incidentMessage: 'Delegate exception',
      createTime: '2026-01-01T00:00:02.000+0000', configuration: 'job-1',
    },
  ];

  const mockJobs: Job[] = [
    {
      id: 'job-1', processInstanceId: 'pi-1', processDefinitionId: 'pd-1',
      processDefinitionKey: 'invoice', executionId: 'ex-1', retries: 0,
      exceptionMessage: 'Error', createTime: '2026-01-01', suspended: false, priority: 0,
    },
  ];

  const mockUserTasks: UserTask[] = [
    {
      id: 'task-1', taskDefinitionKey: 'UserTask_1', name: 'Approve Invoice',
      created: '2026-01-01', priority: 50, processDefinitionId: 'pd-1',
      processInstanceId: 'pi-1', executionId: 'ex-1', assignee: 'john',
    },
  ];

  const mockActivityTree: ActivityInstanceTree = {
    id: 'pi-1:1', activityId: 'invoice:1', activityType: 'processDefinition',
    processInstanceId: 'pi-1', processDefinitionId: 'pd-1',
    childActivityInstances: [
      {
        id: 'ai-1', activityId: 'UserTask_1', activityName: 'Approve Invoice',
        activityType: 'userTask', processInstanceId: 'pi-1', processDefinitionId: 'pd-1',
        childActivityInstances: [], childTransitionInstances: [], executionIds: ['ex-1'],
      },
    ],
    childTransitionInstances: [],
    executionIds: ['pi-1'],
  };

  beforeEach(async () => {
    routeParams$ = new Subject();

    cockpitService = {
      getProcessInstance: vi.fn().mockReturnValue(of(mockInstance)),
      getProcessDefinition: vi.fn().mockReturnValue(of(mockDefinition)),
      getProcessInstanceVariables: vi.fn().mockReturnValue(of(mockVariables)),
      getProcessInstanceActivities: vi.fn().mockReturnValue(of(mockActivities)),
      getProcessInstanceIncidents: vi.fn().mockReturnValue(of(mockIncidents)),
      getHistoryIncidents: vi.fn().mockReturnValue(of([])),
      getBpmn20Xml: vi.fn().mockReturnValue(of({ bpmn20Xml: '<bpmn></bpmn>' })),
      getActivityStatistics: vi.fn().mockReturnValue(of([])),
      getActivityInstanceTree: vi.fn().mockReturnValue(of(mockActivityTree)),
      getJobsByProcessInstance: vi.fn().mockReturnValue(of(mockJobs)),
      getUserTasksByProcessInstance: vi.fn().mockReturnValue(of(mockUserTasks)),
      getHistoryUserTasksByProcessInstance: vi.fn().mockReturnValue(of([])),
      getExternalTasksByProcessInstance: vi.fn().mockReturnValue(of([])),
      getCalledProcessInstances: vi.fn().mockReturnValue(of([])),
      suspendProcessInstance: vi.fn().mockReturnValue(of(undefined)),
      resumeProcessInstance: vi.fn().mockReturnValue(of(undefined)),
      cancelProcessInstance: vi.fn().mockReturnValue(of(undefined)),
      setProcessInstanceVariable: vi.fn().mockReturnValue(of(undefined)),
      deleteProcessInstanceVariable: vi.fn().mockReturnValue(of(undefined)),
      retryJob: vi.fn().mockReturnValue(of(undefined)),
      setJobRetriesByProcessInstance: vi.fn().mockReturnValue(of(undefined)),
      suspendJob: vi.fn().mockReturnValue(of(undefined)),
      resumeJob: vi.fn().mockReturnValue(of(undefined)),
      recalculateJobDueDate: vi.fn().mockReturnValue(of(undefined)),
      setTaskAssignee: vi.fn().mockReturnValue(of(undefined)),
    } as any;

    navMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [ProcessDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: navMenuService },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessDetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should load process data when route params change', async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });


      expect(component.processId).toBe('pi-1');
      expect(cockpitService.getProcessInstance).toHaveBeenCalledWith('pi-1');
      expect(component.processInstance).toEqual(mockInstance);
      expect(component.loading).toBe(false);
    });

    it('should load variables', async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });


      expect(component.variables.length).toBe(3);
    });

    it('should load activities', async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });


      expect(component.activities.length).toBe(2);
    });

    it('should load BPMN diagram for active process', async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });


      expect(cockpitService.getBpmn20Xml).toHaveBeenCalledWith('pd-1');
    });

    it('should load activity instance tree for active process', async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });


      expect(cockpitService.getActivityInstanceTree).toHaveBeenCalledWith('pi-1');
      expect(component.activityTree).toEqual(mockActivityTree);
    });

    it('should load incidents', async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });


      expect(component.incidents.length).toBe(1);
    });

    it('should fallback to history incidents when runtime returns empty', async () => {
      cockpitService.getProcessInstanceIncidents!.mockReturnValue(of([]));
      cockpitService.getHistoryIncidents!.mockReturnValue(of([{
        id: 'hinc-1', processInstanceId: 'pi-1', activityId: 'a1',
        incidentType: 'failedJob', incidentMessage: 'err', createTime: '2026-01-01',
      }]));

      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });


      expect(cockpitService.getHistoryIncidents).toHaveBeenCalledWith('pi-1');
      expect(component.incidents.length).toBe(1);
    });
  });

  // =============================================
  // Tabs
  // =============================================

  describe('tabs', () => {
    it('should initialize with variables tab', () => {
      expect(component.activeTab).toBe('variables');
    });

    it('should have all 6 tabs', () => {
      expect(component.tabs.length).toBe(6);
      expect(component.tabs.map((t) => t.id)).toEqual([
        'variables', 'incidents', 'calledInstances', 'userTasks', 'jobs', 'externalTasks',
      ]);
    });

    it('should switch tabs', () => {
      component.setActiveTab('incidents');
      expect(component.activeTab).toBe('incidents');
    });

    it('should return badge count for tabs', async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });


      const variablesTab = component.tabs.find((t) => t.id === 'variables')!;
      expect(component.getTabBadgeCount(variablesTab)).toBe(3);
    });

    it('should return null for zero badge count', () => {
      component.variables = [];
      const variablesTab = component.tabs.find((t) => t.id === 'variables')!;
      expect(component.getTabBadgeCount(variablesTab)).toBeNull();
    });
  });

  // =============================================
  // Breadcrumbs
  // =============================================

  describe('breadcrumbs', () => {
    it('should update breadcrumbs after loading', async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });


      expect(component.breadcrumbs.length).toBe(3);
      expect(component.breadcrumbs[0].route).toBe('/cockpit/processes');
      expect(component.breadcrumbs[2].label).toBe('pi-1');
    });

    it('should show empty breadcrumbs when no process', () => {
      component.processInstance = null;
      component['updateBreadcrumbs']();
      expect(component.breadcrumbs).toEqual([]);
    });
  });

  // =============================================
  // Variable Management
  // =============================================

  describe('variable management', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });

    });

    it('should start add variable mode', () => {
      component.startAddVariable();
      expect(component.showAddVariable).toBe(true);
      expect(component.newVariable.isNew).toBe(true);
    });

    it('should cancel add variable', () => {
      component.startAddVariable();
      component.cancelAddVariable();
      expect(component.showAddVariable).toBe(false);
    });

    it('should save new variable', async () => {
      component.newVariable = { name: 'newVar', type: 'String', value: 'hello', isNew: true };
      component.saveNewVariable();


      expect(cockpitService.setProcessInstanceVariable).toHaveBeenCalledWith('pi-1', 'newVar', 'hello', 'String');
    });

    it('should not save variable with empty name', () => {
      component.newVariable = { name: '', type: 'String', value: 'hello', isNew: true };
      component.saveNewVariable();
      expect(cockpitService.setProcessInstanceVariable).not.toHaveBeenCalled();
    });

    it('should start editing a variable', () => {
      component.startEditVariable(mockVariables[0]);
      expect(component.editingVariable).toBeDefined();
      expect(component.editingVariable!.name).toBe('amount');
    });

    it('should cancel edit', () => {
      component.startEditVariable(mockVariables[0]);
      component.cancelEditVariable();
      expect(component.editingVariable).toBeNull();
    });

    it('should delete a variable', async () => {
      component.deleteVariable('amount');


      expect(cockpitService.deleteProcessInstanceVariable).toHaveBeenCalledWith('pi-1', 'amount');
      expect(component.variables.find((v) => v.name === 'amount')).toBeUndefined();
    });

    it('should not allow editing on completed process', () => {
      component.processInstance = { ...mockInstance, state: 'COMPLETED' };
      component.startEditVariable(mockVariables[0]);
      expect(component.editingVariable).toBeNull();
    });
  });

  // =============================================
  // Variable Filtering & Sorting
  // =============================================

  describe('variable filtering and sorting', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });

    });

    it('should sort variables by name ascending by default', () => {
      component.applyVariableFilter();
      expect(component.filteredVariables[0].name).toBe('amount');
      expect(component.filteredVariables[1].name).toBe('approved');
      expect(component.filteredVariables[2].name).toBe('customer');
    });

    it('should toggle sort order', () => {
      component.sortVariables('name');
      expect(component.variableSortOrder).toBe('desc');
      expect(component.filteredVariables[0].name).toBe('customer');
    });

    it('should sort by type', () => {
      component.sortVariables('type');
      expect(component.variableSortBy).toBe('type');
      expect(component.variableSortOrder).toBe('asc');
    });

    it('should apply search criteria', () => {
      component.onVariableSearchChange([
        {
          type: { key: 'variableName', label: 'Name', operators: [{ key: 'eq', label: '=' }] },
          operator: { key: 'eq', label: '=' },
          value: 'amount',
        },
      ]);
      expect(component.filteredVariables.length).toBe(1);
      expect(component.filteredVariables[0].name).toBe('amount');
    });

    it('should apply like operator for variable name', () => {
      component.onVariableSearchChange([
        {
          type: { key: 'variableName', label: 'Name', operators: [{ key: 'like', label: 'like' }] },
          operator: { key: 'like', label: 'like' },
          value: 'app',
        },
      ]);
      expect(component.filteredVariables.length).toBe(1);
      expect(component.filteredVariables[0].name).toBe('approved');
    });
  });

  // =============================================
  // parseVariableValue
  // =============================================

  describe('parseVariableValue (private, tested via saveNewVariable)', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });

    });

    it('should parse Integer', async () => {
      component.newVariable = { name: 'count', type: 'Integer', value: '42', isNew: true };
      component.saveNewVariable();

      expect(cockpitService.setProcessInstanceVariable).toHaveBeenCalledWith('pi-1', 'count', 42, 'Integer');
    });

    it('should parse Double', async () => {
      component.newVariable = { name: 'price', type: 'Double', value: '19.99', isNew: true };
      component.saveNewVariable();

      expect(cockpitService.setProcessInstanceVariable).toHaveBeenCalledWith('pi-1', 'price', 19.99, 'Double');
    });

    it('should parse Boolean', async () => {
      component.newVariable = { name: 'flag', type: 'Boolean', value: 'true', isNew: true };
      component.saveNewVariable();

      expect(cockpitService.setProcessInstanceVariable).toHaveBeenCalledWith('pi-1', 'flag', true, 'Boolean');
    });

    it('should parse Json', async () => {
      component.newVariable = { name: 'data', type: 'Json', value: '{"key":"val"}', isNew: true };
      component.saveNewVariable();

      expect(cockpitService.setProcessInstanceVariable).toHaveBeenCalledWith(
        'pi-1', 'data', { key: 'val' }, 'Json'
      );
    });
  });

  // =============================================
  // Activity Selection (like AngularJS)
  // =============================================

  describe('activity selection', () => {
    it('should select an activity', () => {
      component.selectActivity('UserTask_1');
      expect(component.selectedActivityId).toBe('UserTask_1');
      expect(component.selectedActivityIds).toEqual(['UserTask_1']);
    });

    it('should toggle activity selection (single click)', () => {
      component.handleActivityInstanceSelection('ai-1', 'UserTask_1', null);
      expect(component.selectedActivityId).toBe('UserTask_1');

      component.handleActivityInstanceSelection('ai-1', 'UserTask_1', null);
      expect(component.selectedActivityId).toBeNull();
      expect(component.selectedActivityIds).toEqual([]);
    });

    it('should support multi-select with ctrl key', () => {
      const ctrlEvent = { ctrlKey: true } as MouseEvent;
      component.handleActivityInstanceSelection('ai-1', 'UserTask_1', ctrlEvent);
      component.handleActivityInstanceSelection('ai-2', 'ServiceTask_1', ctrlEvent);

      expect(component.selectedActivityIds).toContain('UserTask_1');
      expect(component.selectedActivityIds).toContain('ServiceTask_1');
    });

    it('should deselect in multi-select with ctrl key', () => {
      const ctrlEvent = { ctrlKey: true } as MouseEvent;
      component.handleActivityInstanceSelection('ai-1', 'UserTask_1', ctrlEvent);
      component.handleActivityInstanceSelection('ai-2', 'ServiceTask_1', ctrlEvent);
      component.handleActivityInstanceSelection('ai-1', 'UserTask_1', ctrlEvent);

      expect(component.selectedActivityIds).not.toContain('UserTask_1');
      expect(component.selectedActivityIds).toContain('ServiceTask_1');
    });

    it('should clear selection', () => {
      component.selectActivity('UserTask_1');
      component.clearActivitySelection();
      expect(component.selectedActivityId).toBeNull();
      expect(component.selectedActivityIds).toEqual([]);
    });
  });

  // =============================================
  // Process Actions (suspend, resume, cancel)
  // =============================================

  describe('suspendInstance', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });

    });

    it('should call suspendProcessInstance', async () => {
      component.suspendInstance();


      expect(cockpitService.suspendProcessInstance).toHaveBeenCalledWith('pi-1');
    });

    it('should not suspend when no process instance', () => {
      component.processInstance = null;
      component.suspendInstance();
      expect(cockpitService.suspendProcessInstance).not.toHaveBeenCalled();
    });

    it('should not suspend when action in progress', () => {
      component.actionInProgress = true;
      component.suspendInstance();
      expect(cockpitService.suspendProcessInstance).not.toHaveBeenCalled();
    });
  });

  describe('resumeInstance', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });

    });

    it('should call resumeProcessInstance', async () => {
      component.resumeInstance();


      expect(cockpitService.resumeProcessInstance).toHaveBeenCalledWith('pi-1');
    });
  });

  describe('cancelInstance', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });

    });

    it('should call cancelProcessInstance and navigate', async () => {
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      component.cancelInstance();


      expect(cockpitService.cancelProcessInstance).toHaveBeenCalledWith('pi-1', undefined);
      expect(navigateSpy).toHaveBeenCalledWith(['/cockpit/processes']);
    });

    it('should pass cancel reason if provided', async () => {
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      component.cancelReason = 'No longer needed';
      component.cancelInstance();


      expect(cockpitService.cancelProcessInstance).toHaveBeenCalledWith('pi-1', 'No longer needed');
    });
  });

  // =============================================
  // Job Actions
  // =============================================

  describe('job actions', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });

    });

    it('should retry a job', async () => {
      component.retryJob('job-1');

      expect(cockpitService.retryJob).toHaveBeenCalledWith('job-1');
    });

    it('should retry all jobs', async () => {
      component.retryAllJobs();

      expect(cockpitService.setJobRetriesByProcessInstance).toHaveBeenCalledWith('pi-1', 1);
    });

    it('should retry incident via job configuration', async () => {
      component.retryIncident(mockIncidents[0]);

      expect(cockpitService.retryJob).toHaveBeenCalledWith('job-1');
    });
  });

  // =============================================
  // Computed Properties
  // =============================================

  describe('computed properties', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ id: 'pi-1' });

    });

    it('should extract running activity ids from tree', () => {
      const ids = component.runningActivityIds;
      expect(ids).toContain('UserTask_1');
    });

    it('isProcessRunning should return true for ACTIVE', () => {
      expect(component.isProcessRunning()).toBe(true);
    });

    it('isProcessRunning should return true for SUSPENDED', () => {
      component.processInstance = { ...mockInstance, state: 'SUSPENDED' };
      expect(component.isProcessRunning()).toBe(true);
    });

    it('isProcessRunning should return false for COMPLETED', () => {
      component.processInstance = { ...mockInstance, state: 'COMPLETED' };
      expect(component.isProcessRunning()).toBe(false);
    });

    it('hasFailedJobs should return true when jobs have 0 retries', () => {
      expect(component.hasFailedJobs()).toBe(true);
    });

    it('getFailedJobsCount should count jobs with 0 retries', () => {
      expect(component.getFailedJobsCount()).toBe(1);
    });
  });

  // =============================================
  // State Helpers
  // =============================================

  describe('getStateIcon', () => {
    it('should return correct icon for each state', () => {
      expect(component.getStateIcon('ACTIVE')).toBe(component.faCheckCircle);
      expect(component.getStateIcon('SUSPENDED')).toBe(component.faPauseCircle);
      expect(component.getStateIcon('COMPLETED')).toBe(component.faCheckCircle);
      expect(component.getStateIcon('EXTERNALLY_TERMINATED')).toBe(component.faTimesCircle);
      expect(component.getStateIcon('INTERNALLY_TERMINATED')).toBe(component.faTimesCircle);
    });
  });

  describe('getStateClass', () => {
    it('should return correct class for each state', () => {
      expect(component.getStateClass('ACTIVE')).toBe('state-active');
      expect(component.getStateClass('SUSPENDED')).toBe('state-suspended');
      expect(component.getStateClass('COMPLETED')).toBe('state-completed');
      expect(component.getStateClass('EXTERNALLY_TERMINATED')).toBe('state-terminated');
    });
  });

  // =============================================
  // Utility Methods
  // =============================================

  describe('formatDate', () => {
    it('should format valid date', () => {
      const result = component.formatDate('2026-01-15T10:30:00.000+0000');
      expect(result).not.toBe('-');
    });

    it('should return dash for undefined', () => {
      expect(component.formatDate(undefined)).toBe('-');
    });
  });

  describe('formatValue', () => {
    it('should format null', () => {
      expect(component.formatValue(null)).toBe('null');
    });

    it('should stringify objects', () => {
      expect(component.formatValue({ key: 'val' })).toBe('{"key":"val"}');
    });

    it('should stringify primitives', () => {
      expect(component.formatValue(42)).toBe('42');
      expect(component.formatValue('hello')).toBe('hello');
    });
  });

  // =============================================
  // Diagram Controls
  // =============================================

  describe('diagram controls', () => {
    it('should toggle collapse', () => {
      expect(component.diagramCollapsed).toBe(false);
      component.toggleDiagramCollapse();
      expect(component.diagramCollapsed).toBe(true);
    });

    it('should reset maximize when collapsing', () => {
      component.diagramMaximized = true;
      component.toggleDiagramCollapse();
      expect(component.diagramMaximized).toBe(false);
    });

    it('should toggle maximize', () => {
      expect(component.diagramMaximized).toBe(false);
      component.toggleDiagramMaximize();
      expect(component.diagramMaximized).toBe(true);
    });
  });

  // =============================================
  // Task Assignee Editing
  // =============================================

  describe('task assignee editing', () => {
    it('should start editing task assignee', () => {
      component.startEditTaskAssignee(mockUserTasks[0]);
      expect(component.editingTaskAssignee).toBe('task-1');
      expect(component.editingTaskAssigneeValue).toBe('john');
    });

    it('should cancel editing task assignee', () => {
      component.startEditTaskAssignee(mockUserTasks[0]);
      component.cancelEditTaskAssignee();
      expect(component.editingTaskAssignee).toBeNull();
      expect(component.editingTaskAssigneeValue).toBe('');
    });

    it('should return tasklist URL', () => {
      const url = component.getTasklistUrl(mockUserTasks[0]);
      expect(url).toBe('/orqueio/app/tasklist?task=task-1');
    });
  });
});
