import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
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
import { By } from '@angular/platform-browser';
import { MultiValueChipInputComponent } from '../../../../shared/multi-value-chip-input/multi-value-chip-input';

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

  it('filters by key when search text matches key but not name', () => {
    component.processDefinitionSearchText = 'order-proc';
    expect(component.filteredProcessDefinitionGroups.length).toBe(1);
    expect(component.filteredProcessDefinitionGroups[0].key).toBe('order-proc');

    component.processDefinitionSearchText = 'invoice-val';
    expect(component.filteredProcessDefinitionGroups.length).toBe(1);
    expect(component.filteredProcessDefinitionGroups[0].key).toBe('invoice-val');
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
    // All 3 versions of proc-a selected → upgraded to key; proc-b/c/d: in pendingKeys

    expect(component.pdAllSelected).toBe(true);
    expect(component.pdSomeSelected).toBe(false);
    expect(component.pdVisibleSelectedCount).toBe(4);
  });

  it('selecting all versions individually upgrades state to key-based for that group', () => {
    component.toggleProcessDefinitionVersion('proc-a', 'proc-a:1:id1');
    component.toggleProcessDefinitionVersion('proc-a', 'proc-a:2:id2');
    component.toggleProcessDefinitionVersion('proc-a', 'proc-a:3:id3');

    expect(component.pendingProcessDefinitionKeys).toContain('proc-a');
    expect(component.pendingProcessDefinitionIds).not.toContain('proc-a:1:id1');
    expect(component.pendingProcessDefinitionIds).not.toContain('proc-a:2:id2');
    expect(component.pendingProcessDefinitionIds).not.toContain('proc-a:3:id3');
  });

  it('selecting the only version of a single-version process upgrades immediately to key', () => {
    component.toggleProcessDefinitionVersion('proc-b', 'proc-b:1:idb');

    expect(component.pendingProcessDefinitionKeys).toContain('proc-b');
    expect(component.pendingProcessDefinitionIds).not.toContain('proc-b:1:idb');
  });
});


describe('ProcessInstanceSearchComponent — pill management', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;

  const realSvc = Object.create(CockpitService.prototype) as CockpitService;

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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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
      { field: 'withIncidents', values: [] },
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

  it('should accumulate multiple different criteria as independent pills', () => {
    component.selectCriteriaType('businessKey');
    component.pendingValues = ['BK-001'];
    component.confirmCriterion();
    expect(component.activePills.length).toBe(1);

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

  it('should confirm a 3-value variable pill (values set by child via two-way binding) and produce 3 payload variants', () => {
    component.selectCriteriaType('variable');
    component.pendingVariableName = 'amount';
    component.pendingVariableOperator = 'eq';
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

  describe('state multi-select', () => {
    it('should add a state pill with two selected states', () => {
      component.selectCriteriaType('state');
      component.pendingStateValues = ['active', 'suspended'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].values).toEqual(['active', 'suspended']);
      expect(component.getPillLabel(component.activePills[0])).toBe('State: Active, Suspended');
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
      component.pendingStateValues = [];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(0);
      expect(component.editingPillIndex).toBeNull();
      expect(component.activeEditorType).toBeNull();
    });

    it('should toggle state value on and off', () => {
      component.selectCriteriaType('state');
      component.toggleStateValue('active');
      expect(component.pendingStateValues).toEqual(['active']);
      component.toggleStateValue('active');
      expect(component.pendingStateValues).toEqual([]);
    });
  });

  describe('no duplicate pills', () => {
    it('should not create a duplicate State pill — redirects to existing pill editor', () => {
      component.selectCriteriaType('state');
      component.pendingStateValues = ['active'];
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);

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

      component.selectCriteriaType('variables');
      expect(component.activePills.length).toBe(1);
      expect(component.editingPillIndex).toBe(0);
      expect(component.activeEditorType).toBe('variables');
      expect(component.pendingVariableLines.length).toBe(1);
      expect(component.pendingVariableLines[0].name).toBe('orderId');
    });
  });
});

describe('ProcessInstanceSearchComponent — pill editing', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;

  const realSvc = Object.create(CockpitService.prototype) as CockpitService;

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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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
      { field: 'state', values: ['active'] },
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
    const statePill = component.activePills[0];
    const bodies = (realSvc as any).buildPerStateBodies([statePill], statePill, false, false);
    expect(bodies.length).toBe(2);
    expect(bodies[0]).toEqual({ active: true, unfinished: true, sorting: [{ sortBy: 'startTime', sortOrder: 'desc' }] });
    expect(bodies[1]).toEqual({ suspended: true, unfinished: true, sorting: [{ sortBy: 'startTime', sortOrder: 'desc' }] });
  });
});

