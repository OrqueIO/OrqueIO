import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProcessDefinitionsComponent } from './process-definitions';
import {
  CockpitService,
  ProcessDefinitionStatistics,
  ProcessInstance,
  MultiValueFilter
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

// ============================================================
// Helper: call CockpitService.buildGlobalSearchPayload without
// Angular DI — it's a pure function with no injected calls.
// ============================================================
const realSvc = Object.create(CockpitService.prototype) as CockpitService;

// ============================================================
// buildGlobalSearchPayload — service-level unit tests
// ============================================================
describe('CockpitService.buildGlobalSearchPayload', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('should use processInstanceBusinessKeyLike with wildcard wrapping for a single business key', () => {
    const filters: MultiValueFilter[] = [{ field: 'businessKey', values: ['BK-001'] }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.processInstanceBusinessKeyLike).toBe('%BK-001%');
    expect(payload.processInstanceBusinessKey).toBeUndefined();
    expect(payload.processInstanceBusinessKeyIn).toBeUndefined();
  });

  it('should set processInstanceBusinessKeyIn for multiple business keys', () => {
    const filters: MultiValueFilter[] = [{ field: 'businessKey', values: ['BK-001', 'BK-002'] }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.processInstanceBusinessKeyIn).toEqual(['BK-001', 'BK-002']);
    expect(payload.processInstanceBusinessKey).toBeUndefined();
  });

  it('should create one orQueries entry per value for a variable filter (OR between values)', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['1', '23'],
      variableName: 'orderId', variableOperator: 'eq'
    }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.orQueries).toBeDefined();
    expect(payload.orQueries.length).toBe(2);
    expect(payload.orQueries[0].variables[0]).toEqual({ name: 'orderId', operator: 'eq', value: '1' });
    expect(payload.orQueries[1].variables[0]).toEqual({ name: 'orderId', operator: 'eq', value: '23' });
  });

  it('should create 3 separate orQueries entries for a 3-value variable filter', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['100', '200', '300'],
      variableName: 'amount', variableOperator: 'eq'
    }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.orQueries.length).toBe(3);
    expect(payload.orQueries[0].variables[0]).toEqual({ name: 'amount', operator: 'eq', value: '100' });
    expect(payload.orQueries[1].variables[0]).toEqual({ name: 'amount', operator: 'eq', value: '200' });
    expect(payload.orQueries[2].variables[0]).toEqual({ name: 'amount', operator: 'eq', value: '300' });
  });

  it('should create N+M orQueries entries for two variable pills with N and M values', () => {
    const filters: MultiValueFilter[] = [
      { field: 'variable', values: ['1', '23'], variableName: 'orderId', variableOperator: 'eq' },
      { field: 'variable', values: ['active'], variableName: 'status', variableOperator: 'eq' }
    ];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.orQueries.length).toBe(3);
    expect(payload.orQueries[0].variables[0]).toEqual({ name: 'orderId', operator: 'eq', value: '1' });
    expect(payload.orQueries[1].variables[0]).toEqual({ name: 'orderId', operator: 'eq', value: '23' });
    expect(payload.orQueries[2].variables[0]).toEqual({ name: 'status', operator: 'eq', value: 'active' });
  });

  it('should set active=true and unfinished=true for state=active', () => {
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active'] }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.active).toBe(true);
    expect(payload.unfinished).toBe(true);
  });

  it('should set completed=true and finished=true for state=completed', () => {
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['completed'] }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.completed).toBe(true);
    expect(payload.finished).toBe(true);
  });

  it('should set externallyTerminated=true and finished=true for state=terminated', () => {
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['terminated'] }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.externallyTerminated).toBe(true);
    expect(payload.finished).toBe(true);
  });

  it('should set withIncidents=true for withIncidents filter', () => {
    const filters: MultiValueFilter[] = [{ field: 'withIncidents', values: [] }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.withIncidents).toBe(true);
  });

  it('should set processInstanceIds array for instanceId filter', () => {
    const filters: MultiValueFilter[] = [{ field: 'instanceId', values: ['inst-1', 'inst-2'] }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.processInstanceIds).toEqual(['inst-1', 'inst-2']);
  });

  it('should set startedAfter from filter', () => {
    const filters: MultiValueFilter[] = [{ field: 'startedAfter', values: ['2024-01-01T00:00:00.000+0000'] }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.startedAfter).toBe('2024-01-01T00:00:00.000+0000');
  });

  it('should set variableNamesIgnoreCase and variableValuesIgnoreCase when true', () => {
    const payload = realSvc.buildGlobalSearchPayload([], true, true);
    expect(payload.variableNamesIgnoreCase).toBe(true);
    expect(payload.variableValuesIgnoreCase).toBe(true);
  });

  it('should not include variableIgnoreCase flags when both are false', () => {
    const payload = realSvc.buildGlobalSearchPayload([], false, false);
    expect(payload.variableNamesIgnoreCase).toBeUndefined();
    expect(payload.variableValuesIgnoreCase).toBeUndefined();
  });

  it('should combine multiple filter types in one payload', () => {
    const filters: MultiValueFilter[] = [
      { field: 'businessKey', values: ['BK-001', 'BK-002'] },
      { field: 'state', values: ['active'] },
      { field: 'withIncidents', values: [] },
      { field: 'variable', values: ['42'], variableName: 'amount', variableOperator: 'gt' }
    ];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    // multi-value businessKey stays as exact IN (no wildcard wrapping for arrays)
    expect(payload.processInstanceBusinessKeyIn).toEqual(['BK-001', 'BK-002']);
    expect(payload.processInstanceBusinessKeyLike).toBeUndefined();
    expect(payload.active).toBe(true);
    expect(payload.withIncidents).toBe(true);
    // single variable value → 1 orQueries entry
    expect(payload.orQueries.length).toBe(1);
    expect(payload.orQueries[0].variables[0]).toEqual({ name: 'amount', operator: 'gt', value: '42' });
  });

  it('should pass the like operator through to the variable query payload', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['%partial%'],
      variableName: 'name', variableOperator: 'like'
    }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.orQueries.length).toBe(1);
    expect(payload.orQueries[0].variables[0].operator).toBe('like');
    expect(payload.orQueries[0].variables[0].value).toBe('%partial%');
  });

  it('should not add orQueries when no variable filter is present', () => {
    const filters: MultiValueFilter[] = [{ field: 'withIncidents', values: [] }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.orQueries).toBeUndefined();
  });

  it('should default variable operator to eq when not provided', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['hello'],
      variableName: 'myVar'
    }];
    const payload = realSvc.buildGlobalSearchPayload(filters);
    expect(payload.orQueries[0].variables[0].operator).toBe('eq');
  });
});

