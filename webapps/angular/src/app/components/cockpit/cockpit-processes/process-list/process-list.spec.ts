import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ProcessListComponent } from './process-list';
import { CockpitService, ProcessInstance, ProcessDefinition } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('ProcessListComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: ProcessListComponent;
  let fixture: ComponentFixture<ProcessListComponent>;
  let cockpitService: any;
  let navMenuService: any;
  let routeParams$: Subject<any>;

  const mockDefinition: ProcessDefinition = {
    id: 'pd-1', key: 'invoice', name: 'Invoice Process', version: 1, deploymentId: 'd1', suspended: false,
  };

  const mockInstances: ProcessInstance[] = [
    {
      id: 'pi-1', processDefinitionId: 'pd-1', processDefinitionKey: 'invoice',
      startTime: '2026-01-01T10:00:00.000+0000', state: 'ACTIVE',
    },
    {
      id: 'pi-2', processDefinitionId: 'pd-1', processDefinitionKey: 'invoice',
      startTime: '2026-01-02T10:00:00.000+0000', state: 'COMPLETED',
      endTime: '2026-01-03T10:00:00.000+0000',
    },
    {
      id: 'pi-3', processDefinitionId: 'pd-1', processDefinitionKey: 'invoice',
      startTime: '2026-01-03T10:00:00.000+0000', state: 'SUSPENDED',
    },
  ];

  beforeEach(async () => {
    routeParams$ = new Subject();

    cockpitService = {
      getProcessDefinitionByKey: vi.fn().mockReturnValue(of(mockDefinition)),
      getProcessDefinitionVersions: vi.fn().mockReturnValue(of([mockDefinition])),
      queryProcessInstances: vi.fn().mockReturnValue(of(mockInstances)),
      queryProcessInstancesCount: vi.fn().mockReturnValue(of(3)),
      getIncidentsByProcessDefinitionKey: vi.fn().mockReturnValue(of([])),
      getIncidentsByProcessDefinitionId: vi.fn().mockReturnValue(of([])),
      getBpmn20Xml: vi.fn().mockReturnValue(of({ bpmn20Xml: '<bpmn></bpmn>' })),
      getActivityStatistics: vi.fn().mockReturnValue(of([])),
      getJobDefinitionsByProcessDefinitionKey: vi.fn().mockReturnValue(of({ jobDefinitions: [], count: 0 })),
      getJobDefinitionsByProcessDefinitionId: vi.fn().mockReturnValue(of({ jobDefinitions: [], count: 0 })),
      getCalledProcessDefinitions: vi.fn().mockReturnValue(of([])),
      updateJobDefinitionSuspensionState: vi.fn().mockReturnValue(of(undefined)),
    } as any;

    navMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    } as any;

    localStorage.removeItem('processListPreferences');

    await TestBed.configureTestingModule({
      imports: [ProcessListComponent],
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

    fixture = TestBed.createComponent(ProcessListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.removeItem('processListPreferences');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should load data when route params change', async () => {
      fixture.detectChanges();
      routeParams$.next({ key: 'invoice' });

      expect(component.processDefinitionKey).toBe('invoice');
      expect(cockpitService.getProcessDefinitionByKey).toHaveBeenCalledWith('invoice');
      expect(cockpitService.queryProcessInstances).toHaveBeenCalled();
    });

    it('should set menu items', () => {
      fixture.detectChanges();
      expect(navMenuService.setMenuItems).toHaveBeenCalled();
    });
  });

  // =============================================
  // Pagination
  // =============================================

  describe('pagination', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ key: 'invoice' });
    });

    it('should compute totalPages', () => {
      component.totalCount = 42;
      component.pageSize = 10;
      expect(component.totalPages).toBe(5);
    });

    it('should compute startIndex', () => {
      component.currentPage = 3;
      component.pageSize = 10;
      expect(component.startIndex).toBe(21);
    });

    it('should compute endIndex', () => {
      component.currentPage = 3;
      component.pageSize = 10;
      component.totalCount = 42;
      expect(component.endIndex).toBe(30);
    });

    it('should cap endIndex at totalCount', () => {
      component.currentPage = 5;
      component.pageSize = 10;
      component.totalCount = 42;
      expect(component.endIndex).toBe(42);
    });

    it('should generate page numbers', () => {
      component.totalCount = 100;
      component.pageSize = 10;
      component.currentPage = 5;
      const pages = component.pageNumbers;
      expect(pages).toEqual([3, 4, 5, 6, 7]);
    });

    it('should reload instances on page change', () => {
      component.onPageChange(3);
      expect(component.currentPage).toBe(3);
      expect(cockpitService.queryProcessInstances).toHaveBeenCalled();
    });

    it('should reset to page 1 on page size change', () => {
      component.currentPage = 5;
      component.onPageSizeChange();
      expect(component.currentPage).toBe(1);
    });
  });

  // =============================================
  // Sorting
  // =============================================

  describe('sorting', () => {
    it('should default sort by startTime desc', () => {
      expect(component.sortConfig).toEqual({ column: 'startTime', direction: 'desc' });
    });

    it('should toggle direction on same column', () => {
      fixture.detectChanges();
      routeParams$.next({ key: 'invoice' });

      component.onSort('startTime');
      expect(component.sortConfig.direction).toBe('asc');

      component.onSort('startTime');
      expect(component.sortConfig.direction).toBe('desc');
    });

    it('should switch column with desc direction', () => {
      fixture.detectChanges();
      routeParams$.next({ key: 'invoice' });

      component.onSort('endTime');
      expect(component.sortConfig).toEqual({ column: 'endTime', direction: 'desc' });
    });

    it('should ignore non-sortable columns', () => {
      const original = { ...component.sortConfig };
      component.onSort('id');
      expect(component.sortConfig).toEqual(original);
    });

    it('should persist preferences', () => {
      fixture.detectChanges();
      routeParams$.next({ key: 'invoice' });

      component.onSort('businessKey');
      const saved = JSON.parse(localStorage.getItem('processListPreferences')!);
      expect(saved.sortConfig.column).toBe('businessKey');
    });

    it('should load preferences from localStorage', () => {
      localStorage.setItem('processListPreferences', JSON.stringify({
        pageSize: 50,
        sortConfig: { column: 'endTime', direction: 'asc' },
      }));

      const fixture2 = TestBed.createComponent(ProcessListComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.pageSize).toBe(50);
      expect(component2.sortConfig).toEqual({ column: 'endTime', direction: 'asc' });
    });

    it('should reject invalid sort columns from localStorage', () => {
      localStorage.setItem('processListPreferences', JSON.stringify({
        sortConfig: { column: 'invalidColumn', direction: 'asc' },
      }));

      const fixture2 = TestBed.createComponent(ProcessListComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.sortConfig.column).toBe('startTime');
    });

    it('should return correct sort icon', () => {
      expect(component.getSortIcon('startTime')).toBe(component.faSortDown);
      expect(component.getSortIcon('endTime')).toBe(component.faSort);
    });
  });

  // =============================================
  // Filters
  // =============================================

  describe('filters', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ key: 'invoice' });
    });

    it('should reset filters', () => {
      component.filters.businessKey = 'BK-123';
      component.filters.state = 'active';
      component.resetFilters();

      expect(component.filters.businessKey).toBe('');
      expect(component.filters.state).toBe('all');
      expect(component.currentPage).toBe(1);
    });

    it('should reset to page 1 when applying filters', () => {
      component.currentPage = 5;
      component.applyFilters();
      expect(component.currentPage).toBe(1);
    });

    it('should count active filters', () => {
      component.filters.businessKey = 'test';
      component.filters.state = 'active';
      component.filters.withIncidents = true;
      component.updateActiveFiltersCount();
      expect(component.activeFiltersCount).toBe(3);
    });

    it('should count variable filters', () => {
      component.filters.variables = [
        { name: 'amount', value: '100', operator: 'eq' },
        { name: '', value: '', operator: 'eq' },
      ];
      component.updateActiveFiltersCount();
      expect(component.activeFiltersCount).toBe(1);
    });
  });

  // =============================================
  // buildQueryBody
  // =============================================

  describe('buildQueryBody', () => {
    it('should include processDefinitionKey when version is all', () => {
      component.processDefinitionKey = 'invoice';
      component.selectedVersion = 'all';
      const body = component.buildQueryBody();
      expect(body.processDefinitionKey).toBe('invoice');
      expect(body.processDefinitionId).toBeUndefined();
    });

    it('should include processDefinitionId when specific version selected', () => {
      component.processDefinitionKey = 'invoice';
      component.selectedVersion = 'pd-1:2';
      const body = component.buildQueryBody();
      expect(body.processDefinitionId).toBe('pd-1:2');
      expect(body.processDefinitionKey).toBeUndefined();
    });

    it('should include business key like filter with wildcards', () => {
      component.filters.businessKey = 'INV';
      component.filters.businessKeyOperator = 'like';
      const body = component.buildQueryBody();
      expect(body.processInstanceBusinessKeyLike).toBe('%INV%');
    });

    it('should escape SQL wildcard chars in business key like', () => {
      component.filters.businessKey = 'test%value';
      component.filters.businessKeyOperator = 'like';
      const body = component.buildQueryBody();
      expect(body.processInstanceBusinessKeyLike).toBe('%test\\%value%');
    });

    it('should include exact business key filter', () => {
      component.filters.businessKey = 'INV-001';
      component.filters.businessKeyOperator = 'eq';
      const body = component.buildQueryBody();
      expect(body.processInstanceBusinessKey).toBe('INV-001');
    });

    it('should include state filter for active', () => {
      component.filters.state = 'active';
      const body = component.buildQueryBody();
      expect(body.active).toBe(true);
      expect(body.unfinished).toBe(true);
    });

    it('should include state filter for suspended', () => {
      component.filters.state = 'suspended';
      const body = component.buildQueryBody();
      expect(body.suspended).toBe(true);
      expect(body.unfinished).toBe(true);
    });

    it('should include state filter for completed', () => {
      component.filters.state = 'completed';
      const body = component.buildQueryBody();
      expect(body.completed).toBe(true);
      expect(body.finished).toBe(true);
    });

    it('should include state filter for terminated', () => {
      component.filters.state = 'terminated';
      const body = component.buildQueryBody();
      expect(body.externallyTerminated).toBe(true);
      expect(body.finished).toBe(true);
    });

    it('should include incidents filter', () => {
      component.filters.withIncidents = true;
      const body = component.buildQueryBody();
      expect(body.withIncidents).toBe(true);
    });

    it('should include variable filters', () => {
      component.filters.variables = [
        { name: 'amount', value: '100', operator: 'gt' },
      ];
      const body = component.buildQueryBody();
      expect(body.variables).toBeDefined();
      expect(body.variables.length).toBe(1);
      expect(body.variables[0].name).toBe('amount');
      expect(body.variables[0].value).toBe(100);
      expect(body.variables[0].operator).toBe('gt');
    });

    it('should skip empty variable filters', () => {
      component.filters.variables = [
        { name: '', value: '', operator: 'eq' },
        { name: 'amount', value: '100', operator: 'eq' },
      ];
      const body = component.buildQueryBody();
      expect(body.variables.length).toBe(1);
    });

    it('should include sorting', () => {
      component.sortConfig = { column: 'startTime', direction: 'desc' };
      const body = component.buildQueryBody();
      expect(body.sorting).toEqual([{ sortBy: 'startTime', sortOrder: 'desc' }]);
    });

    it('should include activity ID filter', () => {
      component.filters.activityIds = 'UserTask_1, ServiceTask_1';
      const body = component.buildQueryBody();
      expect(body.activeActivityIdIn).toEqual(['UserTask_1', 'ServiceTask_1']);
    });

    it('should set filterErrors for invalid dates', () => {
      component.filters.startedAfter = 'not-a-date';
      component.buildQueryBody();
      expect(component.filterErrors.length).toBeGreaterThan(0);
    });
  });

  // =============================================
  // parseVariableValue (via buildQueryBody)
  // =============================================

  describe('variable value parsing', () => {
    it('should auto-detect boolean true', () => {
      component.filters.variables = [{ name: 'flag', value: 'true', operator: 'eq' }];
      const body = component.buildQueryBody();
      expect(body.variables[0].value).toBe(true);
    });

    it('should auto-detect boolean false', () => {
      component.filters.variables = [{ name: 'flag', value: 'false', operator: 'eq' }];
      const body = component.buildQueryBody();
      expect(body.variables[0].value).toBe(false);
    });

    it('should auto-detect NULL', () => {
      component.filters.variables = [{ name: 'x', value: 'NULL', operator: 'eq' }];
      const body = component.buildQueryBody();
      expect(body.variables[0].value).toBeNull();
    });

    it('should auto-detect numbers', () => {
      component.filters.variables = [{ name: 'amount', value: '42.5', operator: 'gt' }];
      const body = component.buildQueryBody();
      expect(body.variables[0].value).toBe(42.5);
    });

    it('should auto-wrap like value with %', () => {
      component.filters.variables = [{ name: 'name', value: 'test', operator: 'like' }];
      const body = component.buildQueryBody();
      expect(body.variables[0].value).toBe('%test%');
    });

    it('should not double-wrap like value that already has %', () => {
      component.filters.variables = [{ name: 'name', value: '%test%', operator: 'like' }];
      const body = component.buildQueryBody();
      expect(body.variables[0].value).toBe('%test%');
    });
  });

  // =============================================
  // Computed State (like AngularJS)
  // =============================================

  describe('getComputedState', () => {
    it('should return incidents when instance has incidents', () => {
      const instance: ProcessInstance = {
        ...mockInstances[0],
        incidents: [{ id: 'i1', processInstanceId: 'pi-1', activityId: 'a1', incidentType: 'failedJob', incidentMessage: 'err', createTime: '2026-01-01' }],
      };
      expect(component.getComputedState(instance)).toBe('incidents');
    });

    it('should return suspended for SUSPENDED state', () => {
      expect(component.getComputedState(mockInstances[2])).toBe('suspended');
    });

    it('should return running for ACTIVE with no endTime', () => {
      expect(component.getComputedState(mockInstances[0])).toBe('running');
    });

    it('should return completed when endTime exists', () => {
      expect(component.getComputedState(mockInstances[1])).toBe('completed');
    });

    it('should return terminated for EXTERNALLY_TERMINATED', () => {
      const instance: ProcessInstance = {
        ...mockInstances[0], state: 'EXTERNALLY_TERMINATED', endTime: '2026-01-04',
      };
      expect(component.getComputedState(instance)).toBe('terminated');
    });

    it('should return terminated for INTERNALLY_TERMINATED', () => {
      const instance: ProcessInstance = {
        ...mockInstances[0], state: 'INTERNALLY_TERMINATED', endTime: '2026-01-04',
      };
      expect(component.getComputedState(instance)).toBe('terminated');
    });
  });

  describe('getStateIcon', () => {
    it('should return correct icon for each state', () => {
      expect(component.getStateIcon(mockInstances[0])).toBe(component.faPlayCircle);
      expect(component.getStateIcon(mockInstances[1])).toBe(component.faCheckCircle);
      expect(component.getStateIcon(mockInstances[2])).toBe(component.faPauseCircle);
    });
  });

  describe('getStateClass', () => {
    it('should return correct class for each state', () => {
      expect(component.getStateClass(mockInstances[0])).toBe('state-active');
      expect(component.getStateClass(mockInstances[1])).toBe('state-completed');
      expect(component.getStateClass(mockInstances[2])).toBe('state-suspended');
    });
  });

  describe('getStateLabel', () => {
    it('should return correct label for each state', () => {
      expect(component.getStateLabel(mockInstances[0])).toBe('Running');
      expect(component.getStateLabel(mockInstances[1])).toBe('Completed');
      expect(component.getStateLabel(mockInstances[2])).toBe('Suspended');
    });
  });

  // =============================================
  // Variable Filters Management
  // =============================================

  describe('variable filter management', () => {
    it('should add a new variable filter', () => {
      const initial = component.filters.variables.length;
      component.addVariableFilter();
      expect(component.filters.variables.length).toBe(initial + 1);
    });

    it('should remove a variable filter', () => {
      component.filters.variables = [
        { name: 'a', value: '1', operator: 'eq' },
        { name: 'b', value: '2', operator: 'eq' },
      ];
      component.removeVariableFilter(0);
      expect(component.filters.variables.length).toBe(1);
      expect(component.filters.variables[0].name).toBe('b');
    });

    it('should keep at least one variable filter row', () => {
      component.filters.variables = [{ name: 'a', value: '1', operator: 'eq' }];
      component.removeVariableFilter(0);
      expect(component.filters.variables.length).toBe(1);
      expect(component.filters.variables[0].name).toBe('');
    });
  });

  // =============================================
  // Tabs
  // =============================================

  describe('tabs', () => {
    it('should default to instances tab', () => {
      expect(component.activeTab).toBe('instances');
    });

    it('should switch tabs', () => {
      fixture.detectChanges();
      routeParams$.next({ key: 'invoice' });

      component.switchTab('incidents');
      expect(component.activeTab).toBe('incidents');
    });

    it('should load incidents when switching to incidents tab', async () => {
      fixture.detectChanges();
      routeParams$.next({ key: 'invoice' });

      // After init, selectedVersion is set to the definition id, so it uses ById
      cockpitService.getIncidentsByProcessDefinitionId!.mockClear();
      // Ensure component thinks incidents aren't loaded yet
      component.incidents = [];
      component.incidentsLoading = false;

      component.switchTab('incidents');

      expect(cockpitService.getIncidentsByProcessDefinitionId).toHaveBeenCalled();
    });
  });

  // =============================================
  // Version Change
  // =============================================

  describe('onVersionChange', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      routeParams$.next({ key: 'invoice' });
    });

    it('should reset to page 1', () => {
      component.currentPage = 3;
      component.onVersionChange();
      expect(component.currentPage).toBe(1);
    });

    it('should clear tab data', () => {
      component.incidents = [{ id: 'i1' } as any];
      component.jobDefinitions = [{ id: 'jd1' } as any];
      component.onVersionChange();
      expect(component.incidents).toEqual([]);
      expect(component.jobDefinitions).toEqual([]);
    });
  });

  // =============================================
  // Utility Methods
  // =============================================

  describe('formatDate', () => {
    it('should format a date string', () => {
      const result = component.formatDate('2026-01-15T10:30:00.000+0000');
      expect(result).toBeTruthy();
      expect(result).not.toBe('-');
    });

    it('should return dash for empty string', () => {
      expect(component.formatDate('')).toBe('-');
    });
  });

  describe('getVersionLabel', () => {
    it('should return version label', () => {
      expect(component.getVersionLabel(mockDefinition)).toBe('v1');
    });

    it('should include tenant id if present', () => {
      const def = { ...mockDefinition, tenantId: 'tenant1' };
      expect(component.getVersionLabel(def)).toBe('v1 (tenant1)');
    });
  });

  describe('called definitions helpers', () => {
    it('getCalledDefStateLabel should map state to label', () => {
      expect(component.getCalledDefStateLabel('running')).toBe('Running');
      expect(component.getCalledDefStateLabel('referenced')).toBe('Referenced');
      expect(component.getCalledDefStateLabel('running-and-referenced')).toBe('Running and Referenced');
      expect(component.getCalledDefStateLabel(undefined)).toBe('-');
    });

    it('getCalledDefStateClass should map state to CSS class', () => {
      expect(component.getCalledDefStateClass('running')).toBe('state-active');
      expect(component.getCalledDefStateClass('referenced')).toBe('state-info');
      expect(component.getCalledDefStateClass('running-and-referenced')).toBe('state-warning');
      expect(component.getCalledDefStateClass(undefined)).toBe('');
    });
  });
});
