import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { ProcessInstanceSearchComponent } from './process-instance-search';
import {
  CockpitService,
  ProcessInstance,
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

const TEST_TRANSLATIONS: Record<string, string> = {
  'cockpit.processes.search.selectAllOnPage': 'Select all on page',
  'cockpit.processes.search.selectedCount': '{{count}} selected',
  'cockpit.processes.search.performBatchOp': 'Perform batch operation',
  'cockpit.processes.search.operationRequiresOnlyActive': 'Only available for active instances',
  'cockpit.processes.search.operationRequiresOnlySuspended': 'Only available for suspended instances',
  'cockpit.processes.search.operationRequiresOnlyRunning': 'Only available for running instances',
  'cockpit.processes.search.operationRequiresOnlyFinished': 'Only available for finished instances',
  'cockpit.common.clear': 'Clear',
};

const MOCK_INSTANCES: ProcessInstance[] = [
  {
    id: 'inst-1', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    startTime: '2024-01-01T10:00:00.000Z', state: 'ACTIVE',
  },
  {
    id: 'inst-2', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    startTime: '2024-01-02T10:00:00.000Z', state: 'SUSPENDED',
  },
  {
    id: 'inst-3', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    startTime: '2024-01-03T10:00:00.000Z', state: 'COMPLETED',
  },
  {
    id: 'inst-4', processDefinitionId: 'proc:1:abc', processDefinitionKey: 'proc',
    startTime: '2024-01-04T10:00:00.000Z', state: 'EXTERNALLY_TERMINATED',
  },
];

initTestEnvironment();

describe('ProcessInstanceSearchComponent - Batch Operations', () => {
  let component: ProcessInstanceSearchComponent;
  let fixture: ComponentFixture<ProcessInstanceSearchComponent>;
  let cockpitService: CockpitService;
  let router: Router;

  beforeEach(async () => {
    const mockCockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
      getProcessInstances: vi.fn().mockReturnValue(of({ instances: MOCK_INSTANCES, total: 4 })),
      getProcessInstanceCounts: vi.fn().mockReturnValue(of({ active: 0, suspended: 0, completed: 0, incidents: 0 })),
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of(MOCK_INSTANCES)),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(4)),
    };

    const mockNavMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
      setCockpitTab: vi.fn(),
      setActiveItem: vi.fn(),
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
        provideRouter([]),
        { provide: CockpitService, useValue: mockCockpitService },
        { provide: NavMenuService, useValue: mockNavMenuService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessInstanceSearchComponent);
    component = fixture.componentInstance;
    cockpitService = TestBed.inject(CockpitService);
    router = TestBed.inject(Router);

    // Initialize component
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  // Helper function to select instances with metadata (simulates real selection)
  function selectInstancesWithMetadata(ids: string[], instancesSource: typeof MOCK_INSTANCES = MOCK_INSTANCES) {
    component.selectedInstanceIds = new Set(ids);
    ids.forEach(id => {
      const instance = instancesSource.find(i => i.id === id);
      if (instance) {
        component['selectedInstanceMetadataCache'].set(id, {
          state: instance.state,
          processDefinitionId: instance.processDefinitionId,
          processDefinitionKey: instance.processDefinitionKey
        });
      }
    });
  }

  describe('Instance Selection', () => {
    beforeEach(() => {
      component.selectedInstanceIds.clear();
      component['selectedInstanceMetadataCache'].clear();
    });

    it('should toggle instance selection', () => {
      component.searchResults = MOCK_INSTANCES;
      expect(component.selectedInstanceIds.size).toBe(0);

      component.toggleInstanceSelection('inst-1');
      expect(component.selectedInstanceIds.has('inst-1')).toBe(true);
      expect(component.selectedInstanceIds.size).toBe(1);

      component.toggleInstanceSelection('inst-1');
      expect(component.selectedInstanceIds.has('inst-1')).toBe(false);
      expect(component.selectedInstanceIds.size).toBe(0);
    });

    it('should check if instance is selected', () => {
      component.selectedInstanceIds.add('inst-1');

      expect(component.isInstanceSelected('inst-1')).toBe(true);
      expect(component.isInstanceSelected('inst-2')).toBe(false);
    });

    it('should select all instances on current page', () => {
      component.searchResults = MOCK_INSTANCES;
      component.toggleSelectAllInstances();

      expect(component.selectedInstanceIds.size).toBe(4);
      expect(component.selectedInstanceIds.has('inst-1')).toBe(true);
      expect(component.selectedInstanceIds.has('inst-2')).toBe(true);
      expect(component.selectedInstanceIds.has('inst-3')).toBe(true);
      expect(component.selectedInstanceIds.has('inst-4')).toBe(true);
    });

    it('should deselect all instances when all are selected', () => {
      component.searchResults = MOCK_INSTANCES;
      component.selectedInstanceIds = new Set(['inst-1', 'inst-2', 'inst-3', 'inst-4']);

      component.toggleSelectAllInstances();
      expect(component.selectedInstanceIds.size).toBe(0);
    });

    it('should return true for isAllInstancesSelected when all are selected', () => {
      component.searchResults = MOCK_INSTANCES;
      component.selectedInstanceIds = new Set(['inst-1', 'inst-2', 'inst-3', 'inst-4']);

      expect(component.isAllInstancesSelected).toBe(true);
    });

    it('should return false for isAllInstancesSelected when not all are selected', () => {
      component.searchResults = MOCK_INSTANCES;
      component.selectedInstanceIds = new Set(['inst-1']);

      expect(component.isAllInstancesSelected).toBe(false);
    });

    it('should return true for isIndeterminateSelection when some are selected', () => {
      component.searchResults = MOCK_INSTANCES;
      component.selectedInstanceIds = new Set(['inst-1', 'inst-2']);

      expect(component.isIndeterminateSelection).toBe(true);
    });

    it('should return false for isIndeterminateSelection when all are selected', () => {
      component.searchResults = MOCK_INSTANCES;
      component.selectedInstanceIds = new Set(['inst-1', 'inst-2', 'inst-3', 'inst-4']);

      expect(component.isIndeterminateSelection).toBe(false);
    });

    it('should return false for isIndeterminateSelection when none are selected', () => {
      component.searchResults = MOCK_INSTANCES;
      component.selectedInstanceIds = new Set();

      expect(component.isIndeterminateSelection).toBe(false);
    });

    it('should clear selection when executeSearch is called with user reason (default)', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2']);
      component.activePills = [{ field: 'state', values: ['ACTIVE'], label: 'Active', operator: 'eq' }];

      expect(component.selectedInstanceIds.size).toBe(2);
      expect(component['selectedInstanceMetadataCache'].size).toBe(2);

      component.executeSearch();

      expect(component.selectedInstanceIds.size).toBe(0);
      expect(component['selectedInstanceMetadataCache'].size).toBe(0);
    });

    it('should preserve selection when executeSearch is called with reason=page', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2']);
      component.activePills = [{ field: 'state', values: ['ACTIVE'], label: 'Active', operator: 'eq' }];

      expect(component.selectedInstanceIds.size).toBe(2);

      component.executeSearch({ reason: 'page' });

      expect(component.selectedInstanceIds.size).toBe(2);
      expect(component['selectedInstanceMetadataCache'].size).toBe(2);
    });

    it('should preserve selection when executeSearch is called with reason=init-restore', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2']);
      component.activePills = [{ field: 'state', values: ['ACTIVE'], label: 'Active', operator: 'eq' }];

      expect(component.selectedInstanceIds.size).toBe(2);

      component.executeSearch({ reason: 'init-restore' });

      expect(component.selectedInstanceIds.size).toBe(2);
      expect(component['selectedInstanceMetadataCache'].size).toBe(2);
    });
  });

  describe('Applicable Operations Filtering', () => {
    it('should filter operations with supportsProcessInstances=true', () => {
      const applicable = component.applicableOperations;

      expect(applicable.length).toBeGreaterThan(0);
      expect(applicable.every(op => op.supportsProcessInstances === true)).toBe(true);
    });

    it('should include suspend, activate, delete-running, delete-finished operations', () => {
      const applicable = component.applicableOperations;
      const ids = applicable.map(op => op.id);

      expect(ids).toContain('suspend');
      expect(ids).toContain('activate');
      expect(ids).toContain('delete-running');
      expect(ids).toContain('delete-finished');
    });

    it('should exclude operations with supportsProcessInstances=false', () => {
      const applicable = component.applicableOperations;
      const ids = applicable.map(op => op.id);

      expect(ids).not.toContain('delete-decision');
      expect(ids).not.toContain('removal-time-decision');
      expect(ids).not.toContain('removal-time-batch');
    });

    it('should include move-instances after enabling supportsProcessInstances', () => {
      const applicable = component.applicableOperations;
      const ids = applicable.map(op => op.id);

      expect(ids).toContain('move-instances');
    });
  });

  describe('Selected Instance States', () => {
    beforeEach(() => {
      component.selectedInstanceIds.clear();
      component['selectedInstanceMetadataCache'].clear();
    });

    it('should return empty set when no instances selected', () => {
      component.searchResults = MOCK_INSTANCES;

      expect(component.selectedInstanceStates.size).toBe(0);
    });

    it('should return correct states for selected instances', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2']);

      const states = component.selectedInstanceStates;
      expect(states.size).toBe(2);
      expect(states.has('ACTIVE')).toBe(true);
      expect(states.has('SUSPENDED')).toBe(true);
    });

    it('should return single state when all selected instances have same state', () => {
      const instances = [MOCK_INSTANCES[0], { ...MOCK_INSTANCES[0], id: 'inst-5' }];
      component.searchResults = instances;
      selectInstancesWithMetadata(['inst-1', 'inst-5'], instances);

      const states = component.selectedInstanceStates;
      expect(states.size).toBe(1);
      expect(states.has('ACTIVE')).toBe(true);
    });
  });

  describe('Operation Applicability - suspend', () => {
    beforeEach(() => {
      component.selectedInstanceIds.clear();
      component['selectedInstanceMetadataCache'].clear();
    });

    it('should be applicable when all selected instances are ACTIVE', () => {
      component.searchResults = [MOCK_INSTANCES[0]];
      selectInstancesWithMetadata(['inst-1'], [MOCK_INSTANCES[0]]);

      expect(component.isOperationApplicable('suspend')).toBe(true);
    });

    it('should not be applicable when any selected instance is not ACTIVE', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2']);

      expect(component.isOperationApplicable('suspend')).toBe(false);
    });

    it('should not be applicable when selected instances include SUSPENDED', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-2']);

      expect(component.isOperationApplicable('suspend')).toBe(false);
    });

    it('should return correct disabled reason for suspend', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-2']);

      const reason = component.getOperationDisabledReason('suspend');
      expect(reason).toBe('cockpit.processes.search.operationRequiresOnlyActive');
    });
  });

  describe('Operation Applicability - activate', () => {
    beforeEach(() => {
      component.selectedInstanceIds.clear();
      component['selectedInstanceMetadataCache'].clear();
    });

    it('should be applicable when all selected instances are SUSPENDED', () => {
      component.searchResults = [MOCK_INSTANCES[1]];
      selectInstancesWithMetadata(['inst-2'], [MOCK_INSTANCES[1]]);

      expect(component.isOperationApplicable('activate')).toBe(true);
    });

    it('should not be applicable when any selected instance is not SUSPENDED', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2']);

      expect(component.isOperationApplicable('activate')).toBe(false);
    });

    it('should not be applicable when selected instances include ACTIVE', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1']);

      expect(component.isOperationApplicable('activate')).toBe(false);
    });

    it('should return correct disabled reason for activate', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1']);

      const reason = component.getOperationDisabledReason('activate');
      expect(reason).toBe('cockpit.processes.search.operationRequiresOnlySuspended');
    });
  });

  describe('Operation Applicability - delete-running', () => {
    beforeEach(() => {
      component.selectedInstanceIds.clear();
      component['selectedInstanceMetadataCache'].clear();
    });

    it('should be applicable when all selected instances are ACTIVE', () => {
      component.searchResults = [MOCK_INSTANCES[0]];
      selectInstancesWithMetadata(['inst-1'], [MOCK_INSTANCES[0]]);

      expect(component.isOperationApplicable('delete-running')).toBe(true);
    });

    it('should be applicable when all selected instances are SUSPENDED', () => {
      component.searchResults = [MOCK_INSTANCES[1]];
      selectInstancesWithMetadata(['inst-2'], [MOCK_INSTANCES[1]]);

      expect(component.isOperationApplicable('delete-running')).toBe(true);
    });

    it('should not be applicable when any selected instance is COMPLETED', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-3']);

      expect(component.isOperationApplicable('delete-running')).toBe(false);
    });

    it('should not be applicable when any selected instance is EXTERNALLY_TERMINATED', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-4']);

      expect(component.isOperationApplicable('delete-running')).toBe(false);
    });

    it('should return correct disabled reason for delete-running', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-3']);

      const reason = component.getOperationDisabledReason('delete-running');
      expect(reason).toBe('cockpit.processes.search.operationRequiresOnlyRunning');
    });
  });

  describe('Operation Applicability - delete-finished', () => {
    beforeEach(() => {
      component.selectedInstanceIds.clear();
      component['selectedInstanceMetadataCache'].clear();
    });

    it('should be applicable when all selected instances are COMPLETED', () => {
      component.searchResults = [MOCK_INSTANCES[2]];
      selectInstancesWithMetadata(['inst-3'], [MOCK_INSTANCES[2]]);

      expect(component.isOperationApplicable('delete-finished')).toBe(true);
    });

    it('should be applicable when all selected instances are EXTERNALLY_TERMINATED', () => {
      component.searchResults = [MOCK_INSTANCES[3]];
      selectInstancesWithMetadata(['inst-4'], [MOCK_INSTANCES[3]]);

      expect(component.isOperationApplicable('delete-finished')).toBe(true);
    });

    it('should be applicable when all selected instances are finished (mixed terminated states)', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-3', 'inst-4']);

      expect(component.isOperationApplicable('delete-finished')).toBe(true);
    });

    it('should not be applicable when any selected instance is ACTIVE', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-3']);

      expect(component.isOperationApplicable('delete-finished')).toBe(false);
    });

    it('should not be applicable when any selected instance is SUSPENDED', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-2', 'inst-3']);

      expect(component.isOperationApplicable('delete-finished')).toBe(false);
    });

    it('should return correct disabled reason for delete-finished', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1']);

      const reason = component.getOperationDisabledReason('delete-finished');
      expect(reason).toBe('cockpit.processes.search.operationRequiresOnlyFinished');
    });
  });

  describe('Operation Applicability - other operations', () => {
    beforeEach(() => {
      component.selectedInstanceIds.clear();
      component['selectedInstanceMetadataCache'].clear();
    });

    it('should be applicable for set-retries-jobs when all selected are ACTIVE or SUSPENDED', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2']);

      expect(component.isOperationApplicable('set-retries-jobs')).toBe(true);
    });

    it('should NOT be applicable for set-retries-jobs when any instance is COMPLETED', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2', 'inst-3']);

      expect(component.isOperationApplicable('set-retries-jobs')).toBe(false);
      const reason = component.getOperationDisabledReason('set-retries-jobs');
      expect(reason).toBe('cockpit.processes.search.operationRequiresOnlyRunning');
    });

    it('should be applicable for set-variables when all selected are ACTIVE or SUSPENDED', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2']);

      expect(component.isOperationApplicable('set-variables')).toBe(true);
    });

    it('should NOT be applicable for set-variables when any instance is COMPLETED', () => {
      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2', 'inst-3']);

      expect(component.isOperationApplicable('set-variables')).toBe(false);
      const reason = component.getOperationDisabledReason('set-variables');
      expect(reason).toBe('cockpit.processes.search.operationRequiresOnlyRunning');
    });
  });

  describe('Batch Operations Dropdown', () => {
    it('should toggle dropdown visibility', () => {
      expect(component.showBatchOpsDropdown).toBe(false);

      component.toggleBatchOpsDropdown();
      expect(component.showBatchOpsDropdown).toBe(true);

      component.toggleBatchOpsDropdown();
      expect(component.showBatchOpsDropdown).toBe(false);
    });

    it('should close dropdown on document click outside', () => {
      component.showBatchOpsDropdown = true;

      const outsideEvent = new MouseEvent('click');
      Object.defineProperty(outsideEvent, 'target', { value: document.body, enumerable: true });

      component.onDocumentClick(outsideEvent);
      expect(component.showBatchOpsDropdown).toBe(false);
    });

    it('should close dropdown on Escape key', () => {
      component.showBatchOpsDropdown = true;

      component.onEscapeKey();
      expect(component.showBatchOpsDropdown).toBe(false);
    });
  });

  describe('Batch Operation Selection and Navigation', () => {
    it('should navigate to batch operations wizard with selected instances', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1', 'inst-2']);

      component.onBatchOperationSelect('suspend');

      expect(sessionStorageSpy).toHaveBeenCalledWith(
        'batchOpsWizardState',
        expect.stringContaining('"selectedIds":["inst-1","inst-2"]')
      );
      expect(sessionStorageSpy).toHaveBeenCalledWith(
        'batchOpsWizardState',
        expect.stringContaining('"fromSearch":true')
      );
      expect(sessionStorageSpy).toHaveBeenCalledWith(
        'batchOpsWizardState',
        expect.stringContaining('"operationId":"suspend"')
      );

      expect(navigateSpy).toHaveBeenCalledWith(['/cockpit/batch/operations']);
    });

    it('should save state without returnUrl (behavior changed in later commits)', () => {
      // Start completely fresh
      component.selectedInstanceIds = new Set();
      component['selectedInstanceMetadataCache'].clear();
      component.searchResults = MOCK_INSTANCES;

      // Add only inst-1
      selectInstancesWithMetadata(['inst-1']);

      // Debug: verify selection before calling onBatchOperationSelect
      expect(component.selectedInstanceIds.size).toBe(1);
      expect([...component.selectedInstanceIds]).toEqual(['inst-1']);

      // Spy AFTER selection to avoid interference from previous test
      const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      vi.spyOn(router, 'navigate');

      component.onBatchOperationSelect('suspend');

      const callArg = sessionStorageSpy.mock.calls[0]?.[1] as string;
      const state = JSON.parse(callArg);
      expect(state.selectedIds).toEqual(['inst-1']);
      expect(state.fromSearch).toBe(true);
      expect(state.operationId).toBe('suspend');
      // returnUrl was removed in later commits - no longer expected
      expect(state.returnUrl).toBeUndefined();
    });

    it('should navigate to wizard when selecting an applicable operation', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

      component.searchResults = MOCK_INSTANCES;
      selectInstancesWithMetadata(['inst-1']); // ACTIVE - suspend is applicable

      component.onBatchOperationSelect('suspend');

      expect(sessionStorageSpy).toHaveBeenCalledWith(
        'batchOpsWizardState',
        expect.stringContaining('"operationId":"suspend"')
      );
      expect(navigateSpy).toHaveBeenCalledWith(['/cockpit/batch/operations']);
    });

    it('should return early without navigation when no instances are selected', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

      component.searchResults = MOCK_INSTANCES;
      component.selectedInstanceIds = new Set(); // Empty selection

      // onBatchOperationSelect won't be called from template due to disabled button,
      // but if called directly it should return early for move-instances
      component.onBatchOperationSelect('move-instances');

      expect(sessionStorageSpy).not.toHaveBeenCalled();
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });
});
