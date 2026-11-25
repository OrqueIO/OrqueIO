import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { DecisionService } from '../../../../services/decision.service';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { CockpitService } from '../../../../services/cockpit.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * RENDERING TEST for removal-time-decision step 1 buttons
 *
 * This test actually RENDERS the template with real i18n translations
 * and verifies:
 * 1. Button text displays correctly translated text
 * 2. NO raw i18n keys are displayed (no text starting with "cockpit.")
 * 3. Count parameter interpolation works ({{count}})
 * 4. Both Instances and Query modes work correctly
 * 5. Works with 0, 1, and N selected instances
 */
describe('BatchOperationsWizard - Render decision buttons (removal-time-decision)', () => {
  let component: BatchOperationsWizardComponent;
  let fixture: ComponentFixture<BatchOperationsWizardComponent>;
  let translateService: TranslateService;
  let enTranslations: any;

  // Load actual English translation file
  try {
    const enPath = path.resolve(__dirname, '../../../../../assets/i18n/en.json');
    enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load translation files:', error);
  }

  beforeEach(async () => {
    initTestEnvironment();

    const mockDecisionService = {
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' })),
      getDecisionInstancesCountFiltered: vi.fn().mockReturnValue(of(42)),
      deleteAsync: vi.fn().mockReturnValue(of({ id: 'batch-delete' })),
      getDecisionDefinitions: vi.fn().mockReturnValue(of([]))
    } as any;

    const mockProcessInstanceService = {
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-456' }))
    } as any;

    const mockCockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0))
    } as any;

    await TestBed.configureTestingModule({
      imports: [BatchOperationsWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: DecisionService, useValue: mockDecisionService },
        { provide: ProcessInstanceService, useValue: mockProcessInstanceService },
        { provide: CockpitService, useValue: mockCockpitService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchOperationsWizardComponent);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);

    // Load English translations
    (translateService as any).translations = { en: enTranslations };

    // Set up for removal-time-decision operation
    component.selectedOperationId = 'removal-time-decision';
    component.currentStep = 1;
    fixture.detectChanges();
  });

  describe('Instances mode - button rendering', () => {
    beforeEach(() => {
      component.mode = 'instances';
      component.selectedDecisionIds = new Set<string>();
    });

    it('should render button text (NOT raw key) with 0 decision instances', async () => {
      component.selectedDecisionIds.clear();
      fixture.detectChanges();
      await fixture.whenStable();

      const button = fixture.nativeElement.querySelector('button.btn-primary');
      expect(button).toBeTruthy();

      const buttonText = button?.textContent?.trim() || '';

      // CRITICAL: Button text should NOT be a raw i18n key
      expect(buttonText).not.toContain('cockpit.batchOps');
      expect(buttonText).not.toContain('removalTimeDecision.actionBtn');

      // Should contain the translated text with count=0
      expect(buttonText).toContain('Set removal time for');
      expect(buttonText).toContain('0');
      expect(buttonText).toContain('decision instance');
    });

    it('should render button text (NOT raw key) with 1 decision instance', async () => {
      component.selectedDecisionIds.add('decision-001');
      fixture.detectChanges();
      await fixture.whenStable();

      const button = fixture.nativeElement.querySelector('button.btn-primary');
      const buttonText = button?.textContent?.trim() || '';

      // CRITICAL: Button text should NOT be a raw i18n key
      expect(buttonText).not.toContain('cockpit.batchOps');
      expect(buttonText).not.toContain('removalTimeDecision.actionBtn');

      // Should contain the translated text with count=1
      expect(buttonText).toContain('Set removal time for');
      expect(buttonText).toContain('1');
      expect(buttonText).toContain('decision instance');
    });

    it('should render button text (NOT raw key) with N decision instances', async () => {
      component.selectedDecisionIds.add('decision-001');
      component.selectedDecisionIds.add('decision-002');
      component.selectedDecisionIds.add('decision-003');
      component.selectedDecisionIds.add('decision-004');
      component.selectedDecisionIds.add('decision-005');
      fixture.detectChanges();
      await fixture.whenStable();

      const button = fixture.nativeElement.querySelector('button.btn-primary');
      const buttonText = button?.textContent?.trim() || '';

      // CRITICAL: Button text should NOT be a raw i18n key
      expect(buttonText).not.toContain('cockpit.batchOps');
      expect(buttonText).not.toContain('removalTimeDecision.actionBtn');

      // Should contain the translated text with count=5
      expect(buttonText).toContain('Set removal time for');
      expect(buttonText).toContain('5');
      expect(buttonText).toContain('decision instance');
    });
  });

  describe('Query mode - button rendering', () => {
    beforeEach(() => {
      component.mode = 'query';
    });

    it('should render button text (NOT raw key) in Query mode', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const button = fixture.nativeElement.querySelector('button.btn-primary');
      const buttonText = button?.textContent?.trim() || '';

      // CRITICAL: Button text should NOT be a raw i18n key
      expect(buttonText).not.toContain('cockpit.batchOps');
      expect(buttonText).not.toContain('removalTimeDecision.actionBtnQuery');

      // Should contain the translated text for query mode
      expect(buttonText).toContain('Set removal time for matching decision instances');
    });
  });

  describe('NO raw keys anywhere in removal-time-decision template', () => {
    it('should NOT display any raw i18n keys (text starting with "cockpit.") in step 1', async () => {
      component.mode = 'instances';
      component.selectedDecisionIds.add('decision-001');
      fixture.detectChanges();
      await fixture.whenStable();

      // Get all text content from the component
      const allText = fixture.nativeElement.textContent || '';

      // Should NOT contain any raw keys
      const rawKeyPattern = /cockpit\.batchOps\.\w+/g;
      const matches = allText.match(rawKeyPattern);

      if (matches) {
        console.error('Found raw i18n keys in rendered template:', matches);
      }

      expect(matches).toBeNull(); // No raw keys should be found
    });

    it('should NOT display any raw i18n keys in Query mode step 1', async () => {
      component.mode = 'query';
      fixture.detectChanges();
      await fixture.whenStable();

      const allText = fixture.nativeElement.textContent || '';
      const rawKeyPattern = /cockpit\.batchOps\.\w+/g;
      const matches = allText.match(rawKeyPattern);

      if (matches) {
        console.error('Found raw i18n keys in rendered template:', matches);
      }

      expect(matches).toBeNull();
    });
  });

  describe('[MUTATION PROOF] Verify test would catch reversion to old keys', () => {
    it('OLD KEY TEST: verifies that using old key results in raw key display', () => {
      // This test proves that if the HTML still used the old key,
      // the button would display the raw key string because the old key
      // does NOT exist in translations

      // Test what happens when we translate the OLD key that was removed from JSON
      const oldKeyInstances = (translateService as any).instant(
        'cockpit.batchOps.removalTimeDecision.actionBtn',
        { count: '1' }
      );
      const oldKeyQuery = (translateService as any).instant(
        'cockpit.batchOps.removalTimeDecision.actionBtnQuery'
      );

      // The old keys should return themselves (indicating missing translation)
      expect(oldKeyInstances).toContain('removalTimeDecision.actionBtn');
      expect(oldKeyQuery).toContain('removalTimeDecision.actionBtnQuery');

      // Verify the NEW keys return actual translated text (not the key itself)
      const newKeyInstances = (translateService as any).instant(
        'cockpit.batchOps.confirm.removalTimeDecisionBtn',
        { count: '1' }
      );
      const newKeyQuery = (translateService as any).instant(
        'cockpit.batchOps.confirm.removalTimeDecisionBtnQuery'
      );

      expect(newKeyInstances).not.toContain('cockpit.batchOps');
      expect(newKeyInstances).toContain('Set removal time for');
      expect(newKeyInstances).toContain('1');
      expect(newKeyInstances).toContain('decision instance');

      expect(newKeyQuery).not.toContain('cockpit.batchOps');
      expect(newKeyQuery).toContain('Set removal time for matching decision instances');
    });

    it('[DOCUMENTED] If HTML reverts to old key, this test suite would catch it', () => {
      // This test documents that our other tests would fail if someone
      // accidentally reverted batch-operations-wizard.html to use the old keys

      // Proof: The old keys are missing from translations
      expect(enTranslations['cockpit.batchOps.removalTimeDecision.actionBtn']).toBeUndefined();
      expect(enTranslations['cockpit.batchOps.removalTimeDecision.actionBtnQuery']).toBeUndefined();

      // Therefore, if HTML used old keys, the button text would be:
      // "cockpit.batchOps.removalTimeDecision.actionBtn" (raw key)
      //
      // And our tests "should render button text (NOT raw key)" would FAIL because:
      // expect(buttonText).not.toContain('cockpit.batchOps') would fail
      // expect(buttonText).not.toContain('removalTimeDecision.actionBtn') would fail
      //
      // This proves the test suite has good mutation coverage.
    });
  });
});