describe('ProcessInstanceSearchComponent — click outside popover', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;

  const outsideClick = (comp: ProcessInstanceSearchComponent) =>
    comp.onDocumentClick({ target: document.createElement('div') } as any as Event);

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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should remove a state pill when all states are deselected and user clicks outside', () => {
    component.activePills = [{ field: 'state', values: ['active'] }];
    component.startEditPill(0, new MouseEvent('click'));
    component.pendingStateValues = [];
    outsideClick(component);
    expect(component.activePills.length).toBe(0);
    expect(component.editingPillIndex).toBeNull();
    expect(component.activeEditorType).toBeNull();
  });

  it('should confirm a new instanceId criterion when the user clicks outside with a pending value', () => {
    component.selectCriteriaType('instanceId');
    component.pendingValues = ['inst-abc'];
    outsideClick(component);
    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('instanceId');
    expect(component.activePills[0].values).toEqual(['inst-abc']);
    expect(component.activeEditorType).toBeNull();
  });

  it('should leave a pill unchanged when the user clicks ✕ (cancel stays cancel)', () => {
    component.activePills = [{ field: 'businessKey', values: ['BK-ORIG'] }];
    component.startEditPill(0, new MouseEvent('click'));
    component.pendingValues = ['BK-MODIFIED'];
    component.cancelCriterion();
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

describe('ProcessInstanceSearchComponent — Enter key shortcut', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;
  let cockpitService: any;

  beforeEach(async () => {
    initTestEnvironment();

    cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of(MOCK_INSTANCES)),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(2)),
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should confirm businessKey criterion via emptyEnter (chip added then Enter on empty input)', () => {
    component.selectCriteriaType('businessKey');
    component.pendingValues = ['BK-001'];
    component.confirmCriterion();
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
    component.selectCriteriaType('businessKey');
    component.pendingValues = ['BK-001'];
    fixture.detectChanges();

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

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalled();
  });

  it('should NOT trigger executeSearch when Enter is pressed while a popover is open', () => {
    component.selectCriteriaType('businessKey');
    component.pendingValues = ['BK-001'];
    fixture.detectChanges();

    const bodyDiv: HTMLElement = fixture.nativeElement.querySelector('.editor-popover-body');
    bodyDiv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(component.activePills.length).toBe(1);
    expect(component.activeEditorType).toBeNull();
    expect(cockpitService.searchProcessInstancesGlobal).not.toHaveBeenCalled();
  });
});

describe('ProcessInstanceSearchComponent — Variables popover — keyboard & click-outside behavior', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;

  const outsideClick = (comp: ProcessInstanceSearchComponent) =>
    comp.onDocumentClick({ target: document.createElement('div') } as any as Event);

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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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

    const chipDe = fixture.debugElement.query(By.directive(MultiValueChipInputComponent));
    const chipComp = chipDe.componentInstance as MultiValueChipInputComponent;
    chipComp.currentInput = 'pending-value';

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

describe('ProcessInstanceSearchComponent — Variables popover — Enter key edge cases', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should create a chip and keep the popover open when Enter is pressed in a chip input with text', () => {
    component.selectCriteriaType('variables');
    component.pendingVariableLines[0].name = 'amount';
    fixture.detectChanges();

    const chipDe = fixture.debugElement.query(By.directive(MultiValueChipInputComponent));
    const chipComp = chipDe.componentInstance as MultiValueChipInputComponent;
    chipComp.currentInput = 'hello';

    chipComp.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(component.activeEditorType).toBe('variables');
    expect(chipComp.values).toContain('hello');
    expect(component.activePills.length).toBe(0);
  });

  it('should confirm criterion when Enter is pressed with focus outside the Variables popover (empty area click)', () => {
    component.selectCriteriaType('variables');
    component.pendingVariableLines[0].name = 'amount';
    component.pendingVariableLines[0].values = ['100'];
    fixture.detectChanges();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('variables');
    expect(component.activeEditorType).toBeNull();
  });
});

