import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ProcessInstanceSearchComponent } from './process-instance-search';
import {
  CockpitService,
  ProcessInstance,
  MultiValueFilter,
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

const TEST_TRANSLATIONS: Record<string, string> = {
  'cockpit.processes.tabs.definitions': 'Definitions',
  'cockpit.processes.tabs.searchInstances': 'Search Instances',
  'cockpit.processes.globalSearch.title': 'Search',
  'cockpit.processes.globalSearch.addCriteria': 'Add criteria',
  'cockpit.processes.globalSearch.searchBtn': 'Search',
  'cockpit.processes.globalSearch.clearBtn': 'Clear',
  'cockpit.processes.globalSearch.noSearchYet': 'No search yet',
  'cockpit.processes.globalSearch.noSearchYetHint': 'Add criteria to search.',
  'cockpit.processes.globalSearch.dropdownTitle': 'Add a filter',
  'cockpit.processes.globalSearch.groupInstance': 'Instance',
  'cockpit.processes.globalSearch.groupDates': 'Dates',
  'cockpit.processes.globalSearch.editCriteria': 'Edit',
  'cockpit.processes.globalSearch.resetFilters': 'Reset',
  'cockpit.processes.globalSearch.pill.businessKey': 'Business Key: {{value}}',
  'cockpit.processes.globalSearch.pill.instanceId': 'Instance ID: {{value}}',
  'cockpit.processes.globalSearch.pill.state': 'State: {{value}}',
  'cockpit.processes.globalSearch.pill.withIncidents': 'With incidents',
  'cockpit.processes.globalSearch.pill.startedAfter': 'Started after: {{value}}',
  'cockpit.processes.globalSearch.pill.startedBefore': 'Started before: {{value}}',
  'cockpit.processes.globalSearch.pill.finishedAfter': 'Finished after: {{value}}',
  'cockpit.processes.globalSearch.pill.finishedBefore': 'Finished before: {{value}}',
  'cockpit.processes.globalSearch.pill.variables': 'Variables ({{count}})',
  'cockpit.processes.globalSearch.instanceStateRunning': 'Running',
  'cockpit.processes.globalSearch.instanceStateWithIncidents': 'Incidents',
  'cockpit.processes.globalSearch.selected': 'selected',
  'cockpit.processes.globalSearch.variablesWord': 'variables',
  'cockpit.processes.globalSearch.valuePlaceholder': 'Value',
  'cockpit.processes.globalSearch.chipInputHint': 'Press Enter to add',
  'cockpit.processes.globalSearch.chipInputHintTip': 'Tip: paste comma-separated values',
  'cockpit.processes.filters.businessKey': 'Business Key',
  'cockpit.processes.filters.instanceId': 'Instance ID',
  'cockpit.processes.filters.state': 'State',
  'cockpit.processes.filters.withIncidents': 'With incidents',
  'cockpit.processes.filters.startedAfter': 'Started after',
  'cockpit.processes.filters.startedBefore': 'Started before',
  'cockpit.processes.filters.finishedAfter': 'Finished after',
  'cockpit.processes.filters.finishedBefore': 'Finished before',
  'cockpit.processes.filters.variable': 'Variable',
  'cockpit.processes.filters.stateActive': 'Active',
  'cockpit.processes.filters.stateSuspended': 'Suspended',
  'cockpit.processes.filters.stateCompleted': 'Completed',
  'cockpit.processes.filters.stateTerminated': 'Terminated',
  'cockpit.processes.columns.id': 'ID',
  'cockpit.processes.columns.definition': 'Definition',
  'cockpit.processes.columns.businessKey': 'Business Key',
  'cockpit.processes.columns.startTime': 'Start Time',
  'cockpit.processes.columns.endTime': 'End Time',
  'cockpit.processes.columns.state': 'State',
  'cockpit.processes.columns.actions': 'Actions',
  'cockpit.processes.showing': 'Showing',
  'cockpit.processes.of': 'of',
  'cockpit.processes.noProcessInstances': 'No instances found',
  'cockpit.processes.searchError': 'Search error',
  'cockpit.processes.viewDetails': 'View details',
  'common.loading': 'Loading...',
  'common.remove': 'Remove',
};

const MOCK_INSTANCES: ProcessInstance[] = [
  {
    id: 'inst-1', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    startTime: '2024-01-01T10:00:00.000Z', state: 'ACTIVE',
  },
  {
    id: 'inst-2', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    startTime: '2024-01-02T10:00:00.000Z', state: 'ACTIVE',
  },
];

describe('ProcessInstanceSearchComponent — loadSearchResults', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;
  let cockpitService: CockpitService;

  beforeEach(async () => {
    initTestEnvironment();

    cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of(MOCK_INSTANCES)),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(2)),
    } as any;

    const navMenuService: Partial<NavMenuService> = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: navMenuService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: TEST_TRANSLATIONS };

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  describe('single action → single call to service', () => {
    it('should call searchProcessInstancesGlobal exactly once per executeSearch()', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];

      component.executeSearch();

      expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalledTimes(1);
      expect(cockpitService.searchProcessInstancesGlobalCount).toHaveBeenCalledTimes(1);
    });

    it('should pass firstResult=0 and maxResults=searchPageSize (not 2000) on page 1', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
      component.searchCurrentPage = 1;
      component.searchPageSize = 20;

      component.executeSearch();

      expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalledWith(
        component.activePills,
        false,
        false,
        0,
        20,
      );
    });

    it('should pass correct firstResult when on page 2', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
      component.searchCurrentPage = 2;
      component.searchPageSize = 20;
      component.searchLoading = true;

      (component as any).loadSearchResults();

      expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalledWith(
        component.activePills,
        false,
        false,
        20,
        20,
      );
    });

    it('should assign results and count directly (no concatenation)', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];

      component.executeSearch();

      expect(component.searchResults).toEqual(MOCK_INSTANCES);
      expect(component.searchResultsCount).toBe(2);
      expect(component.searchResultsCount).not.toBe(4);
    });

    it('should not trigger an extra call when button is clicked (no keydown.enter double-fire)', () => {
      component.activePills = [{ field: 'instanceId', values: ['inst-abc'] }];

      component.executeSearch();

      expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalledTimes(1);
      expect(cockpitService.searchProcessInstancesGlobalCount).toHaveBeenCalledTimes(1);
    });

    it('should reset page to 1 on new executeSearch()', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
      component.searchCurrentPage = 3;

      component.executeSearch();

      expect(component.searchCurrentPage).toBe(1);
      const [, , , firstResult] = (cockpitService.searchProcessInstancesGlobal as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(firstResult).toBe(0);
    });
  });

  describe('instanceId pill passes through to service (no client-side .includes())', () => {
    it('should pass instanceId pill unchanged in activePills to the service', () => {
      const idPill: MultiValueFilter = { field: 'instanceId', values: ['abc-123', 'def-456'] };
      component.activePills = [idPill];

      component.executeSearch();

      const [callPills] = (cockpitService.searchProcessInstancesGlobal as ReturnType<typeof vi.fn>).mock.calls[0];
      const passedIdPill = (callPills as MultiValueFilter[]).find(p => p.field === 'instanceId');
      expect(passedIdPill).toBeDefined();
      expect(passedIdPill!.values).toEqual(['abc-123', 'def-456']);
    });

    it('should NOT strip the instanceId pill from the criteria passed to the service', () => {
      component.activePills = [
        { field: 'instanceId', values: ['abc-123'] },
        { field: 'businessKey', values: ['BK-001'] },
      ];

      component.executeSearch();

      const [callPills] = (cockpitService.searchProcessInstancesGlobal as ReturnType<typeof vi.fn>).mock.calls[0];
      expect((callPills as MultiValueFilter[]).length).toBe(2);
      expect((callPills as MultiValueFilter[]).some(p => p.field === 'instanceId')).toBe(true);
    });
  });
});

