import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProcessInstanceSearchComponent } from './process-instance-search';
import { CockpitService, ProcessInstance } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

const SEARCH_BATCH_RETURN_KEY = 'searchBatchReturn';

describe('Process Instance Search - Batch Return Signal Integration', () => {
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let component: ProcessInstanceSearchComponent;
  let cockpitService: CockpitService;

  const MOCK_INSTANCES: ProcessInstance[] = [
    { id: 'inst-1', state: 'ACTIVE', processDefinitionId: 'pd:1:x', processDefinitionKey: 'pk1', startTime: '2024-01-01T10:00:00.000Z' },
    { id: 'inst-2', state: 'ACTIVE', processDefinitionId: 'pd:1:x', processDefinitionKey: 'pk1', startTime: '2024-01-02T10:00:00.000Z' },
    { id: 'inst-3', state: 'ACTIVE', processDefinitionId: 'pd:1:x', processDefinitionKey: 'pk1', startTime: '2024-01-03T10:00:00.000Z' },
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    initTestEnvironment();

    cockpitService = {
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of(MOCK_INSTANCES)),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(3)),
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
    (translateService as any).translations = { en: {
      'cockpit.processes.tabs.searchInstances': 'Search Instances',
      'cockpit.processes.globalSearch.title': 'Search',
      'cockpit.processes.search.staleInstancesDetected': '{{count}} instances removed',
    }};

    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // T3: Search with signal present → selection cleared
  it('[T3-signal] SEARCH_BATCH_RETURN_KEY detected → checkBatchOperationReturn clears selection', () => {
    // Setup persisted state WITH selection
    const persistedState = {
      version: 1,
      criteria: [{ field: 'state', values: ['ACTIVE'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: ['inst-1', 'inst-2', 'inst-3'],
      selectedMetadata: [
        { id: 'inst-1', state: 'ACTIVE', processDefinitionId: 'pd:1:x', processDefinitionKey: 'pk1' },
        { id: 'inst-2', state: 'ACTIVE', processDefinitionId: 'pd:1:x', processDefinitionKey: 'pk1' },
        { id: 'inst-3', state: 'ACTIVE', processDefinitionId: 'pd:1:x', processDefinitionKey: 'pk1' },
      ],
    };
    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(persistedState));

    // Set signal (batch success)
    sessionStorage.setItem(SEARCH_BATCH_RETURN_KEY, 'true');

    // Create new component
    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const newComponent = newFixture.componentInstance;
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {
      'cockpit.processes.tabs.searchInstances': 'Search Instances',
      'cockpit.processes.globalSearch.title': 'Search',
    }};
    newFixture.detectChanges();

    // ASSERTION: Selection cleared by checkBatchOperationReturn()
    expect(newComponent.selectedInstanceIds.size).toBe(0);
    // Criteria preserved
    expect(newComponent.activePills.length).toBe(1);
    // Flag consumed
    expect(sessionStorage.getItem(SEARCH_BATCH_RETURN_KEY)).toBeNull();
  });

  // T3: Search WITHOUT signal → selection preserved
  it('[T3-no-signal] No SEARCH_BATCH_RETURN_KEY → selection preserved from persisted state', () => {
    // Setup persisted state WITH selection
    const persistedState = {
      version: 1,
      criteria: [{ field: 'state', values: ['ACTIVE'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: ['inst-1', 'inst-2', 'inst-3'],
      selectedMetadata: [
        { id: 'inst-1', state: 'ACTIVE', processDefinitionId: 'pd:1:x', processDefinitionKey: 'pk1' },
        { id: 'inst-2', state: 'ACTIVE', processDefinitionId: 'pd:1:x', processDefinitionKey: 'pk1' },
        { id: 'inst-3', state: 'ACTIVE', processDefinitionId: 'pd:1:x', processDefinitionKey: 'pk1' },
      ],
    };
    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(persistedState));

    // NO signal (normal navigation)

    // Create new component
    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const newComponent = newFixture.componentInstance;
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {
      'cockpit.processes.tabs.searchInstances': 'Search Instances',
      'cockpit.processes.globalSearch.title': 'Search',
    }};
    newFixture.detectChanges();

    // ASSERTION: Selection PRESERVED
    expect(newComponent.selectedInstanceIds.size).toBe(3);
    expect(newComponent.selectedInstanceIds.has('inst-1')).toBe(true);
    expect(newComponent.selectedInstanceIds.has('inst-2')).toBe(true);
    expect(newComponent.selectedInstanceIds.has('inst-3')).toBe(true);
  });

  // Anti-double-request: Persisted state → exactly 1 HTTP call
  it('[T3-init-1-request] Persisted state → exactly 1 HTTP request', () => {
    const persistedState = {
      version: 1,
      criteria: [{ field: 'businessKey', values: ['BK-001'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: ['inst-1'],
      selectedMetadata: [{ id: 'inst-1', state: 'ACTIVE', processDefinitionId: 'pd:1:z', processDefinitionKey: 'pk' }],
    };
    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(persistedState));

    (cockpitService.searchProcessInstancesGlobal as any).mockClear();
    (cockpitService.searchProcessInstancesGlobalCount as any).mockClear();

    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {
      'cockpit.processes.tabs.searchInstances': 'Search Instances',
      'cockpit.processes.globalSearch.title': 'Search',
    }};
    newFixture.detectChanges();

    expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalledTimes(1);
    expect(cockpitService.searchProcessInstancesGlobalCount).toHaveBeenCalledTimes(1);
  });

  // Anti-double-request: No persisted state → 0 search calls
  it('[T3-init-no-state] No persisted state → 0 HTTP search calls', () => {
    sessionStorage.clear();

    (cockpitService.searchProcessInstancesGlobal as any).mockClear();
    (cockpitService.searchProcessInstancesGlobalCount as any).mockClear();

    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {
      'cockpit.processes.tabs.searchInstances': 'Search Instances',
      'cockpit.processes.globalSearch.title': 'Search',
    }};
    newFixture.detectChanges();

    expect(cockpitService.searchProcessInstancesGlobal).toHaveBeenCalledTimes(0);
    expect(cockpitService.searchProcessInstancesGlobalCount).toHaveBeenCalledTimes(0);
  });
});