describe('ProcessInstanceSearchComponent — grouped variables criterion', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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
    expect(component.pendingVariableLines.length).toBe(1);
    component.addVariableLine();
    component.addVariableLine();
    expect(component.pendingVariableLines.length).toBe(3);
    expect(component.pendingVariableLines[1].name).toBe('');
    expect(component.pendingVariableLines[2].name).toBe('');
    expect(component.activeEditorType).toBe('variables');
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
    component.removeVariableLine(1);
    expect(component.pendingVariableLines.length).toBe(2);
    expect(component.pendingVariableLines[0].name).toBe('orderId');
    expect(component.pendingVariableLines[1].name).toBe('amount');
  });

  it('should ignore empty lines when confirming — only valid lines are stored', () => {
    component.selectCriteriaType('variables');
    component.pendingVariableLines[0].name = 'orderId';
    component.pendingVariableLines[0].values = ['123'];
    component.addVariableLine();
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
    component.pendingVariableLines = [];
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

describe('ProcessInstanceSearchComponent — variableConflicts getter', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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

describe('ProcessInstanceSearchComponent — operator dropdown — custom single-select', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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
    const stubTrigger = document.createElement('button');
    component.toggleOperatorMenu(0, stubTrigger);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.op-menu-row');
    expect(rows.length).toBe(7);
    const symbols = Array.from(rows as NodeListOf<HTMLElement>).map(
      r => r.querySelector('.op-menu-symbol')?.textContent?.trim()
    );
    expect(symbols).toEqual(['=', '≠', '>', '≥', '<', '≤', '~']);
  });
});

describe('ProcessInstanceSearchComponent — comparison value validation', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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

    const fakeEvt = { target: { value: '100' } } as unknown as Event;
    component.onVariableLineSingleValueChange(0, fakeEvt);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.variable-value-error')).toBeNull();
  });
});


describe('ProcessInstanceSearchComponent — getPillLabel', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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

describe('ProcessInstanceSearchComponent — date criteria — type="date" and time completion', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should use type="date" (not datetime-local) in the date editor popover', () => {
    component.selectCriteriaType('startedAfter');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="date"]');
    expect(input).not.toBeNull();
    const datetimeInput = fixture.nativeElement.querySelector('input[type="datetime-local"]');
    expect(datetimeInput).toBeNull();
  });

  it('should store T00:00:00 for a startedAfter date (start of day)', () => {
    component.selectCriteriaType('startedAfter');
    component.pendingDateValue = '2026-07-21';
    component.confirmCriterion();
    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].values[0]).toContain('T00:00:00');
  });

  it('should store T23:59:59 for a finishedBefore date (end of day)', () => {
    component.selectCriteriaType('finishedBefore');
    component.pendingDateValue = '2026-07-20';
    component.confirmCriterion();
    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].values[0]).toContain('T23:59:59');
  });

  it('should pre-fill pendingDateValue with the stored date when editing an existing date pill', () => {
    component.selectCriteriaType('startedAfter');
    component.pendingDateValue = '2026-07-21';
    component.confirmCriterion();
    expect(component.activePills.length).toBe(1);

    component.startEditPill(0, new MouseEvent('click'));
    expect(component.pendingDateValue).toBe('2026-07-21');
  });
});

describe('ProcessInstanceSearchComponent — startedDateConflict', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should be true when startedAfter is later than startedBefore', () => {
    component.activePills = [
      { field: 'startedAfter',  values: ['2026-07-21T00:00:00.000+0000'] },
      { field: 'startedBefore', values: ['2026-07-20T00:00:00.000+0000'] },
    ];
    expect(component.startedDateConflict).toBe(true);
  });

  it('should be false when startedAfter is earlier than startedBefore', () => {
    component.activePills = [
      { field: 'startedAfter',  values: ['2026-07-19T00:00:00.000+0000'] },
      { field: 'startedBefore', values: ['2026-07-21T00:00:00.000+0000'] },
    ];
    expect(component.startedDateConflict).toBe(false);
  });

  it('should be false when only one of the pair is present', () => {
    component.activePills = [{ field: 'startedAfter', values: ['2026-07-21T00:00:00.000+0000'] }];
    expect(component.startedDateConflict).toBe(false);
  });
});

describe('ProcessInstanceSearchComponent — finishedDateConflict', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should be true when finishedAfter is later than finishedBefore', () => {
    component.activePills = [
      { field: 'finishedAfter',  values: ['2026-07-21T00:00:00.000+0000'] },
      { field: 'finishedBefore', values: ['2026-07-20T00:00:00.000+0000'] },
    ];
    expect(component.finishedDateConflict).toBe(true);
  });

  it('should be false when finishedAfter is earlier than finishedBefore', () => {
    component.activePills = [
      { field: 'finishedAfter',  values: ['2026-07-18T00:00:00.000+0000'] },
      { field: 'finishedBefore', values: ['2026-07-21T00:00:00.000+0000'] },
    ];
    expect(component.finishedDateConflict).toBe(false);
  });
});