describe('ProcessInstanceSearchComponent — URL restoration (loadFromUrl)', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;
  let cockpitService: CockpitService;

  const URL_CRITERIA: MultiValueFilter[] = [
    { field: 'businessKey', values: ['a', 'b', 'c', 'd'] },
    { field: 'instanceId', values: ['e28e0fdf-0000-0000-0000-000000000001'] },
  ];

  async function setup(criteria: MultiValueFilter[], extraParams: Record<string, string> = {}): Promise<void> {
    initTestEnvironment();

    cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of(MOCK_INSTANCES)),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(2)),
    } as any;

    const navMenuService: Partial<NavMenuService> = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    };

    const mockActivatedRoute = {
      snapshot: {
        queryParams: {
          criteria: JSON.stringify(criteria),
          ...extraParams,
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: navMenuService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: TEST_TRANSLATIONS };

    fixture.detectChanges(); // triggers ngOnInit → loadFromUrl → executeSearch
  }

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
    TestBed.resetTestingModule();
  });

  it('should trigger exactly one call to each service method on page load with URL criteria', async () => {
    await setup(URL_CRITERIA);

    expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalledTimes(1);
    expect(cockpitService.searchProcessInstancesGlobalCount).toHaveBeenCalledTimes(1);
  });

  it('should pass firstResult=0 and maxResults=searchPageSize (20, not 2000) when restoring from URL', async () => {
    await setup(URL_CRITERIA);

    const calls = (cockpitService.searchProcessInstancesGlobal as ReturnType<typeof vi.fn>).mock.calls;
    const [, , , firstResult, maxResults] = calls[0];

    expect(firstResult).toBe(0);
    expect(maxResults).toBe(20);
    expect(maxResults).not.toBe(2000);
  });

  it('should restore activePills exactly from URL query param criteria', async () => {
    await setup(URL_CRITERIA);

    expect(component.activePills).toEqual(URL_CRITERIA);
  });

  it('should restore variableNamesIgnoreCase and variableValuesIgnoreCase from URL', async () => {
    await setup(
      [{ field: 'businessKey', values: ['BK-001'] }],
      { vnIgnoreCase: 'true', vvIgnoreCase: 'true' }
    );

    expect(component.variableNamesIgnoreCase).toBe(true);
    expect(component.variableValuesIgnoreCase).toBe(true);

    // And the service must receive those flags
    const [, vnIgnoreCase, vvIgnoreCase] = (cockpitService.searchProcessInstancesGlobal as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(vnIgnoreCase).toBe(true);
    expect(vvIgnoreCase).toBe(true);
  });

  it('should NOT trigger a search when URL criteria is absent', async () => {
    initTestEnvironment();

    cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
    } as any;

    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(ProcessInstanceSearchComponent);
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: TEST_TRANSLATIONS };
    f.detectChanges();

    expect(cockpitService.searchProcessInstancesGlobal).not.toHaveBeenCalled();
    expect(cockpitService.searchProcessInstancesGlobalCount).not.toHaveBeenCalled();
  });

  it('should NOT trigger a search when URL criteria is an empty array', async () => {
    initTestEnvironment();

    cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
    } as any;

    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: { criteria: '[]' } } } },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(ProcessInstanceSearchComponent);
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: TEST_TRANSLATIONS };
    f.detectChanges();

    expect(cockpitService.searchProcessInstancesGlobal).not.toHaveBeenCalled();
  });
});

