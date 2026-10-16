/**
 * Test: Non-regression for "Narrow to..." lists icon rendering
 *
 * Verifies that showStateNarrowing and showFinishedNarrowing lists
 * display full-size icons (34px) without the compact modifier,
 * ensuring the State menu icon changes (24px compact) do not affect them.
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

describe('InstanceFilterPanelComponent — Narrow to lists: full-size icons (non-regression)', () => {
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

  it('showStateNarrowing: Active uses criteria-icon-wrap WITHOUT --compact', () => {
    // Setup with lockedState='unfinished' to trigger showStateNarrowing
    component.lockedState = 'unfinished';
    component.showStateNarrowing = true;
    fixture.detectChanges();

    // Open dropdown to see narrowing options
    component.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    // Find all narrowing buttons and locate the one with emerald icon
    const allButtons = fixture.debugElement.queryAll(By.css('button[role="menuitem"]'));
    const activeButton = allButtons.find(btn => {
      const emeraldIcon = btn.query(By.css('.criteria-icon-wrap--emerald'));
      return emeraldIcon !== null;
    });

    expect(activeButton).toBeDefined();

    // Verify it uses criteria-icon-wrap but NOT --compact
    const iconWrap = activeButton?.query(By.css('.criteria-icon-wrap'));
    expect(iconWrap).not.toBeNull();
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap')).toBe(true);
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap--compact')).toBe(false);
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap--emerald')).toBe(true);
  });

  it('showStateNarrowing: Suspended uses criteria-icon-wrap WITHOUT --compact', () => {
    component.lockedState = 'unfinished';
    component.showStateNarrowing = true;
    fixture.detectChanges();

    component.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    const allButtons = fixture.debugElement.queryAll(By.css('button[role="menuitem"]'));
    const suspendedButton = allButtons.find(btn => {
      const amberIcon = btn.query(By.css('.criteria-icon-wrap--amber'));
      return amberIcon !== null;
    });

    expect(suspendedButton).toBeDefined();

    const iconWrap = suspendedButton?.query(By.css('.criteria-icon-wrap'));
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap')).toBe(true);
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap--compact')).toBe(false);
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap--amber')).toBe(true);
  });

  it('showFinishedNarrowing: Completed uses criteria-icon-wrap WITHOUT --compact', () => {
    // Setup with lockedState='finished' to trigger showFinishedNarrowing
    component.lockedState = 'finished';
    component.showFinishedNarrowing = true;
    fixture.detectChanges();

    component.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    const allButtons = fixture.debugElement.queryAll(By.css('button[role="menuitem"]'));
    const completedButton = allButtons.find(btn => {
      const blueIcon = btn.query(By.css('.criteria-icon-wrap--blue'));
      return blueIcon !== null;
    });

    expect(completedButton).toBeDefined();

    const iconWrap = completedButton?.query(By.css('.criteria-icon-wrap'));
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap')).toBe(true);
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap--compact')).toBe(false);
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap--blue')).toBe(true);
  });

  it('showFinishedNarrowing: Terminated uses criteria-icon-wrap WITHOUT --compact', () => {
    component.lockedState = 'finished';
    component.showFinishedNarrowing = true;
    fixture.detectChanges();

    component.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    const allButtons = fixture.debugElement.queryAll(By.css('button[role="menuitem"]'));
    const terminatedButton = allButtons.find(btn => {
      const redIcon = btn.query(By.css('.criteria-icon-wrap--red'));
      return redIcon !== null;
    });

    expect(terminatedButton).toBeDefined();

    const iconWrap = terminatedButton?.query(By.css('.criteria-icon-wrap'));
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap')).toBe(true);
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap--compact')).toBe(false);
    expect(iconWrap?.nativeElement.classList.contains('criteria-icon-wrap--red')).toBe(true);
  });
});
