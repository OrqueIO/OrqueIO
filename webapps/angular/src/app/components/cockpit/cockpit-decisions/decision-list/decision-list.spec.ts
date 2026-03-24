import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { DecisionListComponent } from './decision-list';
import { CockpitService, DecisionDefinition } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { RouterModule } from '@angular/router';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('DecisionListComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: DecisionListComponent;
  let cockpitService: any;
  let navMenuService: any;

  const mockDef1: DecisionDefinition = {
    id: 'dd-1', key: 'approveInvoice', name: 'Approve Invoice', version: 1, deploymentId: 'dep-1',
  };
  const mockDef2: DecisionDefinition = {
    id: 'dd-2', key: 'denyInvoice', name: 'Deny Invoice', version: 1, deploymentId: 'dep-1',
    tenantId: 'tenant-a',
  };
  const mockDef3: DecisionDefinition = {
    id: 'dd-3', key: 'routeInvoice', name: 'Route Invoice', version: 1, deploymentId: 'dep-2',
    decisionRequirementsDefinitionId: 'drd-1',
    decisionRequirementsDefinitionKey: 'invoiceDrd',
    drd: { id: 'drd-1', key: 'invoiceDrd', name: 'Invoice DRD' },
  };

  function createComponent(): void {
    cockpitService = {
      getDecisionDefinitionsCount: vi.fn().mockReturnValue(of(3)),
      getDecisionDefinitionsPaginated: vi.fn().mockReturnValue(of([mockDef1, mockDef2, mockDef3])),
    };
    navMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DecisionListComponent, RouterModule.forRoot([])],
      providers: [
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: navMenuService },
      ],
    });

    const fixture = TestBed.createComponent(DecisionListComponent);
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

    it('should load decision definitions on init', () => {
      createComponent();
      component.ngOnInit();
      expect(cockpitService.getDecisionDefinitionsPaginated).toHaveBeenCalled();
      expect(cockpitService.getDecisionDefinitionsCount).toHaveBeenCalled();
    });

    it('should set loading to false after data loads', () => {
      createComponent();
      component.ngOnInit();
      expect(component.loading).toBe(false);
    });

    it('should populate decisionDefinitions', () => {
      createComponent();
      component.ngOnInit();
      expect(component.decisionDefinitions.length).toBe(3);
    });

    it('should set totalCount from server response', () => {
      createComponent();
      component.ngOnInit();
      expect(component.totalCount).toBe(3);
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
  // Pagination
  // =============================================

  describe('pagination', () => {
    beforeEach(() => {
      createComponent();
      cockpitService.getDecisionDefinitionsCount.mockReturnValue(of(120));
      cockpitService.getDecisionDefinitionsPaginated.mockReturnValue(of([mockDef1]));
      component.pageSize = 50;
      component.totalCount = 120;
    });

    it('should calculate totalPages correctly', () => {
      expect(component.totalPages).toBe(3); // ceil(120/50)
    });

    it('should calculate startIndex for page 1', () => {
      component.currentPage = 1;
      expect(component.startIndex).toBe(1);
    });

    it('should calculate endIndex for page 1', () => {
      component.currentPage = 1;
      expect(component.endIndex).toBe(50);
    });

    it('should calculate endIndex for last page (capped at total)', () => {
      component.currentPage = 3;
      expect(component.endIndex).toBe(120);
    });

    it('should change page and reload', () => {
      component.ngOnInit();
      component.onPageChange(2);
      expect(component.currentPage).toBe(2);
      expect(cockpitService.getDecisionDefinitionsPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ firstResult: 50 })
      );
    });

    it('should ignore page change below 1', () => {
      component.ngOnInit();
      const initialCallCount = cockpitService.getDecisionDefinitionsPaginated.mock.calls.length;
      component.onPageChange(0);
      expect(cockpitService.getDecisionDefinitionsPaginated.mock.calls.length).toBe(initialCallCount);
    });

    it('should ignore page change above totalPages', () => {
      component.ngOnInit();
      const initialCallCount = cockpitService.getDecisionDefinitionsPaginated.mock.calls.length;
      component.onPageChange(999);
      expect(cockpitService.getDecisionDefinitionsPaginated.mock.calls.length).toBe(initialCallCount);
    });

    it('should reset to page 1 on page size change', () => {
      component.currentPage = 3;
      component.onPageSizeChange();
      expect(component.currentPage).toBe(1);
    });
  });

  // =============================================
  // Sorting
  // =============================================

  describe('sorting', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
    });

    it('should default sort by name asc', () => {
      expect(component.sortConfig.sortBy).toBe('name');
      expect(component.sortConfig.sortOrder).toBe('asc');
    });

    it('should toggle sort direction when clicking same column', () => {
      component.onSort('name');
      expect(component.sortConfig.sortOrder).toBe('desc');
    });

    it('should change column and reset to asc', () => {
      component.onSort('key');
      expect(component.sortConfig.sortBy).toBe('key');
      expect(component.sortConfig.sortOrder).toBe('asc');
    });

    it('should save sort config to localStorage', () => {
      component.onSort('key');
      const saved = JSON.parse(localStorage.getItem('sortDecDefTable')!);
      expect(saved.sortBy).toBe('key');
      expect(saved.sortOrder).toBe('asc');
    });

    it('should restore valid sort config from localStorage', () => {
      localStorage.setItem('sortDecDefTable', JSON.stringify({ sortBy: 'tenantId', sortOrder: 'desc' }));
      createComponent();
      component.ngOnInit();
      expect(component.sortConfig.sortBy).toBe('tenantId');
      expect(component.sortConfig.sortOrder).toBe('desc');
    });

    it('should reject invalid column from localStorage', () => {
      localStorage.setItem('sortDecDefTable', JSON.stringify({ sortBy: '__proto__', sortOrder: 'asc' }));
      createComponent();
      component.ngOnInit();
      expect(component.sortConfig.sortBy).toBe('name'); // default
    });

    it('should reject invalid sortOrder from localStorage', () => {
      localStorage.setItem('sortDecDefTable', JSON.stringify({ sortBy: 'key', sortOrder: 'random' }));
      createComponent();
      component.ngOnInit();
      expect(component.sortConfig.sortOrder).toBe('asc'); // default
    });

    it('should reset to page 1 on sort', () => {
      component.currentPage = 3;
      component.onSort('name');
      expect(component.currentPage).toBe(1);
    });
  });

  describe('getSortIcon', () => {
    beforeEach(() => {
      createComponent();
      component.ngOnInit();
    });

    it('should return faSort for non-active column', () => {
      expect(component.getSortIcon('key')).toBe(component.faSort);
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

  // =============================================
  // Search / client-side filtering
  // =============================================

  describe('applyClientFilter (via loadDecisionDefinitions)', () => {
    beforeEach(() => {
      createComponent();
      cockpitService.getDecisionDefinitionsCount.mockReturnValue(of(3));
      cockpitService.getDecisionDefinitionsPaginated.mockReturnValue(of([mockDef1, mockDef2, mockDef3]));
    });

    it('should show all definitions when search is empty', () => {
      component.searchQuery = '';
      component.loadDecisionDefinitions();
      expect(component.filteredDefinitions.length).toBe(3);
    });

    it('should filter by name (case-insensitive)', () => {
      component.searchQuery = 'approve';
      component.loadDecisionDefinitions();
      expect(component.filteredDefinitions.length).toBe(1);
      expect(component.filteredDefinitions[0].key).toBe('approveInvoice');
    });

    it('should filter by key', () => {
      component.searchQuery = 'denyInvoice';
      component.loadDecisionDefinitions();
      expect(component.filteredDefinitions).toContain(mockDef2);
    });

    it('should filter by tenantId', () => {
      component.searchQuery = 'tenant-a';
      component.loadDecisionDefinitions();
      expect(component.filteredDefinitions).toContain(mockDef2);
    });

    it('should return empty when no match', () => {
      component.searchQuery = 'xyznotfound';
      component.loadDecisionDefinitions();
      expect(component.filteredDefinitions.length).toBe(0);
    });
  });

  // =============================================
  // Helper methods
  // =============================================

  describe('getDisplayName', () => {
    beforeEach(() => { createComponent(); });

    it('should return name when available', () => {
      expect(component.getDisplayName(mockDef1)).toBe('Approve Invoice');
    });

    it('should fallback to key when name is empty', () => {
      const noName = { ...mockDef1, name: '' };
      expect(component.getDisplayName(noName as DecisionDefinition)).toBe('approveInvoice');
    });
  });

  describe('getDrdName', () => {
    beforeEach(() => { createComponent(); });

    it('should return drd.name when drd object is present', () => {
      expect(component.getDrdName(mockDef3)).toBe('Invoice DRD');
    });

    it('should return drd.key when drd.name is absent', () => {
      const withDrdNoName = { ...mockDef3, drd: { id: 'drd-1', key: 'invoiceDrd' } };
      expect(component.getDrdName(withDrdNoName as DecisionDefinition)).toBe('invoiceDrd');
    });

    it('should fallback to decisionRequirementsDefinitionKey when no drd object', () => {
      const noObject = { ...mockDef2, decisionRequirementsDefinitionKey: 'someKey', drd: undefined };
      expect(component.getDrdName(noObject as DecisionDefinition)).toBe('someKey');
    });

    it('should return null when no DRD info', () => {
      expect(component.getDrdName(mockDef1)).toBeNull();
    });
  });

  describe('hasDrd', () => {
    beforeEach(() => { createComponent(); });

    it('should return true when drd object is present', () => {
      expect(component.hasDrd(mockDef3)).toBe(true);
    });

    it('should return true when decisionRequirementsDefinitionId is set', () => {
      const withId = { ...mockDef1, decisionRequirementsDefinitionId: 'drd-99' };
      expect(component.hasDrd(withId as DecisionDefinition)).toBe(true);
    });

    it('should return false when no DRD info', () => {
      expect(component.hasDrd(mockDef1)).toBe(false);
    });
  });

  describe('getDrdId', () => {
    beforeEach(() => { createComponent(); });

    it('should return drd.id when present', () => {
      expect(component.getDrdId(mockDef3)).toBe('drd-1');
    });

    it('should fallback to decisionRequirementsDefinitionId', () => {
      const withId = { ...mockDef1, decisionRequirementsDefinitionId: 'drd-99', drd: undefined };
      expect(component.getDrdId(withId as DecisionDefinition)).toBe('drd-99');
    });

    it('should return null when nothing is set', () => {
      expect(component.getDrdId(mockDef1)).toBeNull();
    });
  });

  // =============================================
  // Error handling
  // =============================================

  describe('error handling', () => {
    it('should set loading to false on forkJoin error', () => {
      createComponent();
      cockpitService.getDecisionDefinitionsCount.mockReturnValue(of(0));
      cockpitService.getDecisionDefinitionsPaginated.mockReturnValue(
        new (require('rxjs').Observable)((sub: any) => sub.error(new Error('HTTP fail')))
      );
      component.loadDecisionDefinitions();
      expect(component.loading).toBe(false);
    });
  });
});
