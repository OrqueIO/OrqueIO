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
 * TEST: Batch ID popover has NO multi-value help text
 *
 * Verifies:
 * - Batch ID is single-value (text input, not chips)
 * - No "Press Enter or comma..." help text for Batch ID
 * - No "Tip: paste a comma-separated list..." for Batch ID
 * - Instance ID still shows multi-value help text (unchanged)
 *
 * Part of batch filter single-value requirement (#114)
 */
describe('InstanceFilterPanelComponent — Batch ID help text', () => {
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
        'cockpit.processes.globalSearch.chipInputHint': 'Press Enter or comma to add a value',
        'cockpit.processes.globalSearch.chipInputHintTip': 'Tip: paste a comma-separated list to add several at once'
      }
    };

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  it('should NOT display multi-value help text for Batch ID (single-value field)', async () => {
    component.selectCriteriaType('batchId');
    fixture.detectChanges();
    await fixture.whenStable();

    // Assert ABSENCE of multi-value help text
    const hintMain = compiled.querySelector('.chip-hint-main');
    const hintTip = compiled.querySelector('.chip-hint-tip');

    expect(hintMain).toBeNull();
    expect(hintTip).toBeNull();
  });

  it('should display single-value text input for Batch ID (not chips)', async () => {
    component.selectCriteriaType('batchId');
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify text input exists
    const textInput = compiled.querySelector('input[type="text"].editor-input');
    expect(textInput).toBeTruthy();

    // Verify no chip input component
    const chipInput = compiled.querySelector('app-multi-value-chip-input');
    expect(chipInput).toBeNull();
  });

  it('should still display multi-value help text for Instance ID (unchanged)', async () => {
    // Reset and test Instance ID (process criteriaSet)
    component.activeEditorType = null;
    component.criteriaSet = 'process';
    component.ngOnInit();
    fixture.detectChanges();

    component.selectCriteriaType('instanceId');
    fixture.detectChanges();
    await fixture.whenStable();

    // Instance ID should still have multi-value help text
    const hintMain = compiled.querySelector('.chip-hint-main');
    const hintTip = compiled.querySelector('.chip-hint-tip');

    expect(hintMain).toBeTruthy();
    expect(hintTip).toBeTruthy();
    expect(hintMain!.textContent?.trim()).toBe('Press Enter or comma to add a value');
    expect(hintTip!.textContent?.trim()).toBe('Tip: paste a comma-separated list to add several at once');
  });
});
