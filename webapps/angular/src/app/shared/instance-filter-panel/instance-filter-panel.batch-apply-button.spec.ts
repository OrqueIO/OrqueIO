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
 * BUG TEST: Apply button (✓) does NOT work for batch criteria
 *
 * This test MUST be RED before fix, GREEN after.
 *
 * When user clicks Type → selects "Set Removal Time (Decisions)" → clicks Apply (✓),
 * the filter panel should:
 * - Create a pill with field='type', values=['decision-set-removal-time']
 * - Emit criteriaChange event with the criterion
 *
 * Current symptom: clicking Apply does NOTHING - no pill, no event
 *
 * Root cause: confirmCriterion() switch has NO cases for 'batchId', 'type', 'completed'
 */
describe('InstanceFilterPanelComponent — Batch Apply button BUG', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let compiled: HTMLElement;
  let emittedEvents: any[] = [];

  beforeEach(async () => {
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
    compiled = fixture.nativeElement as HTMLElement;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = {
      en: {
        'cockpit.batchOps.removalTimeBatch.filters.batchId': 'Batch ID',
        'cockpit.batchOps.removalTimeBatch.filters.type': 'Type',
        'cockpit.batchOps.removalTimeBatch.filters.status': 'Status',
        'cockpit.batchOps.removalTimeBatch.filters.statusCompleted': 'Completed',
        'cockpit.batchOps.removalTimeBatch.filters.statusRunning': 'Running',
        'cockpit.processes.globalSearch.valuePlaceholder': 'Enter value',
        'BATCH_TYPE_DECISION_SET_REMOVAL_TIME': 'Set Removal Time (Decisions)',
        'BATCH_TYPE_SET_REMOVAL_TIME': 'Set Removal Time'
      }
    };

    component.criteriaSet = 'batch';
    component.ngOnInit();

    emittedEvents = [];
    component.criteriaChange.subscribe((event: any) => {
      emittedEvents.push(event);
    });

    fixture.detectChanges();
  });

  describe('[BUG] Type criterion Apply button', () => {
    it('should create pill and emit event when Type → option selected → Apply clicked', async () => {
      component.selectCriteriaType('type');
      fixture.detectChanges();
      await fixture.whenStable();

      const typeButtons = compiled.querySelectorAll('.editor-popover-body--state .batch-type-row');
      expect(typeButtons.length).toBe(12);

      const decisionRemovalTimeButton = Array.from(typeButtons).find(b =>
        b.querySelector('.state-row-label')?.textContent?.trim() === 'Set Removal Time (Decisions)'
      ) as HTMLButtonElement;
      expect(decisionRemovalTimeButton).toBeTruthy();
      decisionRemovalTimeButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.pendingValues).toEqual(['decision-set-removal-time']);

      const applyButton = compiled.querySelector('.btn-editor-confirm-icon') as HTMLButtonElement;
      expect(applyButton).toBeTruthy();
      expect(applyButton.disabled).toBe(false);

      applyButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('type');
      expect(component.activePills[0].values).toEqual(['decision-set-removal-time']);

      expect(emittedEvents.length).toBe(1);
      expect(emittedEvents[0].criteria.length).toBe(1);
      expect(emittedEvents[0].criteria[0].field).toBe('type');
      expect(emittedEvents[0].criteria[0].values).toEqual(['decision-set-removal-time']);

      expect(component.activeEditorType).toBeNull();
    });
  });

  describe('[BUG] Status (completed) criterion Apply button', () => {
    it('should create pill and emit event when Status → Completed → Apply clicked', async () => {
      component.selectCriteriaType('completed');
      fixture.detectChanges();
      await fixture.whenStable();

      const statusButtons = compiled.querySelectorAll('.editor-popover-body--state .state-row');
      expect(statusButtons.length).toBe(2);

      const completedButton = Array.from(statusButtons).find(b =>
        b.querySelector('.state-row-label')?.textContent?.trim() === 'Completed'
      ) as HTMLButtonElement;
      expect(completedButton).toBeTruthy();
      completedButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.pendingValues).toEqual(['true']);

      const applyButton = compiled.querySelector('.btn-editor-confirm-icon') as HTMLButtonElement;
      expect(applyButton).toBeTruthy();
      applyButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('completed');
      expect(component.activePills[0].values).toEqual(['true']);

      expect(emittedEvents.length).toBe(1);
      expect(emittedEvents[0].criteria[0].field).toBe('completed');
      expect(emittedEvents[0].criteria[0].values).toEqual(['true']);
    });

    it('should create pill when Status → Running → Apply clicked', async () => {
      component.selectCriteriaType('completed');
      fixture.detectChanges();

      const statusButtons = compiled.querySelectorAll('.editor-popover-body--state .state-row');
      const runningButton = Array.from(statusButtons).find(b =>
        b.querySelector('.state-row-label')?.textContent?.trim() === 'Running'
      ) as HTMLButtonElement;
      runningButton.click();
      fixture.detectChanges();

      expect(component.pendingValues).toEqual(['false']);

      const applyButton = compiled.querySelector('.btn-editor-confirm-icon') as HTMLButtonElement;
      applyButton.click();
      fixture.detectChanges();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('completed');
      expect(component.activePills[0].values).toEqual(['false']);
    });
  });

  describe('[BUG] Batch ID criterion Apply button', () => {
    it('should create pill and emit event when Batch ID → value entered → Apply clicked', async () => {

      component.selectCriteriaType('batchId');
      fixture.detectChanges();
      await fixture.whenStable();

      component.pendingTextValue = 'batch-123';
      fixture.detectChanges();

      const applyButton = compiled.querySelector('.btn-editor-confirm-icon') as HTMLButtonElement;
      expect(applyButton).toBeTruthy();
      applyButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('batchId');
      expect(component.activePills[0].values).toEqual(['batch-123']);

      expect(emittedEvents.length).toBe(1);
      expect(emittedEvents[0].criteria[0].field).toBe('batchId');
      expect(emittedEvents[0].criteria[0].values).toEqual(['batch-123']);
    });
  });

  describe('[BUG] Apply button enabled but does nothing', () => {
    it('should NOT be disabled for Type criterion', () => {
      component.selectCriteriaType('type');
      component.pendingValues = ['process-set-removal-time'];
      fixture.detectChanges();

      const applyButton = compiled.querySelector('.btn-editor-confirm-icon') as HTMLButtonElement;
      expect(applyButton.disabled).toBe(false);
    });

    it('should NOT be disabled for Status criterion', () => {
      component.selectCriteriaType('completed');
      component.pendingValues = ['true'];
      fixture.detectChanges();

      const applyButton = compiled.querySelector('.btn-editor-confirm-icon') as HTMLButtonElement;
      expect(applyButton.disabled).toBe(false);
    });

    it('should NOT be disabled for Batch ID criterion', () => {
      component.selectCriteriaType('batchId');
      component.pendingValues = ['batch-001'];
      fixture.detectChanges();

      const applyButton = compiled.querySelector('.btn-editor-confirm-icon') as HTMLButtonElement;
      expect(applyButton.disabled).toBe(false);
    });
  });
});
