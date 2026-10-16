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
 * TEST: Batch Type is MULTI-SELECT, Status is SINGLE CHOICE
 *
 * Verifies:
 * - Type: Toggle behavior - clicking same option deselects it, can select multiple
 * - Status: Selecting Completed then Running → only Running remains (single choice)
 *
 * Updated for #114 typeIn multi-value support (2026-10-16)
 */
describe('Batch Type Multi-Select and Status Single Choice', () => {
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

  it('[Type] Real DOM click: A then B → both A and B selected (multi-select toggle)', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    // Clear any previous state
    component.pendingValues = [];

    // Find Type option buttons
    const buttons = compiled.querySelectorAll<HTMLButtonElement>('.state-row');
    
    // Click first button (process-set-removal-time)
    buttons[0].click();
    fixture.detectChanges();
    const firstValue = component.pendingValues[0];
    expect(component.pendingValues.length).toBe(1);

    // Click second button (decision-set-removal-time)
    buttons[1].click();
    fixture.detectChanges();
    
    // Verify BOTH selected (multi-select behavior)
    expect(component.pendingValues.length).toBe(2);
    expect(component.pendingValues).toContain(firstValue);

    // Apply and verify pill
    component.confirmCriterion();
    fixture.detectChanges();

    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('type');
    expect(component.activePills[0].values.length).toBe(2);
  });

  it('[Type] Real DOM click: A then A → deselects A (toggle off)', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    component.pendingValues = [];
    const buttons = compiled.querySelectorAll<HTMLButtonElement>('.state-row');

    // Click option A
    buttons[0].click();
    fixture.detectChanges();
    expect(component.pendingValues.length).toBe(1);
    const valueA = component.pendingValues[0];

    // Click option A again
    buttons[0].click();
    fixture.detectChanges();

    // Verify deselected (toggle off)
    expect(component.pendingValues.length).toBe(0);
  });

  it('[Type] Real DOM click: A, B, A → only B remains (toggle A off)', async () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();
    await fixture.whenStable();

    component.pendingValues = [];
    const buttons = compiled.querySelectorAll<HTMLButtonElement>('.state-row');

    // Click A
    buttons[0].click();
    fixture.detectChanges();
    const valueA = component.pendingValues[0];

    // Click B
    buttons[1].click();
    fixture.detectChanges();
    expect(component.pendingValues.length).toBe(2);
    const valueB = component.pendingValues.find(v => v !== valueA);

    // Click A again (toggle off)
    buttons[0].click();
    fixture.detectChanges();

    // Verify only B remains
    expect(component.pendingValues).toEqual([valueB]);
  });

  it('[Status] Real DOM click: Completed then Running → only Running selected (single choice)', async () => {
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

    // Verify ONLY Running selected (Completed replaced - single choice behavior)
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
