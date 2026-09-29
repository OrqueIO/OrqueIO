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
import { DecisionService } from '../../services/decision.service';
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

  it('exposes 8 options with lockedState="unfinished" (State + finishedAfter + finishedBefore hidden) and 11 when unlocked', async () => {
    // Note: this test creates fresh fixtures to guarantee correct ngIf evaluation with OnPush.
    // Reusing a fixture that transitions through multiple lockedState values produces unreliable
    // counts because Angular OnPush caches embedded views across dropdown open/close cycles.
    //
    // 11 total process criteria (superProcessInstanceId, subProcessInstanceId, activityId,
    // incidentId, incidentType, incidentMessage hidden by showExtendedCriteria=false) minus:
    //   lockedState='unfinished': -State -finishedAfter -finishedBefore → 8
    //   lockedState=null:         no extra hidden → 11
    const cockpitServiceMock = { getProcessDefinitions: vi.fn().mockReturnValue(of([])) } as any;

    async function countOptions(lockedState: string | null): Promise<number> {
      initTestEnvironment();
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [InstanceFilterPanelComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: CockpitService, useValue: cockpitServiceMock },
        ],
      }).compileComponents();
      const f = TestBed.createComponent(InstanceFilterPanelComponent);
      f.componentInstance.lockedState = lockedState;
      (TestBed.inject(TranslateService) as any).translations = { en: {} };
      f.detectChanges();
      const ev = { stopPropagation: vi.fn() } as unknown as Event;
      f.componentInstance.toggleCriteriaDropdown(ev);
      f.detectChanges();
      return f.debugElement.queryAll(By.css('.criteria-option')).length;
    }

    expect(await countOptions('unfinished')).toBe(8);
    expect(await countOptions(null)).toBe(11);
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

describe('InstanceFilterPanelComponent — initialPills chip restoration', () => {
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let component: InstanceFilterPanelComponent;

  async function createWithPills(pills: { field: string; values: string[] }[]) {
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
    component.initialPills = pills as any;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {} };

    fixture.detectChanges();
  }

  it('restores a single State pill passed via initialPills', async () => {
    await createWithPills([{ field: 'state', values: ['active', 'suspended'] }]);

    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('state');
    expect(component.activePills[0].values).toEqual(['active', 'suspended']);
  });

  it('restores a businessKey pill (multi-value text criterion) via initialPills', async () => {
    await createWithPills([{ field: 'businessKey', values: ['BK-001', 'BK-002'] }]);

    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('businessKey');
    expect(component.activePills[0].values).toEqual(['BK-001', 'BK-002']);
  });

  it('restores a date criterion pill via initialPills', async () => {
    await createWithPills([{ field: 'startedAfter', values: ['2024-01-01T00:00:00.000+0100'] }]);

    expect(component.activePills.length).toBe(1);
    expect(component.activePills[0].field).toBe('startedAfter');
    expect(component.activePills[0].values[0]).toContain('2024-01-01');
  });

  it('restores multiple criterion pills of different types simultaneously', async () => {
    await createWithPills([
      { field: 'state', values: ['active'] },
      { field: 'businessKey', values: ['ORDER-1'] },
      { field: 'startedAfter', values: ['2024-06-01T00:00:00.000+0200'] },
    ]);

    expect(component.activePills.length).toBe(3);
    expect(component.activePills.map(p => p.field)).toEqual(['state', 'businessKey', 'startedAfter']);
  });

  it('starts with empty activePills when initialPills is empty (no session to restore)', async () => {
    await createWithPills([]);

    expect(component.activePills.length).toBe(0);
  });

  it('produces a defensive copy — mutating the original initialPills does not change activePills', async () => {
    const original = [{ field: 'businessKey', values: ['BK-1'] }];
    await createWithPills(original);

    original[0].values.push('BK-INJECTED');

    expect(component.activePills[0].values).toEqual(['BK-1']);
  });
});

