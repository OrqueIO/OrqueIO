import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { InstanceFilterPanelComponent } from './instance-filter-panel';
import { CockpitService } from '../../services/cockpit.service';
import { TranslateService } from '../../i18n/translate.service';
import { initTestEnvironment } from '../../testing/test-utils';

describe('InstanceFilterPanelComponent — popover mutual-exclusion', () => {
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let component: InstanceFilterPanelComponent;

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {} };

    fixture.detectChanges();
  });

  it('should close an open criterion popover when "Add criteria" is clicked', () => {
    component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
    component.editingPillIndex = 0;
    component.activeEditorType = 'businessKey';
    component.pendingValues = ['BK-001'];
    component.showCriteriaDropdown = false;

    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    component.toggleCriteriaDropdown(fakeEvent);

    expect(component.editingPillIndex).toBeNull();
    expect(component.activeEditorType).toBeNull();
    expect(component.showCriteriaDropdown).toBe(true);
  });

  it('should close the "Add criteria" dropdown when an existing pill is clicked to edit', () => {
    component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
    component.showCriteriaDropdown = true;
    component.editingPillIndex = null;
    component.activeEditorType = null;

    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    component.startEditPill(0, fakeEvent);

    expect(component.showCriteriaDropdown).toBe(false);
    expect(component.editingPillIndex).toBe(0);
    expect(component.activeEditorType).toBe('businessKey');
  });

  it('should close all popover state when clicking outside the criteria zone', () => {
    component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
    component.editingPillIndex = 0;
    component.activeEditorType = 'businessKey';
    component.pendingValues = ['BK-001'];
    component.showCriteriaDropdown = false;

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    const fakeEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(fakeEvent, 'target', { value: outsideEl, configurable: true });
    component.onDocumentClick(fakeEvent);
    document.body.removeChild(outsideEl);

    expect(component.editingPillIndex).toBeNull();
    expect(component.activeEditorType).toBeNull();
    expect(component.showCriteriaDropdown).toBe(false);
  });
});

describe('InstanceFilterPanelComponent — State criterion visibility based on lockedState', () => {
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let component: InstanceFilterPanelComponent;

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {} };

    fixture.detectChanges();
  });

  it('should hide the State option in Add criteria when lockedState is set (batch context)', () => {
    component.lockedState = 'active';
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    component.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.criteria-icon-wrap--emerald'))).toBeNull();
  });

  it('should show the State option in Add criteria when lockedState is null (Search Instances context)', () => {
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    component.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.criteria-icon-wrap--emerald'))).not.toBeNull();
  });

  it('should expose exactly 9 criteria options when locked (State excluded) and 10 when unlocked', () => {
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;

    component.lockedState = 'unfinished';
    component.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.criteria-option')).length).toBe(9);

    component.toggleCriteriaDropdown(fakeEvent);
    component.lockedState = null;
    component.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.criteria-option')).length).toBe(10);
  });
});
