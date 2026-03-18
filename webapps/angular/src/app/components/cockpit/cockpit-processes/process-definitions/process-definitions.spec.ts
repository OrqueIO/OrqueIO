import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ProcessDefinitionsComponent } from './process-definitions';
import { CockpitService, ProcessDefinitionStatistics } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('ProcessDefinitionsComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

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

  beforeEach(async () => {
    cockpitService = {
      getProcessDefinitionsWithStatistics: vi.fn().mockReturnValue(of(mockStats)),
      getProcessDefinitionsCount: vi.fn().mockReturnValue(of(3)),
    } as any;

    navMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    } as any;

    // Clear localStorage before each test
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

  describe('ngOnInit', () => {
    it('should set menu items on init', () => {
      fixture.detectChanges();
      expect(navMenuService.setMenuItems).toHaveBeenCalled();
    });

    it('should load process definitions on init', async () => {
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

  describe('applyFilter', () => {
    beforeEach(async () => {
      fixture.detectChanges();
    });

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

    it('should return empty for non-matching search', () => {
      component.searchQuery = 'nonexistent';
      component.applyFilter();
      expect(component.filteredDefinitions.length).toBe(0);
    });
  });

  describe('sorting', () => {
    beforeEach(async () => {
      fixture.detectChanges();
    });

    it('should sort by name ascending by default', () => {
      expect(component.sortConfig.sortBy).toBe('name');
      expect(component.sortConfig.sortOrder).toBe('asc');
      expect(component.filteredDefinitions[0].definition.name).toBe('Approval');
    });

    it('should toggle sort order when clicking same column', () => {
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

    it('should sort by incidents count', () => {
      component.onSort('incidents');
      component.onSort('incidents'); // Toggle to desc
      expect(component.filteredDefinitions[0].definition.key).toBe('invoice');
    });

    it('should persist sort config to localStorage', () => {
      component.onSort('key');
      const saved = JSON.parse(localStorage.getItem('cockpit.processes.sortConfig')!);
      expect(saved.sortBy).toBe('key');
      expect(saved.sortOrder).toBe('asc');
    });

    it('should load sort config from localStorage', () => {
      localStorage.setItem('cockpit.processes.sortConfig', JSON.stringify({ sortBy: 'instances', sortOrder: 'desc' }));

      // Create a new component to test initialization
      const fixture2 = TestBed.createComponent(ProcessDefinitionsComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.sortConfig.sortBy).toBe('instances');
      expect(component2.sortConfig.sortOrder).toBe('desc');
    });
  });

  describe('getSortIcon', () => {
    it('should return faSort for inactive column', () => {
      expect(component.getSortIcon('instances')).toBe(component.faSort);
    });

    it('should return faSortUp for active column with asc', () => {
      component.sortConfig = { sortBy: 'name', sortOrder: 'asc' };
      expect(component.getSortIcon('name')).toBe(component.faSortUp);
    });

    it('should return faSortDown for active column with desc', () => {
      component.sortConfig = { sortBy: 'name', sortOrder: 'desc' };
      expect(component.getSortIcon('name')).toBe(component.faSortDown);
    });
  });

  describe('getDefinitionName', () => {
    it('should return name when available', () => {
      expect(component.getDefinitionName(mockStats[0])).toBe('Invoice');
    });

    it('should fallback to key when name is missing', () => {
      const def = { ...mockStats[0], definition: { ...mockStats[0].definition, name: '' } };
      expect(component.getDefinitionName(def)).toBe('invoice');
    });

    it('should fallback to id when both name and key are missing', () => {
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

  describe('getStateClass', () => {
    it('should return state-error when incidents exist', () => {
      expect(component.getStateClass(mockStats[0])).toBe('state-error');
    });

    it('should return state-running when instances > 0 and no incidents', () => {
      expect(component.getStateClass(mockStats[1])).toBe('state-running');
    });

    it('should return state-ok when no instances and no incidents', () => {
      expect(component.getStateClass(mockStats[2])).toBe('state-ok');
    });
  });

  describe('getStateIcon', () => {
    it('should return faExclamationTriangle for error state', () => {
      expect(component.getStateIcon(mockStats[0])).toBe(component.faExclamationTriangle);
    });

    it('should return faPlayCircle for running state', () => {
      expect(component.getStateIcon(mockStats[1])).toBe(component.faPlayCircle);
    });

    it('should return faCheckCircle for ok state', () => {
      expect(component.getStateIcon(mockStats[2])).toBe(component.faCheckCircle);
    });
  });

  describe('error handling', () => {
    it('should set loading to false on error', async () => {
      cockpitService.getProcessDefinitionsWithStatistics!.mockReturnValue(throwError(() => new Error('fail')));
      cockpitService.getProcessDefinitionsCount!.mockReturnValue(throwError(() => new Error('fail')));

      component.loadProcessDefinitions();

      expect(component.loading).toBe(false);
    });
  });

  describe('breadcrumbs', () => {
    it('should have processes breadcrumb', () => {
      expect(component.breadcrumbs.length).toBe(1);
      expect(component.breadcrumbs[0].translateKey).toBe('cockpit.menu.processes');
    });
  });
});
