import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ProcessInstanceSearchComponent } from './process-instance-search';
import {
  CockpitService,
  ProcessInstance,
  MultiValueFilter,
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { SearchInstancesStateService, SearchInstancesPersistedState } from '../../../../services/search-instances-state.service';
import { AuthService } from '../../../../services/auth';
import { initTestEnvironment } from '../../../../testing/test-utils';

const TEST_TRANSLATIONS: Record<string, string> = {
  'cockpit.processes.search.staleInstancesDetected': '{{count}} selected instance(s) are no longer available and have been removed from selection',
  'cockpit.processes.search.selectionTooLargeNoPersist': 'Selection too large ({{count}} instances). Maximum 100,000 instances can be persisted.',
  'cockpit.processes.search.storageQuotaExceeded': 'Search state could not be saved due to browser storage limits',
  'cockpit.common.clear': 'Clear',
};

const MOCK_INSTANCES_PAGE1: ProcessInstance[] = [
  {
    id: 'inst-1', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    processDefinitionName: 'Test Process', startTime: '2024-01-01T10:00:00.000Z', state: 'ACTIVE',
  },
  {
    id: 'inst-2', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    processDefinitionName: 'Test Process', startTime: '2024-01-02T10:00:00.000Z', state: 'ACTIVE',
  },
  {
    id: 'inst-3', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    processDefinitionName: 'Test Process', startTime: '2024-01-03T10:00:00.000Z', state: 'ACTIVE',
  },
];

const MOCK_INSTANCES_PAGE2: ProcessInstance[] = [
  {
    id: 'inst-4', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    processDefinitionName: 'Test Process', startTime: '2024-01-04T10:00:00.000Z', state: 'ACTIVE',
  },
  {
    id: 'inst-5', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    processDefinitionName: 'Test Process', startTime: '2024-01-05T10:00:00.000Z', state: 'ACTIVE',
  },
];

const MOCK_MIXED_VERSION_INSTANCES: ProcessInstance[] = [
  {
    id: 'inst-1', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    processDefinitionName: 'Test Process', startTime: '2024-01-01T10:00:00.000Z', state: 'ACTIVE',
  },
  {
    id: 'inst-6', processDefinitionId: 'proc:2:def', processDefinitionKey: 'proc',
    processDefinitionName: 'Test Process', startTime: '2024-01-06T10:00:00.000Z', state: 'ACTIVE',
  },
];

initTestEnvironment();

describe('ProcessInstanceSearchComponent - State Persistence', () => {
  let component: ProcessInstanceSearchComponent;
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let cockpitService: CockpitService;
  let router: Router;
  let stateService: SearchInstancesStateService;
  let authService: AuthService;
  let authEventsSubject: Subject<any>;
  let searchCallCount: number;

  beforeEach(async () => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    searchCallCount = 0;

    authEventsSubject = new Subject();

    const mockAuthService = {
      events$: authEventsSubject.asObservable(),
      authEvents$: authEventsSubject.asObservable(),
      isAuthenticated: vi.fn().mockReturnValue(of(true)),
      getCurrentAuth: vi.fn().mockReturnValue({ userId: 'test-user', apps: ['cockpit'], authorizedApps: ['cockpit'] }),
      canAccess: vi.fn().mockReturnValue(true),
    };

    const mockCockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobal: vi.fn((filters: MultiValueFilter[], vnIgnoreCase: boolean, vvIgnoreCase: boolean, firstResult: number, maxResults: number) => {
        searchCallCount++;
        // Return page 1 or page 2 based on firstResult
        if (firstResult === 0) {
          return of(MOCK_INSTANCES_PAGE1);
        } else if (firstResult === 20) {
          return of(MOCK_INSTANCES_PAGE2);
        }
        return of([]);
      }),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(25)),
    };

    const mockNavMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    };

    const mockTranslateService = {
      instant: vi.fn((key: string, params?: Record<string, unknown>) => {
        let result = TEST_TRANSLATIONS[key] || key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
          });
        }
        return result;
      }),
      currentLang: 'en',
      currentLang$: of('en'),
      setLanguage: vi.fn(),
    };

    const mockActivatedRoute = {
      queryParams: of({}),
      snapshot: { queryParams: {} },
    };

    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: ProcessInstanceSearchComponent }]),
        { provide: CockpitService, useValue: mockCockpitService },
        { provide: NavMenuService, useValue: mockNavMenuService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: AuthService, useValue: mockAuthService },
        SearchInstancesStateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    cockpitService = TestBed.inject(CockpitService);
    router = TestBed.inject(Router);
    stateService = TestBed.inject(SearchInstancesStateService);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    if (fixture && !fixture.destroyed) {
      fixture.destroy();
    }
    sessionStorage.clear();
  });

  it('Test 1: Should restore 3 checked instances after navigation with only ONE initial query', async () => {
    // Setup: Execute search and select 3 instances
    component.activePills = [{ field: 'state', values: ['active'] }];
    component.searchResults = MOCK_INSTANCES_PAGE1;  // Set results manually
    component.executeSearch();
    fixture.detectChanges();
    await fixture.whenStable();

    // Select first 3 instances
    component.toggleInstanceSelection('inst-1');
    component.toggleInstanceSelection('inst-2');
    component.toggleInstanceSelection('inst-3');
    fixture.detectChanges();

    expect(component.selectedInstanceIds.size).toBe(3);

    // Simulate navigation away and destroy component
    component.ngOnDestroy();
    fixture.destroy();

    // Reset search count
    searchCallCount = 0;

    // Create new component instance (simulating navigation back)
    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify: Same 3 instances are checked
    expect(component.selectedInstanceIds.size).toBe(3);
    expect(component.selectedInstanceIds.has('inst-1')).toBe(true);
    expect(component.selectedInstanceIds.has('inst-2')).toBe(true);
    expect(component.selectedInstanceIds.has('inst-3')).toBe(true);

    // Verify: Only ONE search query was executed
    expect(searchCallCount).toBe(1);
  });

  it('Test 2: Should restore multi-page selection with counter=3', async () => {
    // Setup: Execute search
    component.activePills = [{ field: 'state', values: ['active'] }];
    component.searchResults = MOCK_INSTANCES_PAGE1;  // Page 1 data
    component.executeSearch();
    fixture.detectChanges();
    await fixture.whenStable();

    // Select 2 instances on page 1
    component.toggleInstanceSelection('inst-1');
    component.toggleInstanceSelection('inst-2');
    fixture.detectChanges();

    expect(component.selectedInstanceIds.size).toBe(2);

    // Navigate to page 2
    component.searchResults = MOCK_INSTANCES_PAGE2;  // Page 2 data
    component.onSearchPageChange(2);
    fixture.detectChanges();
    await fixture.whenStable();

    // Select 1 instance on page 2
    component.toggleInstanceSelection('inst-4');
    fixture.detectChanges();

    expect(component.selectedInstanceIds.size).toBe(3);

    // Simulate navigation away
    component.ngOnDestroy();
    fixture.destroy();

    // Create new component instance
    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify: Counter shows 3 selected
    expect(component.selectedInstanceIds.size).toBe(3);
    expect(component.selectedInstanceIds.has('inst-1')).toBe(true);
    expect(component.selectedInstanceIds.has('inst-2')).toBe(true);
    expect(component.selectedInstanceIds.has('inst-4')).toBe(true);
  });

  it('Test 3: Should enable/disable Move operation based on version after restore', async () => {
    // Test part 1: Same version instances
    component.searchResults = MOCK_INSTANCES_PAGE1;
    component.toggleInstanceSelection('inst-1');
    component.toggleInstanceSelection('inst-2');
    fixture.detectChanges();

    // Verify: Move operation is applicable for same version
    expect(component.isOperationApplicable('move-instances')).toBe(true);

    // Test part 2: Mixed versions
    component.searchResults = MOCK_MIXED_VERSION_INSTANCES;
    component.selectedInstanceIds.clear();
    component['selectedInstanceMetadataCache'].clear();
    component.toggleInstanceSelection('inst-1');
    component.toggleInstanceSelection('inst-6');
    fixture.detectChanges();

    // Verify: Move operation is NOT applicable for mixed versions
    expect(component.isOperationApplicable('move-instances')).toBe(false);
  });

  it('Test 4: Should clear persisted state from sessionStorage when Clear button is clicked', async () => {
    // Setup: Execute search and select instances
    component.activePills = [{ field: 'state', values: ['active'] }];
    component.executeSearch();
    fixture.detectChanges();
    await fixture.whenStable();

    component.toggleInstanceSelection('inst-1');
    fixture.detectChanges();

    // Manually trigger state save
    component['saveCurrentState']();
    stateService.flushToStorage();

    // Verify state is saved
    const savedState = sessionStorage.getItem('searchInstancesState.v1');
    expect(savedState).not.toBeNull();

    // Click Clear button
    component.clearSearch();
    fixture.detectChanges();

    // Verify: sessionStorage is empty
    const clearedState = sessionStorage.getItem('searchInstancesState.v1');
    expect(clearedState).toBeNull();
  });

  it('Test 5: Should clear selection but keep criteria after batch operation return', async () => {
    // Setup: Execute search and select instances
    component.activePills = [{ field: 'state', values: ['active'] }];
    component.searchResults = MOCK_INSTANCES_PAGE1;  // Set results manually
    component.executeSearch();
    fixture.detectChanges();
    await fixture.whenStable();

    component.toggleInstanceSelection('inst-1');
    component.toggleInstanceSelection('inst-2');
    fixture.detectChanges();

    expect(component.selectedInstanceIds.size).toBe(2);

    // Save state
    component['saveCurrentState']();
    stateService.flushToStorage();

    // Simulate batch operation return flag
    sessionStorage.setItem('searchBatchReturn', 'true');

    // Call the check method that runs on component init
    component['checkBatchOperationReturn']();
    fixture.detectChanges();

    // Verify: Selection is cleared
    expect(component.selectedInstanceIds.size).toBe(0);

    // Verify: Criteria are kept
    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('state');
    expect(component.activePills[0].values).toEqual(['active']);

    // Verify: Return flag is removed
    expect(sessionStorage.getItem('searchBatchReturn')).toBeNull();
  });

  it('Test 6: Should handle corrupted/wrong version/invalid state gracefully with clean screen', () => {
    // Test 1: Corrupted JSON
    sessionStorage.setItem('searchInstancesState.v1', 'invalid-json{');

    const corruptedState = stateService.loadState();

    // Verify: Returns null and cleans up
    expect(corruptedState).toBeNull();
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();

    // Test 2: Wrong version
    const wrongVersionState = {
      version: 999,
      criteria: [{ field: 'state', values: ['active'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: ['inst-1'],
      selectedMetadata: [],
    };

    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(wrongVersionState));

    const wrongVersionResult = stateService.loadState();

    // Verify: Returns null and cleans up
    expect(wrongVersionResult).toBeNull();
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();
  });

  it('Test 7: Should not persist selection >100k IDs and continue working', () => {
    // Create large selection
    const largeSelection = new Array(100001).fill(0).map((_, i) => `inst-${i}`);

    const largeState: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'state', values: ['active'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: largeSelection,
      selectedMetadata: [],
    };

    // Attempt to save large state
    stateService.updateState(largeState);
    stateService.flushToStorage();

    // Verify: Selection not persisted (should be empty or truncated)
    const saved = sessionStorage.getItem('searchInstancesState.v1');
    expect(saved).not.toBeNull();

    const parsedState = JSON.parse(saved!);
    expect(parsedState.selectedIds.length).toBe(0); // Should be empty due to size limit

    // Verify: Criteria are still persisted
    expect(parsedState.criteria).toEqual([{ field: 'state', values: ['active'] }]);
  });

  it('Test 8: Should detect and remove stale IDs with message', async () => {
    // Setup: Execute search and select instances
    component.activePills = [{ field: 'state', values: ['active'] }];
    component.searchResults = MOCK_INSTANCES_PAGE1;  // Set results manually
    component.executeSearch();
    fixture.detectChanges();
    await fixture.whenStable();

    // Select instances
    component.toggleInstanceSelection('inst-1');
    component.selectedInstanceIds.add('inst-99'); // Add stale ID manually

    // Manually add stale ID to metadata
    component['selectedInstanceMetadataCache'].set('inst-99', {
      state: 'ACTIVE',
      processDefinitionId: 'proc:1:abc',
      processDefinitionKey: 'proc',
    });

    fixture.detectChanges();

    // Save state
    component.ngOnDestroy();
    fixture.destroy();

    // Recreate and restore
    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    component.searchResults = MOCK_INSTANCES_PAGE1;  // Set results after restore
    fixture.detectChanges();
    await fixture.whenStable();

    // Trigger stale detection by loading search results
    component['detectStaleSelectedIds']();
    fixture.detectChanges();

    // Verify: Stale ID removed (inst-99 not in current search results)
    expect(component.selectedInstanceIds.has('inst-99')).toBe(false);

    // Verify: Valid ID still selected
    expect(component.selectedInstanceIds.has('inst-1')).toBe(true);
  });

  it('Test 9: Should delete state on logout', () => {
    // Setup: Save some state
    const testState: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'state', values: ['active'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: ['inst-1', 'inst-2'],
      selectedMetadata: [],
    };

    stateService.updateState(testState);
    stateService.flushToStorage();

    // Verify state exists
    expect(sessionStorage.getItem('searchInstancesState.v1')).not.toBeNull();

    // Trigger logout event
    authEventsSubject.next({ type: 'authentication.logout.success' });

    // Verify: State is deleted
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();
  });

  it('Test 10: Should restore state with new service instance from sessionStorage', async () => {
    // Setup: Create initial state directly in sessionStorage (before component initialization)
    const testState: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'businessKey', values: ['BK-123'] }],
      variableNamesIgnoreCase: true,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 50,
      selectedIds: ['inst-1', 'inst-2', 'inst-3'],
      selectedMetadata: [
        {
          id: 'inst-1',
          state: 'ACTIVE',
          processDefinitionId: 'proc:1:abc',
          processDefinitionKey: 'proc',
        },
        {
          id: 'inst-2',
          state: 'ACTIVE',
          processDefinitionId: 'proc:1:abc',
          processDefinitionKey: 'proc',
        },
        {
          id: 'inst-3',
          state: 'ACTIVE',
          processDefinitionId: 'proc:1:abc',
          processDefinitionKey: 'proc',
        },
      ],
      scrollTop: 500,
    };

    // Clear existing state and set new one
    sessionStorage.clear();
    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(testState));

    // Destroy current component
    if (fixture && !fixture.destroyed) {
      fixture.destroy();
    }

    // Create new component (simulating page reload with existing sessionStorage)
    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify: All state is restored from sessionStorage
    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('businessKey');
    expect(component.activePills[0].values).toEqual(['BK-123']);
    expect(component.variableNamesIgnoreCase).toBe(true);
    expect(component.variableValuesIgnoreCase).toBe(false);
    expect(component.searchPageSize).toBe(50);
    expect(component.selectedInstanceIds.size).toBe(3);
    expect(component.selectedInstanceIds.has('inst-1')).toBe(true);
    expect(component.selectedInstanceIds.has('inst-2')).toBe(true);
    expect(component.selectedInstanceIds.has('inst-3')).toBe(true);

    // Verify: Service loaded the state correctly
    const loadedState = stateService.loadState();
    expect(loadedState).not.toBeNull();
    expect(loadedState?.selectedIds.length).toBe(3);
  });
});