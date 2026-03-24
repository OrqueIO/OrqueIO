import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Subject } from 'rxjs';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DecisionInstanceComponent } from './decision-instance';
import {
  CockpitService,
  DecisionDefinition,
  DecisionInstance,
  DecisionInput,
  DecisionOutput,
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('DecisionInstanceComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: DecisionInstanceComponent;
  let cockpitService: any;
  let navMenuService: any;
  let routeParams$: Subject<any>;

  const mockInputs: DecisionInput[] = [
    { id: 'in-1', decisionInstanceId: 'di-1', clauseId: 'clause-amount', clauseName: 'Amount', type: 'Double', value: 250.0 },
    { id: 'in-2', decisionInstanceId: 'di-1', clauseId: 'clause-category', clauseName: 'Category', type: 'String', value: 'premium' },
  ];

  const mockOutputs: DecisionOutput[] = [
    { id: 'out-1', decisionInstanceId: 'di-1', clauseId: 'clause-result', clauseName: 'Result', ruleId: 'rule-1', ruleOrder: 1, variableName: 'approved', type: 'Boolean', value: true },
    { id: 'out-2', decisionInstanceId: 'di-1', clauseId: 'clause-category', clauseName: 'Category', ruleId: 'rule-1', ruleOrder: 1, variableName: 'category', type: 'String', value: 'gold' },
    { id: 'out-3', decisionInstanceId: 'di-1', clauseId: 'clause-result', clauseName: 'Result', ruleId: 'rule-2', ruleOrder: 2, variableName: 'approved', type: 'Boolean', value: false },
  ];

  const mockInstance: DecisionInstance = {
    id: 'di-1',
    decisionDefinitionId: 'dd-1',
    decisionDefinitionKey: 'approveInvoice',
    decisionDefinitionName: 'Approve Invoice',
    evaluationTime: '2026-01-15T12:00:00.000+0000',
    processInstanceId: 'pi-1',
    processDefinitionKey: 'invoice',
    caseInstanceId: 'ci-1',
    decisionRequirementsDefinitionId: 'drd-1',
    inputs: mockInputs,
    outputs: mockOutputs,
  };

  const mockDef: DecisionDefinition = {
    id: 'dd-1',
    key: 'approveInvoice',
    name: 'Approve Invoice',
    version: 1,
    deploymentId: 'dep-1',
  };

  function createComponent(): void {
    routeParams$ = new Subject();
    cockpitService = {
      getDecisionInstance: vi.fn().mockReturnValue(of(mockInstance)),
      getDecisionDefinition: vi.fn().mockReturnValue(of(mockDef)),
      getDecisionXml: vi.fn().mockReturnValue(of({ id: 'dd-1', dmnXml: '<definitions/>' })),
    };
    navMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DecisionInstanceComponent, RouterModule.forRoot([])],
      providers: [
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: navMenuService },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
    });

    const fixture = TestBed.createComponent(DecisionInstanceComponent);
    component = fixture.componentInstance;
  }

  // =============================================
  // Initialization
  // =============================================

  describe('ngOnInit', () => {
    it('should call navMenuService.setMenuItems', () => {
      createComponent();
      component.ngOnInit();
      expect(navMenuService.setMenuItems).toHaveBeenCalled();
    });

    it('should subscribe to route params', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(component.instanceId).toBe('di-1');
    });

    it('should load decision instance on route param change', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(cockpitService.getDecisionInstance).toHaveBeenCalledWith('di-1');
    });

    it('should set decisionInstance after load', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(component.decisionInstance).toEqual(mockInstance);
    });

    it('should load definition after instance loads', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(cockpitService.getDecisionDefinition).toHaveBeenCalledWith('dd-1');
      expect(component.decisionDefinition).toEqual(mockDef);
    });

    it('should load DMN XML after definition loads', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(cockpitService.getDecisionXml).toHaveBeenCalledWith('dd-1');
      expect(component.dmnXml).toBe('<definitions/>');
    });

    it('should set dmnXml to null when response is null', () => {
      createComponent();
      cockpitService.getDecisionXml.mockReturnValue(of(null));
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(component.dmnXml).toBeNull();
    });

    it('should update breadcrumbs with definition name', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      // breadcrumb[1] should be definition name/key with route
      expect(component.breadcrumbs[1].label).toBe('Approve Invoice');
      expect(component.breadcrumbs[1].route).toBe('/cockpit/decisions/dd-1');
    });

    it('should use decisionDefinitionKey when name is absent', () => {
      const noName = { ...mockInstance, decisionDefinitionName: undefined };
      createComponent();
      cockpitService.getDecisionInstance.mockReturnValue(of(noName));
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(component.breadcrumbs[1].label).toBe('approveInvoice');
    });

    it('should set breadcrumb[2] to truncated instance id', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(component.breadcrumbs[2].label).toBe('di-1'); // short id, no truncation
    });

    it('should set loading to false after load', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(component.loading).toBe(false);
    });

    it('should set loading to false on error', () => {
      createComponent();
      cockpitService.getDecisionInstance.mockReturnValue(
        new (require('rxjs').Observable)((sub: any) => sub.error(new Error('err')))
      );
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
      expect(component.loading).toBe(false);
    });

    it('should not load definition when instance is null', () => {
      createComponent();
      cockpitService.getDecisionInstance.mockReturnValue(of(null));
      component.ngOnInit();
      routeParams$.next({ id: 'di-999' });
      expect(cockpitService.getDecisionDefinition).not.toHaveBeenCalled();
      expect(component.decisionInstance).toBeNull();
    });
  });

  describe('ngOnDestroy', () => {
    it('should call navMenuService.clearMenuItems', () => {
      createComponent();
      component.ngOnInit();
      component.ngOnDestroy();
      expect(navMenuService.clearMenuItems).toHaveBeenCalled();
    });
  });

  // =============================================
  // Tabs
  // =============================================

  describe('tabs', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
    });

    it('should default to inputs tab', () => {
      expect(component.activeTab).toBe('inputs');
    });

    it('should have inputs and outputs tabs', () => {
      expect(component.tabs.map(t => t.id)).toEqual(['inputs', 'outputs']);
    });

    it('should switch to outputs tab', () => {
      component.setActiveTab('outputs');
      expect(component.activeTab).toBe('outputs');
    });

    it('should switch back to inputs tab', () => {
      component.setActiveTab('outputs');
      component.setActiveTab('inputs');
      expect(component.activeTab).toBe('inputs');
    });
  });

  // =============================================
  // Computed properties
  // =============================================

  describe('inputs getter', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
    });

    it('should return inputs from loaded instance', () => {
      expect(component.inputs).toEqual(mockInputs);
      expect(component.inputs.length).toBe(2);
    });

    it('should return empty array when instance is null', () => {
      component.decisionInstance = null;
      expect(component.inputs).toEqual([]);
    });

    it('should return empty array when inputs are absent', () => {
      component.decisionInstance = { ...mockInstance, inputs: undefined };
      expect(component.inputs).toEqual([]);
    });
  });

  describe('outputs getter', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
    });

    it('should return outputs from loaded instance', () => {
      expect(component.outputs).toEqual(mockOutputs);
      expect(component.outputs.length).toBe(3);
    });

    it('should return empty array when instance is null', () => {
      component.decisionInstance = null;
      expect(component.outputs).toEqual([]);
    });
  });

  describe('highlightedRules getter', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
    });

    it('should return unique rule ids from outputs', () => {
      // mockOutputs has rule-1 (twice) and rule-2
      const rules = component.highlightedRules;
      expect(rules).toContain('rule-1');
      expect(rules).toContain('rule-2');
      expect(rules.length).toBe(2); // deduplicated
    });

    it('should return empty array when no outputs', () => {
      component.decisionInstance = { ...mockInstance, outputs: undefined };
      expect(component.highlightedRules).toEqual([]);
    });

    it('should return empty array when instance is null', () => {
      component.decisionInstance = null;
      expect(component.highlightedRules).toEqual([]);
    });

    it('should filter out outputs without ruleId', () => {
      const outputsNoRule: DecisionOutput[] = [
        { ...mockOutputs[0], ruleId: '' },
        { ...mockOutputs[1], ruleId: 'rule-x' },
      ];
      component.decisionInstance = { ...mockInstance, outputs: outputsNoRule };
      const rules = component.highlightedRules;
      expect(rules).not.toContain('');
      expect(rules).toContain('rule-x');
    });
  });

  // =============================================
  // URL helpers
  // =============================================

  describe('URL helpers', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'di-1' });
    });

    it('getProcessInstanceUrl should return correct URL', () => {
      expect(component.getProcessInstanceUrl()).toBe('/cockpit/processes/instance/pi-1');
    });

    it('getProcessInstanceUrl should return # when no processInstanceId', () => {
      component.decisionInstance = { ...mockInstance, processInstanceId: undefined };
      expect(component.getProcessInstanceUrl()).toBe('#');
    });

    it('getCaseInstanceUrl should return correct URL', () => {
      expect(component.getCaseInstanceUrl()).toBe('/cockpit/case/instance/ci-1');
    });

    it('getCaseInstanceUrl should return # when no caseInstanceId', () => {
      component.decisionInstance = { ...mockInstance, caseInstanceId: undefined };
      expect(component.getCaseInstanceUrl()).toBe('#');
    });

    it('getDefinitionUrl should return URL with definition id', () => {
      expect(component.getDefinitionUrl()).toBe('/cockpit/decisions/dd-1');
    });

    it('getDefinitionUrl should return # when no instance', () => {
      component.decisionInstance = null;
      expect(component.getDefinitionUrl()).toBe('#');
    });

    it('getDeploymentUrl should return URL with deploymentId', () => {
      expect(component.getDeploymentUrl()).toBe('/cockpit/repository?deployment=dep-1');
    });

    it('getDeploymentUrl should return # when no definition loaded', () => {
      component.decisionDefinition = null;
      expect(component.getDeploymentUrl()).toBe('#');
    });

    it('getDrdUrl should return URL for DRD', () => {
      // Uses decisionDefinitionId of the instance (not DRD id)
      expect(component.getDrdUrl()).toBe('/cockpit/decisions/dd-1');
    });

    it('getDrdUrl should return # when no DRD', () => {
      component.decisionInstance = { ...mockInstance, decisionRequirementsDefinitionId: undefined };
      expect(component.getDrdUrl()).toBe('#');
    });
  });

  // =============================================
  // Formatting helpers
  // =============================================

  describe('formatDate', () => {
    beforeEach(() => { createComponent(); });

    it('should return "-" for undefined', () => {
      expect(component.formatDate(undefined)).toBe('-');
    });

    it('should return localized date string', () => {
      const result = component.formatDate('2026-01-15T12:00:00.000Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe('-');
    });
  });

  describe('formatValue', () => {
    beforeEach(() => { createComponent(); });

    it('should return "null" for null', () => {
      expect(component.formatValue(null)).toBe('null');
    });

    it('should return "null" for undefined', () => {
      expect(component.formatValue(undefined)).toBe('null');
    });

    it('should pretty-print objects', () => {
      const result = component.formatValue({ key: 'val' });
      expect(result).toContain('"key"');
      expect(result).toContain('"val"');
    });

    it('should convert number to string', () => {
      expect(component.formatValue(3.14)).toBe('3.14');
    });

    it('should convert boolean to string', () => {
      expect(component.formatValue(true)).toBe('true');
    });
  });

  describe('formatType', () => {
    beforeEach(() => { createComponent(); });

    it('should return "Unknown" for undefined', () => {
      expect(component.formatType(undefined)).toBe('Unknown');
    });

    it('should return simple type name unchanged', () => {
      expect(component.formatType('String')).toBe('String');
    });

    it('should extract class name from qualified Java type', () => {
      expect(component.formatType('java.lang.String')).toBe('String');
    });

    it('should extract class name from deeply nested type', () => {
      expect(component.formatType('com.example.domain.MyClass')).toBe('MyClass');
    });
  });

  describe('truncateId', () => {
    beforeEach(() => { createComponent(); });

    it('should truncate id longer than default 8 chars', () => {
      expect(component.truncateId('abcdefghijk')).toBe('abcdefgh...');
    });

    it('should not truncate id equal to limit', () => {
      expect(component.truncateId('abcdefgh')).toBe('abcdefgh');
    });

    it('should handle custom length', () => {
      expect(component.truncateId('hello world', 5)).toBe('hello...');
    });

    it('should handle empty string', () => {
      expect(component.truncateId('')).toBe('');
    });
  });

  describe('toggleDmnExpand', () => {
    beforeEach(() => { createComponent(); });

    it('should toggle isDmnExpanded', () => {
      expect(component.isDmnExpanded).toBe(false);
      component.toggleDmnExpand();
      expect(component.isDmnExpanded).toBe(true);
    });
  });

  // =============================================
  // Clipboard
  // =============================================

  describe('isCopied', () => {
    beforeEach(() => { createComponent(); });

    it('should return false when nothing is copied', () => {
      expect(component.isCopied('myField')).toBe(false);
    });

    it('should return true after copyToClipboard is called', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
      await component.copyToClipboard('some-id', 'myField');
      expect(component.isCopied('myField')).toBe(true);
    });

    it('should return false for a different field', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
      await component.copyToClipboard('some-id', 'fieldA');
      expect(component.isCopied('fieldB')).toBe(false);
    });
  });
});
