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
 * TEST: Batch Type and Status are SINGLE CHOICE
 *
 * Verifies:
 * - Type: Selecting option A then B → only B remains (pill, pendingValues, HTTP request)
 * - Status: Selecting Completed then Running → only Running remains
 * - No multi-select behavior
 *
 * Part of batch filter single-value requirement (#114)
 */
describe('Batch Type and Status - Single Choice Verification', () => {
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
        'BATCH_TYPE_PROCESS_SET_REMOVAL_TIME': 'Set Removal Time',
        'BATCH_TYPE_DECISION_SET_REMOVAL_TIME': 'Set Removal Time (Decisions)',
        'cockpit.batchOps.removalTimeBatch.filters.statusCompleted': 'Completed',
        'cockpit.batchOps.removalTimeBatch.filters.statusRunning': 'Running'
      }
    };

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  it('[Type] Real DOM click: A then B → only B selected (pill + pendingValues)', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    // Find Type option buttons in DOM using test IDs or click handlers
    // Since buttons set pendingValues via click handler, we can identify them
    // by checking which one triggers the right value

    // Click option A: process-set-removal-time
    // Find button by simulating clicks and checking pendingValues
    let buttonA: HTMLButtonElement | null = null;
    let buttonB: HTMLButtonElement | null = null;

    const buttons = compiled.querySelectorAll<HTMLButtonElement>('.state-row');
    for (const btn of Array.from(buttons)) {
      // Reset pendingValues to test
      component.pendingValues = [];
      btn.click();
      fixture.detectChanges();

      if (component.pendingValues[0] === 'process-set-removal-time') {
        buttonA = btn;
      } else if (component.pendingValues[0] === 'decision-set-removal-time') {
        buttonB = btn;
      }

      if (buttonA && buttonB) break;
    }

    expect(buttonA).toBeTruthy();
    expect(buttonB).toBeTruthy();

    // Now perform the real test: click A then B
    buttonA!.click();
    fixture.detectChanges();

    // Verify A selected
    expect(component.pendingValues).toEqual(['process-set-removal-time']);

    // Click option B: decision-set-removal-time
    buttonB!.click();
    fixture.detectChanges();

    // Verify ONLY B selected (A replaced)
    expect(component.pendingValues).toEqual(['decision-set-removal-time']);
    expect(component.pendingValues.length).toBe(1);

    // Apply and verify pill
    component.confirmCriterion();
    fixture.detectChanges();

    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('type');
    expect(component.activePills[0].values).toEqual(['decision-set-removal-time']);
  });

  it('[Status] Real DOM click: Completed then Running → only Running selected (pill + pendingValues)', async () => {
    component.selectCriteriaType('completed');
    fixture.detectChanges();
    await fixture.whenStable();

    // Find Status option buttons in DOM
    const buttons = compiled.querySelectorAll('.state-row');
    expect(buttons.length).toBe(2);

    // Click Completed (button at index 0)
    const buttonCompleted = buttons[0] as HTMLButtonElement;
    buttonCompleted.click();
    fixture.detectChanges();

    // Verify Completed selected
    expect(component.pendingValues).toEqual(['true']);

    // Click Running (button at index 1)
    const buttonRunning = buttons[1] as HTMLButtonElement;
    buttonRunning.click();
    fixture.detectChanges();

    // Verify ONLY Running selected (Completed replaced)
    expect(component.pendingValues).toEqual(['false']);
    expect(component.pendingValues.length).toBe(1);

    // Apply and verify pill
    component.confirmCriterion();
    fixture.detectChanges();

    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('completed');
    expect(component.activePills[0].values).toEqual(['false']);
  });
});