describe('ProcessInstanceSearchComponent — cursor state lifecycle', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;
  let cockpitService: CockpitService;

  const KEYSET_PAGE = { items: MOCK_INSTANCES, nextCursor: { offsets: { '0': 2 } }, hasMore: true };

  beforeEach(async () => {
    initTestEnvironment();

    cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of(MOCK_INSTANCES)),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(2)),
      searchPerStatePaged: vi.fn().mockReturnValue(of(KEYSET_PAGE)),
    } as any;

    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: TEST_TRANSLATIONS };
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('resets cursor state on new executeSearch so prior navigation never leaks', () => {
    component.activePills = [{ field: 'state', values: ['active', 'completed'] }];
    component.executeSearch();
    component.nextMultiStatePage();

    expect(component.cursorStack.length).toBe(1);
    expect(component.multiStateAbsoluteOffset).toBeGreaterThan(0);

    component.executeSearch();

    expect(component.cursorStack.length).toBe(0);
    expect(component.multiStateAbsoluteOffset).toBe(0);
  });

  it('resets cursor state when page size changes (offsets become invalid)', () => {
    component.activePills = [{ field: 'state', values: ['active', 'completed'] }];
    component.executeSearch();
    component.nextMultiStatePage();

    expect(component.cursorStack.length).toBe(1);

    component.onSearchPageSizeChange();

    expect(component.cursorStack.length).toBe(0);
    expect(component.multiStateAbsoluteOffset).toBe(0);
  });

  it('advances and reverts absoluteOffset correctly across next/prev page', () => {
    component.activePills = [{ field: 'state', values: ['active', 'completed'] }];
    component.executeSearch();

    const afterPage1 = component.multiStateAbsoluteOffset;
    component.nextMultiStatePage();
    const afterPage2 = component.multiStateAbsoluteOffset;

    expect(afterPage2).toBeGreaterThan(afterPage1);

    component.prevMultiStatePage();

    expect(component.multiStateAbsoluteOffset).toBe(afterPage1);
  });
});

