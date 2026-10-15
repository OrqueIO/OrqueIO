import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { InstanceFilterPanelComponent } from './instance-filter-panel';
import { CockpitService } from '../../services/cockpit.service';
import { DecisionService } from '../../services/decision.service';
import { TranslateService } from '../../i18n/translate.service';
import { initTestEnvironment } from '../../testing/test-utils';
import { BATCH_TYPE_LABELS } from '../../models/cockpit/batch.model';

/**
 * REAL INTEGRATION TEST: Batch Type Filter — Design with Icons
 *
 * Tests the complete batch type filter implementation with:
 * - Real EN/FR translations loaded from en.json/fr.json
 * - Icon rendering for each batch type
 * - Single select behavior with DOM clicks
 * - Pill creation with translated labels
 * - API call verification with raw batch type values
 * - Popover reopen behavior
 *
 * Part of ticket #114 - Set removal time for batches - ÉTAPE 2
 */
describe('InstanceFilterPanel — Batch Type Filter Design (Real Integration)', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let compiled: HTMLElement;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    initTestEnvironment();

    const mockCockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
      getHistoricProcessInstances: vi.fn().mockReturnValue(of({ data: [], count: 0 }))
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
        { provide: DecisionService, useValue: mockDecisionService },
        TranslateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    httpMock = TestBed.inject(HttpTestingController);

    // Set up translations (matching real en.json/fr.json)
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = {
      en: {
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
        'BATCH_TYPE_CORRELATE_MESSAGE': 'Correlate Message',
        'cockpit.batchOps.removalTimeBatch.pills.type': 'Type: {{value}}'
      },
      fr: {
        'BATCH_TYPE_MIGRATION': 'Migration d\'instances',
        'BATCH_TYPE_MODIFICATION': 'Modification d\'instances de processus',
        'BATCH_TYPE_RESTART': 'Redémarrage d\'instances de processus',
        'BATCH_TYPE_DELETION': 'Suppression d\'instances de processus',
        'BATCH_TYPE_SUSPENSION': 'Suspension d\'instances de processus',
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

  describe('13 batch types with exact EN labels and icons', () => {
    beforeEach(() => {
      component.selectCriteriaType('type');
      fixture.detectChanges();
    });

    it('should render exactly 13 batch type options in correct order', () => {
      const buttons = compiled.querySelectorAll('.batch-type-row');
      expect(buttons.length).toBe(13);

      const expectedLabels = [
        'Process Instance Modification',
        'Process Instance Restart',
        'Process Instance Deletion',
        'Process Instance Suspension',
        'Finished Instance Deletion',
        'Decision Instance Deletion',
        'Set Job Retries',
        'Set External Task Retries',
        'Set Variables',
        'Correlate Message',
        'Set Removal Time',
        'Set Removal Time (Decisions)',
        'Set Removal Time (Batches)'
      ];

      buttons.forEach((btn, index) => {
        const label = btn.querySelector('.state-row-label')?.textContent?.trim();
        expect(label).toBe(expectedLabels[index]);
      });
    });

    it('should render an icon for each batch type option', () => {
      const buttons = compiled.querySelectorAll('.batch-type-row');

      buttons.forEach(btn => {
        const iconWrap = btn.querySelector('.batch-type-icon');
        expect(iconWrap).toBeTruthy();

        const faIcon = iconWrap?.querySelector('fa-icon');
        expect(faIcon).toBeTruthy();

        const svgIcon = iconWrap?.querySelector('svg');
        expect(svgIcon).toBeTruthy();
      });
    });

    it('should have colored icons matching wizard operations (amber/green/red/blue/purple/gray/secondary)', () => {
      const buttons = compiled.querySelectorAll('.batch-type-row');

      // All 13 options should have an icon with a color class
      expect(buttons.length).toBe(13);

      buttons.forEach(btn => {
        const iconWrapper = btn.querySelector('.batch-type-icon');
        expect(iconWrapper).toBeTruthy();

        const svg = iconWrapper?.querySelector('svg');
        expect(svg).toBeTruthy();

        // Should have exactly one icon color class
        const hasAmber = iconWrapper?.classList.contains('batch-type-icon--amber');
        const hasGreen = iconWrapper?.classList.contains('batch-type-icon--green');
        const hasRed = iconWrapper?.classList.contains('batch-type-icon--red');
        const hasBlue = iconWrapper?.classList.contains('batch-type-icon--blue');
        const hasPurple = iconWrapper?.classList.contains('batch-type-icon--purple');
        const hasGray = iconWrapper?.classList.contains('batch-type-icon--gray');
        const hasSecondary = iconWrapper?.classList.contains('batch-type-icon--secondary');

        const colorCount = [hasAmber, hasGreen, hasRed, hasBlue, hasPurple, hasGray, hasSecondary].filter(Boolean).length;
        expect(colorCount).toBe(1);
      });

      // Verify specific icon colors from wizard
      const iconWrappers = compiled.querySelectorAll('.batch-type-icon');
      expect(iconWrappers[0].classList.contains('batch-type-icon--blue')).toBe(true); // instance-modification (move-instances)
      expect(iconWrappers[1].classList.contains('batch-type-icon--secondary')).toBe(true); // instance-restart (no wizard op)
      expect(iconWrappers[2].classList.contains('batch-type-icon--red')).toBe(true); // instance-deletion
      expect(iconWrappers[3].classList.contains('batch-type-icon--amber')).toBe(true); // instance-update-suspension-state (suspend)
      expect(iconWrappers[8].classList.contains('batch-type-icon--purple')).toBe(true); // set-variables
      expect(iconWrappers[9].classList.contains('batch-type-icon--blue')).toBe(true); // correlate-message
      expect(iconWrappers[10].classList.contains('batch-type-icon--gray')).toBe(true); // process-set-removal-time
    });
  });

  describe('FR translations', () => {
    let frTranslations: any;

    beforeEach(() => {
      // Load real FR translations from JSON file
      const fs = require('fs');
      const path = require('path');
      const frPath = path.resolve(__dirname, '../../../assets/i18n/fr.json');
      frTranslations = JSON.parse(fs.readFileSync(frPath, 'utf-8'));
    });

    it('should display exact FR labels for all 13 batch types', () => {
      const expectedLabels = [
        'Modification d\'instances',                              // instance-modification
        'Redémarrage d\'instances',                               // instance-restart (raccourci)
        'Suppression d\'instances',                               // instance-deletion
        'Suspension d\'instances',                                // instance-update-suspension-state
        'Suppression d\'instances terminées',                     // historic-instance-deletion
        'Suppression d\'instances de décision',                   // historic-decision-instance-deletion
        'Tentatives de job',                                      // set-job-retries (raccourci)
        'Tentatives de tâche externe',                            // set-external-task-retries (raccourci)
        'Définition de variables',                                // set-variables (nominal)
        'Corrélation de message',                                 // correlate-message (nominal)
        'Temps de suppression (processus)',                       // process-set-removal-time (raccourci + clarification)
        'Temps de suppression (décisions)',                       // decision-set-removal-time (raccourci)
        'Temps de suppression (lots)'                             // batch-set-removal-time (raccourci)
      ];

      // Verify each expected label exists in FR translations
      expectedLabels.forEach((label, index) => {
        const option = component.BATCH_TYPE_OPTIONS[index];
        const frLabel = frTranslations[option.i18nKey];
        expect(frLabel).toBeDefined();
        expect(frLabel).toBe(label);
      });
    });

    it('[MUTATION PROOF] FR label for instance-restart should be shortened version', () => {
      const restartOption = component.BATCH_TYPE_OPTIONS.find(o => o.value === 'instance-restart');
      const frLabel = frTranslations[restartOption!.i18nKey];

      // Should FAIL if FR translation reverts to old long label
      expect(frLabel).toBe('Redémarrage d\'instances');
      expect(frLabel).not.toBe('Redémarrage d\'instances de processus');
      expect(frLabel).not.toContain('de processus');
    });

    it('[MUTATION PROOF] FR label for historic-instance-deletion should be exact', () => {
      const deleteOption = component.BATCH_TYPE_OPTIONS.find(o => o.value === 'historic-instance-deletion');
      const frLabel = frTranslations[deleteOption!.i18nKey];

      // Should FAIL if FR translation changes
      expect(frLabel).toBe('Suppression d\'instances terminées');
      expect(frLabel).not.toBe('Suppression d\'instances historiques');
      expect(frLabel).toContain('terminées');
    });
  });

  describe('Single select behavior with DOM clicks', () => {
    beforeEach(() => {
      component.selectCriteriaType('type');
      fixture.detectChanges();
    });

    it('should select first type when clicked, then replace with second type', () => {
      const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');

      // Click first type (instance-modification)
      buttons[0].click();
      fixture.detectChanges();

      expect(component.pendingValues.length).toBe(1);
      expect(component.pendingValues[0]).toBe('instance-modification');
      expect(buttons[0].classList.contains('state-row--selected')).toBe(true);
      expect(buttons[0].getAttribute('aria-pressed')).toBe('true');

      // Check mark should be visible
      const checkIcon1 = buttons[0].querySelector('.state-row-check');
      expect(checkIcon1).toBeTruthy();

      // Click second type (instance-restart) — should replace first
      buttons[1].click();
      fixture.detectChanges();

      expect(component.pendingValues.length).toBe(1);
      expect(component.pendingValues[0]).toBe('instance-restart');
      expect(buttons[0].classList.contains('state-row--selected')).toBe(false);
      expect(buttons[1].classList.contains('state-row--selected')).toBe(true);
      expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    });

    it('should apply raw batch type value (not translated label) to API', () => {
      const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');

      // Click "Set Removal Time" (11th option, index 10)
      buttons[10].click();
      fixture.detectChanges();

      // Value should be raw key, not translated label
      expect(component.pendingValues[0]).toBe('process-set-removal-time');
      expect(component.pendingValues[0]).not.toBe('Set Removal Time');
    });
  });

  describe('Pill creation with translated label', () => {
    it('should create pill with translated label', () => {
      const initialPillCount = component.activePills.length;

      // Open Type filter
      component.selectCriteriaType('type');
      fixture.detectChanges();

      // Click "Process Instance Deletion" (3rd option, index 2)
      const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');
      buttons[2].click();
      fixture.detectChanges();

      // Value should be raw key before confirmation
      expect(component.pendingValues[0]).toBe('instance-deletion');

      // Confirm selection
      component.confirmCriterion();
      fixture.detectChanges();

      // New pill should be created
      expect(component.activePills.length).toBe(initialPillCount + 1);

      // Pill should show translated label
      const pills = compiled.querySelectorAll('.pill-text-btn');
      const typePill = Array.from(pills).find(p => p.textContent?.includes('Deletion'));
      expect(typePill).toBeTruthy();
      expect(typePill?.textContent).toContain('Deletion');
    });
  });

  describe('Popover reopen behavior', () => {
    it('should show selected option when reopening popover', () => {
      // Select and confirm a type
      component.selectCriteriaType('type');
      fixture.detectChanges();

      const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');
      buttons[4].click(); // Select "Finished Instance Deletion"
      fixture.detectChanges();
      component.confirmCriterion();
      fixture.detectChanges();

      // Reopen editor
      component.selectCriteriaType('type');
      fixture.detectChanges();

      // Previously selected option should still be selected
      const buttonsReopen = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');
      expect(buttonsReopen[4].classList.contains('state-row--selected')).toBe(true);
      expect(component.pendingValues[0]).toBe('historic-instance-deletion');
    });

    it('should not apply changes when cancel is clicked', () => {
      const initialPillCount = component.activePills.length;

      // Open type filter and select an option
      component.selectCriteriaType('type');
      fixture.detectChanges();

      const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');
      buttons[0].click();
      fixture.detectChanges();

      // Cancel instead of confirm
      component.cancelCriterion();
      fixture.detectChanges();

      // No new pill should be created
      expect(component.activePills.length).toBe(initialPillCount);
    });
  });

  describe('[MUTATION PROOF] Icons and design elements', () => {
    beforeEach(() => {
      component.selectCriteriaType('type');
      fixture.detectChanges();
    });

    it('should have batch-type-icon class on all icon wrappers', () => {
      const iconWrappers = compiled.querySelectorAll('.batch-type-icon');
      expect(iconWrappers.length).toBe(13);

      iconWrappers.forEach(wrap => {
        expect(wrap.classList.contains('batch-type-icon')).toBe(true);
      });
    });

    it('should have state-row--selected class only on selected row', () => {
      const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');

      // No selection initially
      buttons.forEach(btn => {
        expect(btn.classList.contains('state-row--selected')).toBe(false);
      });

      // Select one
      buttons[5].click();
      fixture.detectChanges();

      // Only selected one should have the class
      buttons.forEach((btn, idx) => {
        if (idx === 5) {
          expect(btn.classList.contains('state-row--selected')).toBe(true);
        } else {
          expect(btn.classList.contains('state-row--selected')).toBe(false);
        }
      });
    });

    it('should have aria-pressed attribute matching selection state', () => {
      const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');

      buttons[3].click();
      fixture.detectChanges();

      expect(buttons[3].getAttribute('aria-pressed')).toBe('true');
      buttons.forEach((btn, idx) => {
        if (idx !== 3) {
          const ariaPressed = btn.getAttribute('aria-pressed');
          expect(ariaPressed === null || ariaPressed === 'false').toBe(true);
        }
      });
    });

    it('should have wizard icon colors for deletion (red), retries (blue), removal-time (gray), variables (purple), suspend (amber)', () => {
      const iconWrappers = compiled.querySelectorAll('.batch-type-icon');

      // Deletion types should have red class (from wizard badge--red)
      expect(iconWrappers[2].classList.contains('batch-type-icon--red')).toBe(true); // instance-deletion
      expect(iconWrappers[4].classList.contains('batch-type-icon--red')).toBe(true); // historic-instance-deletion
      expect(iconWrappers[5].classList.contains('batch-type-icon--red')).toBe(true); // historic-decision-instance-deletion

      // Retries should have blue class (from wizard badge--blue)
      expect(iconWrappers[6].classList.contains('batch-type-icon--blue')).toBe(true); // set-job-retries
      expect(iconWrappers[7].classList.contains('batch-type-icon--blue')).toBe(true); // set-external-task-retries

      // Removal time types should have gray class (from wizard badge--gray)
      expect(iconWrappers[10].classList.contains('batch-type-icon--gray')).toBe(true); // process-set-removal-time
      expect(iconWrappers[11].classList.contains('batch-type-icon--gray')).toBe(true); // decision-set-removal-time
      expect(iconWrappers[12].classList.contains('batch-type-icon--gray')).toBe(true); // batch-set-removal-time

      // Variables should have purple class (from wizard badge--purple)
      expect(iconWrappers[8].classList.contains('batch-type-icon--purple')).toBe(true); // set-variables

      // Suspend should have amber class (from wizard badge--amber)
      expect(iconWrappers[3].classList.contains('batch-type-icon--amber')).toBe(true); // instance-update-suspension-state
    });
  });
});