describe('ProcessInstanceSearchComponent — incidentsWithTerminalStateConflict', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should be true when withIncidents + only terminal states selected', () => {
    component.activePills = [
      { field: 'withIncidents', values: [] },
      { field: 'state', values: ['completed'] },
    ];
    expect(component.incidentsWithTerminalStateConflict).toBe(true);
  });

  it('should be true when withIncidents + completed and terminated (no active/suspended)', () => {
    component.activePills = [
      { field: 'withIncidents', values: [] },
      { field: 'state', values: ['completed', 'terminated'] },
    ];
    expect(component.incidentsWithTerminalStateConflict).toBe(true);
  });

  it('should be false when withIncidents + state includes Active', () => {
    component.activePills = [
      { field: 'withIncidents', values: [] },
      { field: 'state', values: ['active', 'completed'] },
    ];
    expect(component.incidentsWithTerminalStateConflict).toBe(false);
  });

  it('should be false when withIncidents + state includes Suspended', () => {
    component.activePills = [
      { field: 'withIncidents', values: [] },
      { field: 'state', values: ['suspended', 'terminated'] },
    ];
    expect(component.incidentsWithTerminalStateConflict).toBe(false);
  });

  it('should be false when withIncidents but no State pill', () => {
    component.activePills = [{ field: 'withIncidents', values: [] }];
    expect(component.incidentsWithTerminalStateConflict).toBe(false);
  });

  it('should be false when State pill is terminal-only but no withIncidents pill', () => {
    component.activePills = [{ field: 'state', values: ['completed', 'terminated'] }];
    expect(component.incidentsWithTerminalStateConflict).toBe(false);
  });
});


describe('ProcessInstanceSearchComponent — search loading state', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;

  beforeEach(async () => {
    initTestEnvironment();

    const cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of(MOCK_INSTANCES)),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(2)),
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should set searchLoading to false and show results after executeSearch resolves, without extra user interaction', () => {
    component.activePills = [{ field: 'withIncidents', values: [] }];
    fixture.detectChanges();

    component.executeSearch();
    fixture.detectChanges();

    expect(component.searchLoading).toBe(false);
    expect(component.searchResults.length).toBeGreaterThan(0);

    const loadingEl: HTMLElement | null = fixture.nativeElement.querySelector('.loading-state');
    expect(loadingEl).toBeNull();
  });
});

describe('ProcessInstanceSearchComponent — executeSearch (category B)', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;
  let cockpitService: any;

  beforeEach(async () => {
    initTestEnvironment();

    cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of(MOCK_INSTANCES)),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(2)),
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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
});

describe('ProcessInstanceSearchComponent — clearSearch', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should reset all search state', () => {
    component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
    component.searchResults = [...MOCK_INSTANCES];
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

describe('ProcessInstanceSearchComponent — hasVariableFilter', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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

describe('ProcessInstanceSearchComponent — checkPopoverPosition', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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

describe('ProcessInstanceSearchComponent — getInstanceStateClass', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

  it('should return state-active for ACTIVE state', () => {
    expect(component.getInstanceStateClass(MOCK_INSTANCES[0])).toBe('state-active');
  });

  it('should return state-completed for COMPLETED state', () => {
    const inst: ProcessInstance = { ...MOCK_INSTANCES[0], state: 'COMPLETED' };
    expect(component.getInstanceStateClass(inst)).toBe('state-completed');
  });

  it('should return state-suspended for SUSPENDED state', () => {
    const inst: ProcessInstance = { ...MOCK_INSTANCES[0], state: 'SUSPENDED' };
    expect(component.getInstanceStateClass(inst)).toBe('state-suspended');
  });

  it('should return state-terminated for EXTERNALLY_TERMINATED state', () => {
    const inst: ProcessInstance = { ...MOCK_INSTANCES[0], state: 'EXTERNALLY_TERMINATED' };
    expect(component.getInstanceStateClass(inst)).toBe('state-terminated');
  });

  it('should return state-terminated for INTERNALLY_TERMINATED state', () => {
    const inst: ProcessInstance = { ...MOCK_INSTANCES[0], state: 'INTERNALLY_TERMINATED' };
    expect(component.getInstanceStateClass(inst)).toBe('state-terminated');
  });
});

describe('ProcessInstanceSearchComponent — extractVersionNumber', () => {
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

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('globalSearchPreferences');
  });

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


describe('ProcessInstanceSearchComponent — URL and localStorage persistence', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;
  let router: Router;

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
    router = TestBed.inject(Router);

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: TEST_TRANSLATIONS };

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    localStorage.removeItem('globalSearchPreferences');

    fixture.detectChanges();
  });

  afterEach(() => {
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

    const fixture2 = TestBed.createComponent(ProcessInstanceSearchComponent);
    fixture2.detectChanges();

    expect(fixture2.componentInstance.searchPageSize).toBe(100);
    fixture2.destroy();
  });
});
