import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { InstanceFilterPanelComponent } from './instance-filter-panel';
import { CockpitService } from '../../services/cockpit.service';
import { DecisionService } from '../../services/decision.service';
import { TranslateService } from '../../i18n/translate.service';
import { initTestEnvironment } from '../../testing/test-utils';

/**
 * NON-REGRESSION TEST for process/decision criteriaSet
 *
 * Ensures that batch Type select changes do NOT affect process/decision behavior:
 * - Process/Decision criteriaSet still use multi-value-chip-input for all fields
 * - State select still works for process
 * - No batch-specific UI appears in process/decision
 *
 * Part of ticket #114 - Set removal time for batches
 */
describe('InstanceFilterPanelComponent — Process/Decision Non-Regression', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let compiled: HTMLElement;

  const setupTest = async (criteriaSet: 'process' | 'decision') => {
    initTestEnvironment();

    const mockCockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
    } as any;

    const mockDecisionService = {
      getDecisionDefinitions: vi.fn().mockReturnValue(of([]))
    } as any;

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CockpitService, useValue: mockCockpitService },
        { provide: DecisionService, useValue: mockDecisionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;
    const translateService = TestBed.inject(TranslateService);
    compiled = fixture.nativeElement as HTMLElement;

    // Mock translate service
    (translateService as any).translations = {
      en: {
        'cockpit.processes.filters.state': 'State',
        'cockpit.processes.filters.stateActive': 'Active',
        'cockpit.processes.filters.stateSuspended': 'Suspended',
        'cockpit.processes.filters.stateCompleted': 'Completed',
        'cockpit.processes.filters.stateTerminated': 'Terminated',
        'cockpit.processes.globalSearch.valuePlaceholder': 'Enter value'
      }
    };

    component.criteriaSet = criteriaSet;
    component.ngOnInit();
    fixture.detectChanges();
  };

  describe('[Process] State select still works (4 options)', () => {
    beforeEach(async () => {
      await setupTest('process');
    });

    it('should display State criterion in process', () => {
      const stateOption = component.availableCriteria.find(c => c.field === 'state');
      expect(stateOption).toBeTruthy();
    });

    it('should show 4 state options when State is selected', () => {
      component.selectCriteriaType('state');
      fixture.detectChanges();

      const buttons = compiled.querySelectorAll('.editor-popover-body--state .state-row');
      expect(buttons.length).toBe(4); // Active, Suspended, Completed, Terminated
    });

    it('should NOT show batch Type select in process', () => {
      // Type field doesn't exist in process criteriaSet
      const typeOption = component.availableCriteria.find(c => c.field === 'type');
      expect(typeOption).toBeUndefined();
    });

    it('should NOT show batch Status select in process', () => {
      const completedOption = component.availableCriteria.find(c => c.field === 'completed');
      expect(completedOption).toBeUndefined();
    });
  });

  describe('[Decision] No batch-specific UI', () => {
    beforeEach(async () => {
      await setupTest('decision');
    });

    it('should NOT display batch Type criterion', () => {
      const typeOption = component.availableCriteria.find(c => c.field === 'type');
      expect(typeOption).toBeUndefined();
    });

    it('should NOT display batch batchId criterion', () => {
      const batchIdOption = component.availableCriteria.find(c => c.field === 'batchId');
      expect(batchIdOption).toBeUndefined();
    });

    it('should NOT display batch Status (completed) criterion', () => {
      const completedOption = component.availableCriteria.find(c => c.field === 'completed');
      expect(completedOption).toBeUndefined();
    });

    it('should display Decision-specific criteria', () => {
      const decisionInstanceIdOption = component.availableCriteria.find(c => c.field === 'decisionInstanceId');
      expect(decisionInstanceIdOption).toBeTruthy();

      const decisionDefinitionOption = component.availableCriteria.find(c => c.field === 'decisionDefinition');
      expect(decisionDefinitionOption).toBeTruthy();
    });
  });

  describe('[Process] All process criteria still available', () => {
    beforeEach(async () => {
      await setupTest('process');
    });

    it('should include instanceId criterion', () => {
      const option = component.availableCriteria.find(c => c.field === 'instanceId');
      expect(option).toBeTruthy();
    });

    it('should include businessKey criterion', () => {
      const option = component.availableCriteria.find(c => c.field === 'businessKey');
      expect(option).toBeTruthy();
    });

    it('should include processDefinition criterion', () => {
      const option = component.availableCriteria.find(c => c.field === 'processDefinition');
      expect(option).toBeTruthy();
    });

    it('should include state criterion', () => {
      const option = component.availableCriteria.find(c => c.field === 'state');
      expect(option).toBeTruthy();
    });
  });
});