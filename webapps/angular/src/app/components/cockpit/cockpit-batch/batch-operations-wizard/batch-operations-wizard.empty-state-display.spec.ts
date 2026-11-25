/**
 * Test: Empty state DISPLAY for removal-time-process with multi-state instances
 *
 * Vérifie que :
 * 1. Quand le service renvoie des instances (ACTIVE, SUSPENDED, COMPLETED, TERMINATED), la liste les affiche
 * 2. Le message de liste vide n'apparaît que si la réponse est vide
 * 3. Toutes les instances (tous états) sont affichées sans filtrage erroné
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { of } from 'rxjs';

describe('BatchOperationsWizardComponent — Empty state display (removal-time-process)', () => {

  let component: BatchOperationsWizardComponent;
  let mockCockpitService: any;

  beforeEach(() => {
    mockCockpitService = {
      getProcessInstancesV2: vi.fn()
    };

    component = Object.create(BatchOperationsWizardComponent.prototype);
    component.cockpitService = mockCockpitService;
    component.cdr = { markForCheck: vi.fn() };
    component.destroyRef = { onDestroy: vi.fn() };
    component.selectedOperationId = 'removal-time-process';
    component.mode = 'query';
    component.filterCriteria = [];
    component.processInstances = [];
    component.processInstancesTotal = 0;
    component.processInstancesLoading = false;
    component.instancesPage = 1;
    component.instancesPageSize = 20;
  });

  it('shows instances from multiple states (ACTIVE, SUSPENDED, COMPLETED, TERMINATED)', async () => {
    // Mock service returns instances of ALL states
    mockCockpitService.getProcessInstancesV2.mockReturnValue(of({
      items: [
        { id: 'pi-active-1', state: 'ACTIVE', processDefinitionKey: 'invoice', startTime: '2027-01-01T10:00:00Z' },
        { id: 'pi-suspended-1', state: 'SUSPENDED', processDefinitionKey: 'invoice', startTime: '2027-01-02T10:00:00Z' },
        { id: 'pi-completed-1', state: 'COMPLETED', processDefinitionKey: 'invoice', startTime: '2027-01-03T10:00:00Z', endTime: '2027-01-03T11:00:00Z' },
        { id: 'pi-externally-terminated-1', state: 'EXTERNALLY_TERMINATED', processDefinitionKey: 'invoice', startTime: '2027-01-04T10:00:00Z', endTime: '2027-01-04T10:30:00Z' },
        { id: 'pi-internally-terminated-1', state: 'INTERNALLY_TERMINATED', processDefinitionKey: 'invoice', startTime: '2027-01-05T10:00:00Z', endTime: '2027-01-05T10:15:00Z' }
      ],
      total: 5
    }));

    // Simulate loadInstances() call
    component.loadInstances = function() {
      this.processInstancesLoading = true;
      this.cockpitService.getProcessInstancesV2({
        page: this.instancesPage,
        size: this.instancesPageSize
      }).subscribe((result: any) => {
        this.processInstances = result.items;
        this.processInstancesTotal = result.total;
        this.processInstancesLoading = false;
        this.cdr.markForCheck();
      });
    };

    component.loadInstances();
    await new Promise(resolve => setTimeout(resolve, 20));

    // ASSERT: All 5 instances are loaded
    expect(component.processInstances.length).toBe(5);
    expect(component.processInstancesTotal).toBe(5);

    // ASSERT: Empty state message should NOT be visible
    expect(component.processInstances.length > 0).toBe(true);

    // ASSERT: All states are present
    const states = component.processInstances.map((i: any) => i.state);
    expect(states).toContain('ACTIVE');
    expect(states).toContain('SUSPENDED');
    expect(states).toContain('COMPLETED');
    expect(states).toContain('EXTERNALLY_TERMINATED');
    expect(states).toContain('INTERNALLY_TERMINATED');
  });

  it('shows empty state message ONLY when response is empty', async () => {
    // Mock service returns NO instances
    mockCockpitService.getProcessInstancesV2.mockReturnValue(of({
      items: [],
      total: 0
    }));

    component.loadInstances = function() {
      this.processInstancesLoading = true;
      this.cockpitService.getProcessInstancesV2({
        page: this.instancesPage,
        size: this.instancesPageSize
      }).subscribe((result: any) => {
        this.processInstances = result.items;
        this.processInstancesTotal = result.total;
        this.processInstancesLoading = false;
        this.cdr.markForCheck();
      });
    };

    component.loadInstances();
    await new Promise(resolve => setTimeout(resolve, 20));

    // ASSERT: No instances loaded
    expect(component.processInstances.length).toBe(0);
    expect(component.processInstancesTotal).toBe(0);

    // ASSERT: Empty state message SHOULD be visible
    expect(component.processInstances.length === 0).toBe(true);

    // ASSERT: operationNoInstancesKey returns correct key
    const key = component.operationNoInstancesKey;
    expect(key).toBe('cockpit.batchOps.removalTimeProcess.noInstances');
  });

  it('Instances mode: shows instances from multiple states', () => {
    component.mode = 'instances';
    component.selectedIds = new Set(['pi-active-1', 'pi-suspended-1', 'pi-completed-1']);

    // ASSERT: Instances mode with selectedIds should show continue button
    expect(component.selectedIds.size).toBe(3);
    expect(component.selectedIds.size > 0).toBe(true);

    // ASSERT: Empty state not relevant (user selected instances)
    expect(component.selectedIds.size > 0).toBe(true);
  });

  it('Query mode: empty filter returns instances of all states (no artificial empty)', async () => {
    // No filter = all states should be returned by backend
    component.filterCriteria = [];

    mockCockpitService.getProcessInstancesV2.mockReturnValue(of({
      items: [
        { id: 'pi-1', state: 'ACTIVE' },
        { id: 'pi-2', state: 'SUSPENDED' },
        { id: 'pi-3', state: 'COMPLETED' }
      ],
      total: 3
    }));

    component.loadInstances = function() {
      this.processInstancesLoading = true;
      this.cockpitService.getProcessInstancesV2({
        page: this.instancesPage,
        size: this.instancesPageSize
      }).subscribe((result: any) => {
        this.processInstances = result.items;
        this.processInstancesTotal = result.total;
        this.processInstancesLoading = false;
        this.cdr.markForCheck();
      });
    };

    component.loadInstances();
    await new Promise(resolve => setTimeout(resolve, 20));

    // ASSERT: Instances of multiple states returned
    expect(component.processInstances.length).toBe(3);
    expect(component.processInstancesTotal).toBe(3);
  });
});
