import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ProcessInstanceSearchComponent } from './process-instance-search';
import { CockpitService, ProcessInstance } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { SearchInstancesStateService, SearchInstancesPersistedState } from '../../../../services/search-instances-state.service';
import { NavigationHistoryService } from '../../../../services/navigation-history.service';
import { AuthService } from '../../../../services/auth';
import { initTestEnvironment } from '../../../../testing/test-utils';

const MOCK_INSTANCES: ProcessInstance[] = [
  {
    id: 'inst-1', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    processDefinitionName: 'Test Process', startTime: '2024-01-01T10:00:00.000Z', state: 'ACTIVE',
  },
  {
    id: 'inst-2', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    processDefinitionName: 'Test Process', startTime: '2024-01-02T10:00:00.000Z', state: 'ACTIVE',
  },
];

initTestEnvironment();

describe('Process Instance Search - Batch Success Integration', () => {
  let component: ProcessInstanceSearchComponent;
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let stateService: SearchInstancesStateService;
  let navigationHistoryService: NavigationHistoryService;
  let authEventsSubject: Subject<any>;

  beforeEach(async () => {
    sessionStorage.clear();
    authEventsSubject = new Subject();

    await TestBed.configureTestingModule({
      imports: [ProcessInstanceSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: CockpitService,
          useValue: {
            getProcessDefinitions: vi.fn().mockReturnValue(of([])),
            searchProcessInstancesGlobal: vi.fn(() => of(MOCK_INSTANCES)),
            searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(2)),
          },
        },
        {
          provide: AuthService,
          useValue: {
            events$: authEventsSubject.asObservable(),
            authEvents$: authEventsSubject.asObservable(),
            isAuthenticated: vi.fn().mockReturnValue(of(true)),
            getCurrentAuth: vi.fn().mockReturnValue({ userId: 'test-user', apps: ['cockpit'], authorizedApps: ['cockpit'] }),
            canAccess: vi.fn().mockReturnValue(true),
          },
        },
        { provide: NavMenuService, useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() } },
        {
          provide: TranslateService,
          useValue: {
            instant: vi.fn((key: string) => key),
            currentLang$: of('en'),
            switchLanguage: vi.fn(),
          },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} }, queryParams: of({}) } },
        SearchInstancesStateService,
        NavigationHistoryService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(SearchInstancesStateService);
    navigationHistoryService = TestBed.inject(NavigationHistoryService);

    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
    fixture.destroy();
  });

  // T-S1: Retour sans succès → sélection restaurée
  it('[T-S1] Should restore selection when returning from batch WITHOUT success flag', async () => {
    // Destroy existing component
    fixture.destroy();

    // Prepare: Write snapshot with selection
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
    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(snapshot));

    // NO success flag (batch not created or user navigated away)
    // sessionStorage.setItem('searchBatchReturn', 'true'); ← NOT SET

    // Simulate navigation from batch operations
    (navigationHistoryService as any)._previousUrl = '/cockpit/batch/operations';
    (navigationHistoryService as any)._currentUrl = '/cockpit/processes/search';

    // Inject URL criteria
    const routeSnapshot = TestBed.inject(ActivatedRoute).snapshot;
    (routeSnapshot.queryParams as any) = {
      criteria: JSON.stringify([{ field: 'businessKey', values: ['BK-123'] }]),
    };

    // Create new component
    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    await newFixture.whenStable();

    // Verify: Selection RESTORED
    expect(newComponent.selectedInstanceIds.size).toBe(2);
    expect(newComponent.selectedInstanceIds.has('inst-1')).toBe(true);
    expect(newComponent.selectedInstanceIds.has('inst-2')).toBe(true);
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull(); // Snapshot consumed

    newFixture.destroy();
  });

  // T-S2: Retour après succès → sélection vide
  it('[T-S2] Should clear selection when returning from batch WITH success flag', async () => {
    fixture.destroy();

    // Prepare: Write snapshot with selection
    const snapshot: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'businessKey', values: ['BK-456'] }],
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
    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(snapshot));

    // SUCCESS flag set by wizard after batch creation
    sessionStorage.setItem('searchBatchReturn', 'true');

    // Simulate navigation from batch operations
    (navigationHistoryService as any)._previousUrl = '/cockpit/batch/operations';
    (navigationHistoryService as any)._currentUrl = '/cockpit/processes/search';

    const routeSnapshot = TestBed.inject(ActivatedRoute).snapshot;
    (routeSnapshot.queryParams as any) = {
      criteria: JSON.stringify([{ field: 'businessKey', values: ['BK-456'] }]),
    };

    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    await newFixture.whenStable();

    // Verify: Selection EMPTY (cleared by success flag)
    expect(newComponent.selectedInstanceIds.size).toBe(0);
    // Verify: Success flag removed
    expect(sessionStorage.getItem('searchBatchReturn')).toBeNull();
    // Verify: Snapshot also cleared (to prevent restoration on F5)
    expect(sessionStorage.getItem('searchInstancesState.v1')).toBeNull();

    newFixture.destroy();
  });

  // T-S3: Échec du batch → sélection restaurée (même comportement que T-S1)
  it('[T-S3] Should restore selection when batch fails (no success flag)', async () => {
    fixture.destroy();

    const snapshot: SearchInstancesPersistedState = {
      version: 1,
      criteria: [{ field: 'state', values: ['active'] }],
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
    sessionStorage.setItem('searchInstancesState.v1', JSON.stringify(snapshot));

    // Batch failed → NO success flag
    // sessionStorage.setItem('searchBatchReturn', 'true'); ← NOT SET

    (navigationHistoryService as any)._previousUrl = '/cockpit/batch/operations';
    (navigationHistoryService as any)._currentUrl = '/cockpit/processes/search';

    const routeSnapshot = TestBed.inject(ActivatedRoute).snapshot;
    (routeSnapshot.queryParams as any) = {
      criteria: JSON.stringify([{ field: 'state', values: ['active'] }]),
    };

    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    await newFixture.whenStable();

    // Verify: Selection RESTORED (batch failed, so selection is kept)
    expect(newComponent.selectedInstanceIds.size).toBe(1);
    expect(newComponent.selectedInstanceIds.has('inst-1')).toBe(true);

    newFixture.destroy();
  });

  // T-S4: Succès puis F5 → rien restauré
  it('[T-S4] Should NOT restore anything after success + F5 refresh', async () => {
    fixture.destroy();

    // Simulate: Batch was successful, snapshot was cleared, success flag removed
    // User then presses F5 → NO snapshot, NO success flag, NO previousUrl (fresh load)
    // Result: Clean slate, no restoration

    // NO snapshot
    // NO success flag
    // previousUrl is null (fresh page load)
    (navigationHistoryService as any)._previousUrl = null;
    (navigationHistoryService as any)._currentUrl = '/cockpit/processes/search';

    const routeSnapshot = TestBed.inject(ActivatedRoute).snapshot;
    (routeSnapshot.queryParams as any) = {};

    const newFixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    await newFixture.whenStable();

    // Verify: Clean slate
    expect(newComponent.activePills.length).toBe(0);
    expect(newComponent.selectedInstanceIds.size).toBe(0);
    expect(newComponent.searchExecuted).toBe(false);

    newFixture.destroy();
  });
});
