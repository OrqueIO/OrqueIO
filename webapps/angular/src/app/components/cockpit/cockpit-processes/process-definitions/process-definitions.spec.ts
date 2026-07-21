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
import { initTestEnvironment } from '../../../../testing/test-utils';
import { By } from '@angular/platform-browser';
import { MultiValueChipInputComponent } from '../../../../shared/multi-value-chip-input/multi-value-chip-input';

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

  it('should set externallyTerminated=true and finished=true for state=terminated', () => {
    const filters: MultiValueFilter[] = [{ field: 'state', values: ['terminated'] }];
    const [p] = realSvc.buildPayloadVariants(filters);
    expect(p.externallyTerminated).toBe(true);
    expect(p.finished).toBe(true);
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

    it('should not add pill when pendingValues is empty', () => {
      component.selectCriteriaType('businessKey');
      component.pendingValues = [];
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
      component.pendingStateValues = ['completed'];
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
      component.pendingStateValues = ['active'];
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

    it('should confirm a 3-value variable pill (values set by child via two-way binding) and produce 3 orQueries entries', () => {
      component.selectCriteriaType('variable');
      component.pendingVariableName = 'amount';
      component.pendingVariableOperator = 'eq';

      // Simulate the child chip-input emitting 3 values via the [(values)] two-way binding
      component.pendingValues = ['100', '200', '300'];
      expect(component.pendingValues).toEqual(['100', '200', '300']);

      component.confirmCriterion();

      expect(component.activePills.length).toBe(1);
      const pill = component.activePills[0];
      expect(pill.values).toEqual(['100', '200', '300']);
      expect(pill.variableName).toBe('amount');
      expect(component.getPillLabel(pill)).toBe('amount = 100, 200, 300');
      expect(component.activeEditorType).toBeNull();
      expect(component.pendingValues.length).toBe(0);

      const ps = realSvc.buildPayloadVariants(component.activePills);
      expect(ps.length).toBe(3);
      expect(ps[0].variables[0]).toEqual({ name: 'amount', operator: 'eq', value: 100 });
      expect(ps[1].variables[0]).toEqual({ name: 'amount', operator: 'eq', value: 200 });
      expect(ps[2].variables[0]).toEqual({ name: 'amount', operator: 'eq', value: 300 });
    });
  });

  // ===========================
  // Global Search — state multi-select
  // ===========================

  describe('state multi-select', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should add a state pill with two selected states', () => {
      component.selectCriteriaType('state');
      component.pendingStateValues = ['active', 'suspended'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].values).toEqual(['active', 'suspended']);
      expect(component.getPillLabel(component.activePills[0])).toBe('State: Active, Suspended');
    });

    it('should generate one body per state for active + completed via buildPerStateBodies', () => {
      const statePill: MultiValueFilter = { field: 'state', values: ['active', 'completed'] };
      const bodies = (realSvc as any).buildPerStateBodies([statePill], statePill, false, false);
      expect(bodies.length).toBe(2);
      expect(bodies[0]).toEqual({ active: true, unfinished: true });
      expect(bodies[1]).toEqual({ completed: true, finished: true });
      // No cross-state flags that would cause Camunda to AND finished+unfinished
    });

    it('should NOT combine active + terminated in one request — produces 3 separate bodies (regression)', () => {
      // active → 1 body, terminated → 2 bodies (externallyTerminated + internallyTerminated)
      const statePill: MultiValueFilter = { field: 'state', values: ['active', 'terminated'] };
      const bodies = (realSvc as any).buildPerStateBodies([statePill], statePill, false, false);
      expect(bodies.length).toBe(3);
      expect(bodies[0]).toEqual({ active: true, unfinished: true });
      expect(bodies[1]).toEqual({ externallyTerminated: true, finished: true });
      expect(bodies[2]).toEqual({ internallyTerminated: true, finished: true });
      // Each body has only one state's flags → no impossible finished+unfinished conflict
    });

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

    it('should not add a state pill when no state is selected (add mode)', () => {
      component.selectCriteriaType('state');
      component.pendingStateValues = [];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(0);
    });

    it('should remove the state pill when all states deselected and confirmed in edit mode', () => {
      component.activePills = [{ field: 'state', values: ['active'] }];
      component.startEditPill(0, new MouseEvent('click'));
      component.pendingStateValues = [];   // deselect all
      component.confirmCriterion();
      expect(component.activePills.length).toBe(0);
      expect(component.editingPillIndex).toBeNull();
      expect(component.activeEditorType).toBeNull();
    });

    it('should still use top-level fields for single state (backward compat)', () => {
      const pill: MultiValueFilter = { field: 'state', values: ['active'] };
      const [p] = realSvc.buildPayloadVariants([pill]);
      expect(p.active).toBe(true);
      expect(p.unfinished).toBe(true);
      expect(p.orQueries).toBeUndefined();
    });

    it('should toggle state value on and off', () => {
      component.selectCriteriaType('state');
      component.toggleStateValue('active');
      expect(component.pendingStateValues).toEqual(['active']);
      component.toggleStateValue('active');
      expect(component.pendingStateValues).toEqual([]);
    });

    it('searchPerState should sort merged results by startTime desc so all states appear on page 1', async () => {
      // active query returns instances at Jan-10 and Jan-08; completed query returns Jan-09
      // Without sort: active-1, active-2, completed-1 — with maxResults=2 page 1 never shows completed-1
      // With sort:    active-1(Jan-10), completed-1(Jan-09), active-2(Jan-08) — correct interleaving
      (realSvc as any).processInstanceService = {
        queryProcessInstances: (body: any) => {
          if (body.active) {
            return of<ProcessInstance[]>([
              { id: 'active-1', processDefinitionId: '', processDefinitionKey: '', startTime: '2024-01-10T00:00:00.000Z', state: 'ACTIVE' as const },
              { id: 'active-2', processDefinitionId: '', processDefinitionKey: '', startTime: '2024-01-08T00:00:00.000Z', state: 'ACTIVE' as const },
            ]);
          }
          return of<ProcessInstance[]>([
            { id: 'completed-1', processDefinitionId: '', processDefinitionKey: '', startTime: '2024-01-09T00:00:00.000Z', state: 'COMPLETED' as const },
          ]);
        }
      };
      const statePill: MultiValueFilter = { field: 'state', values: ['active', 'completed'] };
      const results = await lastValueFrom<ProcessInstance[]>(
        (realSvc as any).searchPerState([statePill], statePill, false, false, 0, 2)
      );
      // Page 1 with maxResults=2: should show the 2 most recent = active-1(Jan-10) + completed-1(Jan-09)
      expect(results.length).toBe(2);
      expect(results[0].id).toBe('active-1');
      expect(results[1].id).toBe('completed-1');
    });
  });

  // ===========================
  // Global Search — pill editing
  // ===========================

  describe('pill editing', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should open editor pre-filled with businessKey pill values on startEditPill', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001', 'BK-002'] }];
      component.startEditPill(0, new MouseEvent('click'));
      expect(component.activeEditorType).toBe('businessKey');
      expect(component.editingPillIndex).toBe(0);
      expect(component.pendingValues).toEqual(['BK-001', 'BK-002']);
    });

    it('should open editor pre-filled with state pill values on startEditPill', () => {
      component.activePills = [{ field: 'state', values: ['active', 'completed'] }];
      component.startEditPill(0, new MouseEvent('click'));
      expect(component.activeEditorType).toBe('state');
      expect(component.editingPillIndex).toBe(0);
      expect(component.pendingStateValues).toEqual(['active', 'completed']);
    });

    it('should update the pill in place on confirmCriterion when editing', () => {
      component.activePills = [
        { field: 'businessKey', values: ['BK-001'] },
        { field: 'state', values: ['active'] }
      ];
      component.startEditPill(0, new MouseEvent('click'));
      component.pendingValues = ['BK-001', 'BK-999'];
      component.confirmCriterion();

      expect(component.activePills.length).toBe(2);
      expect(component.activePills[0].values).toEqual(['BK-001', 'BK-999']);
      expect(component.activePills[1].field).toBe('state');
      expect(component.editingPillIndex).toBeNull();
    });

    it('should not add a duplicate pill when editing and confirming', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
      component.startEditPill(0, new MouseEvent('click'));
      component.pendingValues = ['BK-NEW'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].values).toEqual(['BK-NEW']);
    });

    it('should leave pill unchanged on cancelCriterion when editing', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-ORIG'] }];
      component.startEditPill(0, new MouseEvent('click'));
      component.pendingValues = ['BK-MODIFIED'];
      component.cancelCriterion();
      expect(component.activePills[0].values).toEqual(['BK-ORIG']);
      expect(component.editingPillIndex).toBeNull();
      expect(component.activeEditorType).toBeNull();
    });

    it('should update state pill values on confirm when editing', () => {
      component.activePills = [{ field: 'state', values: ['active'] }];
      component.startEditPill(0, new MouseEvent('click'));
      component.pendingStateValues = ['active', 'suspended'];
      component.confirmCriterion();
      expect(component.activePills[0].values).toEqual(['active', 'suspended']);
      expect(component.getPillLabel(component.activePills[0])).toBe('State: Active, Suspended');
      // Multi-state uses buildPerStateBodies (separate calls), not buildPayloadVariants
      const statePill = component.activePills[0];
      const bodies = (realSvc as any).buildPerStateBodies([statePill], statePill, false, false);
      expect(bodies.length).toBe(2);
      expect(bodies[0]).toEqual({ active: true, unfinished: true });
      expect(bodies[1]).toEqual({ suspended: true, unfinished: true });
    });
  });

  // ===========================
  // Click outside popover
  // ===========================

  describe('click outside popover', () => {
    beforeEach(() => { fixture.detectChanges(); });

    const outsideClick = (comp: ProcessDefinitionsComponent) =>
      comp.onDocumentClick({ target: document.createElement('div') } as any as Event);

    it('should remove a state pill when all states are deselected and user clicks outside', () => {
      component.activePills = [{ field: 'state', values: ['active'] }];
      component.startEditPill(0, new MouseEvent('click'));
      component.pendingStateValues = []; // simulate unchecking all states
      outsideClick(component);
      expect(component.activePills.length).toBe(0);
      expect(component.editingPillIndex).toBeNull();
      expect(component.activeEditorType).toBeNull();
    });

    it('should confirm a new instanceId criterion when the user clicks outside with a pending value', () => {
      component.selectCriteriaType('instanceId');
      component.pendingValues = ['inst-abc']; // blur already ran and added the chip
      outsideClick(component);
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('instanceId');
      expect(component.activePills[0].values).toEqual(['inst-abc']);
      expect(component.activeEditorType).toBeNull();
    });

    it('should leave a pill unchanged when the user clicks ✕ (cancel stays cancel, not affected by outside-click change)', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-ORIG'] }];
      component.startEditPill(0, new MouseEvent('click'));
      component.pendingValues = ['BK-MODIFIED'];
      component.cancelCriterion(); // explicit cancel via ✕
      expect(component.activePills[0].values).toEqual(['BK-ORIG']);
      expect(component.editingPillIndex).toBeNull();
      expect(component.activeEditorType).toBeNull();
    });

    it('should update a pill with new values when the user clicks outside an editing popover', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-ORIG'] }];
      component.startEditPill(0, new MouseEvent('click'));
      component.pendingValues = ['BK-UPDATED'];
      outsideClick(component);
      expect(component.activePills[0].values).toEqual(['BK-UPDATED']);
      expect(component.editingPillIndex).toBeNull();
      expect(component.activeEditorType).toBeNull();
    });
  });

  // ===========================
  // Global Search — Enter key shortcut
  // ===========================

  describe('Enter key shortcut', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should confirm businessKey criterion via emptyEnter (chip added then Enter on empty input)', () => {
      // Simulates: user types 'BK-001' → Enter (chip created) → Enter again (input empty → emptyEnter fires)
      component.selectCriteriaType('businessKey');
      component.pendingValues = ['BK-001']; // chip was already created on first Enter
      component.confirmCriterion();         // emptyEnter calls confirmCriterion()
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('businessKey');
      expect(component.activePills[0].values).toEqual(['BK-001']);
      expect(component.activeEditorType).toBeNull();
    });

    it('should confirm state criterion when keydown Enter is dispatched on state body', () => {
      component.selectCriteriaType('state');
      component.toggleStateValue('active');
      fixture.detectChanges();

      const stateBody: HTMLElement = fixture.nativeElement.querySelector('.editor-popover-body--state');
      expect(stateBody).toBeTruthy();
      stateBody.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('state');
      expect(component.activePills[0].values).toEqual(['active']);
      expect(component.activeEditorType).toBeNull();
    });

    it('should also work when editing an existing state pill via Enter', () => {
      component.activePills = [{ field: 'state', values: ['active'] }];
      component.startEditPill(0, new MouseEvent('click'));
      component.toggleStateValue('completed');
      fixture.detectChanges();

      const stateBody: HTMLElement = fixture.nativeElement.querySelector('.editor-popover-body--state');
      expect(stateBody).toBeTruthy();
      stateBody.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(component.activePills[0].values).toEqual(['active', 'completed']);
      expect(component.editingPillIndex).toBeNull();
      expect(component.activeEditorType).toBeNull();
    });

    it('should confirm criterion when Enter pressed on body div after focus has left the chip input (blur scenario)', () => {
      // Simulates: user typed 'BK-001', clicked elsewhere in popover → blur fired → chip created
      // Now focus is NOT in the chip text input → Enter on body div must confirm the criterion
      component.selectCriteriaType('businessKey');
      component.pendingValues = ['BK-001']; // reflects state after chip input's onBlur created the chip
      fixture.detectChanges();

      // Dispatch Enter directly on the body div (not on the chip input's internal <input>)
      // This matches the real user scenario: focus is on the popover background, not inside the chip input
      const bodyDiv: HTMLElement = fixture.nativeElement.querySelector('.editor-popover-body');
      expect(bodyDiv).toBeTruthy();
      bodyDiv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('businessKey');
      expect(component.activePills[0].values).toEqual(['BK-001']);
      expect(component.activeEditorType).toBeNull();
    });

    it('should trigger executeSearch when Enter is pressed anywhere (no popover open)', () => {
      component.activePills = [
        { field: 'businessKey', values: ['BK-001'] },
        { field: 'state', values: ['active'] },
      ];
      fixture.detectChanges();

      // Simulate focus on document.body (typical state after popover closes) pressing Enter
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalled();
    });

    it('should NOT trigger executeSearch when Enter is pressed while a popover is open', () => {
      component.selectCriteriaType('businessKey');
      component.pendingValues = ['BK-001'];
      fixture.detectChanges();

      // Enter inside the popover confirms the criterion via its own handler + stops propagation
      const bodyDiv: HTMLElement = fixture.nativeElement.querySelector('.editor-popover-body');
      bodyDiv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      // Criterion confirmed — pill added
      expect(component.activePills.length).toBe(1);
      expect(component.activeEditorType).toBeNull();
      // Search was NOT triggered by the panel-level handler
      expect(cockpitService.searchProcessInstancesGlobal).not.toHaveBeenCalled();
    });
  });

  // ===========================
  // Variables popover — keyboard & click-outside
  // ===========================

  describe('Variables popover — keyboard & click-outside behavior', () => {
    beforeEach(() => { fixture.detectChanges(); });

    const outsideClick = (comp: ProcessDefinitionsComponent) =>
      comp.onDocumentClick({ target: document.createElement('div') } as any as Event);

    it('should create a Variables pill when clicking outside the open popover with a valid line', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'amount';
      component.pendingVariableLines[0].operator = 'eq';
      component.pendingVariableLines[0].values = ['100'];

      outsideClick(component);

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('variables');
      expect(component.activePills[0].variableLines).toHaveLength(1);
      expect(component.activePills[0].variableLines![0].variableName).toBe('amount');
      expect(component.activePills[0].variableLines![0].values).toEqual(['100']);
      expect(component.activeEditorType).toBeNull();
    });

    it('should confirm Variables criterion when Enter is pressed in a name input (2 valid lines)', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'price';
      component.pendingVariableLines[0].values = ['50'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'qty';
      component.pendingVariableLines[1].values = ['10'];
      fixture.detectChanges();

      const nameInput: HTMLElement = fixture.nativeElement.querySelector('.editor-input--name');
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('variables');
      expect(component.activePills[0].variableLines).toHaveLength(2);
      expect(component.activeEditorType).toBeNull();
    });

    it('should flush chip currentInput to values when clicking outside (blur fires before click)', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'tag';
      fixture.detectChanges();

      // Simulate user typing in chip input without confirming with Enter
      const chipDe = fixture.debugElement.query(By.directive(MultiValueChipInputComponent));
      const chipComp = chipDe.componentInstance as MultiValueChipInputComponent;
      chipComp.currentInput = 'pending-value';

      // Browser fires blur before click; onBlur calls addCurrentInput which emits valuesChange
      chipComp.onBlur();

      outsideClick(component);

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].variableLines![0].values).toContain('pending-value');
      expect(component.activeEditorType).toBeNull();
    });

    it('should not modify an existing Variables pill when ✕ is clicked after editing', () => {
      component.activePills = [{
        field: 'variables',
        values: [],
        variableLines: [{ variableName: 'amount', variableOperator: 'eq', values: ['500'] }]
      }];
      component.startEditPill(0, new MouseEvent('click'));
      // Modify pending state during editing session
      component.pendingVariableLines[0].values = ['999'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'qty';
      component.pendingVariableLines[1].values = ['5'];

      component.cancelCriterion();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].variableLines).toHaveLength(1);
      expect(component.activePills[0].variableLines![0].values).toEqual(['500']);
      expect(component.editingPillIndex).toBeNull();
      expect(component.activeEditorType).toBeNull();
    });
  });

  // ===========================
  // Variables popover — Enter key edge cases (bugs 1 & 2)
  // ===========================

  describe('Variables popover — Enter key edge cases', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should create a chip and keep the popover open when Enter is pressed in a chip input with text', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'amount';
      fixture.detectChanges();

      const chipDe = fixture.debugElement.query(By.directive(MultiValueChipInputComponent));
      const chipComp = chipDe.componentInstance as MultiValueChipInputComponent;
      chipComp.currentInput = 'hello';

      chipComp.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(component.activeEditorType).toBe('variables'); // popover still open
      expect(chipComp.values).toContain('hello');           // chip was created
      expect(component.activePills.length).toBe(0);         // no pill confirmed yet
    });

    it('should confirm criterion when Enter is pressed with focus outside the Variables popover (empty area click)', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'amount';
      component.pendingVariableLines[0].values = ['100'];
      fixture.detectChanges();

      // Simulate focus on document.body (e.g. user clicked on an empty area of the popover card)
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('variables');
      expect(component.activeEditorType).toBeNull();
    });
  });

  // ===========================
  // Search loading state (bug 3)
  // ===========================

  describe('search loading state — OnPush re-render after API response', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should set searchLoading to false and show results after executeSearch resolves, without extra user interaction', () => {
      component.activePills = [{ field: 'withIncidents', values: [] }];
      fixture.detectChanges();

      component.executeSearch();
      fixture.detectChanges(); // single detectChanges — no extra click required

      expect(component.searchLoading).toBe(false);
      expect(component.searchResults.length).toBeGreaterThan(0);

      const loadingEl: HTMLElement | null = fixture.nativeElement.querySelector('.loading-state');
      expect(loadingEl).toBeNull(); // spinner is gone
    });
  });

  // ===========================
  // Global Search — paste split
  // ===========================

  // paste / Enter / dedup behaviours are tested in MultiValueChipInputComponent spec

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

    it('should return true when a grouped variables pill exists', () => {
      component.activePills = [{ field: 'variables', values: [], variableLines: [{ variableName: 'x', variableOperator: 'eq', values: ['v'] }] }];
      expect(component.hasVariableFilter()).toBe(true);
    });
  });

  // ===========================
  // Grouped Variables criterion
  // ===========================

  describe('grouped variables criterion', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should create a single Variables (2) pill when 2 variables are added in the same popover', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'orderId';
      component.pendingVariableLines[0].values = ['123'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'status';
      component.pendingVariableLines[1].values = ['active'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('variables');
      expect(component.getPillLabel(component.activePills[0])).toBe('Variables (2)');
    });

    it('should add new empty lines without closing the popover when addVariableLine is called twice', () => {
      component.selectCriteriaType('variables');
      expect(component.pendingVariableLines.length).toBe(1); // starts with 1 empty line
      component.addVariableLine();
      component.addVariableLine();
      expect(component.pendingVariableLines.length).toBe(3);
      expect(component.pendingVariableLines[1].name).toBe('');
      expect(component.pendingVariableLines[2].name).toBe('');
      expect(component.activeEditorType).toBe('variables'); // popover still open
    });

    it('should remove only the targeted line when removeVariableLine is called', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'orderId';
      component.pendingVariableLines[0].values = ['123'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'status';
      component.pendingVariableLines[1].values = ['active'];
      component.addVariableLine();
      component.pendingVariableLines[2].name = 'amount';
      component.pendingVariableLines[2].values = ['42'];
      component.removeVariableLine(1); // remove 'status'
      expect(component.pendingVariableLines.length).toBe(2);
      expect(component.pendingVariableLines[0].name).toBe('orderId');
      expect(component.pendingVariableLines[1].name).toBe('amount');
    });

    it('should ignore empty lines when confirming — only valid lines are stored', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'orderId';
      component.pendingVariableLines[0].values = ['123'];
      component.addVariableLine(); // 2nd line left empty (no name, no values)
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].variableLines?.length).toBe(1);
      expect(component.activePills[0].variableLines?.[0].variableName).toBe('orderId');
    });

    it('should remove the Variables pill entirely when all lines are cleared then confirmed', () => {
      component.activePills = [{
        field: 'variables', values: [],
        variableLines: [{ variableName: 'orderId', variableOperator: 'eq', values: ['123'] }]
      }];
      component.startEditPill(0, new MouseEvent('click'));
      component.pendingVariableLines = []; // clear all lines
      component.confirmCriterion();
      expect(component.activePills.length).toBe(0);
      expect(component.editingPillIndex).toBeNull();
    });

    it('should reopen pre-filled with all variable lines when an existing Variables pill is clicked', () => {
      component.activePills = [{
        field: 'variables', values: [],
        variableLines: [
          { variableName: 'orderId', variableOperator: 'eq', values: ['123'] },
          { variableName: 'status', variableOperator: 'like', values: ['act'] }
        ]
      }];
      component.startEditPill(0, new MouseEvent('click'));
      expect(component.editingPillIndex).toBe(0);
      expect(component.activeEditorType).toBe('variables');
      expect(component.pendingVariableLines.length).toBe(2);
      expect(component.pendingVariableLines[0].name).toBe('orderId');
      expect(component.pendingVariableLines[0].values).toEqual(['123']);
      expect(component.pendingVariableLines[1].name).toBe('status');
      expect(component.pendingVariableLines[1].operator).toBe('like');
      // Confirm after editing does not duplicate the pill
      component.pendingVariableLines[0].values = ['456'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].variableLines?.[0].values).toEqual(['456']);
    });

    it('should apply criterion-editor-popover--variables class to the popover when variables editor is open', () => {
      fixture.detectChanges();
      component.selectCriteriaType('variables');
      fixture.detectChanges();
      const popoverEl = fixture.nativeElement.querySelector('.criterion-editor-popover');
      expect(popoverEl).toBeTruthy();
      expect(popoverEl.classList.contains('criterion-editor-popover--variables')).toBe(true);
    });
  });

  // ===========================
  // variableConflicts getter
  // ===========================

  describe('variableConflicts getter', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should return no conflict when valid range: gteq 2 and lt 100', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'amount';
      component.pendingVariableLines[0].operator = 'gteq';
      component.pendingVariableLines[0].values = ['2'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'amount';
      component.pendingVariableLines[1].operator = 'lt';
      component.pendingVariableLines[1].values = ['100'];
      const conflicts = component.variableConflicts;
      expect(conflicts.length).toBe(0);
    });

    it('should return no conflicts when two lines share the same name AND same operator', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'orderId';
      component.pendingVariableLines[0].operator = 'eq';
      component.pendingVariableLines[0].values = ['1'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'orderId';
      component.pendingVariableLines[1].operator = 'eq';
      component.pendingVariableLines[1].values = ['2'];
      const conflicts = component.variableConflicts;
      expect(conflicts.length).toBe(0);
    });

    it('should return impossible conflict when gteq 10 and lteq 5', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'score';
      component.pendingVariableLines[0].operator = 'gteq';
      component.pendingVariableLines[0].values = ['10'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'score';
      component.pendingVariableLines[1].operator = 'lteq';
      component.pendingVariableLines[1].values = ['5'];
      const conflicts = component.variableConflicts;
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].name).toBe('score');
      expect(conflicts[0].type).toBe('impossible');
      expect(conflicts[0].detail).toContain('≥ 10');
      expect(conflicts[0].detail).toContain('≤ 5');
    });

    it('should return impossible conflict when gt 5 and lt 5 (strict bounds exclude each other)', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'qty';
      component.pendingVariableLines[0].operator = 'gt';
      component.pendingVariableLines[0].values = ['5'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'qty';
      component.pendingVariableLines[1].operator = 'lt';
      component.pendingVariableLines[1].values = ['5'];
      const conflicts = component.variableConflicts;
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('impossible');
    });

    it('should return generic conflict when like operator is involved', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'label';
      component.pendingVariableLines[0].operator = 'like';
      component.pendingVariableLines[0].values = ['foo'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'label';
      component.pendingVariableLines[1].operator = 'eq';
      component.pendingVariableLines[1].values = ['bar'];
      const conflicts = component.variableConflicts;
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].name).toBe('label');
      expect(conflicts[0].type).toBe('generic');
    });

    it('should return generic conflict when value is non-numeric for a comparison operator', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'invoiceNumber';
      component.pendingVariableLines[0].operator = 'gteq';
      component.pendingVariableLines[0].values = ['tg'];
      component.addVariableLine();
      component.pendingVariableLines[1].name = 'invoiceNumber';
      component.pendingVariableLines[1].operator = 'lt';
      component.pendingVariableLines[1].values = ['100'];
      const conflicts = component.variableConflicts;
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('generic');
    });
  });

  // ===========================
  // Operator dropdown UX
  // ===========================

  describe('operator dropdown — custom single-select', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('isMultiValueOperator returns false for comparison operators (>, ≥, <, ≤)', () => {
      expect(component.isMultiValueOperator('gt')).toBe(false);
      expect(component.isMultiValueOperator('gteq')).toBe(false);
      expect(component.isMultiValueOperator('lt')).toBe(false);
      expect(component.isMultiValueOperator('lteq')).toBe(false);
    });

    it('isMultiValueOperator returns true for eq, neq, like', () => {
      expect(component.isMultiValueOperator('eq')).toBe(true);
      expect(component.isMultiValueOperator('neq')).toBe(true);
      expect(component.isMultiValueOperator('like')).toBe(true);
    });

    it('switching eq→gt with 2 chips keeps only the first value', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].operator = 'eq';
      component.pendingVariableLines[0].values = ['alpha', 'beta'];
      component.selectOperator(0, 'gt');
      expect(component.pendingVariableLines[0].operator).toBe('gt');
      expect(component.pendingVariableLines[0].values).toEqual(['alpha']);
    });

    it('switching gt→eq with a single value preserves the value as a chip', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].operator = 'gt';
      component.pendingVariableLines[0].values = ['42'];
      component.selectOperator(0, 'eq');
      expect(component.pendingVariableLines[0].operator).toBe('eq');
      expect(component.pendingVariableLines[0].values).toEqual(['42']);
    });

    it('variable-like-hint appears when operator is like and disappears when changed', () => {
      component.selectCriteriaType('variables');
      component.selectOperator(0, 'like');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.variable-like-hint')).toBeTruthy();

      component.selectOperator(0, 'eq');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.variable-like-hint')).toBeNull();
    });

    it('opening the operator menu renders all 7 operator rows (none clipped by overflow)', () => {
      component.selectCriteriaType('variables');
      fixture.detectChanges();
      // Use a stub element — JSDOM getBoundingClientRect() returns zeros, which is fine:
      // spaceBelow = innerHeight(768) - bottom(0) = 768 >= estimatedMenuHeight → opens below
      const stubTrigger = document.createElement('button');
      component.toggleOperatorMenu(0, stubTrigger);
      fixture.detectChanges();
      const rows = fixture.nativeElement.querySelectorAll('.op-menu-row');
      expect(rows.length).toBe(7);
      // Verify all operator symbols are present
      const symbols = Array.from(rows as NodeListOf<HTMLElement>).map(
        r => r.querySelector('.op-menu-symbol')?.textContent?.trim()
      );
      expect(symbols).toEqual(['=', '≠', '>', '≥', '<', '≤', '~']);
    });
  });

  // ===========================
  // Comparison value validation
  // ===========================

  describe('comparison value validation', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('isComparisonValueInvalid returns true for gteq with non-numeric value', () => {
      component.selectCriteriaType('variables');
      component.selectOperator(0, 'gteq');
      component.pendingVariableLines[0].values = ['tg'];
      expect(component.isComparisonValueInvalid(component.pendingVariableLines[0])).toBe(true);
    });

    it('isComparisonValueInvalid returns false for gteq with a valid number', () => {
      component.selectCriteriaType('variables');
      component.selectOperator(0, 'gteq');
      component.pendingVariableLines[0].values = ['42'];
      expect(component.isComparisonValueInvalid(component.pendingVariableLines[0])).toBe(false);
    });

    it('isComparisonValueInvalid returns false for eq with non-numeric value (multi-value op)', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].operator = 'eq';
      component.pendingVariableLines[0].values = ['tg'];
      expect(component.isComparisonValueInvalid(component.pendingVariableLines[0])).toBe(false);
    });

    it('isComparisonValueInvalid returns false when value is empty (not yet entered)', () => {
      component.selectCriteriaType('variables');
      component.selectOperator(0, 'gt');
      component.pendingVariableLines[0].values = [];
      expect(component.isComparisonValueInvalid(component.pendingVariableLines[0])).toBe(false);
    });

    it('hasInvalidVariableValues is true when any comparison line has non-numeric value', () => {
      component.selectCriteriaType('variables');
      component.selectOperator(0, 'gteq');
      component.pendingVariableLines[0].name = 'invoiceNumber';
      component.pendingVariableLines[0].values = ['tg'];
      expect(component.hasInvalidVariableValues).toBe(true);
    });

    it('confirm button is disabled when a comparison line has a non-numeric value', () => {
      component.selectCriteriaType('variables');
      component.selectOperator(0, 'gteq');
      component.pendingVariableLines[0].name = 'invoiceNumber';
      component.pendingVariableLines[0].values = ['tg'];
      fixture.detectChanges();
      const confirmBtn = fixture.nativeElement.querySelector('.btn-editor-confirm-icon');
      expect(confirmBtn.disabled).toBe(true);
    });

    it('variable-value-error message is shown in the DOM when value is non-numeric for comparison op', () => {
      component.selectCriteriaType('variables');
      component.selectOperator(0, 'gt');
      component.pendingVariableLines[0].name = 'amount';
      component.pendingVariableLines[0].values = ['abc'];
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.variable-value-error')).toBeTruthy();
    });

    it('variable-value-error message disappears when value is corrected to a number', () => {
      component.selectCriteriaType('variables');
      component.selectOperator(0, 'gt');
      component.pendingVariableLines[0].name = 'amount';
      component.pendingVariableLines[0].values = ['abc'];
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.variable-value-error')).toBeTruthy();

      // Use the component method so markForCheck() is called and OnPush re-renders
      const fakeEvt = { target: { value: '100' } } as unknown as Event;
      component.onVariableLineSingleValueChange(0, fakeEvt);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.variable-value-error')).toBeNull();
    });
  });

  // ===========================
  // Bug fixes: no duplicate pills
  // ===========================

  describe('selectCriteriaType — no duplicate pills', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should not create a duplicate State pill — redirects to existing pill editor', () => {
      component.selectCriteriaType('state');
      component.pendingStateValues = ['active'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      // Select state again from "Add criteria"
      component.selectCriteriaType('state');
      expect(component.activePills.length).toBe(1);
      expect(component.editingPillIndex).toBe(0);
      expect(component.activeEditorType).toBe('state');
      expect(component.pendingStateValues).toEqual(['active']);
    });

    it('should not create a duplicate Variables pill — redirects to existing pill editor', () => {
      component.selectCriteriaType('variables');
      component.pendingVariableLines[0].name = 'orderId';
      component.pendingVariableLines[0].values = ['123'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      // Select variables again from "Add criteria"
      component.selectCriteriaType('variables');
      expect(component.activePills.length).toBe(1);
      expect(component.editingPillIndex).toBe(0);
      expect(component.activeEditorType).toBe('variables');
      expect(component.pendingVariableLines.length).toBe(1);
      expect(component.pendingVariableLines[0].name).toBe('orderId');
    });
  });

  // ===========================
  // Bug fixes: popover flip (viewport overflow)
  // ===========================

  describe('checkPopoverPosition — viewport overflow detection', () => {
    beforeEach(() => { fixture.detectChanges(); });

    it('should set popoverFlipped=true when popover right edge exceeds viewport width', () => {
      component.popoverFlipped = false;
      const fakeEl = { getBoundingClientRect: () => ({ right: 1100 } as DOMRect) } as HTMLElement;
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
      component.checkPopoverPosition(fakeEl);
      expect(component.popoverFlipped).toBe(true);
    });

    it('should set popoverFlipped=false when popover fits within viewport', () => {
      component.popoverFlipped = true;
      const fakeEl = { getBoundingClientRect: () => ({ right: 700 } as DOMRect) } as HTMLElement;
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
      component.checkPopoverPosition(fakeEl);
      expect(component.popoverFlipped).toBe(false);
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

    it('should return correct label for state pill (single value)', () => {
      const pill: MultiValueFilter = { field: 'state', values: ['completed'] };
      expect(component.getPillLabel(pill)).toBe('State: Completed');
    });

    it('should return correct label for state pill (multiple values)', () => {
      const pill: MultiValueFilter = { field: 'state', values: ['active', 'suspended'] };
      expect(component.getPillLabel(pill)).toBe('State: Active, Suspended');
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

  // ===========================
  // URL and localStorage persistence
  // ===========================

  describe('URL and localStorage persistence', () => {
    let router: Router;

    beforeEach(() => {
      fixture.detectChanges();
      router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      localStorage.removeItem('globalSearchPreferences');
    });

    it('should write pills as JSON criteria query param when a criterion is confirmed', () => {
      component.selectCriteriaType('businessKey');
      component.pendingValues = ['BK-001', 'BK-002'];
      component.confirmCriterion();

      component.selectCriteriaType('state');
      component.toggleStateValue('active');
      component.toggleStateValue('completed');
      component.confirmCriterion();

      const calls = (router.navigate as ReturnType<typeof vi.spyOn>).mock.calls;
      const lastArgs = calls[calls.length - 1];
      const pills = JSON.parse(lastArgs[1].queryParams.criteria);
      expect(pills).toHaveLength(2);
      expect(pills[0]).toMatchObject({ field: 'businessKey', values: ['BK-001', 'BK-002'] });
      expect(pills[1]).toMatchObject({ field: 'state', values: ['active', 'completed'] });
      expect(lastArgs[1].replaceUrl).toBe(true);
      expect(lastArgs[1].queryParamsHandling).toBe('merge');
    });

    it('should set criteria to null in URL when clearSearch is called', () => {
      component.activePills = [{ field: 'withIncidents', values: [] }];
      component.clearSearch();

      const calls = (router.navigate as ReturnType<typeof vi.spyOn>).mock.calls;
      const lastArgs = calls[calls.length - 1];
      expect(lastArgs[1].queryParams.criteria).toBeNull();
    });

    it('should remove a pill from the URL when removePill is called', () => {
      component.activePills = [
        { field: 'businessKey', values: ['BK-001'] },
        { field: 'state', values: ['active'] },
      ];
      component.removePill(0);

      const calls = (router.navigate as ReturnType<typeof vi.spyOn>).mock.calls;
      const lastArgs = calls[calls.length - 1];
      const pills = JSON.parse(lastArgs[1].queryParams.criteria);
      expect(pills).toHaveLength(1);
      expect(pills[0].field).toBe('state');
    });

    it('should persist page size in localStorage when onSearchPageSizeChange is called', () => {
      component.activePills = [{ field: 'withIncidents', values: [] }];
      component.searchPageSize = 50;
      component.onSearchPageSizeChange();

      const saved = JSON.parse(localStorage.getItem('globalSearchPreferences')!);
      expect(saved.pageSize).toBe(50);
    });

    it('should restore page size from localStorage when a new component instance is created', () => {
      localStorage.setItem('globalSearchPreferences', JSON.stringify({ pageSize: 100 }));

      const fixture2 = TestBed.createComponent(ProcessDefinitionsComponent);
      fixture2.detectChanges();

      expect(fixture2.componentInstance.searchPageSize).toBe(100);
      fixture2.destroy();
    });
  });
});

// ============================================================
// ProcessDefinitionsComponent — restore criteria from URL
// Tests ngOnInit reading queryParams and auto-running search
// ============================================================

describe('ProcessDefinitionsComponent — restore criteria from URL', () => {
  let fixture: ComponentFixture<ProcessDefinitionsComponent>;
  let component: ProcessDefinitionsComponent;
  let cockpitService: any;

  const restoredPills: MultiValueFilter[] = [
    { field: 'businessKey', values: ['BK-001', 'BK-002'] },
    { field: 'state', values: ['active', 'completed'] },
  ];

  beforeAll(() => { initTestEnvironment(); });

  beforeEach(async () => {
    cockpitService = {
      getProcessDefinitionsWithStatistics: vi.fn().mockReturnValue(of([])),
      getProcessDefinitionsCount: vi.fn().mockReturnValue(of(0)),
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
      queryProcessInstances: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ProcessDefinitionsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: { criteria: JSON.stringify(restoredPills) } } },
        },
      ],
    }).compileComponents();

    // Prevent router.navigate from erroring with mock ActivatedRoute
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ProcessDefinitionsComponent);
    component = fixture.componentInstance;
  });

  it('should restore activePills from URL criteria param on init', () => {
    fixture.detectChanges();

    expect(component.activePills).toHaveLength(2);
    expect(component.activePills[0]).toMatchObject({ field: 'businessKey', values: ['BK-001', 'BK-002'] });
    expect(component.activePills[1]).toMatchObject({ field: 'state', values: ['active', 'completed'] });
  });

  it('should automatically run search with the restored criteria', () => {
    fixture.detectChanges();

    expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalled();
    expect(component.searchExecuted).toBe(true);
  });

  it('should not set ignore-case flags when they are absent from URL params', () => {
    fixture.detectChanges();

    // The beforeEach setup uses criteria-only params (no vnIgnoreCase/vvIgnoreCase)
    expect(component.variableNamesIgnoreCase).toBe(false);
    expect(component.variableValuesIgnoreCase).toBe(false);
  });
});

// ============================================================
// ProcessDefinitionsComponent — restore ignore-case flags from URL
// ============================================================

describe('ProcessDefinitionsComponent — restore ignore-case flags from URL', () => {
  beforeAll(() => { initTestEnvironment(); });

  beforeEach(async () => {
    const cockpitSvc = {
      getProcessDefinitionsWithStatistics: vi.fn().mockReturnValue(of([])),
      getProcessDefinitionsCount: vi.fn().mockReturnValue(of(0)),
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
      queryProcessInstances: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ProcessDefinitionsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitSvc },
        { provide: NavMenuService, useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: {
                criteria: JSON.stringify([{ field: 'withIncidents', values: [] }]),
                vnIgnoreCase: 'true',
                vvIgnoreCase: 'true',
              },
            },
          },
        },
      ],
    }).compileComponents();

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('should restore vnIgnoreCase and vvIgnoreCase flags from URL params', () => {
    const f = TestBed.createComponent(ProcessDefinitionsComponent);
    f.detectChanges();

    expect(f.componentInstance.variableNamesIgnoreCase).toBe(true);
    expect(f.componentInstance.variableValuesIgnoreCase).toBe(true);
    f.destroy();
  });
});
