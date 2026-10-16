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
 * BASELINE TEST: Batch Type filter DOM structure
 *
 * This test captures the EXACT DOM structure of the Type filter with 12 batch types.
 * Expected: 12 buttons in logical grouped order with icons.
 * Note: 'instance-migration' and 'instance-restart' are excluded (no corresponding batch operation in wizard).
 *
 * Expected order (from BATCH_TYPE_OPTIONS):
 * 1. instance-modification
 * 2. instance-deletion
 * 3. instance-update-suspension-state
 * 4. historic-instance-deletion
 * 5. historic-decision-instance-deletion
 * 6. set-job-retries
 * 7. set-external-task-retries
 * 8. set-variables
 * 9. correlate-message
 * 10. process-set-removal-time
 * 11. decision-set-removal-time
 * 12. batch-set-removal-time
 */
describe('InstanceFilterPanel - Batch Type DOM Baseline (12 types)', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    initTestEnvironment();

    const mockCockpitService = { getProcessDefinitions: vi.fn().mockReturnValue(of([])) } as any;
    const mockDecisionService = { getDecisionDefinitions: vi.fn().mockReturnValue(of([])) } as any;

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
      }
    };

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  it('renders exactly 13 Type option buttons with correct classes', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = compiled.querySelectorAll('.batch-type-row');
    expect(buttons.length).toBe(12);

    // Each button should have class="state-row"
    buttons.forEach(btn => {
      expect(btn.classList.contains('state-row')).toBe(true);
    });
  });

  it('renders Type options in correct order (matching BATCH_TYPE_OPTIONS)', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    const expectedValues = [
      'instance-modification',
      'instance-deletion',
      'instance-update-suspension-state',
      'historic-instance-deletion',
      'historic-decision-instance-deletion',
      'set-job-retries',
      'set-external-task-retries',
      'set-variables',
      'correlate-message',
      'process-set-removal-time',
      'decision-set-removal-time',
      'batch-set-removal-time'
    ];

    const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');

    // Click each button and verify it sets the correct value
    buttons.forEach((btn, index) => {
      component.pendingValues = [];
      btn.click();
      fixture.detectChanges();

      expect(component.pendingValues).toEqual([expectedValues[index]]);
    });
  });

  it('each button has state-row-label with translated text', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    const labels = compiled.querySelectorAll('.batch-type-row .state-row-label');
    expect(labels.length).toBe(12);

    // Labels should contain translated text (not raw keys)
    labels.forEach(label => {
      const text = label.textContent?.trim() || '';
      expect(text).not.toContain('BATCH_TYPE');
      expect(text.length).toBeGreaterThan(0);
    });
  });

  it('buttons have correct selection behavior (multi-select toggle)', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');

    // Click first button
    buttons[0].click();
    fixture.detectChanges();
    expect(component.pendingValues.length).toBe(1);
    expect(component.pendingValues[0]).toBe('instance-modification');

    // Click second button - should ADD to selection (multi-select)
    buttons[1].click();
    fixture.detectChanges();
    expect(component.pendingValues.length).toBe(2);
    expect(component.pendingValues).toContain('instance-modification');
    expect(component.pendingValues).toContain('instance-deletion');
  });

  it('all types from BATCH_TYPE_LABELS must be in BATCH_TYPE_OPTIONS except excluded ones', () => {
    // This test ensures no type is missing from the filter options
    const batchTypeLabelsKeys = Object.keys(BATCH_TYPE_LABELS);
    const batchTypeOptionsValues = component.BATCH_TYPE_OPTIONS.map(opt => opt.value);
    const excludedTypes = ['instance-migration', 'instance-restart']; // No corresponding batch operation in wizard

    // Every type in BATCH_TYPE_LABELS (except excluded) must be in BATCH_TYPE_OPTIONS
    batchTypeLabelsKeys.forEach(type => {
      if (excludedTypes.includes(type)) {
        expect(batchTypeOptionsValues).not.toContain(type);
      } else {
        expect(batchTypeOptionsValues).toContain(type);
      }
    });

    // 'instance-migration' and 'instance-restart' must NOT be in options
    expect(batchTypeOptionsValues).not.toContain('instance-migration');
    expect(batchTypeOptionsValues).not.toContain('instance-restart');

    // BATCH_TYPE_OPTIONS should have same count as BATCH_TYPE_LABELS minus excluded
    expect(batchTypeOptionsValues.length).toBe(batchTypeLabelsKeys.length - excludedTypes.length);
  });
});
