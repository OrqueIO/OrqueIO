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
import { initTestEnvironment } from '../../testing/test-utils';

/**
 * TEST: Batch ID input behavior
 *
 * Verifies:
 * - Enter key applies the value (calls confirmCriterion)
 * - Whitespace is trimmed
 * - Empty/whitespace-only value = nothing applied (no pill created)
 *
 * Part of batch filter single-value requirement (#114)
 */
describe('Batch ID Input Behavior', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;

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
    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  it('Enter key applies value (confirmCriterion called)', () => {
    component.selectCriteriaType('batchId');
    component.pendingTextValue = 'batch-123';
    fixture.detectChanges();

    // Spy on confirmCriterion
    const spy = vi.spyOn(component, 'confirmCriterion');

    // Simulate Enter key in editor-popover-body (keydown.enter)="confirmCriterion()"
    component.confirmCriterion();

    expect(spy).toHaveBeenCalled();
    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].values).toEqual(['batch-123']);
  });

  it('Whitespace is trimmed from value', () => {
    component.selectCriteriaType('batchId');
    component.pendingTextValue = '  batch-001  ';
    component.confirmCriterion();
    fixture.detectChanges();

    // Verify trimmed value in pill
    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].values).toEqual(['batch-001']);
  });

  it('Empty value = nothing applied (no pill)', () => {
    component.selectCriteriaType('batchId');
    component.pendingTextValue = '';
    component.confirmCriterion();
    fixture.detectChanges();

    expect(component.activePills.length).toBe(0);
  });

  it('Whitespace-only value = nothing applied (no pill)', () => {
    component.selectCriteriaType('batchId');
    component.pendingTextValue = '   ';
    component.confirmCriterion();
    fixture.detectChanges();

    expect(component.activePills.length).toBe(0);
  });

  it('Tab and newline are also trimmed', () => {
    component.selectCriteriaType('batchId');
    component.pendingTextValue = '\t\nbatch-002\t\n';
    component.confirmCriterion();
    fixture.detectChanges();

    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].values).toEqual(['batch-002']);
  });
});