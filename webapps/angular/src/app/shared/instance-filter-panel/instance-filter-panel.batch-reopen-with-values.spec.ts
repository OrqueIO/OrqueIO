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
 * TEST: Batch filters reopen with applied values
 *
 * When user:
 * 1. Applies Batch ID (single value: "batch-001")
 * 2. Closes popover
 * 3. Clicks pill to reopen
 *
 * Expected: Popover opens WITH text input filled with "batch-001".
 * Same behavior for Type and Status (selected option visible).
 *
 * Regression: Process Instance ID unchanged (multi-value chips).
 *
 * Part of batch filter single-value requirement (#114)
 */
describe('InstanceFilterPanelComponent — Batch reopen with values', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    initTestEnvironment();

    const mockCockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([]))
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
        'cockpit.batchOps.removalTimeBatch.pills.batchId': 'Batch ID: {{value}}',
        'cockpit.batchOps.removalTimeBatch.pills.type': 'Type: {{value}}',
        'cockpit.batchOps.removalTimeBatch.pills.status': 'Status: {{value}}',
        'cockpit.processes.globalSearch.valuePlaceholder': 'Enter value',
        'BATCH_TYPE_DECISION_SET_REMOVAL_TIME': 'Set Removal Time (Decisions)',
        'BATCH_TYPE_SET_REMOVAL_TIME': 'Set Removal Time'
      }
    };

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  describe('[Batch ID] Reopen with single value', () => {
    it('should reopen with applied value in text input', async () => {
      // Apply Batch ID with single value
      component.selectCriteriaType('batchId');
      component.pendingTextValue = 'batch-abc';
      component.confirmCriterion();
      fixture.detectChanges();

      // Verify pill created
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('batchId');
      expect(component.activePills[0].values).toEqual(['batch-abc']);

      // Close popover
      component.activeEditorType = null;
      fixture.detectChanges();

      // Reopen by clicking pill
      component.startEditPill(0, new Event('click'));
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify popover opened
      expect(component.activeEditorType).toBe('batchId');

      // Verify pendingTextValue populated
      expect(component.pendingTextValue).toBe('batch-abc');

      // Verify text input visible in DOM with correct value
      const textInput = compiled.querySelector('input[type="text"].editor-input') as HTMLInputElement;
      expect(textInput).toBeTruthy();
      expect(textInput.value).toBe('batch-abc');
    });

    it('should allow modifying value and reapplying', async () => {
      // Apply Batch ID with value "original"
      component.selectCriteriaType('batchId');
      component.pendingTextValue = 'original';
      component.confirmCriterion();
      fixture.detectChanges();

      // Reopen
      component.activeEditorType = null;
      component.startEditPill(0, new Event('click'));
      fixture.detectChanges();

      // Change value
      component.pendingTextValue = 'modified';
      component.confirmCriterion();
      fixture.detectChanges();

      // Verify pill updated (not duplicated)
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].values).toEqual(['modified']);
    });

    it('should NOT modify pill when canceling (✗)', async () => {
      // Apply Batch ID
      component.selectCriteriaType('batchId');
      component.pendingTextValue = 'original';
      component.confirmCriterion();
      fixture.detectChanges();

      // Reopen and modify
      component.activeEditorType = null;
      component.startEditPill(0, new Event('click'));
      component.pendingTextValue = 'modified';
      fixture.detectChanges();

      // Cancel by closing without Apply
      component.activeEditorType = null;
      fixture.detectChanges();

      // Verify pill unchanged
      expect(component.activePills[0].values).toEqual(['original']);
    });

    it('should trim whitespace on confirm', async () => {
      // Apply Batch ID with leading/trailing spaces
      component.selectCriteriaType('batchId');
      component.pendingTextValue = '  batch-001  ';
      component.confirmCriterion();
      fixture.detectChanges();

      // Verify trimmed value in pill
      expect(component.activePills[0].values).toEqual(['batch-001']);
    });

    it('should NOT create pill when value is empty or whitespace-only', async () => {
      // Try to confirm with empty value
      component.selectCriteriaType('batchId');
      component.pendingTextValue = '';
      component.confirmCriterion();
      fixture.detectChanges();

      expect(component.activePills.length).toBe(0);

      // Try with whitespace-only
      component.pendingTextValue = '   ';
      component.confirmCriterion();
      fixture.detectChanges();

      expect(component.activePills.length).toBe(0);
    });
  });

  describe('[Type] Reopen with selected option', () => {
    it('should reopen with applied type selected', async () => {
      // Apply Type filter
      component.selectCriteriaType('type');
      component.pendingValues = ['decision-set-removal-time'];
      component.confirmCriterion();
      fixture.detectChanges();

      // Verify pill created
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('type');
      expect(component.activePills[0].values).toEqual(['decision-set-removal-time']);

      // Reopen
      component.activeEditorType = null;
      component.startEditPill(0, new Event('click'));
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify popover opened with correct type
      expect(component.activeEditorType).toBe('type');
      expect(component.pendingValues).toEqual(['decision-set-removal-time']);

      // Verify selected state in DOM (button has .state-row--selected)
      const selectedButton = compiled.querySelector('.state-row.state-row--selected');
      expect(selectedButton).toBeTruthy();
      expect(selectedButton!.textContent).toContain('Set Removal Time (Decisions)');
    });
  });

  describe('[Status] Reopen with selected option', () => {
    it('should reopen with Completed selected', async () => {
      // Apply Status Completed
      component.selectCriteriaType('completed');
      component.pendingValues = ['true'];
      component.confirmCriterion();
      fixture.detectChanges();

      // Reopen
      component.activeEditorType = null;
      component.startEditPill(0, new Event('click'));
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify popover opened with correct status
      expect(component.activeEditorType).toBe('completed');
      expect(component.pendingValues).toEqual(['true']);

      // Verify selected state in DOM
      const selectedButton = compiled.querySelector('.state-row.state-row--selected');
      expect(selectedButton).toBeTruthy();
      expect(selectedButton!.textContent).toContain('Completed');
    });

    it('should reopen with Running selected', async () => {
      // Apply Status Running
      component.selectCriteriaType('completed');
      component.pendingValues = ['false'];
      component.confirmCriterion();
      fixture.detectChanges();

      // Reopen
      component.activeEditorType = null;
      component.startEditPill(0, new Event('click'));
      fixture.detectChanges();

      // Verify
      expect(component.pendingValues).toEqual(['false']);

      const selectedButton = compiled.querySelector('.state-row.state-row--selected');
      expect(selectedButton).toBeTruthy();
      expect(selectedButton!.textContent).toContain('Running');
    });
  });

  describe('[Non-regression] Process Instance ID unchanged', () => {
    it('should reopen Instance ID with chips (process criteriaSet)', async () => {
      // Switch to process criteriaSet
      component.criteriaSet = 'process';
      component.ngOnInit();
      fixture.detectChanges();

      // Apply Instance ID
      component.selectCriteriaType('instanceId');
      component.pendingValues = ['inst-001', 'inst-002'];
      component.confirmCriterion();
      fixture.detectChanges();

      // Reopen
      component.activeEditorType = null;
      component.startEditPill(0, new Event('click'));
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify chips present
      expect(component.pendingValues).toEqual(['inst-001', 'inst-002']);

      const chips = compiled.querySelectorAll('.chip');
      expect(chips.length).toBe(2);
    });
  });
});