describe('InstanceFilterPanelComponent — criteriaSet=decision: State structurally absent (delete-decision batch op)', () => {
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let component: InstanceFilterPanelComponent;

  beforeEach(async () => {
    initTestEnvironment();

    const cockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
    } as any;
    const decisionService = {
      getDecisionDefinitions: vi.fn().mockReturnValue(of([])),
    } as any;

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CockpitService, useValue: cockpitService },
        { provide: DecisionService, useValue: decisionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;
    component.criteriaSet = 'decision';
    // lockedState intentionally null — as in the wizard's decision panel binding
    component.lockedState = null;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {} };

    fixture.detectChanges();
  });

  it('State option is absent from Add criteria when criteriaSet=decision (even with lockedState=null)', () => {
    // For delete-decision, the wizard passes criteriaSet='decision' without lockedState.
    // State must be absent because the decision criteria set simply has no State criterion —
    // not because of the lockedState mechanism. This test confirms the structural exclusion.
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    component.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();

    // The emerald State button should not exist in the decision criteria panel
    expect(fixture.debugElement.query(By.css('.criteria-icon-wrap--emerald'))).toBeNull();
  });

  it('Process Definition option is absent from Add criteria when criteriaSet=decision', () => {
    // Only decision-specific criteria appear when criteriaSet='decision':
    // decisionInstanceId, processInstanceId, decisionDefinition, evaluatedAfter, evaluatedBefore
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    component.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();

    // The orange Process Definition button (criteria-icon-wrap--orange) is present in decision
    // mode only for decisionDefinition, not processDefinition — and the dropdown shows exactly
    // the decision criteria set (5 buttons: decisionInstanceId, processInstanceId,
    // decisionDefinition, evaluatedAfter, evaluatedBefore)
    const options = fixture.debugElement.queryAll(By.css('.criteria-option'));
    expect(options.length).toBe(5);
    // State (emerald) is absent
    expect(fixture.debugElement.query(By.css('.criteria-icon-wrap--emerald'))).toBeNull();
  });
});

