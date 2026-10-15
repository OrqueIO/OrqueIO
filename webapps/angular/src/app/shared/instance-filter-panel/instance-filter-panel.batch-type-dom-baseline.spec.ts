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
 * BASELINE TEST: Batch Type filter DOM structure
 *
 * This test captures the EXACT DOM structure of the Type filter BEFORE converting to *ngFor.
 * After converting to *ngFor, the same DOM must be rendered (11 buttons, same order, same classes).
 *
 * Expected order (from BATCH_TYPE_LABELS):
 * 1. instance-migration
 * 2. instance-modification
 * 3. instance-deletion
 * 4. instance-update-suspension-state
 * 5. set-job-retries
 * 6. set-external-task-retries
 * 7. process-set-removal-time
 * 8. decision-set-removal-time
 * 9. batch-set-removal-time
 * 10. set-variables
 * 11. correlate-message
 */
describe('InstanceFilterPanel - Batch Type DOM Baseline (before *ngFor)', () => {
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
        'BATCH_TYPE_MIGRATION': 'Instance Migration',
        'BATCH_TYPE_MODIFICATION': 'Instance Modification',
        'BATCH_TYPE_DELETION': 'Instance Deletion',
        'BATCH_TYPE_SUSPENSION': 'Instance Update Suspension State',
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

  it('renders exactly 11 Type option buttons with correct classes', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = compiled.querySelectorAll('.state-row');
    expect(buttons.length).toBe(11);

    // Each button should have class="state-row"
    buttons.forEach(btn => {
      expect(btn.classList.contains('state-row')).toBe(true);
    });
  });

  it('renders Type options in correct order (matching BATCH_TYPE_LABELS)', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    const expectedValues = [
      'instance-migration',
      'instance-modification',
      'instance-deletion',
      'instance-update-suspension-state',
      'set-job-retries',
      'set-external-task-retries',
      'process-set-removal-time',
      'decision-set-removal-time',
      'batch-set-removal-time',
      'set-variables',
      'correlate-message'
    ];

    const buttons = compiled.querySelectorAll<HTMLButtonElement>('.state-row');

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

    const labels = compiled.querySelectorAll('.state-row-label');
    expect(labels.length).toBe(11);

    // Labels should contain translated text (not raw keys)
    labels.forEach(label => {
      const text = label.textContent?.trim() || '';
      expect(text).not.toContain('BATCH_TYPE');
      expect(text.length).toBeGreaterThan(0);
    });
  });

  it('buttons have correct selection behavior (single choice)', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = compiled.querySelectorAll<HTMLButtonElement>('.state-row');

    // Click first button
    buttons[0].click();
    fixture.detectChanges();
    expect(component.pendingValues.length).toBe(1);

    // Click second button - should replace first
    buttons[1].click();
    fixture.detectChanges();
    expect(component.pendingValues.length).toBe(1);
    expect(component.pendingValues[0]).toBe('instance-modification');
  });
});
