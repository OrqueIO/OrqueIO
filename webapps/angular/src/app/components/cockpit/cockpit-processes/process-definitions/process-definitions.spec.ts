import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of, throwError, lastValueFrom } from 'rxjs';
import { ProcessDefinitionsComponent } from './process-definitions';
import {
  CockpitService,
  ProcessDefinitionStatistics,
  ProcessInstance,
  MultiValueFilter
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';
import { By } from '@angular/platform-browser';
import { MultiValueChipInputComponent } from '../../../../shared/multi-value-chip-input/multi-value-chip-input';

const TEST_EN_TRANSLATIONS: Record<string, string> = {
  'cockpit.processes.globalSearch.pill.businessKey': 'Business Key: {{value}}',
  'cockpit.processes.globalSearch.pill.instanceId': 'Instance ID: {{value}}',
  'cockpit.processes.globalSearch.pill.state': 'State: {{value}}',
  'cockpit.processes.globalSearch.pill.withIncidents': 'With incidents',
  'cockpit.processes.globalSearch.pill.startedAfter': 'Started after: {{value}}',
  'cockpit.processes.globalSearch.pill.startedBefore': 'Started before: {{value}}',
  'cockpit.processes.globalSearch.pill.finishedAfter': 'Finished after: {{value}}',
  'cockpit.processes.globalSearch.pill.finishedBefore': 'Finished before: {{value}}',
  'cockpit.processes.globalSearch.pill.variables': 'Variables ({{count}})',
  'cockpit.processes.filters.stateActive': 'Active',
  'cockpit.processes.filters.stateSuspended': 'Suspended',
  'cockpit.processes.filters.stateCompleted': 'Completed',
  'cockpit.processes.filters.stateTerminated': 'Terminated',
  'cockpit.processes.globalSearch.instanceStateRunning': 'Running',
  'cockpit.processes.globalSearch.instanceStateWithIncidents': 'Incidents',
  'cockpit.processes.globalSearch.selected': 'selected',
  'cockpit.processes.globalSearch.variablesWord': 'variables',
};

// ============================================================
// Helper: call CockpitService.buildPayloadVariants without
// Angular DI — it's a pure function with no injected calls.
// ============================================================
const realSvc = Object.create(CockpitService.prototype) as CockpitService;

// ============================================================
// buildPayloadVariants — service-level unit tests
// ============================================================
describe('CockpitService.buildPayloadVariants', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('should put a single business key in a payload as a LIKE pattern (no orQueries)', () => {
    const filters: MultiValueFilter[] = [{ field: 'businessKey', values: ['BK-001'] }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.processInstanceBusinessKeyLike).toBe('%BK-001%');
    expect(p.orQueries).toBeUndefined();
    expect(p.processInstanceBusinessKeyIn).toBeUndefined();
  });

  it('should produce 2 payload variants for 2 business keys (OR via separate calls)', () => {
    const filters: MultiValueFilter[] = [{ field: 'businessKey', values: ['BK-001', 'BK-002'] }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps.length).toBe(2);
    expect(ps[0].processInstanceBusinessKeyLike).toBe('%BK-001%');
    expect(ps[1].processInstanceBusinessKeyLike).toBe('%BK-002%');
    expect(ps[0].processInstanceBusinessKeyIn).toBeUndefined();
    expect(ps[0].orQueries).toBeUndefined();
  });

  it('should produce one payload variant per value for a variable filter (OR via separate calls)', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['1', '23'],
      variableName: 'orderId', variableOperator: 'eq'
    }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps.length).toBe(2);
    expect(ps[0].variables[0]).toEqual({ name: 'orderId', operator: 'eq', value: 1 });
    expect(ps[1].variables[0]).toEqual({ name: 'orderId', operator: 'eq', value: 23 });
    expect(ps[0].orQueries).toBeUndefined();
  });

  it('should produce 3 payload variants for a 3-value variable filter', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['100', '200', '300'],
      variableName: 'amount', variableOperator: 'eq'
    }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps.length).toBe(3);
    expect(ps[0].variables[0]).toEqual({ name: 'amount', operator: 'eq', value: 100 });
    expect(ps[1].variables[0]).toEqual({ name: 'amount', operator: 'eq', value: 200 });
    expect(ps[2].variables[0]).toEqual({ name: 'amount', operator: 'eq', value: 300 });
  });

  it('should cross-product two variable pills: N×M payload variants each carrying one condition per pill', () => {
    // orderId=[1,23] × status=[active] → 2×1=2 variants, each payload AND's both conditions
    const filters: MultiValueFilter[] = [
      { field: 'variable', values: ['1', '23'], variableName: 'orderId', variableOperator: 'eq' },
      { field: 'variable', values: ['active'], variableName: 'status', variableOperator: 'eq' }
    ];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps.length).toBe(2);
    expect(ps[0].variables).toEqual([
      { name: 'orderId', operator: 'eq', value: 1 },
      { name: 'status',  operator: 'eq', value: 'active' }
    ]);
    expect(ps[1].variables).toEqual([
      { name: 'orderId', operator: 'eq', value: 23 },
      { name: 'status',  operator: 'eq', value: 'active' }
    ]);
  });

  it('should AND two different variable lines and OR multiple values within each line (grouped variables pill)', () => {
    // creditor=[pizza,sushi] × invoiceCategory=[food,beverage] → 2×2=4 variants
    // Semantics: (creditor=pizza OR creditor=sushi) AND (invoiceCategory=food OR invoiceCategory=beverage)
    // Each payload carries one value per variable → AND between variables, OR achieved via union of payloads
    const filters: MultiValueFilter[] = [{
      field: 'variables',
      values: [],
      variableLines: [
        { variableName: 'creditor',        variableOperator: 'eq', values: ['pizza', 'sushi'] },
        { variableName: 'invoiceCategory', variableOperator: 'eq', values: ['food', 'beverage'] }
      ]
    }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps.length).toBe(4);
    expect(ps[0].variables).toEqual([
      { name: 'creditor',        operator: 'eq', value: 'pizza' },
      { name: 'invoiceCategory', operator: 'eq', value: 'food' }
    ]);
    expect(ps[1].variables).toEqual([
      { name: 'creditor',        operator: 'eq', value: 'pizza' },
      { name: 'invoiceCategory', operator: 'eq', value: 'beverage' }
    ]);
    expect(ps[2].variables).toEqual([
      { name: 'creditor',        operator: 'eq', value: 'sushi' },
      { name: 'invoiceCategory', operator: 'eq', value: 'food' }
    ]);
    expect(ps[3].variables).toEqual([
      { name: 'creditor',        operator: 'eq', value: 'sushi' },
      { name: 'invoiceCategory', operator: 'eq', value: 'beverage' }
    ]);
    expect(ps[0].orQueries).toBeUndefined();
  });

  // ── parseVariableValue type coercion in buildPayloadVariants ──────────

  it('should send 20.5 as a number (not a string) for a float variable value', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['20.5'],
      variableName: 'amount', variableOperator: 'eq'
    }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.variables[0].value).toBe(20.5);
    expect(typeof p.variables[0].value).toBe('number');
  });

  it('should send each numeric value as a number for a multi-value variable filter', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['20.5', '30'],
      variableName: 'amount', variableOperator: 'eq'
    }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps[0].variables[0].value).toBe(20.5);
    expect(ps[1].variables[0].value).toBe(30);
  });

  it('should send true/false as booleans for boolean variable values', () => {
    const f1: MultiValueFilter[] = [{ field: 'variable', values: ['true'],  variableName: 'flag', variableOperator: 'eq' }];
    const f2: MultiValueFilter[] = [{ field: 'variable', values: ['false'], variableName: 'flag', variableOperator: 'eq' }];
    expect(realSvc.buildPayloadVariants(f1)[0].variables[0].value).toBe(true);
    expect(realSvc.buildPayloadVariants(f2)[0].variables[0].value).toBe(false);
  });

  it('should send null for NULL variable value', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['NULL'],
      variableName: 'x', variableOperator: 'eq'
    }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.variables[0].value).toBeNull();
  });

  it('should auto-wrap like value with % for variable operator like', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['invoice'],
      variableName: 'name', variableOperator: 'like'
    }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.variables[0].value).toBe('%invoice%');
  });

  it('should set active=true and unfinished=true for state=active', () => {
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['active'] }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.active).toBe(true);
    expect(p.unfinished).toBe(true);
  });

  it('should set completed=true and finished=true for state=completed', () => {
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['completed'] }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.completed).toBe(true);
    expect(p.finished).toBe(true);
  });

  it('should set finished=true for state=terminated (routing sends terminated through stateBodyFragment, not buildPayloadVariants)', () => {
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['terminated'] }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.finished).toBe(true);
    expect(p.externallyTerminated).toBeUndefined();
    expect(p.internallyTerminated).toBeUndefined();
  });

  it('should set withIncidents=true for withIncidents filter', () => {
    const filters: MultiValueFilter[] = [{ field: 'withIncidents', values: [] }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.withIncidents).toBe(true);
  });

  it('should set processInstanceIds array for instanceId filter', () => {
    const filters: MultiValueFilter[] = [{ field: 'instanceId', values: ['inst-1', 'inst-2'] }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.processInstanceIds).toEqual(['inst-1', 'inst-2']);
  });

  it('should set startedAfter from filter', () => {
    const filters: MultiValueFilter[] = [{ field: 'startedAfter', values: ['2024-01-01T00:00:00.000+0000'] }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.startedAfter).toBe('2024-01-01T00:00:00.000+0000');
  });

  it('should set variableNamesIgnoreCase and variableValuesIgnoreCase when true', () => {
    const [p] = realSvc.buildPayloadVariants([], true, true);
    expect(p.variableNamesIgnoreCase).toBe(true);
    expect(p.variableValuesIgnoreCase).toBe(true);
  });

  it('should not include variableIgnoreCase flags when both are false', () => {
    const [p] = realSvc.buildPayloadVariants([], false, false);
    expect(p.variableNamesIgnoreCase).toBeUndefined();
    expect(p.variableValuesIgnoreCase).toBeUndefined();
  });

  it('should combine multiple filter types: cross-product of bk values × variable values', () => {
    // businessKey=[BK-001,BK-002] × variable amount=[42] → 2×1=2 variants
    const filters: MultiValueFilter[] = [
      { field: 'businessKey', values: ['BK-001', 'BK-002'] },
      { field: 'state', values: ['active'] },
      { field: 'withIncidents', values: [] },
      { field: 'variable', values: ['42'], variableName: 'amount', variableOperator: 'gt' }
    ];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps[0].processInstanceBusinessKeyIn).toBeUndefined();
    expect(ps[0].active).toBe(true);
    expect(ps[0].withIncidents).toBe(true);
    expect(ps.length).toBe(2);
    expect(ps[0].processInstanceBusinessKeyLike).toBe('%BK-001%');
    expect(ps[0].variables[0]).toEqual({ name: 'amount', operator: 'gt', value: 42 });
    expect(ps[0].orQueries).toBeUndefined();
    expect(ps[1].processInstanceBusinessKeyLike).toBe('%BK-002%');
    expect(ps[1].variables[0]).toEqual({ name: 'amount', operator: 'gt', value: 42 });
  });

  it('should pass the like operator through to the variable query payload', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['%partial%'],
      variableName: 'name', variableOperator: 'like'
    }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps.length).toBe(1);
    expect(ps[0].variables[0].operator).toBe('like');
    expect(ps[0].variables[0].value).toBe('%partial%');
  });

  it('should not add variables or orQueries when no variable filter is present', () => {
    const filters: MultiValueFilter[] = [{ field: 'withIncidents', values: [] }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.variables).toBeUndefined();
    expect(p.orQueries).toBeUndefined();
  });

  it('should default variable operator to eq when not provided', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['hello'],
      variableName: 'myVar'
    }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.variables[0].operator).toBe('eq');
  });

  // ── variable operator API name mapping ────────────────────────────────────

  it('should send operator "like" (never "~") and value "%20%" for amount ~ 20', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['20'],
      variableName: 'amount', variableOperator: 'like'
    }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.variables[0].operator).toBe('like');
    expect(p.variables[0].operator).not.toBe('~');
    expect(p.variables[0].value).toBe('%20%');
  });

  it('should send correct API operator names for all 7 operator options', () => {
    const ops: Array<[string, string]> = [
      ['eq', 'eq'], ['neq', 'neq'], ['gt', 'gt'], ['gteq', 'gteq'],
      ['lt', 'lt'], ['lteq', 'lteq'], ['like', 'like'],
    ];
    ops.forEach(([uiValue, apiName]) => {
      const filters: MultiValueFilter[] = [{
        field: 'variable', values: ['test'],
        variableName: 'x', variableOperator: uiValue as any
      }];
      const [p] = realSvc.buildPayloadVariants(filters);
      expect(p.variables[0].operator).toBe(apiName);
    });
  });

  it('should produce 2 payload variants with %abc% and %def% for a multi-value like filter', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['abc', 'def'],
      variableName: 'name', variableOperator: 'like'
    }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps).toHaveLength(2);
    expect(ps[0].variables[0]).toEqual({ name: 'name', operator: 'like', value: '%abc%' });
    expect(ps[1].variables[0]).toEqual({ name: 'name', operator: 'like', value: '%def%' });
  });

  it('should set variableValuesIgnoreCase=true on the payload for a like operator', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['pizza'],
      variableName: 'dish', variableOperator: 'like'
    }];
    const [p] = realSvc.buildPayloadVariants(filters);
    // Top-level flag applies to top-level variables (no orQueries used)
    expect(p.variableValuesIgnoreCase).toBe(true);
  });

  it('should NOT set variableValuesIgnoreCase for non-like operators', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['pizza'],
      variableName: 'dish', variableOperator: 'eq'
    }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.variableValuesIgnoreCase).toBeUndefined();
  });

  it('should set variableValuesIgnoreCase on the payload when the checkbox flag is true', () => {
    const filters: MultiValueFilter[] = [{
      field: 'variable', values: ['hello'],
      variableName: 'x', variableOperator: 'eq'
    }];
    const [p] = realSvc.buildPayloadVariants(filters, false, true);
    expect(p.variableValuesIgnoreCase).toBe(true);
  });

  // ── same-variable-name OR merging ────────────────────────────────────────

  it('same name+op → values merged (OR semantics): 2 payloads, not 4', () => {
    // Two lines: orderId=1 and orderId=2 (same name, same op)
    // → merged into one varPill with values [1,2] → cross-product gives 2 payloads
    const filters: MultiValueFilter[] = [{
      field: 'variables',
      values: [],
      variableLines: [
        { variableName: 'orderId', variableOperator: 'eq', values: ['1'] },
        { variableName: 'orderId', variableOperator: 'eq', values: ['2'] }
      ]
    }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps.length).toBe(2);
    expect(ps[0].variables).toEqual([{ name: 'orderId', operator: 'eq', value: 1 }]);
    expect(ps[1].variables).toEqual([{ name: 'orderId', operator: 'eq', value: 2 }]);
  });

  it('same name diff op → AND semantics: kept as separate varPills, 1 payload', () => {
    // orderId=1 AND orderId>0 (same name, different op) → two separate varPills → 1 payload
    const filters: MultiValueFilter[] = [{
      field: 'variables',
      values: [],
      variableLines: [
        { variableName: 'orderId', variableOperator: 'eq',  values: ['1'] },
        { variableName: 'orderId', variableOperator: 'gteq', values: ['0'] }
      ]
    }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps.length).toBe(1);
    expect(ps[0].variables).toEqual([
      { name: 'orderId', operator: 'eq',  value: 1 },
      { name: 'orderId', operator: 'gteq', value: 0 }
    ]);
  });

  it('3 lines: two share name+op (merged), one different op (separate) → 2 payloads', () => {
    // orderId=1, orderId=2 → merged; orderId>0 → separate → cross-product 2×1=2 payloads
    const filters: MultiValueFilter[] = [{
      field: 'variables',
      values: [],
      variableLines: [
        { variableName: 'orderId', variableOperator: 'eq',   values: ['1'] },
        { variableName: 'orderId', variableOperator: 'eq',   values: ['2'] },
        { variableName: 'orderId', variableOperator: 'gteq', values: ['0'] }
      ]
    }];
    const ps = realSvc.buildPayloadVariants(filters);
    expect(ps.length).toBe(2);
    // Both payloads carry the gteq constraint AND one of the eq values
    expect(ps[0].variables).toContainEqual({ name: 'orderId', operator: 'eq',   value: 1 });
    expect(ps[0].variables).toContainEqual({ name: 'orderId', operator: 'gteq', value: 0 });
    expect(ps[1].variables).toContainEqual({ name: 'orderId', operator: 'eq',   value: 2 });
    expect(ps[1].variables).toContainEqual({ name: 'orderId', operator: 'gteq', value: 0 });
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
  let translateService: TranslateService;

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

    translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: TEST_EN_TRANSLATIONS };
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
  // Global Search — state multi-select
  // ===========================

  describe('state multi-select', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should preserve non-state filter criteria in every per-state body', () => {
      const statePill: MultiValueFilter = { field: 'state', values: ['active', 'suspended'] };
      const filters: MultiValueFilter[] = [
        statePill,
        { field: 'businessKey', values: ['BK-001'] }
      ];
      const bodies = (realSvc as any).buildPerStateBodies(filters, statePill, false, false);
      expect(bodies.length).toBe(2);
      expect(bodies[0].processInstanceBusinessKeyLike).toBe('%BK-001%');
      expect(bodies[1].processInstanceBusinessKeyLike).toBe('%BK-001%');
    });

    it('should still use top-level fields for single state (backward compat)', () => {
      const pill: MultiValueFilter = { field: 'state', values: ['active'] };
      const [p] = realSvc.buildPayloadVariants([pill]);
      expect(p.active).toBe(true);
      expect(p.unfinished).toBe(true);
      expect(p.orQueries).toBeUndefined();
    });

  });

});