describe('InstanceFilterPanelComponent — Process Definition version filter', () => {
  const fakeDefs = [
    { id: 'pd-a-v2', key: 'proc-a', name: 'Process A', version: 2 },
    { id: 'pd-a-v1', key: 'proc-a', name: 'Process A', version: 1 },
    { id: 'pd-b-v1', key: 'proc-b', name: 'Process B', version: 1 },
  ];

  async function createWithDefs(defs: typeof fakeDefs) {
    initTestEnvironment();

    const cockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of(defs)),
    } as any;

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CockpitService, useValue: cockpitService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    const component = fixture.componentInstance;
    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {} };
    fixture.detectChanges();
    return { fixture, component };
  }

  it('groups definitions by key, sorts versions descending and marks the highest as latest', async () => {
    const { component } = await createWithDefs(fakeDefs);

    expect(component.availableProcessDefinitionGroups.length).toBe(2);
    const groupA = component.availableProcessDefinitionGroups.find(g => g.key === 'proc-a')!;
    expect(groupA.versions.length).toBe(2);
    expect(groupA.versions[0].version).toBe(2);
    expect(groupA.versions[0].isLatest).toBe(true);
    expect(groupA.versions[1].version).toBe(1);
    expect(groupA.versions[1].isLatest).toBe(false);
  });

  it('selecting a group by key clears any pre-existing version IDs for that group', async () => {
    const { component } = await createWithDefs(fakeDefs);

    component.pendingProcessDefinitionIds = ['pd-a-v1'];
    component.toggleProcessDefinitionKey('proc-a');

    expect(component.pendingProcessDefinitionKeys).toContain('proc-a');
    expect(component.pendingProcessDefinitionIds).not.toContain('pd-a-v1');
  });

  it('selecting a specific version removes the group key and adds the version ID', async () => {
    const { component } = await createWithDefs(fakeDefs);

    component.pendingProcessDefinitionKeys = ['proc-a'];
    component.toggleProcessDefinitionVersion('proc-a', 'pd-a-v1');

    expect(component.pendingProcessDefinitionKeys).not.toContain('proc-a');
    expect(component.pendingProcessDefinitionIds).toContain('pd-a-v1');
  });

  it('single-version process confirmed by key produces values[] with no processDefinitionIds', async () => {
    const { component } = await createWithDefs(fakeDefs);

    component.activeEditorType = 'processDefinition';
    component.pendingProcessDefinitionKeys = ['proc-b'];
    component.pendingProcessDefinitionIds = [];
    component.confirmCriterion();

    expect(component.activePills.length).toBe(1);
    const pill = component.activePills[0];
    expect(pill.values).toEqual(['proc-b']);
    expect((pill as any).processDefinitionIds).toBeUndefined();
  });

  it('selecting only one version of a multi-version process → emit fires with processDefinitionIds (not KeyIn)', async () => {
    const { component } = await createWithDefs(fakeDefs);
    const emitted: any[] = [];
    component.criteriaChange.subscribe((e: any) => emitted.push(e));

    // Open the processDefinition editor
    component.activeEditorType = 'processDefinition';
    // Click only pd-a-v2 (proc-a has 2 versions — no promote-to-key should happen)
    component.toggleProcessDefinitionVersion('proc-a', 'pd-a-v2');

    // Data structure: ID added, key NOT added
    expect(component.pendingProcessDefinitionIds).toContain('pd-a-v2');
    expect(component.pendingProcessDefinitionKeys).not.toContain('proc-a');

    component.confirmCriterion();

    // criteriaChange should have fired exactly once
    expect(emitted.length).toBe(1);
    const criteria: any[] = emitted[0].criteria;
    expect(criteria.length).toBe(1);
    const pill = criteria[0];
    expect(pill.field).toBe('processDefinition');
    expect(pill.values).toEqual([]);
    expect(pill.processDefinitionIds).toEqual(['pd-a-v2']);
  });

  it('selecting all versions of a multi-version process one-by-one promotes to key level', async () => {
    const { component } = await createWithDefs(fakeDefs);

    // proc-a has pd-a-v2 (v2) and pd-a-v1 (v1)
    component.toggleProcessDefinitionVersion('proc-a', 'pd-a-v2');
    expect(component.pendingProcessDefinitionIds).toContain('pd-a-v2');
    expect(component.pendingProcessDefinitionKeys).not.toContain('proc-a');

    // Selecting the second (and last) version triggers promotion
    component.toggleProcessDefinitionVersion('proc-a', 'pd-a-v1');
    expect(component.pendingProcessDefinitionIds).not.toContain('pd-a-v2');
    expect(component.pendingProcessDefinitionIds).not.toContain('pd-a-v1');
    expect(component.pendingProcessDefinitionKeys).toContain('proc-a');
  });

  it('isProcessGroupSelected returns true when only one version is selected (partial) — R3 parity', async () => {
    const { component } = await createWithDefs(fakeDefs);
    const groupA = component.availableProcessDefinitionGroups.find(g => g.key === 'proc-a')!;

    // proc-a has 2 versions — selecting only one is a partial selection
    component.toggleProcessDefinitionVersion('proc-a', 'pd-a-v2');

    expect(component.isProcessGroupSelected(groupA)).toBe(true);
  });

  it('isProcessGroupSelected returns true when whole group is selected by key — non-regression', async () => {
    const { component } = await createWithDefs(fakeDefs);
    const groupA = component.availableProcessDefinitionGroups.find(g => g.key === 'proc-a')!;

    component.toggleProcessDefinitionKey('proc-a');

    expect(component.isProcessGroupSelected(groupA)).toBe(true);
  });

  it('isProcessGroupSelected returns false when nothing is selected for a group', async () => {
    const { component } = await createWithDefs(fakeDefs);
    const groupA = component.availableProcessDefinitionGroups.find(g => g.key === 'proc-a')!;

    expect(component.isProcessGroupSelected(groupA)).toBe(false);
  });
});

// ─── Finished-date criteria: menu visibility ────────────────────────────────

