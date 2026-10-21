import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter, NavigationEnd } from '@angular/router';
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
import { NavigationHistoryService } from '../../../../services/navigation-history.service';
import { AuthService } from '../../../../services/auth';
import { initTestEnvironment } from '../../../../testing/test-utils';

const TEST_TRANSLATIONS: Record<string, string> = {
  'cockpit.processes.search.staleInstancesDetected': '{{count}} selected instance(s) are no longer available and have been removed from selection',
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

describe('ProcessInstanceSearchComponent - State Persistence NEW RULE', () => {
  let component: ProcessInstanceSearchComponent;
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let cockpitService: CockpitService;
  let router: Router;
  let stateService: SearchInstancesStateService;
  let navigationHistoryService: NavigationHistoryService;
  let authService: AuthService;
  let authEventsSubject: Subject<any>;
  let searchCallCount: number;

  beforeEach(async () => {
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
      searchProcessInstancesGlobal: vi.fn(() => {
        searchCallCount++;
        return of(MOCK_INSTANCES_PAGE1);
      }),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(3)),
    };

    const mockNavMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    };

    const mockTranslateService = {
      instant: vi.fn((key: string, params?: Record<string, string>) => {
        let result = TEST_TRANSLATIONS[key] || key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            result = result.replace(`{{${k}}}`, v);
          });
        }
        return result;
      }),
      currentLang$: of('en'),
      switchLanguage: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: mockCockpitService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NavMenuService, useValue: mockNavMenuService },
        { provide: TranslateService, useValue: mockTranslateService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
            queryParams: of({}),
          },
        },
        SearchInstancesStateService,
        NavigationHistoryService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    cockpitService = TestBed.inject(CockpitService);
    router = TestBed.inject(Router);
    stateService = TestBed.inject(SearchInstancesStateService);
    navigationHistoryService = TestBed.inject(NavigationHistoryService);
    authService = TestBed.inject(AuthService);

    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
    fixture.destroy();
  });

  // T1: État NON restauré si previousUrl ne correspond PAS à BATCH_RETURN_ORIGINS
  it('T1: Should NOT restore state if previousUrl is not a batch operation', async () => {
    // Write snapshot directly to sessionStorage (before any component creation)
    const snapshot: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'businessKey', values: ['BK-123'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: ['inst-1', 'inst-2'],
      selectedMetadata: [
        { id: 'inst-1', state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc' },
        { id: 'inst-2', state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc' },
      ],
      scrollTop: 0,
    };

    // Create fresh TestBed with navigation history simulating non-batch origin
    const freshAuthEventsSubject = new Subject<any>();

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: {
          getProcessDefinitions: vi.fn().mockReturnValue(of([])),
          searchProcessInstancesGlobal: vi.fn(() => of(MOCK_INSTANCES_PAGE1)),
          searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(3)),
        }},
        { provide: AuthService, useValue: {
          events$: freshAuthEventsSubject.asObservable(),
          authEvents$: freshAuthEventsSubject.asObservable(),
          isAuthenticated: vi.fn().mockReturnValue(of(true)),
          getCurrentAuth: vi.fn().mockReturnValue({ userId: 'test-user', apps: ['cockpit'], authorizedApps: ['cockpit'] }),
          canAccess: vi.fn().mockReturnValue(true),
        }},
        { provide: NavMenuService, useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() }},
        { provide: TranslateService, useValue: {
          instant: vi.fn((key: string) => key),
          currentLang$: of('en'),
          switchLanguage: vi.fn(),
        }},
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} }, queryParams: of({}) }},
        SearchInstancesStateService,
        NavigationHistoryService,
      ],
    }).compileComponents();

    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(snapshot));

    // Get fresh NavigationHistoryService and set previousUrl to non-batch BEFORE creating component
    const freshNavHistory = TestBed.inject(NavigationHistoryService);
    (freshNavHistory as any)._previousUrl = '/cockpit/processes/some-process';
    (freshNavHistory as any)._currentUrl = '/cockpit/processes/search';

    // Create component (ngOnInit will run during this call)
    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    await newFixture.whenStable();

    // Verify: State NOT restored (snapshot remains intact, not consumed)
    expect(newComponent.activePills.length).toBe(0);
    expect(newComponent.selectedInstanceIds.size).toBe(0);
    // Snapshot is NOT deleted because it was never read (isReturningFromBatch was false)
    expect(sessionStorage.getItem('searchInstancesState.v1')).not.toBeNull();

    newFixture.destroy();
  });

  // T2: État restauré si previousUrl = /cockpit/batch/operations
  it('T2: Should restore state when returning from /cockpit/batch/operations', async () => {
    const snapshot: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'businessKey', values: ['BK-456'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: ['inst-1'],
      selectedMetadata: [
        { id: 'inst-1', state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc' },
      ],
      scrollTop: 0,
    };
    stateService.writeSnapshot(snapshot);

    // Simulate navigation from batch operations
    (navigationHistoryService as any)._previousUrl = '/cockpit/batch/operations';
    (navigationHistoryService as any)._currentUrl = '/cockpit/processes/search';

    // Inject URL criteria to trigger initializeFromContext with criteria
    const routeSnapshot = TestBed.inject(ActivatedRoute).snapshot;
    (routeSnapshot.queryParams as any) = {
      criteria: JSON.stringify([{ field: 'businessKey', values: ['BK-456'] }]),
    };

    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    await newFixture.whenStable();

    // Verify: State restored from snapshot, snapshot deleted
    expect(newComponent.activePills.length).toBe(1);
    expect(newComponent.activePills[0].field).toBe('businessKey');
    expect(newComponent.selectedInstanceIds.size).toBe(1);
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();
  });

  // T3: État restauré si previousUrl = /cockpit/processes/X?tab=modify
  it('T3: Should restore state when returning from modify tab (move instances)', async () => {
    const snapshot: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'state', values: ['active'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: ['inst-1', 'inst-2', 'inst-3'],
      selectedMetadata: [
        { id: 'inst-1', state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc' },
        { id: 'inst-2', state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc' },
        { id: 'inst-3', state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc' },
      ],
      scrollTop: 0,
    };
    stateService.writeSnapshot(snapshot);

    // Simulate navigation from modify tab
    (navigationHistoryService as any)._previousUrl = '/cockpit/processes/proc/instances?tab=modify';
    (navigationHistoryService as any)._currentUrl = '/cockpit/processes/search';

    const routeSnapshot = TestBed.inject(ActivatedRoute).snapshot;
    (routeSnapshot.queryParams as any) = {
      criteria: JSON.stringify([{ field: 'state', values: ['active'] }]),
    };

    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    await newFixture.whenStable();

    // Verify: State restored
    expect(newComponent.activePills.length).toBe(1);
    expect(newComponent.selectedInstanceIds.size).toBe(3);
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();
  });

  // T4: Snapshot écrit dans onBatchOperationSelect (batch operations)
  it('T4: Should write snapshot when selecting batch operation', () => {
    // Setup: criteria + selection
    component.activePills = [{ field: 'businessKey', values: ['BK-789'] }];
    component.searchExecuted = true;
    component.searchResults = MOCK_INSTANCES_PAGE1;
    component.selectedInstanceIds = new Set(['inst-1', 'inst-2']);
    (component as any).selectedInstanceMetadataCache.set('inst-1', {
      state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    });
    (component as any).selectedInstanceMetadataCache.set('inst-2', {
      state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    });

    // Spy on router navigate
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    // Execute: Select batch operation
    component.onBatchOperationSelect('suspend');

    // Verify: Snapshot written to sessionStorage
    const stored = sessionStorage.getItem('searchInstancesState.v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.selectedIds).toEqual(['inst-1', 'inst-2']);
    expect(parsed.criteria).toEqual([{ field: 'businessKey', values: ['BK-789'] }]);

    // Verify: Navigation to batch operations
    expect(navigateSpy).toHaveBeenCalledWith(['/cockpit/batch/operations']);
  });

  // T5: Snapshot écrit dans onBatchOperationSelect (move-instances)
  it('T5: Should write snapshot when selecting move-instances operation', () => {
    component.activePills = [{ field: 'state', values: ['active'] }];
    component.searchExecuted = true;
    component.searchResults = MOCK_INSTANCES_PAGE1;
    component.selectedInstanceIds = new Set(['inst-1', 'inst-2', 'inst-3']);
    (component as any).selectedInstanceMetadataCache.set('inst-1', {
      state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    });
    (component as any).selectedInstanceMetadataCache.set('inst-2', {
      state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    });
    (component as any).selectedInstanceMetadataCache.set('inst-3', {
      state: 'ACTIVE', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    });

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onBatchOperationSelect('move-instances');

    // Verify: Snapshot written
    const stored = sessionStorage.getItem('searchInstancesState.v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.selectedIds).toEqual(['inst-1', 'inst-2', 'inst-3']);

    // Verify: Navigation to modify tab
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/cockpit/processes', 'proc', 'instances'],
      expect.objectContaining({
        queryParams: { definitionId: 'proc:1:abc', tab: 'modify' },
      })
    );
  });

  // T6: Snapshot supprimé après lecture (single-use)
  it('T6: Should delete snapshot after reading (single-use)', () => {
    const snapshot: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'instanceId', values: ['id-1'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: [],
      selectedMetadata: [],
      scrollTop: 0,
    };
    stateService.writeSnapshot(snapshot);

    // Verify snapshot exists
    expect(sessionStorage.getItem('searchInstancesState.v1')).not.toBeNull();

    // Read snapshot
    const loaded = stateService.loadAndDeleteState();
    expect(loaded).not.toBeNull();

    // Verify snapshot deleted
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();

    // Second read returns null
    const secondLoad = stateService.loadAndDeleteState();
    expect(secondLoad).toBeNull();
  });

  // T7: État vidé par Clear button
  it('T7: Should clear state when Clear button is clicked', async () => {
    component.activePills = [{ field: 'businessKey', values: ['BK-CLEAR'] }];
    component.searchExecuted = true;
    component.searchResults = MOCK_INSTANCES_PAGE1;
    component.selectedInstanceIds = new Set(['inst-1']);

    // Write snapshot
    const snapshot: SearchInstancesPersistedState = {
      version: 1,
      criteria: component.activePills,
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: ['inst-1'],
      selectedMetadata: [],
      scrollTop: 0,
    };
    stateService.writeSnapshot(snapshot);

    // Execute: Clear search
    component.clearSearch();
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify: All state cleared
    expect(component.activePills.length).toBe(0);
    expect(component.selectedInstanceIds.size).toBe(0);
    expect(component.searchExecuted).toBe(false);
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();
  });

  // T8: État vidé lors du logout
  it('T8: Should clear state on logout', () => {
    const snapshot: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'businessKey', values: ['BK-LOGOUT'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: [],
      selectedMetadata: [],
      scrollTop: 0,
    };
    stateService.writeSnapshot(snapshot);

    // Verify snapshot exists
    expect(sessionStorage.getItem('searchInstancesState.v1')).not.toBeNull();

    // Trigger logout event
    authEventsSubject.next({ type: 'authentication.logout.success' });

    // Verify: State cleared
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();
  });

  // T9: État corrompu géré gracieusement
  it('T9: Should handle corrupted state gracefully', () => {
    sessionStorage.setItem('searchInstancesState.v1', 'invalid-json{');

    const loaded = stateService.loadAndDeleteState();

    // Verify: Returns null and cleans up
    expect(loaded).toBeNull();
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();
  });

  // T10: Version incorrecte ignorée
  it('T10: Should ignore state with wrong version', () => {
    const wrongVersion = {
      version: 99,
      criteria: [],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: [],
      selectedMetadata: [],
    };
    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(wrongVersion));

    const loaded = stateService.loadAndDeleteState();

    // Verify: Returns null, snapshot deleted
    expect(loaded).toBeNull();
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();
  });

  // T11: Sélection >100k IDs non persistée
  it('T11: Should not persist selection exceeding 100k IDs', () => {
    const largeSelection = Array.from({ length: 100001 }, (_, i) => `id-${i}`);
    const largeSnapshot: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'state', values: ['active'] }],
      variableNamesIgnoreCase: false,
      variableValuesIgnoreCase: false,
      currentPage: 1,
      pageSize: 20,
      selectedIds: largeSelection,
      selectedMetadata: [],
      scrollTop: 0,
    };

    // Attempt to write large snapshot
    stateService.writeSnapshot(largeSnapshot);

    // Verify: Nothing written to sessionStorage
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();
  });

  // REMOVED tests that contradict the NEW RULE:
  // - OLD Test 1 "restore after navigation with ONE query" → contradicts NEW RULE (no continuous save)
  // - OLD Test 2 "restore multi-page selection" → contradicts NEW RULE
  // - OLD Test 5 "clear selection after batch return" → contradicts NEW RULE (snapshot auto-deleted)
  // - OLD Test 10 "restore with new service instance" → contradicts NEW RULE (no restore without batch return)
});
