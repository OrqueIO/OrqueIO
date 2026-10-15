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
        'BATCH_TYPE_SUSPENSION': 'Process Instance Suspension',
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
        'BATCH_TYPE_SUSPENSION': 'Suspension d\'instances',
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
      const buttons = compiled.querySelectorAll('.editor-popover-body--state .state-row');
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


  describe('Status popover has exactly 2 options (no "All")', () => {
    beforeEach(() => {
      component.selectCriteriaType('completed');
      fixture.detectChanges();
    });

    it('should display exactly 2 status options', () => {
      const buttons = compiled.querySelectorAll('.editor-popover-body--state .state-row');
      expect(buttons.length).toBe(2);
    });

    it('should display "Completed" option', () => {
      const buttons = Array.from(compiled.querySelectorAll('.state-row-label'));
      const completedLabel = buttons.find(b => b.textContent?.trim() === 'Completed');
      expect(completedLabel).toBeTruthy();
    });

    it('should display "Running" option', () => {
      const buttons = Array.from(compiled.querySelectorAll('.state-row-label'));
      const runningLabel = buttons.find(b => b.textContent?.trim() === 'Running');
      expect(runningLabel).toBeTruthy();
    });

    it('[CRITICAL] should NOT display "All" option', () => {
      const buttons = Array.from(compiled.querySelectorAll('.state-row-label'));
      const allLabel = buttons.find(b => b.textContent?.trim() === 'All');
      expect(allLabel).toBeUndefined();
    });

    it('[MUTATION PROOF] should NOT contain statusAll i18n key', () => {
      const bodyText = compiled.querySelector('.editor-popover-body--state')?.textContent || '';
      expect(bodyText).not.toContain('statusAll');
      expect(bodyText).not.toContain('cockpit.batchOps.removalTimeBatch.filters.statusAll');
    });
  });


  describe('Batch Type selection behavior', () => {
    beforeEach(() => {
      component.selectCriteriaType('type');
      fixture.detectChanges();
    });

    it('should select only one type at a time (single select)', () => {
      const buttons = compiled.querySelectorAll('.state-row') as NodeListOf<HTMLButtonElement>;

      // Click first type (now instance-modification, not migration)
      buttons[0].click();
      fixture.detectChanges();
      expect(component.pendingValues.length).toBe(1);
      expect(component.pendingValues[0]).toBe('instance-modification');

      // Click second type - should replace first
      buttons[1].click();
      fixture.detectChanges();
      expect(component.pendingValues.length).toBe(1);
      expect(component.pendingValues[0]).toBe('instance-deletion');
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