describe('InstanceFilterPanelComponent — Finished-date criteria hidden for in-progress locked scope', () => {
  async function createWithLockedState(lockedState: string | null): Promise<ComponentFixture<InstanceFilterPanelComponent>> {
    initTestEnvironment();

    const cockpitService = { getProcessDefinitions: vi.fn().mockReturnValue(of([])) } as any;

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CockpitService, useValue: cockpitService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    fixture.componentInstance.lockedState = lockedState;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {} };

    fixture.detectChanges();
    return fixture;
  }

  it('hides finishedAfter / finishedBefore when lockedState is "active" (Suspend)', async () => {
    const fixture = await createWithLockedState('active');
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    fixture.componentInstance.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.criteria-icon-wrap--slate')).length).toBe(0);
  });

  it('hides finishedAfter / finishedBefore when lockedState is "suspended" (Activate)', async () => {
    const fixture = await createWithLockedState('suspended');
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    fixture.componentInstance.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.criteria-icon-wrap--slate')).length).toBe(0);
  });

  it('hides finishedAfter / finishedBefore when lockedState is "unfinished" (Delete Running / Set Retries / Set Variables)', async () => {
    const fixture = await createWithLockedState('unfinished');
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    fixture.componentInstance.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.criteria-icon-wrap--slate')).length).toBe(0);
  });

  it('shows finishedAfter and finishedBefore when lockedState is "finished" (Delete Finished)', async () => {
    const fixture = await createWithLockedState('finished');
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    fixture.componentInstance.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.criteria-icon-wrap--slate')).length).toBe(2);
  });

  it('shows finishedAfter and finishedBefore when lockedState is null (free search)', async () => {
    const fixture = await createWithLockedState(null);
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as Event;
    fixture.componentInstance.toggleCriteriaDropdown(fakeEvent);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.criteria-icon-wrap--slate')).length).toBe(2);
  });
});

// ─── Finished-date pills: stripped on restore for in-progress locked scope ──

describe('InstanceFilterPanelComponent — ngOnInit strips finished-date pills for in-progress locked scope', () => {
  async function createWithPillsAndLockedState(
    pills: { field: string; values: string[] }[],
    lockedState: string | null
  ): Promise<InstanceFilterPanelComponent> {
    initTestEnvironment();

    const cockpitService = { getProcessDefinitions: vi.fn().mockReturnValue(of([])) } as any;

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CockpitService, useValue: cockpitService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    const component = fixture.componentInstance;
    component.initialPills = pills as any;
    component.lockedState = lockedState;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {} };

    fixture.detectChanges();
    return component;
  }

  it('strips finishedAfter pill when lockedState is "active"', async () => {
    const component = await createWithPillsAndLockedState(
      [{ field: 'finishedAfter', values: ['2024-01-01T00:00:00.000+0100'] }],
      'active'
    );
    expect(component.activePills).toHaveLength(0);
  });

  it('strips finishedBefore pill when lockedState is "suspended"', async () => {
    const component = await createWithPillsAndLockedState(
      [{ field: 'finishedBefore', values: ['2024-12-31T23:59:59.000+0100'] }],
      'suspended'
    );
    expect(component.activePills).toHaveLength(0);
  });

  it('strips both finished-date pills but keeps others when lockedState is "unfinished"', async () => {
    const component = await createWithPillsAndLockedState(
      [
        { field: 'businessKey', values: ['ORDER-1'] },
        { field: 'finishedAfter', values: ['2024-01-01T00:00:00.000+0100'] },
        { field: 'finishedBefore', values: ['2024-12-31T23:59:59.000+0100'] },
      ],
      'unfinished'
    );
    expect(component.activePills).toHaveLength(1);
    expect(component.activePills[0].field).toBe('businessKey');
  });

  it('keeps finished-date pills when lockedState is "finished" (Delete Finished)', async () => {
    const component = await createWithPillsAndLockedState(
      [
        { field: 'finishedAfter', values: ['2024-01-01T00:00:00.000+0100'] },
        { field: 'finishedBefore', values: ['2024-12-31T23:59:59.000+0100'] },
      ],
      'finished'
    );
    expect(component.activePills).toHaveLength(2);
    expect(component.activePills.map(p => p.field)).toEqual(['finishedAfter', 'finishedBefore']);
  });

  it('keeps finished-date pills when lockedState is null (free search)', async () => {
    const component = await createWithPillsAndLockedState(
      [{ field: 'finishedAfter', values: ['2024-01-01T00:00:00.000+0100'] }],
      null
    );
    expect(component.activePills).toHaveLength(1);
    expect(component.activePills[0].field).toBe('finishedAfter');
  });
});
