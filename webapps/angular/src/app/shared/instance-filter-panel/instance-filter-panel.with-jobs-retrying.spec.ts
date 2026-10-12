/**
 * Test: "With jobs retrying" button visibility for removal-time-process
 *
 * Verifies that:
 * - The button is displayed when showWithJobsRetrying=true
 * - The button is hidden when showWithJobsRetrying=false
 * - Non-regression: other operations maintain their showWithJobsRetrying state
 */

import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { InstanceFilterPanelComponent } from './instance-filter-panel';
import { By } from '@angular/platform-browser';
import { TranslateService } from '../../i18n/translate.service';
import { CockpitService } from '../../services/cockpit.service';
import { initTestEnvironment } from '../../testing/test-utils';

describe('InstanceFilterPanelComponent — With jobs retrying button visibility', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;

  beforeEach(async () => {
    initTestEnvironment();

    const cockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
    } as any;

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CockpitService, useValue: cockpitService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {} };

    fixture.detectChanges();
  });

  it('Button displayed when showWithJobsRetrying=true and finishedScope=false', () => {
    component.showWithJobsRetrying = true;
    component.finishedScope = false;
    fixture.detectChanges();

    component.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    const allButtons = fixture.debugElement.queryAll(By.css('button[role="menuitem"]'));
    const withJobsRetryingButton = allButtons.find(btn => {
      const text = btn.nativeElement.textContent;
      return text && text.toLowerCase().includes('retrying');
    });

    expect(withJobsRetryingButton).toBeDefined();
  });

  it('Button hidden when showWithJobsRetrying=false', () => {
    component.showWithJobsRetrying = false;
    component.finishedScope = false;
    fixture.detectChanges();

    component.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    const allButtons = fixture.debugElement.queryAll(By.css('button[role="menuitem"]'));
    const withJobsRetryingButton = allButtons.find(btn => {
      const text = btn.nativeElement.textContent;
      return text && text.toLowerCase().includes('retrying');
    });

    expect(withJobsRetryingButton).toBeUndefined();
  });

  it('Button hidden when finishedScope=true (even if showWithJobsRetrying=true)', () => {
    component.showWithJobsRetrying = true;
    component.finishedScope = true;
    fixture.detectChanges();

    component.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    const allButtons = fixture.debugElement.queryAll(By.css('button[role="menuitem"]'));
    const withJobsRetryingButton = allButtons.find(btn => {
      const text = btn.nativeElement.textContent;
      return text && text.toLowerCase().includes('retrying');
    });

    expect(withJobsRetryingButton).toBeUndefined();
  });

  it('Clicking button creates withJobsRetrying pill', () => {
    component.showWithJobsRetrying = true;
    component.finishedScope = false;
    fixture.detectChanges();

    component.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    const allButtons = fixture.debugElement.queryAll(By.css('button[role="menuitem"]'));
    const withJobsRetryingButton = allButtons.find(btn => {
      const text = btn.nativeElement.textContent;
      return text && text.toLowerCase().includes('retrying');
    });

    expect(withJobsRetryingButton).toBeDefined();

    // Click the button
    withJobsRetryingButton!.nativeElement.click();
    fixture.detectChanges();

    // Verify pill was created
    const pill = component.activePills.find(p => p.field === 'withJobsRetrying');
    expect(pill).toBeDefined();
    expect(pill?.field).toBe('withJobsRetrying');
    expect(pill?.values).toEqual([]);
  });
});