// ============================================================
// ProcessDefinitionsComponent tests
// ============================================================
describe('ProcessDefinitionsComponent', () => {
  let component: ProcessDefinitionsComponent;
  let fixture: ComponentFixture<ProcessDefinitionsComponent>;
  let cockpitService: any;
  let navMenuService: any;

  const mockStats: ProcessDefinitionStatistics[] = [
    {
      id: 'pd-1', key: 'invoice', name: 'Invoice', version: 1, suspended: false,
      instances: 5, failedJobs: 1,
      incidents: [{ incidentType: 'failedJob', incidentCount: 1 }],
      definition: { id: 'pd-1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd1', suspended: false },
    },
    {
      id: 'pd-2', key: 'order', name: 'Order', version: 1, suspended: false,
      instances: 3, failedJobs: 0, incidents: [],
      definition: { id: 'pd-2', key: 'order', name: 'Order', version: 1, deploymentId: 'd2', suspended: false },
    },
    {
      id: 'pd-3', key: 'approval', name: 'Approval', version: 1, suspended: false,
      instances: 0, failedJobs: 0, incidents: [],
      definition: { id: 'pd-3', key: 'approval', name: 'Approval', version: 1, deploymentId: 'd3', suspended: false },
    },
  ];

  const mockInstances: ProcessInstance[] = [
    {
      id: 'inst-1', processDefinitionId: 'invoice:1:abc', processDefinitionKey: 'invoice',
      processDefinitionName: 'Invoice', businessKey: 'BK-001',
      startTime: '2024-01-01T10:00:00.000Z', state: 'ACTIVE'
    },
    {
      id: 'inst-2', processDefinitionId: 'order:2:def', processDefinitionKey: 'order',
      processDefinitionName: 'Order', businessKey: 'BK-002',
      startTime: '2024-01-02T10:00:00.000Z', endTime: '2024-01-03T10:00:00.000Z', state: 'COMPLETED'
    },
  ];

  beforeEach(async () => {
    cockpitService = {
      getProcessDefinitionsWithStatistics: vi.fn().mockReturnValue(of(mockStats)),
      getProcessDefinitionsCount: vi.fn().mockReturnValue(of(3)),
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of(mockInstances)),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(2)),
      queryProcessInstances: vi.fn().mockReturnValue(of(mockInstances)),
    } as any;

    navMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    } as any;

    localStorage.removeItem('cockpit.processes.sortConfig');

    await TestBed.configureTestingModule({
      imports: [ProcessDefinitionsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: navMenuService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessDefinitionsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.removeItem('cockpit.processes.sortConfig');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ===========================
  // ngOnInit / ngOnDestroy
  // ===========================

  describe('ngOnInit', () => {
    it('should set menu items on init', () => {
      fixture.detectChanges();
      expect(navMenuService.setMenuItems).toHaveBeenCalled();
    });

    it('should load process definitions on init', () => {
      fixture.detectChanges();
      expect(cockpitService.getProcessDefinitionsWithStatistics).toHaveBeenCalled();
      expect(cockpitService.getProcessDefinitionsCount).toHaveBeenCalled();
      expect(component.processDefinitions.length).toBe(3);
      expect(component.totalCount).toBe(3);
      expect(component.loading).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('should clear menu items', () => {
      fixture.detectChanges();
      component.ngOnDestroy();
      expect(navMenuService.clearMenuItems).toHaveBeenCalled();
    });
  });

  // ===========================
  // Definitions filter / sort
  // ===========================

  describe('applyFilter', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should show all definitions when search is empty', () => {
      component.searchQuery = '';
      component.applyFilter();
      expect(component.filteredDefinitions.length).toBe(3);
    });

    it('should filter by name (case-insensitive)', () => {
      component.searchQuery = 'inv';
      component.applyFilter();
      expect(component.filteredDefinitions.length).toBe(1);
      expect(component.filteredDefinitions[0].definition.key).toBe('invoice');
    });

    it('should filter by key', () => {
      component.searchQuery = 'order';
      component.applyFilter();
      expect(component.filteredDefinitions.length).toBe(1);
    });

    it('should return empty list for non-matching search', () => {
      component.searchQuery = 'nonexistent';
      component.applyFilter();
      expect(component.filteredDefinitions.length).toBe(0);
    });
  });

  describe('sorting', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should sort by name ascending by default', () => {
      expect(component.sortConfig.sortBy).toBe('name');
      expect(component.sortConfig.sortOrder).toBe('asc');
      expect(component.filteredDefinitions[0].definition.name).toBe('Approval');
    });

    it('should toggle sort order when clicking the same column', () => {
      component.onSort('name');
      expect(component.sortConfig.sortOrder).toBe('desc');
      expect(component.filteredDefinitions[0].definition.name).toBe('Order');
    });

    it('should switch to new column with asc order', () => {
      component.onSort('instances');
      expect(component.sortConfig.sortBy).toBe('instances');
      expect(component.sortConfig.sortOrder).toBe('asc');
      expect(component.filteredDefinitions[0].instances).toBe(0);
    });

    it('should sort by incidents descending', () => {
      component.onSort('incidents');
      component.onSort('incidents');
      expect(component.filteredDefinitions[0].definition.key).toBe('invoice');
    });

    it('should persist sort config to localStorage', () => {
      component.onSort('key');
      const saved = JSON.parse(localStorage.getItem('cockpit.processes.sortConfig')!);
      expect(saved.sortBy).toBe('key');
      expect(saved.sortOrder).toBe('asc');
    });

    it('should restore sort config from localStorage on init', () => {
      localStorage.setItem('cockpit.processes.sortConfig', JSON.stringify({ sortBy: 'instances', sortOrder: 'desc' }));
      const f2 = TestBed.createComponent(ProcessDefinitionsComponent);
      const c2 = f2.componentInstance;
      f2.detectChanges();
      expect(c2.sortConfig.sortBy).toBe('instances');
      expect(c2.sortConfig.sortOrder).toBe('desc');
    });
  });

  describe('getSortIcon', () => {
    it('should return faSort for an inactive column', () => {
      expect(component.getSortIcon('instances')).toBe(component.faSort);
    });

    it('should return faSortUp for active column with asc order', () => {
      component.sortConfig = { sortBy: 'name', sortOrder: 'asc' };
      expect(component.getSortIcon('name')).toBe(component.faSortUp);
    });

    it('should return faSortDown for active column with desc order', () => {
      component.sortConfig = { sortBy: 'name', sortOrder: 'desc' };
      expect(component.getSortIcon('name')).toBe(component.faSortDown);
    });
  });

  describe('getDefinitionName', () => {
    it('should return name when available', () => {
      expect(component.getDefinitionName(mockStats[0])).toBe('Invoice');
    });

    it('should fall back to key when name is empty', () => {
      const def = { ...mockStats[0], definition: { ...mockStats[0].definition, name: '' } };
      expect(component.getDefinitionName(def)).toBe('invoice');
    });

    it('should fall back to id when both name and key are empty', () => {
      const def = { ...mockStats[0], definition: { ...mockStats[0].definition, name: '', key: '' } };
      expect(component.getDefinitionName(def)).toBe('pd-1');
    });
  });

  describe('getTotalIncidents', () => {
    it('should return total incident count', () => {
      expect(component.getTotalIncidents(mockStats[0])).toBe(1);
    });

    it('should return 0 when no incidents', () => {
      expect(component.getTotalIncidents(mockStats[1])).toBe(0);
    });

    it('should return 0 for undefined incidents', () => {
      const def = { ...mockStats[0], incidents: undefined as any };
      expect(component.getTotalIncidents(def)).toBe(0);
    });
  });

  describe('getStateClass / getStateIcon', () => {
    it('should return state-error and faExclamationTriangle when incidents exist', () => {
      expect(component.getStateClass(mockStats[0])).toBe('state-error');
      expect(component.getStateIcon(mockStats[0])).toBe(component.faExclamationTriangle);
    });

    it('should return state-running and faPlayCircle when instances > 0 and no incidents', () => {
      expect(component.getStateClass(mockStats[1])).toBe('state-running');
      expect(component.getStateIcon(mockStats[1])).toBe(component.faPlayCircle);
    });

    it('should return state-ok and faCheckCircle when no instances and no incidents', () => {
      expect(component.getStateClass(mockStats[2])).toBe('state-ok');
      expect(component.getStateIcon(mockStats[2])).toBe(component.faCheckCircle);
    });
  });

  describe('error handling', () => {
    it('should set loading to false on HTTP error', () => {
      cockpitService.getProcessDefinitionsWithStatistics.mockReturnValue(throwError(() => new Error('fail')));
      cockpitService.getProcessDefinitionsCount.mockReturnValue(throwError(() => new Error('fail')));
      component.loadProcessDefinitions();
      expect(component.loading).toBe(false);
    });
  });

  describe('breadcrumbs', () => {
    it('should contain a single processes breadcrumb', () => {
      expect(component.breadcrumbs.length).toBe(1);
      expect(component.breadcrumbs[0].translateKey).toBe('cockpit.menu.processes');
    });
  });

  // ===========================
  // Global Search — pill management
  // ===========================

  describe('pill management', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should start with no active pills', () => {
      expect(component.activePills.length).toBe(0);
    });

    it('should add withIncidents pill immediately without opening an editor', () => {
      component.selectCriteriaType('withIncidents');
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('withIncidents');
      expect(component.activeEditorType).toBeNull();
    });

    it('should not add a duplicate withIncidents pill', () => {
      component.selectCriteriaType('withIncidents');
      component.selectCriteriaType('withIncidents');
      expect(component.activePills.length).toBe(1);
    });

    it('should open editor for businessKey and reset pending state', () => {
      component.selectCriteriaType('businessKey');
      expect(component.activeEditorType).toBe('businessKey');
      expect(component.pendingValues.length).toBe(0);
    });

    it('should open editor for variable', () => {
      component.selectCriteriaType('variable');
      expect(component.activeEditorType).toBe('variable');
    });

    it('should add businessKey pill with multiple values', () => {
      component.selectCriteriaType('businessKey');
      component.pendingValues = ['BK-001', 'BK-002'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('businessKey');
      expect(component.activePills[0].values).toEqual(['BK-001', 'BK-002']);
      expect(component.activeEditorType).toBeNull();
    });

    it('should not add pill when pendingValues is empty and input is blank', () => {
      component.selectCriteriaType('businessKey');
      component.pendingValues = [];
      component.pendingInputText = '';
      component.confirmCriterion();
      expect(component.activePills.length).toBe(0);
    });

    it('should add variable pill with all fields', () => {
      component.selectCriteriaType('variable');
      component.pendingVariableName = 'orderId';
      component.pendingVariableOperator = 'eq';
      component.pendingValues = ['1', '23'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      const pill = component.activePills[0];
      expect(pill.field).toBe('variable');
      expect(pill.variableName).toBe('orderId');
      expect(pill.variableOperator).toBe('eq');
      expect(pill.values).toEqual(['1', '23']);
    });

    it('should not add variable pill when name is empty', () => {
      component.selectCriteriaType('variable');
      component.pendingVariableName = '';
      component.pendingValues = ['1'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(0);
    });

    it('should remove a pill by index', () => {
      component.activePills = [
        { field: 'businessKey', values: ['BK-001'] },
        { field: 'withIncidents', values: [] }
      ];
      component.removePill(0);
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('withIncidents');
    });

    it('should cancel the editor without adding a pill', () => {
      component.selectCriteriaType('businessKey');
      component.pendingValues = ['BK-001'];
      component.cancelCriterion();
      expect(component.activePills.length).toBe(0);
      expect(component.activeEditorType).toBeNull();
      expect(component.pendingValues.length).toBe(0);
    });

    it('should add state pill', () => {
      component.selectCriteriaType('state');
      component.pendingStateValue = 'completed';
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('state');
      expect(component.activePills[0].values).toEqual(['completed']);
    });

    // ── Bug 1 regression: second criterion must accumulate, not replace ──
    it('should accumulate multiple different criteria as independent pills', () => {
      // First criterion: businessKey
      component.selectCriteriaType('businessKey');
      component.pendingValues = ['BK-001'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);

      // Second criterion: state — must NOT overwrite first pill
      component.selectCriteriaType('state');
      component.pendingStateValue = 'active';
      component.confirmCriterion();
      expect(component.activePills.length).toBe(2);
      expect(component.activePills[0].field).toBe('businessKey');
      expect(component.activePills[1].field).toBe('state');
    });

    it('should accumulate withIncidents alongside other pills', () => {
      component.selectCriteriaType('businessKey');
      component.pendingValues = ['BK-001'];
      component.confirmCriterion();

      component.selectCriteriaType('withIncidents');

      expect(component.activePills.length).toBe(2);
      expect(component.activePills[0].field).toBe('businessKey');
      expect(component.activePills[1].field).toBe('withIncidents');
    });
  });

  // ===========================
  // Global Search — paste split
  // ===========================

  describe('paste split', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should split pasted comma-separated values into pendingValues', () => {
      component.selectCriteriaType('businessKey');
      const pasteEvent = {
        preventDefault: vi.fn(),
        clipboardData: { getData: vi.fn().mockReturnValue('val1, val2, val3') }
      } as any as ClipboardEvent;
      component.onPendingInputPaste(pasteEvent);
      expect(component.pendingValues).toEqual(['val1', 'val2', 'val3']);
      expect(component.pendingInputText).toBe('');
    });

    it('should deduplicate pasted values against existing pendingValues', () => {
      component.pendingValues = ['val1'];
      const pasteEvent = {
        preventDefault: vi.fn(),
        clipboardData: { getData: vi.fn().mockReturnValue('val1, val2') }
      } as any as ClipboardEvent;
      component.onPendingInputPaste(pasteEvent);
      expect(component.pendingValues).toEqual(['val1', 'val2']);
    });

    it('should filter out empty parts from pasted text', () => {
      const pasteEvent = {
        preventDefault: vi.fn(),
        clipboardData: { getData: vi.fn().mockReturnValue('val1,,val2,  ') }
      } as any as ClipboardEvent;
      component.onPendingInputPaste(pasteEvent);
      expect(component.pendingValues).toEqual(['val1', 'val2']);
    });

    it('should add pending value on Enter key', () => {
      component.pendingInputText = 'myValue';
      const event = { key: 'Enter', preventDefault: vi.fn() } as any as KeyboardEvent;
      component.onPendingInputKeydown(event);
      expect(component.pendingValues).toContain('myValue');
      expect(component.pendingInputText).toBe('');
    });

    it('should not add a duplicate pending value', () => {
      component.pendingValues = ['existing'];
      component.pendingInputText = 'existing';
      component.addPendingValue();
      expect(component.pendingValues.length).toBe(1);
    });
  });

  // ===========================
  // Global Search — executeSearch
  // ===========================

  describe('executeSearch', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should not execute search when there are no active pills', () => {
      component.activePills = [];
      component.executeSearch();
      expect(cockpitService.searchProcessInstancesGlobal).not.toHaveBeenCalled();
      expect(component.searchExecuted).toBe(false);
    });

    it('should mark searchExecuted=true and call the service', () => {
      component.activePills = [{ field: 'withIncidents', values: [] }];
      component.executeSearch();
      expect(component.searchExecuted).toBe(true);
      expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalled();
      expect(cockpitService.searchProcessInstancesGlobalCount).toHaveBeenCalled();
    });

    it('should populate searchResults and searchResultsCount after success', () => {
      component.activePills = [{ field: 'withIncidents', values: [] }];
      component.executeSearch();
      expect(component.searchResults.length).toBe(2);
      expect(component.searchResultsCount).toBe(2);
      expect(component.searchLoading).toBe(false);
    });

    it('should set searchLoading=false on error', () => {
      cockpitService.searchProcessInstancesGlobal.mockReturnValue(throwError(() => new Error('fail')));
      cockpitService.searchProcessInstancesGlobalCount.mockReturnValue(throwError(() => new Error('fail')));
      component.activePills = [{ field: 'withIncidents', values: [] }];
      component.executeSearch();
      expect(component.searchLoading).toBe(false);
    });

    it('should filter instanceId results client-side — partial match returns matching instances', () => {
      // Only instanceId pill → queryProcessInstances called with "match all" orQueries body
      component.activePills = [{ field: 'instanceId', values: ['inst'] }];
      component.executeSearch();
      expect(cockpitService.queryProcessInstances).toHaveBeenCalled();
      expect(component.searchResults.length).toBe(2);
      expect(component.searchResultsCount).toBe(2);
    });

    it('should filter instanceId results client-side — narrower partial match returns subset', () => {
      component.activePills = [{ field: 'instanceId', values: ['inst-1'] }];
      component.executeSearch();
      expect(component.searchResults.length).toBe(1);
      expect(component.searchResults[0].id).toBe('inst-1');
      expect(component.searchResultsCount).toBe(1);
    });

    it('should call queryProcessInstances with match-all orQueries when only instanceId pill present', () => {
      component.activePills = [{ field: 'instanceId', values: ['f'] }];
      component.executeSearch();
      expect(cockpitService.queryProcessInstances).toHaveBeenCalledWith({}, 0, 2000);
      expect(cockpitService.searchProcessInstancesGlobal).not.toHaveBeenCalled();
    });

    it('should use searchProcessInstancesGlobal (without instanceId) when other pills also present', () => {
      component.activePills = [
        { field: 'instanceId', values: ['f'] },
        { field: 'withIncidents', values: [] }
      ];
      component.executeSearch();
      expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalled();
      const apiPills: MultiValueFilter[] = cockpitService.searchProcessInstancesGlobal.mock.calls[0][0];
      expect(apiPills.some(p => p.field === 'instanceId')).toBe(false);
      expect(apiPills.some(p => p.field === 'withIncidents')).toBe(true);
    });

    it('should not call searchProcessInstancesGlobalCount when instanceId filter is present', () => {
      component.activePills = [{ field: 'instanceId', values: ['f'] }];
      component.executeSearch();
      expect(cockpitService.searchProcessInstancesGlobalCount).not.toHaveBeenCalled();
    });
  });

  // ===========================
  // Global Search — clearSearch
  // ===========================

  describe('clearSearch', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should reset all search state', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
      component.searchResults = [...mockInstances];
      component.searchResultsCount = 2;
      component.searchExecuted = true;
      component.variableNamesIgnoreCase = true;
      component.variableValuesIgnoreCase = true;
      component.clearSearch();
      expect(component.activePills.length).toBe(0);
      expect(component.searchResults.length).toBe(0);
      expect(component.searchResultsCount).toBe(0);
      expect(component.searchExecuted).toBe(false);
      expect(component.variableNamesIgnoreCase).toBe(false);
      expect(component.variableValuesIgnoreCase).toBe(false);
    });
  });

  // ===========================
  // Global Search — hasVariableFilter
  // ===========================

  describe('hasVariableFilter', () => {
    it('should return false when no variable pill exists', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
      expect(component.hasVariableFilter()).toBe(false);
    });

    it('should return true when at least one variable pill exists', () => {
      component.activePills = [{ field: 'variable', values: ['1'], variableName: 'x', variableOperator: 'eq' }];
      expect(component.hasVariableFilter()).toBe(true);
    });
  });

  // ===========================
  // Global Search — getPillLabel
  // ===========================

  describe('getPillLabel', () => {
    it('should return correct label for businessKey pill', () => {
      const pill: MultiValueFilter = { field: 'businessKey', values: ['BK-001', 'BK-002'] };
      expect(component.getPillLabel(pill)).toBe('Business Key: BK-001, BK-002');
    });

    it('should return correct label for withIncidents pill', () => {
      const pill: MultiValueFilter = { field: 'withIncidents', values: [] };
      expect(component.getPillLabel(pill)).toBe('With incidents');
    });

    it('should return correct label for variable pill', () => {
      const pill: MultiValueFilter = {
        field: 'variable', values: ['1', '23'],
        variableName: 'orderId', variableOperator: 'eq'
      };
      expect(component.getPillLabel(pill)).toBe('orderId = 1, 23');
    });

    it('should return correct label for state pill', () => {
      const pill: MultiValueFilter = { field: 'state', values: ['completed'] };
      expect(component.getPillLabel(pill)).toBe('State: Completed');
    });

    it('should return correct label for instanceId pill', () => {
      const pill: MultiValueFilter = { field: 'instanceId', values: ['inst-1'] };
      expect(component.getPillLabel(pill)).toBe('Instance ID: inst-1');
    });
  });

  // ===========================
  // Instance state helpers
  // ===========================

  describe('getInstanceStateClass', () => {
    it('should return state-active for ACTIVE state', () => {
      expect(component.getInstanceStateClass(mockInstances[0])).toBe('state-active');
    });

    it('should return state-completed for COMPLETED state', () => {
      expect(component.getInstanceStateClass(mockInstances[1])).toBe('state-completed');
    });

    it('should return state-suspended for SUSPENDED state', () => {
      const inst: ProcessInstance = { ...mockInstances[0], state: 'SUSPENDED' };
      expect(component.getInstanceStateClass(inst)).toBe('state-suspended');
    });

    it('should return state-terminated for EXTERNALLY_TERMINATED state', () => {
      const inst: ProcessInstance = { ...mockInstances[0], state: 'EXTERNALLY_TERMINATED' };
      expect(component.getInstanceStateClass(inst)).toBe('state-terminated');
    });

    it('should return state-terminated for INTERNALLY_TERMINATED state', () => {
      const inst: ProcessInstance = { ...mockInstances[0], state: 'INTERNALLY_TERMINATED' };
      expect(component.getInstanceStateClass(inst)).toBe('state-terminated');
    });
  });

  // ===========================
  // Search pagination helpers
  // ===========================

  describe('search pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.searchResultsCount = 45;
      component.searchPageSize = 20;
      component.searchCurrentPage = 1;
    });

    it('should compute total pages correctly', () => {
      expect(component.searchTotalPages).toBe(3);
    });

    it('should compute start index on first page', () => {
      expect(component.searchStartIndex).toBe(1);
    });

    it('should compute end index on first page', () => {
      expect(component.searchEndIndex).toBe(20);
    });

    it('should compute end index capped to total count on last page', () => {
      component.searchCurrentPage = 3;
      expect(component.searchEndIndex).toBe(45);
    });

    it('should return 0 start index when no results', () => {
      component.searchResultsCount = 0;
      expect(component.searchStartIndex).toBe(0);
    });
  });

  // ===========================
  // extractVersionNumber
  // ===========================

  describe('extractVersionNumber', () => {
    it('should extract version number from Camunda 7 definition ID', () => {
      expect(component.extractVersionNumber('invoice:2:abc123')).toBe(2);
    });

    it('should return null for IDs without colon-delimited format', () => {
      expect(component.extractVersionNumber('abc123')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(component.extractVersionNumber('')).toBeNull();
    });

    it('should return null for non-numeric version segment', () => {
      expect(component.extractVersionNumber('key:notANumber:id')).toBeNull();
    });
  });
});