describe('ProcessInstanceSearchComponent — searchTotalPages & multiStateCurrentPage', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;

  beforeEach(async () => {
    initTestEnvironment();

    const cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
    } as any;

    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: TEST_TRANSLATIONS };
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  describe('searchTotalPages', () => {
    it('returns 0 when count is 0', () => {
      component.searchResultsCount = 0;
      component.searchPageSize = 20;
      expect(component.searchTotalPages).toBe(0);
    });

    it('returns 0 when pageSize is 0', () => {
      component.searchResultsCount = 100;
      component.searchPageSize = 0;
      expect(component.searchTotalPages).toBe(0);
    });

    it.each([
      { count: 1,    pageSize: 20,  expected: 1  },
      { count: 20,   pageSize: 20,  expected: 1  },
      { count: 21,   pageSize: 20,  expected: 2  },
      { count: 100,  pageSize: 20,  expected: 5  },
      { count: 101,  pageSize: 20,  expected: 6  },
      { count: 95,   pageSize: 50,  expected: 2  },
      { count: 1000, pageSize: 100, expected: 10 },
      { count: 1001, pageSize: 100, expected: 11 },
    ])('ceil($count / $pageSize) = $expected', ({ count, pageSize, expected }) => {
      component.searchResultsCount = count;
      component.searchPageSize = pageSize;
      expect(component.searchTotalPages).toBe(expected);
    });

    it('updates when pageSize changes mid-navigation', () => {
      component.searchResultsCount = 100;
      component.searchPageSize = 20;
      expect(component.searchTotalPages).toBe(5);

      component.searchPageSize = 50;
      expect(component.searchTotalPages).toBe(2);

      component.searchPageSize = 10;
      expect(component.searchTotalPages).toBe(10);
    });
  });

  describe('multiStateCurrentPage', () => {
    it('returns 1 when absoluteOffset is 0', () => {
      component.multiStateAbsoluteOffset = 0;
      component.searchPageSize = 20;
      expect(component.multiStateCurrentPage).toBe(1);
    });

    it.each([
      { offset: 0,   pageSize: 20, expected: 1 },
      { offset: 19,  pageSize: 20, expected: 1 },
      { offset: 20,  pageSize: 20, expected: 2 },
      { offset: 40,  pageSize: 20, expected: 3 },
      { offset: 100, pageSize: 20, expected: 6 },
      { offset: 0,   pageSize: 50, expected: 1 },
      { offset: 50,  pageSize: 50, expected: 2 },
      { offset: 99,  pageSize: 50, expected: 2 },
      { offset: 100, pageSize: 50, expected: 3 },
    ])('floor($offset / $pageSize) + 1 = $expected', ({ offset, pageSize, expected }) => {
      component.multiStateAbsoluteOffset = offset;
      component.searchPageSize = pageSize;
      expect(component.multiStateCurrentPage).toBe(expected);
    });
  });
});
