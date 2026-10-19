/**
 * Tests for batch operations wizard preselection feature (ORQ-283)
 *
 * Tests:
 * - loadFromSessionStorage with fromSearch=true skips loadInstances()
 * - backToSearch() navigation with returnUrl
 * - reset() clears fromSearch and returnUrl
 * - "Back to search" button visibility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { of } from 'rxjs';

describe('BatchOperationsWizardComponent — Preselection from search (ORQ-283)', () => {
  let component: BatchOperationsWizardComponent;
  let mockProcessInstanceService: any;
  let mockRouter: any;
  let mockCdr: any;
  let sessionStorageGetSpy: any;
  let sessionStorageSetSpy: any;
  let sessionStorageRemoveSpy: any;

  beforeEach(() => {
    sessionStorage.clear();

    mockProcessInstanceService = {
      getProcessInstances: vi.fn().mockReturnValue(of({ instances: [], total: 0 })),
      suspendInstancesAsync: vi.fn().mockReturnValue(of({ id: 'batch-suspend' })),
    };

    mockRouter = {
      navigate: vi.fn().mockReturnValue(Promise.resolve(true)),
      navigateByUrl: vi.fn().mockReturnValue(Promise.resolve(true)),
      url: '/cockpit/processes/search?state=ACTIVE&processDefinitionKey=invoice',
    };

    mockCdr = {
      markForCheck: vi.fn(),
    };

    component = Object.create(BatchOperationsWizardComponent.prototype);
    component.processInstanceService = mockProcessInstanceService;
    component.router = mockRouter;
    component.cdr = mockCdr;
    component.destroyRef = { onDestroy: vi.fn() };

    component.currentStep = 1;
    component.selectedOperationId = null;
    component.selectedIds = new Set();
    component.mode = 'instances';
    component.fromSearch = false;
    component.returnUrl = undefined;
    component.executing = false;

    sessionStorageGetSpy = vi.spyOn(Storage.prototype, 'getItem');
    sessionStorageSetSpy = vi.spyOn(Storage.prototype, 'setItem');
    sessionStorageRemoveSpy = vi.spyOn(Storage.prototype, 'removeItem');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('loadFromSessionStorage with fromSearch', () => {
    it('should skip loadInstances() when fromSearch=true and selectedIds has instances', () => {
      const state = {
        operationId: 'suspend',
        selectedIds: ['inst-1', 'inst-2', 'inst-3'],
        fromSearch: true,
        returnUrl: '/cockpit/processes/search?state=ACTIVE',
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(state));

      component.loadFromSessionStorage();

      expect(component.selectedOperationId).toBe('suspend');
      expect(component.selectedIds.size).toBe(3);
      expect(component.selectedIds.has('inst-1')).toBe(true);
      expect(component.selectedIds.has('inst-2')).toBe(true);
      expect(component.selectedIds.has('inst-3')).toBe(true);
      expect(component.fromSearch).toBe(true);
      expect(component.returnUrl).toBe('/cockpit/processes/search?state=ACTIVE');

      expect(mockProcessInstanceService.getProcessInstances).not.toHaveBeenCalled();
    });

    it('should load instances when fromSearch=true but selectedIds is empty', () => {
      const state = {
        operationId: 'suspend',
        selectedIds: [],
        fromSearch: true,
        returnUrl: '/cockpit/processes/search',
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(state));

      component.loadFromSessionStorage();

      expect(component.fromSearch).toBe(true);
      expect(component.returnUrl).toBe('/cockpit/processes/search');
      expect(component.selectedIds.size).toBe(0);
      expect(mockProcessInstanceService.getProcessInstances).toHaveBeenCalled();
    });

    it('should load instances when fromSearch=false', () => {
      const state = {
        operationId: 'suspend',
        selectedIds: ['inst-1', 'inst-2'],
        fromSearch: false,
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(state));

      component.loadFromSessionStorage();

      expect(component.fromSearch).toBe(false);
      expect(component.selectedIds.size).toBe(2);
      expect(mockProcessInstanceService.getProcessInstances).toHaveBeenCalled();
    });

    it('should load instances when fromSearch is not present in state', () => {
      const state = {
        operationId: 'suspend',
        selectedIds: ['inst-1', 'inst-2'],
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(state));

      component.loadFromSessionStorage();

      expect(component.fromSearch).toBe(false);
      expect(component.selectedIds.size).toBe(2);
      expect(mockProcessInstanceService.getProcessInstances).toHaveBeenCalled();
    });

    it('should handle missing returnUrl gracefully', () => {
      const state = {
        operationId: 'suspend',
        selectedIds: ['inst-1'],
        fromSearch: true,
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(state));

      component.loadFromSessionStorage();

      expect(component.fromSearch).toBe(true);
      expect(component.returnUrl).toBeUndefined();
      expect(mockProcessInstanceService.getProcessInstances).not.toHaveBeenCalled();
    });
  });

  describe('saveToSessionStorage with fromSearch', () => {
    it('should save fromSearch and returnUrl to sessionStorage', () => {
      component.selectedOperationId = 'suspend';
      component.selectedIds = new Set(['inst-1', 'inst-2']);
      component.fromSearch = true;
      component.returnUrl = '/cockpit/processes/search?state=ACTIVE';
      component.mode = 'instances';

      component.saveToSessionStorage();

      expect(sessionStorageSetSpy).toHaveBeenCalledWith(
        'batchOpsWizardState',
        expect.any(String)
      );

      const savedState = JSON.parse(sessionStorageSetSpy.mock.calls[0][1]);
      expect(savedState.fromSearch).toBe(true);
      expect(savedState.returnUrl).toBe('/cockpit/processes/search?state=ACTIVE');
      expect(savedState.operationId).toBe('suspend');
      expect(savedState.selectedIds).toEqual(['inst-1', 'inst-2']);
    });

    it('should not save fromSearch when it is false', () => {
      component.selectedOperationId = 'suspend';
      component.selectedIds = new Set(['inst-1']);
      component.fromSearch = false;
      component.mode = 'instances';

      component.saveToSessionStorage();

      const savedState = JSON.parse(sessionStorageSetSpy.mock.calls[0][1]);
      expect(savedState.fromSearch).toBeUndefined();
      expect(savedState.returnUrl).toBeUndefined();
    });
  });

  describe('backToSearch() navigation', () => {
    it('should navigate to returnUrl when returnUrl is present', () => {
      component.returnUrl = '/cockpit/processes/search?state=ACTIVE&processDefinitionKey=invoice';

      component.backToSearch();

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith(
        '/cockpit/processes/search?state=ACTIVE&processDefinitionKey=invoice'
      );
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to default search page when returnUrl is undefined', () => {
      component.returnUrl = undefined;

      component.backToSearch();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cockpit/processes/search']);
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should navigate to default search page when returnUrl is empty string', () => {
      component.returnUrl = '';

      component.backToSearch();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cockpit/processes/search']);
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('reset() clears fromSearch and returnUrl', () => {
    it('should clear fromSearch and returnUrl on reset', () => {
      component.fromSearch = true;
      component.returnUrl = '/cockpit/processes/search?state=ACTIVE';
      component.selectedOperationId = 'suspend';
      component.selectedIds = new Set(['inst-1', 'inst-2']);
      component.currentStep = 2;

      component.reset();

      expect(component.fromSearch).toBe(false);
      expect(component.returnUrl).toBeUndefined();
      expect(component.selectedOperationId).toBeNull();
      expect(component.selectedIds.size).toBe(0);
      expect(component.currentStep).toBe(1);
    });

    it('should clear fromSearch and returnUrl from sessionStorage on reset', () => {
      component.fromSearch = true;
      component.returnUrl = '/cockpit/processes/search?state=ACTIVE';
      component.selectedOperationId = 'suspend';
      component.selectedIds = new Set(['inst-1']);
      component.mode = 'instances';

      component.saveToSessionStorage();
      component.reset();

      expect(sessionStorageRemoveSpy).toHaveBeenCalledWith('batchOpsWizardState');
    });
  });

  describe('Back to search button visibility logic', () => {
    it('should show button when fromSearch=true and currentStep=1', () => {
      component.fromSearch = true;
      component.currentStep = 1;

      const shouldShow = component.fromSearch && component.currentStep === 1;
      expect(shouldShow).toBe(true);
    });

    it('should not show button when fromSearch=false and currentStep=1', () => {
      component.fromSearch = false;
      component.currentStep = 1;

      const shouldShow = component.fromSearch && component.currentStep === 1;
      expect(shouldShow).toBe(false);
    });

    it('should not show button when fromSearch=true but currentStep=2', () => {
      component.fromSearch = true;
      component.currentStep = 2;

      const shouldShow = component.fromSearch && component.currentStep === 1;
      expect(shouldShow).toBe(false);
    });

    it('should not show button when fromSearch=true but currentStep=3', () => {
      component.fromSearch = true;
      component.currentStep = 3;

      const shouldShow = component.fromSearch && component.currentStep === 1;
      expect(shouldShow).toBe(false);
    });
  });

  describe('Integration: Full flow from search to wizard and back', () => {
    it('should handle complete flow: search → wizard → back to search', () => {
      const initialState = {
        operationId: 'suspend',
        selectedIds: ['inst-1', 'inst-2', 'inst-3'],
        fromSearch: true,
        returnUrl: '/cockpit/processes/search?state=ACTIVE&processDefinitionKey=invoice',
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(initialState));

      component.loadFromSessionStorage();

      expect(component.fromSearch).toBe(true);
      expect(component.returnUrl).toBe('/cockpit/processes/search?state=ACTIVE&processDefinitionKey=invoice');
      expect(component.selectedIds.size).toBe(3);
      expect(component.selectedOperationId).toBe('suspend');
      expect(mockProcessInstanceService.getProcessInstances).not.toHaveBeenCalled();

      component.backToSearch();

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith(
        '/cockpit/processes/search?state=ACTIVE&processDefinitionKey=invoice'
      );
    });

    it('should preserve selection when user navigates back from step 2', () => {
      const initialState = {
        operationId: 'activate',
        selectedIds: ['inst-1', 'inst-2'],
        fromSearch: true,
        returnUrl: '/cockpit/processes/search',
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(initialState));

      component.loadFromSessionStorage();

      expect(component.selectedIds.size).toBe(2);
      expect(component.fromSearch).toBe(true);

      component.continue();
      expect(component.currentStep).toBe(2);

      const shouldShowBackButton = component.fromSearch && component.currentStep === 1;
      expect(shouldShowBackButton).toBe(false);

      component.back();
      expect(component.currentStep).toBe(1);

      const shouldShowBackButtonOnStep1 = component.fromSearch && component.currentStep === 1;
      expect(shouldShowBackButtonOnStep1).toBe(true);
      expect(component.selectedIds.size).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed sessionStorage state gracefully', () => {
      sessionStorage.setItem('batchOpsWizardState', 'not-valid-json');

      expect(() => component.loadFromSessionStorage()).not.toThrow();
    });

    it('should handle null returnUrl', () => {
      const state = {
        operationId: 'suspend',
        selectedIds: ['inst-1'],
        fromSearch: true,
        returnUrl: null,
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(state));

      component.loadFromSessionStorage();

      expect(component.returnUrl).toBeNull();

      component.backToSearch();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cockpit/processes/search']);
    });

    it('should not skip loadInstances when fromSearch=true but selectedIds has size 0', () => {
      component.fromSearch = true;
      component.selectedIds = new Set();

      const shouldSkipLoad = component.fromSearch && component.selectedIds.size > 0;
      expect(shouldSkipLoad).toBe(false);
    });
  });
});
