import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { DecisionDetailComponent } from './decision-detail';
import { CockpitService, DecisionDefinition, DecisionInstance } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('DecisionDetailComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: DecisionDetailComponent;
  let cockpitService: any;
  let navMenuService: any;
  let router: any;
  let routeParams$: Subject<any>;

  const mockDef: DecisionDefinition = {
    id: 'dd-1',
    key: 'approveInvoice',
    name: 'Approve Invoice',
    version: 3,
    deploymentId: 'dep-1',
    tenantId: 'tenant-a',
  };

  const mockDef_v2: DecisionDefinition = { ...mockDef, id: 'dd-1-v2', version: 2 };
  const mockDef_v1: DecisionDefinition = { ...mockDef, id: 'dd-1-v1', version: 1 };

  const mockInstances: DecisionInstance[] = [
    {
      id: 'di-1',
      decisionDefinitionId: 'dd-1',
      decisionDefinitionKey: 'approveInvoice',
      evaluationTime: '2026-01-10T08:00:00.000+0000',
      processDefinitionKey: 'invoice',
      processInstanceId: 'pi-1',
    },
    {
      id: 'di-2',
      decisionDefinitionId: 'dd-1',
      decisionDefinitionKey: 'approveInvoice',
      evaluationTime: '2026-01-11T09:00:00.000+0000',
    },
  ];

  function createComponent(): void {
    routeParams$ = new Subject();
    cockpitService = {
      getDecisionDefinition: vi.fn().mockReturnValue(of(mockDef)),
      getDecisionDefinitionVersions: vi.fn().mockReturnValue(of([mockDef, mockDef_v2, mockDef_v1])),
      getDecisionXml: vi.fn().mockReturnValue(of({ id: 'dd-1', dmnXml: '<definitions/>' })),
      getDecisionInstancesCount: vi.fn().mockReturnValue(of(2)),
      getDecisionInstancesPaginated: vi.fn().mockReturnValue(of(mockInstances)),
    };
    navMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    };
    router = { navigate: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DecisionDetailComponent, RouterModule.forRoot([])],
      providers: [
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: navMenuService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
    });

    const fixture = TestBed.createComponent(DecisionDetailComponent);
    component = fixture.componentInstance;
    localStorage.clear();
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
      routeParams$.next({ id: 'dd-1' });
      expect(component.decisionId).toBe('dd-1');
    });

    it('should set breadcrumb with definition name after load', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      expect(component.breadcrumbs[1].label).toBe('Approve Invoice');
    });

    it('should set breadcrumb with key when name is absent', () => {
      const noName = { ...mockDef, name: '' };
      createComponent();
      cockpitService.getDecisionDefinition.mockReturnValue(of(noName));
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      expect(component.breadcrumbs[1].label).toBe('approveInvoice');
    });

    it('should load all versions after loading definition', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      expect(cockpitService.getDecisionDefinitionVersions).toHaveBeenCalledWith('approveInvoice', 'tenant-a');
      expect(component.allVersions.length).toBe(3);
    });

    it('should load DMN XML after loading definition', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      expect(cockpitService.getDecisionXml).toHaveBeenCalledWith('dd-1');
      expect(component.dmnXml).toBe('<definitions/>');
    });

    it('should set dmnXml to null when XML response is null', () => {
      createComponent();
      cockpitService.getDecisionXml.mockReturnValue(of(null));
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      expect(component.dmnXml).toBeNull();
    });

    it('should load decision instances', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      expect(cockpitService.getDecisionInstancesPaginated).toHaveBeenCalled();
      expect(component.decisionInstances.length).toBe(2);
    });

    it('should set instancesCount from server response', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      expect(component.instancesCount).toBe(2);
    });

    it('should set loading to false after definition loads', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      expect(component.loading).toBe(false);
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
      routeParams$.next({ id: 'dd-1' });
    });

    it('should default to instances tab', () => {
      expect(component.activeTab).toBe('instances');
    });

    it('should have one tab defined', () => {
      expect(component.tabs.length).toBe(1);
      expect(component.tabs[0].id).toBe('instances');
    });

    it('should set active tab on setActiveTab', () => {
      component.setActiveTab('instances');
      expect(component.activeTab).toBe('instances');
    });
  });

  // =============================================
  // Version dropdown
  // =============================================

  describe('version dropdown', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
    });

    it('should toggle version dropdown', () => {
      expect(component.versionDropdownOpen).toBe(false);
      component.toggleVersionDropdown();
      expect(component.versionDropdownOpen).toBe(true);
      component.toggleVersionDropdown();
      expect(component.versionDropdownOpen).toBe(false);
    });

    it('should close version dropdown', () => {
      component.versionDropdownOpen = true;
      component.closeVersionDropdown();
      expect(component.versionDropdownOpen).toBe(false);
    });

    it('should navigate to version id on selectVersion', () => {
      component.selectVersion(mockDef_v2);
      expect(router.navigate).toHaveBeenCalledWith(['/cockpit/decisions', 'dd-1-v2']);
    });

    it('should close dropdown on selectVersion', () => {
      component.versionDropdownOpen = true;
      component.selectVersion(mockDef_v1);
      expect(component.versionDropdownOpen).toBe(false);
    });
  });

  // =============================================
  // Instances table sorting
  // =============================================

  describe('instances table sorting', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
    });

    it('should default sort by evaluationTime desc', () => {
      expect(component.instancesSortConfig.sortBy).toBe('evaluationTime');
      expect(component.instancesSortConfig.sortOrder).toBe('desc');
    });

    it('should toggle sort direction when clicking same column', () => {
      component.onInstancesSort('evaluationTime');
      expect(component.instancesSortConfig.sortOrder).toBe('asc');
    });

    it('should change column and reset to desc', () => {
      component.onInstancesSort('id');
      expect(component.instancesSortConfig.sortBy).toBe('id');
      expect(component.instancesSortConfig.sortOrder).toBe('desc');
    });

    it('should save sort config to localStorage', () => {
      component.onInstancesSort('id');
      const saved = JSON.parse(localStorage.getItem('sortDecInstTable')!);
      expect(saved.sortBy).toBe('id');
    });

    it('should restore sort config from localStorage', () => {
      localStorage.setItem('sortDecInstTable', JSON.stringify({ sortBy: 'id', sortOrder: 'asc' }));
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      expect(component.instancesSortConfig.sortBy).toBe('id');
      expect(component.instancesSortConfig.sortOrder).toBe('asc');
    });

    it('should reset to page 1 on sort', () => {
      component.instancesCurrentPage = 3;
      component.onInstancesSort('evaluationTime');
      expect(component.instancesCurrentPage).toBe(1);
    });
  });

  describe('getInstancesSortIcon', () => {
    beforeEach(() => { createComponent(); });

    it('should return faSort for non-active column', () => {
      expect(component.getInstancesSortIcon('id')).toBe(component.faSort);
    });

    it('should return faSortDown for active column with desc order', () => {
      component.instancesSortConfig = { sortBy: 'evaluationTime', sortOrder: 'desc' };
      expect(component.getInstancesSortIcon('evaluationTime')).toBe(component.faSortDown);
    });

    it('should return faSortUp for active column with asc order', () => {
      component.instancesSortConfig = { sortBy: 'evaluationTime', sortOrder: 'asc' };
      expect(component.getInstancesSortIcon('evaluationTime')).toBe(component.faSortUp);
    });
  });

  // =============================================
  // Instances table pagination
  // =============================================

  describe('instances pagination', () => {
    beforeEach(() => {
      createComponent();
      cockpitService.getDecisionInstancesCount.mockReturnValue(of(150));
      component.instancesPageSize = 50;
      component.instancesCount = 150;
    });

    it('should calculate instancesTotalPages', () => {
      expect(component.instancesTotalPages).toBe(3);
    });

    it('should calculate instancesStartIndex', () => {
      component.instancesCurrentPage = 2;
      expect(component.instancesStartIndex).toBe(51);
    });

    it('should calculate instancesEndIndex (mid page)', () => {
      component.instancesCurrentPage = 2;
      expect(component.instancesEndIndex).toBe(100);
    });

    it('should calculate instancesEndIndex (last page capped)', () => {
      component.instancesCurrentPage = 3;
      expect(component.instancesEndIndex).toBe(150);
    });

    it('should reload instances on page change', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      const callsBefore = cockpitService.getDecisionInstancesPaginated.mock.calls.length;
      component.onInstancesPageChange(2);
      expect(cockpitService.getDecisionInstancesPaginated.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('should ignore invalid page change', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      const callsBefore = cockpitService.getDecisionInstancesPaginated.mock.calls.length;
      component.onInstancesPageChange(9999);
      expect(cockpitService.getDecisionInstancesPaginated.mock.calls.length).toBe(callsBefore);
    });

    it('should reset to page 1 on page size change', () => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
      component.instancesCurrentPage = 3;
      component.onInstancesPageSizeChange();
      expect(component.instancesCurrentPage).toBe(1);
    });
  });

  // =============================================
  // Clipboard
  // =============================================

  describe('copyToClipboard / isCopied', () => {
    beforeEach(() => { createComponent(); });

    it('should return false when field not copied', () => {
      expect(component.isCopied('id')).toBe(false);
    });

    it('should return true after copyToClipboard is called', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
      await component.copyToClipboard('some-value', 'id');
      expect(component.isCopied('id')).toBe(true);
    });
  });

  // =============================================
  // URL helpers
  // =============================================

  describe('URL helpers', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
      routeParams$.next({ id: 'dd-1' });
    });

    it('getDeploymentUrl should return correct URL', () => {
      expect(component.getDeploymentUrl()).toBe('/cockpit/repository?deployment=dep-1');
    });

    it('getDeploymentUrl should return # when no definition', () => {
      component.decisionDefinition = null;
      expect(component.getDeploymentUrl()).toBe('#');
    });

    it('getProcessDefinitionUrl should return URL with key', () => {
      const url = component.getProcessDefinitionUrl(mockInstances[0]);
      expect(url).toBe('/cockpit/processes/invoice/instances');
    });

    it('getProcessDefinitionUrl should return # when no key', () => {
      expect(component.getProcessDefinitionUrl(mockInstances[1])).toBe('#');
    });

    it('getProcessInstanceUrl should return URL with instance id', () => {
      const url = component.getProcessInstanceUrl(mockInstances[0]);
      expect(url).toBe('/cockpit/processes/instance/pi-1');
    });

    it('getProcessInstanceUrl should return # when no processInstanceId', () => {
      expect(component.getProcessInstanceUrl(mockInstances[1])).toBe('#');
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

    it('should return formatted date string', () => {
      const result = component.formatDate('2026-01-10T08:00:00.000Z');
      expect(result).not.toBe('-');
      expect(result.length).toBeGreaterThan(0);
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

    it('should stringify objects', () => {
      expect(component.formatValue({ a: 1 })).toBe('{"a":1}');
    });

    it('should convert primitives to string', () => {
      expect(component.formatValue(42)).toBe('42');
      expect(component.formatValue(true)).toBe('true');
    });
  });

  describe('truncateId', () => {
    beforeEach(() => { createComponent(); });

    it('should truncate long id', () => {
      expect(component.truncateId('abcdefghijklmnop', 8)).toBe('abcdefgh...');
    });

    it('should not truncate short id', () => {
      expect(component.truncateId('abc', 8)).toBe('abc');
    });
  });

  describe('toggleDmnExpand', () => {
    beforeEach(() => { createComponent(); });

    it('should toggle isDmnExpanded', () => {
      expect(component.isDmnExpanded).toBe(false);
      component.toggleDmnExpand();
      expect(component.isDmnExpanded).toBe(true);
      component.toggleDmnExpand();
      expect(component.isDmnExpanded).toBe(false);
    });
  });
});
