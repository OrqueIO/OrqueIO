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

describe('InstanceFilterPanelComponent — State criterion editor: all 4 states present', () => {
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

  it('should render Active, Suspended, Completed and Terminated state rows', () => {
    component.selectCriteriaType('state');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.state-dot--active'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.state-dot--suspended'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.state-dot--completed'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.state-dot--terminated'))).not.toBeNull();
  });

  it('should render exactly 4 state rows (no state missing, no duplicate)', () => {
    component.selectCriteriaType('state');
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.state-row')).length).toBe(4);
  });
});

describe('InstanceFilterPanelComponent — auto-removal of empty multi-value criteria', () => {
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

  const chipFields = ['businessKey', 'instanceId', 'decisionInstanceId', 'processInstanceId'] as const;

  chipFields.forEach(field => {
    it(`should remove the ${field} pill when all chips are cleared and confirmCriterion is called`, () => {
      component.activePills = [{ field, values: ['val-1', 'val-2'] }];
      component.editingPillIndex = 0;
      component.activeEditorType = field;
      component.pendingValues = [];

      component.confirmCriterion();

      expect(component.activePills.length).toBe(0);
      expect(component.editingPillIndex).toBeNull();
      expect(component.activeEditorType).toBeNull();
    });

    it(`should not remove the ${field} pill when chips remain (non-regression)`, () => {
      component.activePills = [{ field, values: ['old'] }];
      component.editingPillIndex = 0;
      component.activeEditorType = field;
      component.pendingValues = ['new-val'];

      component.confirmCriterion();

      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].values).toEqual(['new-val']);
    });
  });

  it('should remove the state pill when all state values are cleared and confirmCriterion is called', () => {
    component.activePills = [{ field: 'state', values: ['active'] }];
    component.editingPillIndex = 0;
    component.activeEditorType = 'state';
    component.pendingStateValues = [];

    component.confirmCriterion();

    expect(component.activePills.length).toBe(0);
    expect(component.editingPillIndex).toBeNull();
    expect(component.activeEditorType).toBeNull();
  });

  it('should not remove a non-editing pill when another pill shares the same type', () => {
    component.activePills = [
      { field: 'businessKey', values: ['BK-1'] },
      { field: 'instanceId', values: ['inst-1'] },
    ];
    component.editingPillIndex = 0;
    component.activeEditorType = 'businessKey';
    component.pendingValues = [];

    component.confirmCriterion();

    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('instanceId');
  });

  it('should emit criteriaChange after auto-removing an empty businessKey pill', () => {
    const emitted: unknown[] = [];
    component.criteriaChange.subscribe(e => emitted.push(e));

    component.activePills = [{ field: 'businessKey', values: ['BK-001'] }];
    component.editingPillIndex = 0;
    component.activeEditorType = 'businessKey';
    component.pendingValues = [];

    component.confirmCriterion();

    expect(emitted.length).toBe(1);
  });

  it('should not remove a chip-field pill when editingPillIndex is null (new criterion, not editing)', () => {
    component.activePills = [{ field: 'businessKey', values: ['existing'] }];
    component.editingPillIndex = null;
    component.activeEditorType = 'businessKey';
    component.pendingValues = [];

    component.confirmCriterion();

    expect(component.activePills.length).toBe(1);
  });
});
