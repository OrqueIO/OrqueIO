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
  'cockpit.processes.globalSearch.noProcessDefs': 'No process definitions available',
  'cockpit.processes.globalSearch.noMatchingProcessDefs': 'No matching process definitions',
  'cockpit.processes.globalSearch.searchProcessDefs': 'Search...',
  'cockpit.processes.globalSearch.selectAll': 'Select all',
  'cockpit.processes.globalSearch.selectedOf': '{{selected}} of {{total}}',
  'cockpit.processes.filters.processDefinition': 'Process Definition',
  'cockpit.processes.globalSearch.pill.processDefinition': 'Process: {{value}}',
  'cockpit.processes.globalSearch.clearBtn': 'Clear',
  'cockpit.processes.deployedDefinitions': 'Deployed Definitions',
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
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
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

  describe('OnPush change detection — page change must render without user interaction', () => {
    it('should clear loading state and show results after onSearchPageChange without extra fixture.detectChanges()', () => {
      // Arrange: establish initial search results on page 1
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
      component.executeSearch();
      fixture.detectChanges();

      // Verify page 1 is rendered (results visible, not loading)
      const resultsBefore = fixture.nativeElement.querySelectorAll('.instance-row, .search-result-row, tr[data-instance-id], .result-item');
      const loadingBefore = fixture.nativeElement.querySelector('.loading-state');
      expect(loadingBefore).toBeNull();

      // Act: navigate to page 2 — simulate the pagination button click handler
      component.onSearchPageChange(2);
      // ONE fixture.detectChanges() = ONE Angular CD cycle, equivalent to what NgZone
      // triggers automatically after an async event (HTTP response).
      // With markForCheck(), the component is marked dirty in the subscribe callback
      // so this single cycle is enough to render the new state.
      // With the old detectChanges(), the test was still passing but the real browser
      // showed "Loading" because detectChanges() did not propagate to ancestor OnPush views.
      fixture.detectChanges();

      // Assert: loading state gone, results shown — no further interaction needed
      const loadingAfter = fixture.nativeElement.querySelector('.loading-state');
      expect(loadingAfter).toBeNull();
      expect(component.searchLoading).toBe(false);
      expect(component.searchResults).toEqual(MOCK_INSTANCES);
      expect(component.searchCurrentPage).toBe(2);
    });

    it('should clear loading state after onSearchPageSizeChange without extra fixture.detectChanges()', () => {
      component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
      component.executeSearch();
      fixture.detectChanges();

      component.searchPageSize = 50;
      component.onSearchPageSizeChange();
      fixture.detectChanges();

      const loadingAfter = fixture.nativeElement.querySelector('.loading-state');
      expect(loadingAfter).toBeNull();
      expect(component.searchLoading).toBe(false);
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
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
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
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
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
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
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
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
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
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
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

describe('ProcessInstanceSearchComponent — processDefinition search filter', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;
  let mockGetProcessDefinitions: ReturnType<typeof vi.fn>;

  const DEFS = [
    { id: 'order-proc:1:aaa',    key: 'order-proc',   name: 'Order Processing',    version: 1 },
    { id: 'invoice-val:1:bbb',   key: 'invoice-val',  name: 'Invoice Validation',  version: 1 },
    { id: 'cust-onboard:1:ccc',  key: 'cust-onboard', name: 'Customer Onboarding', version: 1 },
    { id: 'report-gen:1:ddd',    key: 'report-gen',   name: 'Report Generator',    version: 1 },
  ];

  beforeEach(async () => {
    initTestEnvironment();

    mockGetProcessDefinitions = vi.fn().mockReturnValue(of(DEFS));

    const cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
      getProcessDefinitions: mockGetProcessDefinitions,
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
    TestBed.resetTestingModule();
  });

  it('filters definitions by name (case-insensitive contains) when search text is set', () => {
    component.processDefinitionSearchText = 'report';
    const visible = component.filteredProcessDefinitionGroups;
    expect(visible.length).toBe(1);
    expect(visible[0].key).toBe('report-gen');  // group.key == process key

    component.processDefinitionSearchText = 'INVOICE';
    expect(component.filteredProcessDefinitionGroups.length).toBe(1);
    expect(component.filteredProcessDefinitionGroups[0].key).toBe('invoice-val');

    component.processDefinitionSearchText = 'on'; // "Order Processing", "Customer Onboarding"
    expect(component.filteredProcessDefinitionGroups.length).toBe(2);

    component.processDefinitionSearchText = '';
    expect(component.filteredProcessDefinitionGroups.length).toBe(DEFS.length);
  });

  it('Select All with active filter selects only the visible items, not all definitions', () => {
    component.processDefinitionSearchText = 'order';
    expect(component.filteredProcessDefinitionGroups.length).toBe(1);

    component.toggleSelectAllProcessDefinitions();

    expect(component.pendingProcessDefinitionKeys).toContain('order-proc');
    expect(component.pendingProcessDefinitionKeys).not.toContain('invoice-val');
    expect(component.pendingProcessDefinitionKeys).not.toContain('cust-onboard');
    expect(component.pendingProcessDefinitionKeys).not.toContain('report-gen');
    expect(component.pendingProcessDefinitionKeys.length).toBe(1);
  });

  it('selections persist after clearing or changing the search text', () => {
    component.processDefinitionSearchText = 'order';
    component.toggleSelectAllProcessDefinitions(); // selects 'order-proc'

    component.processDefinitionSearchText = ''; // clear
    expect(component.pendingProcessDefinitionKeys).toContain('order-proc');
    expect(component.filteredProcessDefinitionGroups.length).toBe(DEFS.length);

    component.processDefinitionSearchText = 'report'; // change filter
    expect(component.pendingProcessDefinitionKeys).toContain('order-proc'); // still selected
    expect(component.filteredProcessDefinitionGroups.some(d => d.key === 'order-proc')).toBe(false);
  });

  it('typing in the search field triggers no additional getProcessDefinitions network calls', () => {
    const callsAfterInit = mockGetProcessDefinitions.mock.calls.length;
    expect(callsAfterInit).toBe(1); // called once in ngOnInit

    component.processDefinitionSearchText = 'order';
    component.processDefinitionSearchText = 'invoice';
    component.processDefinitionSearchText = '';

    expect(mockGetProcessDefinitions.mock.calls.length).toBe(callsAfterInit);
  });
});

// ---------------------------------------------------------------------------
// searchEndIndex / searchStartIndex — guard: endIndex must never exceed total
// ---------------------------------------------------------------------------
describe('ProcessInstanceSearchComponent — searchEndIndex never exceeds total (bug: "Showing 7101-7132 of 7131")', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;

  // 2 states that ARE isArbitraryMultiState = true → keyset path
  const KEYSET_STATES = { field: 'state', values: ['active', 'completed'] };
  // All 4 states → isArbitraryMultiState = false → offset path (exhaustive shortcut)
  const ALL_4_STATES = { field: 'state', values: ['active', 'suspended', 'completed', 'terminated'] };

  beforeEach(async () => {
    initTestEnvironment();

    const cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
      searchPerStatePaged: vi.fn().mockReturnValue(of({ items: [], nextCursor: null, hasMore: false })),
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
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
    TestBed.resetTestingModule();
  });

  // ── Keyset path (isArbitraryMultiState = true — genuine 2-state combos) ──

  it('[keyset] exact last page: total=7131, offset=7100, 31 items → endIndex=7131', () => {
    component.activePills = [KEYSET_STATES];
    component.multiStateAbsoluteOffset = 7100;
    component.searchResults = Array(31).fill(MOCK_INSTANCES[0]);
    component.searchResultsCount = 7131;
    expect(component.searchEndIndex).toBe(7131);
  });

  it('[keyset] race-condition extra item: total=7131, offset=7100, 32 items → endIndex clamped to 7131', () => {
    // Reproduction of "Showing 7101-7132 of 7131":
    // count query returned 7131; a new instance was created; data query returned 32.
    // Without Math.min the display would show 7132.
    component.activePills = [KEYSET_STATES];
    component.multiStateAbsoluteOffset = 7100;
    component.searchResults = Array(32).fill(MOCK_INSTANCES[0]);
    component.searchResultsCount = 7131;
    expect(component.searchEndIndex).toBe(7131);
  });

  it('[keyset] mid-page with non-round total: total=150, pageSize=100, offset=100, 50 items → endIndex=150', () => {
    component.activePills = [KEYSET_STATES];
    component.searchPageSize = 100;
    component.multiStateAbsoluteOffset = 100;
    component.searchResults = Array(50).fill(MOCK_INSTANCES[0]);
    component.searchResultsCount = 150;
    expect(component.searchEndIndex).toBe(150);
  });

  it('[keyset] endIndex is never greater than total across a range of totals', () => {
    component.activePills = [KEYSET_STATES];
    for (const { total, offset, items } of [
      { total: 7131, offset: 7100, items: 32 },
      { total: 1,    offset: 0,    items: 2  },
      { total: 100,  offset: 90,   items: 15 },
      { total: 999,  offset: 990,  items: 12 },
    ]) {
      component.searchResultsCount = total;
      component.multiStateAbsoluteOffset = offset;
      component.searchResults = Array(items).fill(MOCK_INSTANCES[0]);
      expect(component.searchEndIndex).toBeLessThanOrEqual(total);
    }
  });

  // ── Offset path (isArbitraryMultiState = false) ──────────────────────────

  it('[offset] last page clamped: total=7131, page=72, pageSize=100 → endIndex=7131 not 7200', () => {
    component.activePills = []; // no state pill → isArbitraryMultiState = false
    component.searchResultsCount = 7131;
    component.searchCurrentPage = 72;
    component.searchPageSize = 100;
    expect(component.searchEndIndex).toBe(7131);
  });

  it('[offset] full last page (exact multiple): total=7000, page=70, pageSize=100 → endIndex=7000', () => {
    component.activePills = [];
    component.searchResultsCount = 7000;
    component.searchCurrentPage = 70;
    component.searchPageSize = 100;
    expect(component.searchEndIndex).toBe(7000);
  });

  // ── startIndex (both paths) ───────────────────────────────────────────────

  it('[keyset] startIndex = absoluteOffset + 1', () => {
    component.activePills = [KEYSET_STATES];
    component.multiStateAbsoluteOffset = 7100;
    component.searchResultsCount = 7131;
    component.searchResults = Array(31).fill(MOCK_INSTANCES[0]);
    expect(component.searchStartIndex).toBe(7101);
  });

  it('[offset] startIndex = (page-1)*pageSize + 1', () => {
    component.activePills = [];
    component.searchResultsCount = 7131;
    component.searchCurrentPage = 72;
    component.searchPageSize = 100;
    component.searchResults = Array(31).fill(MOCK_INSTANCES[0]);
    expect(component.searchStartIndex).toBe(7101);
  });
});

// ---------------------------------------------------------------------------
// isArbitraryMultiState — exhaustive 4-state shortcut
// ---------------------------------------------------------------------------
describe('ProcessInstanceSearchComponent — isArbitraryMultiState: 4 states = offset path (exhaustive shortcut)', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;
  let mockSearchGlobal: ReturnType<typeof vi.fn>;
  let mockSearchPerStatePaged: ReturnType<typeof vi.fn>;

  const ALL_4_STATES = { field: 'state', values: ['active', 'suspended', 'completed', 'terminated'] };

  beforeEach(async () => {
    initTestEnvironment();

    mockSearchGlobal = vi.fn().mockReturnValue(of([]));
    mockSearchPerStatePaged = vi.fn().mockReturnValue(of({ items: [], nextCursor: null, hasMore: false }));

    const cockpitService = {
      searchProcessInstancesGlobal: mockSearchGlobal,
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
      searchPerStatePaged: mockSearchPerStatePaged,
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
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
    TestBed.resetTestingModule();
  });

  // ── isArbitraryMultiState getter ─────────────────────────────────────────

  it('returns false for all 4 states (exhaustive = no filter needed)', () => {
    component.activePills = [ALL_4_STATES];
    expect(component.isArbitraryMultiState).toBe(false);
  });

  it('returns false when no state pill is present', () => {
    component.activePills = [];
    expect(component.isArbitraryMultiState).toBe(false);
  });

  it('returns false for single-state pills', () => {
    component.activePills = [{ field: 'state', values: ['active'] }];
    expect(component.isArbitraryMultiState).toBe(false);
  });

  it('returns false for active+suspended (native unfinished flag → offset path)', () => {
    component.activePills = [{ field: 'state', values: ['active', 'suspended'] }];
    expect(component.isArbitraryMultiState).toBe(false);
  });

  it('returns false for completed+terminated (native finished flag → offset path)', () => {
    component.activePills = [{ field: 'state', values: ['completed', 'terminated'] }];
    expect(component.isArbitraryMultiState).toBe(false);
  });

  it.each([
    ['active', 'completed'],
    ['active', 'terminated'],
    ['suspended', 'completed'],
    ['suspended', 'terminated'],
    ['active', 'completed', 'suspended'],
    ['active', 'completed', 'terminated'],
    ['active', 'suspended', 'terminated'],
    ['completed', 'suspended', 'terminated'],
  ])('returns true for non-native non-exhaustive combo %j', (...states) => {
    component.activePills = [{ field: 'state', values: states.flat() }];
    expect(component.isArbitraryMultiState).toBe(true);
  });

  // ── Routing: 4 states → searchProcessInstancesGlobal, NOT searchPerStatePaged ──

  it('4 states: executeSearch() calls searchProcessInstancesGlobal, never searchPerStatePaged', () => {
    component.activePills = [ALL_4_STATES];
    component.executeSearch();

    expect(mockSearchGlobal).toHaveBeenCalled();
    expect(mockSearchPerStatePaged).not.toHaveBeenCalled();
  });

  it('2 non-native states: executeSearch() calls searchPerStatePaged, not only searchProcessInstancesGlobal', () => {
    component.activePills = [{ field: 'state', values: ['active', 'completed'] }];
    component.executeSearch();

    expect(mockSearchPerStatePaged).toHaveBeenCalled();
  });

  // ── searchEndIndex for 4-state uses offset formula ────────────────────────

  it('4 states: searchEndIndex uses offset formula Math.min(page*size, total)', () => {
    component.activePills = [ALL_4_STATES];
    component.searchResultsCount = 7131;
    component.searchCurrentPage = 72;
    component.searchPageSize = 100;
    // offset formula: Math.min(72 * 100, 7131) = 7131
    expect(component.searchEndIndex).toBe(7131);
  });

  it('4 states: searchStartIndex uses offset formula (page-1)*size + 1', () => {
    component.activePills = [ALL_4_STATES];
    component.searchResultsCount = 7131;
    component.searchCurrentPage = 72;
    component.searchPageSize = 100;
    expect(component.searchStartIndex).toBe(7101);
  });

  it('4 states last-page endIndex never exceeds total even if extra data arrives', () => {
    component.activePills = [ALL_4_STATES];
    component.searchResultsCount = 7131;
    component.searchCurrentPage = 72;
    component.searchPageSize = 100;
    // Math.min(7200, 7131) = 7131 — no keyset offset involved
    expect(component.searchEndIndex).toBeLessThanOrEqual(7131);
  });
});

// ---------------------------------------------------------------------------
// pdVisibleSelectedCount — counts processes (groups), not individual versions
// ---------------------------------------------------------------------------
describe('ProcessInstanceSearchComponent — pdVisibleSelectedCount counts processes not versions', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;

  // 4 process groups: A (3 versions), B/C/D (1 version each)
  const MULTI_VERSION_DEFS = [
    { id: 'proc-a:3:id3', key: 'proc-a', name: 'Process A', version: 3 },
    { id: 'proc-a:2:id2', key: 'proc-a', name: 'Process A', version: 2 },
    { id: 'proc-a:1:id1', key: 'proc-a', name: 'Process A', version: 1 },
    { id: 'proc-b:1:idb', key: 'proc-b', name: 'Process B', version: 1 },
    { id: 'proc-c:1:idc', key: 'proc-c', name: 'Process C', version: 1 },
    { id: 'proc-d:1:idd', key: 'proc-d', name: 'Process D', version: 1 },
  ];

  beforeEach(async () => {
    initTestEnvironment();

    const cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
      getProcessDefinitions: vi.fn().mockReturnValue(of(MULTI_VERSION_DEFS)),
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
    TestBed.resetTestingModule();
  });

  it('selecting all 3 versions of a single process counts as 1, not 3', () => {
    // All 3 version IDs of Process A explicitly selected — NO key in pendingKeys
    component.pendingProcessDefinitionIds = ['proc-a:3:id3', 'proc-a:2:id2', 'proc-a:1:id1'];
    component.pendingProcessDefinitionKeys = [];

    expect(component.pdVisibleSelectedCount).toBe(1);
    expect(component.filteredProcessDefinitionGroups.length).toBe(4); // Y still = 4 processes
  });

  it('selecting one version each from 2 different processes counts as 2', () => {
    component.pendingProcessDefinitionIds = ['proc-a:3:id3', 'proc-b:1:idb'];
    component.pendingProcessDefinitionKeys = [];

    expect(component.pdVisibleSelectedCount).toBe(2);
  });

  it('all processes fully covered → pdVisibleSelectedCount equals total and pdAllSelected is true', () => {
    // Mix: Process A selected by key, B/C/D selected by individual version ID
    component.pendingProcessDefinitionKeys = ['proc-a'];
    component.pendingProcessDefinitionIds = ['proc-b:1:idb', 'proc-c:1:idc', 'proc-d:1:idd'];

    const total = component.filteredProcessDefinitionGroups.length; // 4
    expect(component.pdVisibleSelectedCount).toBe(total);
    expect(component.pdAllSelected).toBe(true);
  });

  it('unchecking one version after Select All moves badge to partial while process count stays the same', () => {
    // Select all 4 processes by key via Select All
    component.toggleSelectAllProcessDefinitions();
    expect(component.pdAllSelected).toBe(true);
    expect(component.pdVisibleSelectedCount).toBe(4);

    // Click version 2 of Process A: removes proc-a from pendingKeys, adds only version-2 ID
    component.toggleProcessDefinitionVersion('proc-a', 'proc-a:2:id2');

    // Badge: proc-a now has only 1 of 3 versions selected → not all versions covered → partial
    expect(component.pdAllSelected).toBe(false);
    expect(component.pdSomeSelected).toBe(true);
    // Counter: proc-a still has a selected version → still counts as 1 process → total unchanged
    expect(component.pdVisibleSelectedCount).toBe(4);
  });

  it('rechecking the two missing versions of proc-a restores badge to full', () => {
    // Start from same partially-uncovered state as above
    component.toggleSelectAllProcessDefinitions();
    component.toggleProcessDefinitionVersion('proc-a', 'proc-a:2:id2');
    // proc-a: only version 2 selected; proc-b/c/d: still selected by key
    expect(component.pdAllSelected).toBe(false);

    // Add the two missing versions of proc-a
    component.toggleProcessDefinitionVersion('proc-a', 'proc-a:3:id3');
    component.toggleProcessDefinitionVersion('proc-a', 'proc-a:1:id1');
    // proc-a: all 3 version IDs in pendingIds; proc-b/c/d: in pendingKeys → every group fully covered

    expect(component.pdAllSelected).toBe(true);
    expect(component.pdSomeSelected).toBe(false);
    expect(component.pdVisibleSelectedCount).toBe(4);
  });
});
