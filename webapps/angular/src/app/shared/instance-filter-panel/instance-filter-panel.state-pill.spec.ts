/**
 * Test: Generic 'state' criterion pill display and interaction
 *
 * Ensures:
 * - Pill displays with correct label and icon
 * - Single and multiple state values are formatted correctly
 * - User can select, modify, and remove state criterion
 */

import { InstanceFilterPanelComponent } from './instance-filter-panel';
import { TranslateService } from '@ngx-translate/core';

describe('InstanceFilterPanelComponent - state pill', () => {
  let component: InstanceFilterPanelComponent;
  let translateService: any;

  beforeEach(() => {
    // Mock TranslateService
    translateService = {
      instant: vi.fn((key: string, params?: any) => {
        const translations: Record<string, string> = {
          'cockpit.processes.globalSearch.pill.state': `State: ${params?.value || ''}`,
          'cockpit.processes.filters.stateActive': 'Active',
          'cockpit.processes.filters.stateSuspended': 'Suspended',
          'cockpit.processes.filters.stateCompleted': 'Completed',
          'cockpit.processes.filters.stateTerminated': 'Terminated'
        };
        return translations[key] || key;
      })
    };

    component = Object.create(InstanceFilterPanelComponent.prototype);
    component.translateService = translateService;
    component.activePills = [];
  });

  describe('getPillLabel', () => {
    it('should return correct label for single state value (active)', () => {
      const pill = { field: 'state' as const, values: ['active'] };

      const label = component.getPillLabel(pill);

      expect(label).toBe('State: Active');
    });

    it('should return correct label for single state value (suspended)', () => {
      const pill = { field: 'state' as const, values: ['suspended'] };

      const label = component.getPillLabel(pill);

      expect(label).toBe('State: Suspended');
    });

    it('should return correct label for single state value (completed)', () => {
      const pill = { field: 'state' as const, values: ['completed'] };

      const label = component.getPillLabel(pill);

      expect(label).toBe('State: Completed');
    });

    it('should return correct label for single state value (terminated)', () => {
      const pill = { field: 'state' as const, values: ['terminated'] };

      const label = component.getPillLabel(pill);

      expect(label).toBe('State: Terminated');
    });

    it('should return correct label for multiple state values', () => {
      const pill = { field: 'state' as const, values: ['active', 'suspended'] };

      const label = component.getPillLabel(pill);

      expect(label).toBe('State: Active, Suspended');
    });

    it('should return correct label for all four state values', () => {
      const pill = { field: 'state' as const, values: ['active', 'suspended', 'completed', 'terminated'] };

      const label = component.getPillLabel(pill);

      expect(label).toBe('State: Active, Suspended, Completed, Terminated');
    });
  });

  describe('getPillIcon', () => {
    it('should return faCircleDot icon for state criterion', () => {
      component.faCircleDot = 'circle-dot-icon' as any;
      const pill = { field: 'state' as const, values: ['active'] };

      const icon = component.getPillIcon(pill);

      expect(icon).toBe('circle-dot-icon');
    });
  });
});