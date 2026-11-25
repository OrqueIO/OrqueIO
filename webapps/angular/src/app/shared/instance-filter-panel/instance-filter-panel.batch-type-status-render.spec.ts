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
import { BATCH_TYPE_LABELS } from '../../models/cockpit/batch.model';

/**
 * RENDERING TEST for Type select and Status (2 options) in batch criteriaSet
 *
 * Tests:
 * - Type popover displays 12 options from BATCH_TYPE_OPTIONS with translated labels (not raw values)
 *   Note: 'instance-migration' and 'instance-restart' excluded (no corresponding batch operation in wizard)
 * - Status popover displays exactly 2 options (Completed, Running) - NO "All"
 * - No raw i18n keys visible ("cockpit.", "BATCH_TYPE_")
 *
 * Part of ticket #114 - Set removal time for batches
 */
describe('InstanceFilterPanelComponent — Batch Type select & Status (no All)', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let translateService: TranslateService;
  let compiled: HTMLElement;

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
    translateService = TestBed.inject(TranslateService);
    compiled = fixture.nativeElement as HTMLElement;

    // Mock translate service with batch filter keys and batch type labels
    (translateService as any).translations = {
      en: {
        'cockpit.batchOps.removalTimeBatch.filters.type': 'Type',
        'cockpit.batchOps.removalTimeBatch.filters.status': 'Status',
        'cockpit.batchOps.removalTimeBatch.filters.statusCompleted': 'Completed',
        'cockpit.batchOps.removalTimeBatch.filters.statusRunning': 'Running',
        'BATCH_TYPE_MIGRATION': 'Process Instance Migration',
        'BATCH_TYPE_MODIFICATION': 'Process Instance Modification',
        'BATCH_TYPE_RESTART': 'Process Instance Restart',
        'BATCH_TYPE_DELETION': 'Process Instance Deletion',
        'BATCH_TYPE_SUSPENSION': 'Process Instance State Change',
        'BATCH_TYPE_HISTORIC_INSTANCE_DELETION': 'Finished Instance Deletion',
        'BATCH_TYPE_HISTORIC_DECISION_INSTANCE_DELETION': 'Decision Instance Deletion',
        'BATCH_TYPE_SET_JOB_RETRIES': 'Set Job Retries',
        'BATCH_TYPE_SET_EXTERNAL_TASK_RETRIES': 'Set External Task Retries',
        'BATCH_TYPE_SET_REMOVAL_TIME': 'Set Removal Time',
        'BATCH_TYPE_DECISION_SET_REMOVAL_TIME': 'Set Removal Time (Decisions)',
        'BATCH_TYPE_BATCH_SET_REMOVAL_TIME': 'Set Removal Time (Batches)',
        'BATCH_TYPE_SET_VARIABLES': 'Set Variables',
        'BATCH_TYPE_CORRELATE_MESSAGE': 'Correlate Message'
      },
      fr: {
        'cockpit.batchOps.removalTimeBatch.filters.type': 'Type',
        'cockpit.batchOps.removalTimeBatch.filters.status': 'Statut',
        'cockpit.batchOps.removalTimeBatch.filters.statusCompleted': 'Terminé',
        'cockpit.batchOps.removalTimeBatch.filters.statusRunning': 'En cours',
        'BATCH_TYPE_MIGRATION': 'Migration d\'instances',
        'BATCH_TYPE_MODIFICATION': 'Modification d\'instances',
        'BATCH_TYPE_RESTART': 'Redémarrage d\'instances de processus',
        'BATCH_TYPE_DELETION': 'Suppression d\'instances',
        'BATCH_TYPE_SUSPENSION': 'Changement d\'état d\'instances',
        'BATCH_TYPE_HISTORIC_INSTANCE_DELETION': 'Suppression d\'instances terminées',
        'BATCH_TYPE_HISTORIC_DECISION_INSTANCE_DELETION': 'Suppression d\'instances de décision',
        'BATCH_TYPE_SET_JOB_RETRIES': 'Définir les tentatives de job',
        'BATCH_TYPE_SET_EXTERNAL_TASK_RETRIES': 'Définir les tentatives de tâche externe',
        'BATCH_TYPE_SET_REMOVAL_TIME': 'Définir le temps de suppression',
        'BATCH_TYPE_DECISION_SET_REMOVAL_TIME': 'Définir le temps de suppression (décisions)',
        'BATCH_TYPE_BATCH_SET_REMOVAL_TIME': 'Définir le temps de suppression (lots)',
        'BATCH_TYPE_SET_VARIABLES': 'Définir les variables',
        'BATCH_TYPE_CORRELATE_MESSAGE': 'Corréler un message'
      }
    };

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  describe('Type popover renders 12 batch types as select options', () => {
    beforeEach(() => {
      component.selectCriteriaType('type');
      fixture.detectChanges();
    });

    it('should display exactly 12 batch type options', () => {
      const buttons = compiled.querySelectorAll('.editor-popover-body--state .batch-type-row');
      expect(buttons.length).toBe(12);
    });

    it('should NOT display "Process Instance Migration" (excluded from filter)', () => {
      const buttons = Array.from(compiled.querySelectorAll('.state-row-label'));
      const migrationLabel = buttons.find(b => b.textContent?.trim() === 'Process Instance Migration');
      expect(migrationLabel).toBeUndefined();
    });

    it('should NOT display "Process Instance Restart" (excluded from filter)', () => {
      const buttons = Array.from(compiled.querySelectorAll('.state-row-label'));
      const restartLabel = buttons.find(b => b.textContent?.trim() === 'Process Instance Restart');
      expect(restartLabel).toBeUndefined();
    });

    it('should display "Set Removal Time" for process-set-removal-time', () => {
      const buttons = Array.from(compiled.querySelectorAll('.state-row-label'));
      const removalTimeLabel = buttons.find(b => b.textContent?.trim() === 'Set Removal Time');
      expect(removalTimeLabel).toBeTruthy();
    });

    it('should display "Set Removal Time (Decisions)" for decision-set-removal-time', () => {
      const buttons = Array.from(compiled.querySelectorAll('.state-row-label'));
      const decisionLabel = buttons.find(b => b.textContent?.trim() === 'Set Removal Time (Decisions)');
      expect(decisionLabel).toBeTruthy();
    });

    it('should display "Correlate Message" for correlate-message', () => {
      const buttons = Array.from(compiled.querySelectorAll('.state-row-label'));
      const correlateLabel = buttons.find(b => b.textContent?.trim() === 'Correlate Message');
      expect(correlateLabel).toBeTruthy();
    });

    it('[MUTATION PROOF] should NOT display raw i18n keys BATCH_TYPE_*', () => {
      const bodyText = compiled.querySelector('.editor-popover-body--state')?.textContent || '';
      expect(bodyText).not.toContain('BATCH_TYPE_MIGRATION');
      expect(bodyText).not.toContain('BATCH_TYPE_SET_REMOVAL_TIME');
      expect(bodyText).not.toContain('BATCH_TYPE_');
    });

    it('[MUTATION PROOF] should NOT display raw batch type values (instance-migration, etc.)', () => {
      // The labels should be translated, not showing raw values like "instance-migration"
      const bodyText = compiled.querySelector('.editor-popover-body--state')?.textContent || '';
      expect(bodyText).not.toContain('instance-migration');
      expect(bodyText).not.toContain('process-set-removal-time');
      expect(bodyText).not.toContain('correlate-message');
    });
  });


  describe('Status criteria are direct selectors (no popover)', () => {
    // New batch status architecture: batchCompleted and batchRunning are direct criteria
    // They appear in the main criteria dropdown, not in a secondary popover
    // No "All" option exists (mutual exclusion between Completed and Running)

    it('should create batchCompleted pill immediately (no popover workflow)', () => {
      component.selectCriteriaType('batchCompleted');
      fixture.detectChanges();

      // Pill created immediately without popover
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('batchCompleted');
      expect(component.activePills[0].values).toEqual([]);
    });

    it('should create batchRunning pill immediately (no popover workflow)', () => {
      component.selectCriteriaType('batchRunning');
      fixture.detectChanges();

      // Pill created immediately without popover
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('batchRunning');
      expect(component.activePills[0].values).toEqual([]);
    });

    it('[CRITICAL] should exhibit mutual exclusion (batchCompleted then batchRunning → only Running pill)', () => {
      // Apply batchCompleted
      component.selectCriteriaType('batchCompleted');
      fixture.detectChanges();
      expect(component.activePills[0].field).toBe('batchCompleted');

      // Apply batchRunning (should replace batchCompleted)
      component.selectCriteriaType('batchRunning');
      fixture.detectChanges();

      // Verify only Running pill remains (mutual exclusion)
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('batchRunning');
    });

    it('[CRITICAL] should NOT create "statusAll" criterion (no batch status "All" option)', () => {
      // "completed" field still exists in availableCriteria (used for backend API)
      // but there should be NO "statusAll" option
      const hasStatusAllCriterion = component.availableCriteria.some(c => c.field === 'statusAll');

      expect(hasStatusAllCriterion).toBe(false);

      // Verify "completed" criterion exists (this is the backend field for batch status)
      const hasCompletedCriterion = component.availableCriteria.some(c => c.field === 'completed');
      expect(hasCompletedCriterion).toBe(true);
    });

    it('[MUTATION PROOF] should NOT contain old "completed" criterion or statusAll i18n key', () => {
      // Open criteria dropdown
      component.toggleCriteriaDropdown(new Event('click'));
      fixture.detectChanges();

      const dropdownText = compiled.querySelector('.filter-editor-dropdown')?.textContent || '';

      // Should not contain old format or "All" option
      expect(dropdownText).not.toContain('statusAll');
      expect(dropdownText).not.toContain('cockpit.batchOps.removalTimeBatch.filters.statusAll');
    });
  });


  describe('Batch Type selection behavior', () => {
    beforeEach(() => {
      component.selectCriteriaType('type');
      fixture.detectChanges();
    });

    it('should allow multiple types to be selected (multi-select toggle)', () => {
      const buttons = compiled.querySelectorAll('.batch-type-row') as NodeListOf<HTMLButtonElement>;

      // Click first type (now instance-modification, not migration)
      buttons[0].click();
      fixture.detectChanges();
      expect(component.pendingValues.length).toBe(1);
      expect(component.pendingValues[0]).toBe('instance-modification');

      // Click second type - should ADD to selection
      buttons[1].click();
      fixture.detectChanges();
      expect(component.pendingValues.length).toBe(2);
      expect(component.pendingValues).toContain('instance-modification');
      expect(component.pendingValues).toContain('instance-deletion');
    });

    it('should apply correct value to API (raw key, not translated label)', () => {
      const buttons = compiled.querySelectorAll('.state-row') as NodeListOf<HTMLButtonElement>;

      // Click "Set Removal Time" option
      const removalTimeButton = Array.from(buttons).find(b =>
        b.querySelector('.state-row-label')?.textContent?.trim() === 'Set Removal Time'
      );
      expect(removalTimeButton).toBeTruthy();
      removalTimeButton!.click();
      fixture.detectChanges();

      // Value should be raw key "process-set-removal-time", NOT translated label
      expect(component.pendingValues[0]).toBe('process-set-removal-time');
      expect(component.pendingValues[0]).not.toBe('Set Removal Time');
    });
  });
});
