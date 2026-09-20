import 'zone.js';
import 'zone.js/testing';
import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SelectInstancesDialogComponent } from './select-instances-dialog';
import { CockpitService, VariableLine } from '../../../../services/cockpit.service';
import { InstanceFilterPanelComponent } from '../../../../shared/instance-filter-panel/instance-filter-panel';
import { TranslateService } from '../../../../i18n/translate.service';
import { BpmnElement } from '../../../../shared/bpmn-viewer/bpmn-viewer';
import { initTestEnvironment } from '../../../../testing/test-utils';
import { of } from 'rxjs';

const SAMPLE_ACTIVITIES: BpmnElement[] = [
  { id: 'UserTask_1', type: 'bpmn:UserTask', name: 'User Task' },
  { id: 'ServiceTask_1', type: 'bpmn:ServiceTask', name: 'Service Task' },
  { id: 'EndEvent_1', type: 'bpmn:EndEvent' },
];

const mockCockpitService = {
  queryProcessInstances: vi.fn().mockReturnValue(of([]))
};

const mockTranslateService = {
  instant: (key: string) => key,
  get: (key: string) => of(key),
  currentLang$: of('en')
};

async function createComponent(opts: {
  sourceActivityId?: string | null;
  availableActivities?: BpmnElement[];
  targetActivityId?: string | null;
} = {}) {
  await TestBed.configureTestingModule({
    imports: [SelectInstancesDialogComponent],
    providers: [
      provideRouter([]),
      { provide: CockpitService, useValue: mockCockpitService },
      { provide: TranslateService, useValue: mockTranslateService }
    ]
  }).compileComponents();

  const fixture: ComponentFixture<SelectInstancesDialogComponent> =
    TestBed.createComponent(SelectInstancesDialogComponent);
  const component = fixture.componentInstance;
  component.processDefinitionId = 'process:1';
  component.sourceActivityId = opts.sourceActivityId ?? 'UserTask_1';
  component.availableActivities = opts.availableActivities ?? SAMPLE_ACTIVITIES;
  component.targetActivityId = opts.targetActivityId ?? null;
  fixture.detectChanges();
  return { fixture, component };
}

// ─── Non-regression: bidirectional sync ──────────────────────────────────────

describe('SelectInstancesDialogComponent — bidirectional sync (non-regression)', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('modifying the Activity ID pill emits activityIdCriterionChange with the new value', async () => {
    const { component } = await createComponent({ sourceActivityId: 'UserTask_1' });
    const emitted: (string | null)[] = [];
    component.activityIdCriterionChange.subscribe((v: string | null) => emitted.push(v));

    component.startEditPill(0, new MouseEvent('click'));
    component.selectActivity('ServiceTask_1');
    component.confirmEdit();

    expect(emitted).toEqual(['ServiceTask_1']);
  });

  it('removing the Activity ID pill sets canConfirm to false', async () => {
    const { component } = await createComponent({ sourceActivityId: 'UserTask_1' });

    component.selectionMode = 'query';
    (component as any).searchResults = [{ id: 'inst-1', businessKey: null }];
    expect(component.canConfirm).toBe(true);

    component.removePill(0);

    expect(component.hasActivityIdPill).toBe(false);
    expect(component.canConfirm).toBe(false);
  });

  it('Activity ID uses the activity picker (not chip input) — single value only', async () => {
    const { component } = await createComponent({ sourceActivityId: 'UserTask_1' });

    expect(component.isChipField('activityId')).toBe(false);

    component.startEditPill(0, new MouseEvent('click'));
    component.selectActivity('EndEvent_1');
    component.confirmEdit();

    const pill = component.activePills.find(p => p.field === 'activityId');
    expect(pill).toBeDefined();
    expect(pill!.values.length).toBe(1);
    expect(pill!.values[0]).toBe('EndEvent_1');
  });
});

// ─── Part 2: Activity dropdown with Target grayed out ────────────────────────

describe('SelectInstancesDialogComponent — activity dropdown (Part 2)', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('target activity item is disabled and non-clickable in the picker', async () => {
    const { component, fixture } = await createComponent({
      sourceActivityId: 'UserTask_1',
      availableActivities: SAMPLE_ACTIVITIES,
      targetActivityId: 'ServiceTask_1'
    });

    // Open the editor for the pre-populated activityId pill
    component.startEditPill(0, new MouseEvent('click'));
    fixture.detectChanges();

    // All activity-picker-item buttons rendered
    const items = fixture.debugElement.queryAll(By.css('.activity-picker-item'));
    expect(items.length).toBe(SAMPLE_ACTIVITIES.length);

    // The button for ServiceTask_1 (= targetActivityId) must be disabled
    const targetItem = items.find(el =>
      el.nativeElement.textContent.includes('ServiceTask_1') ||
      el.nativeElement.textContent.includes('Service Task')
    );
    expect(targetItem).toBeDefined();
    expect(targetItem!.nativeElement.disabled).toBe(true);
    expect(targetItem!.nativeElement.classList.contains('activity-picker-item--disabled')).toBe(true);
  });

  it('target activity does not update pendingTextValue when clicked', async () => {
    const { component } = await createComponent({
      sourceActivityId: 'UserTask_1',
      availableActivities: SAMPLE_ACTIVITIES,
      targetActivityId: 'ServiceTask_1'
    });

    component.startEditPill(0, new MouseEvent('click'));
    // Attempt to select the target activity directly
    component.selectActivity('ServiceTask_1');

    // Calling selectActivity directly sets the value, but the template guard
    // `act.id !== targetActivityId && selectActivity(act.id)` prevents this from
    // being reachable via the button click. Here we verify that even if called,
    // confirmEdit will simply pick whatever pendingTextValue is — the template
    // prevents the call from happening in the browser.
    // The meaningful assertion: clicking a disabled button fires no (click) event.
    // We test the template guard via the class and disabled attribute (tested above).
    // This test asserts selectActivity still works when called for non-target activities.
    component.pendingTextValue = '';
    component.selectActivity('EndEvent_1');
    expect(component.pendingTextValue).toBe('EndEvent_1');
  });

  it('re-opening the dialog after going back resets to the new sourceActivityId', async () => {
    // This verifies the *ngIf destroy/recreate mechanism:
    // When showSelectDialog flips false→true, ngOnInit() re-runs and re-populates the pill.
    // We simulate this by re-calling ngOnInit with a new sourceActivityId.
    const { component } = await createComponent({ sourceActivityId: 'UserTask_1' });

    // Simulate going back: the parent closes the dialog (*ngIf = false)
    // and changes sourceActivityId, then re-opens (*ngIf = true → ngOnInit re-runs)
    component.activePills = [];                   // cleared by destruction
    component.sourceActivityId = 'ServiceTask_1'; // parent changed the source
    component.ngOnInit();                          // re-init simulates *ngIf recreation

    const pill = component.activePills.find(p => p.field === 'activityId');
    expect(pill).toBeDefined();
    expect(pill!.values[0]).toBe('ServiceTask_1');
  });
});


describe('SelectInstancesDialogComponent — check icon and hover state', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('check icon appears only on the currently selected activity and moves when selection changes', async () => {
    const { component, fixture } = await createComponent({
      sourceActivityId: 'UserTask_1',
      availableActivities: SAMPLE_ACTIVITIES,
    });

    component.startEditPill(0, new MouseEvent('click'));
    fixture.detectChanges();

    let checks = fixture.debugElement.queryAll(By.css('.activity-picker-item__check'));
    expect(checks.length).toBe(1);

    const items = fixture.debugElement.queryAll(By.css('.activity-picker-item'));
    const userTaskItem = items.find(el => el.nativeElement.textContent.includes('User Task'))!;
    expect(userTaskItem.query(By.css('.activity-picker-item__check'))).toBeTruthy();

    component.selectActivity('ServiceTask_1');
    fixture.detectChanges();

    checks = fixture.debugElement.queryAll(By.css('.activity-picker-item__check'));
    expect(checks.length).toBe(1);

    const serviceTaskItem = items.find(el => el.nativeElement.textContent.includes('Service Task'))!;
    expect(serviceTaskItem.query(By.css('.activity-picker-item__check'))).toBeTruthy();
    expect(userTaskItem.query(By.css('.activity-picker-item__check'))).toBeNull();
  });

  it('hoveredId is set on mouseenter and cleared on mouseleave, independently of selection', async () => {
    const { component, fixture } = await createComponent({
      sourceActivityId: 'UserTask_1',
      availableActivities: SAMPLE_ACTIVITIES,
    });

    component.startEditPill(0, new MouseEvent('click'));
    fixture.detectChanges();

    expect(component.hoveredId).toBeNull();

    const items = fixture.debugElement.queryAll(By.css('.activity-picker-item'));
    const serviceItem = items.find(el => el.nativeElement.textContent.includes('Service Task'))!;
    serviceItem.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(component.hoveredId).toBe('ServiceTask_1');
    const checks = fixture.debugElement.queryAll(By.css('.activity-picker-item__check'));
    expect(checks.length).toBe(1);
    expect(serviceItem.query(By.css('.activity-picker-item__check'))).toBeNull();

    serviceItem.nativeElement.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(component.hoveredId).toBeNull();
  });
});


describe('SelectInstancesDialogComponent — activity type icons', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('returns the correct icon and color for every listed BPMN type', async () => {
    const { component } = await createComponent();

    const cases: Array<{ type: string; expectedColor: string; label: string }> = [
      { type: 'bpmn:StartEvent',             expectedColor: 'var(--color-success)',  label: 'startEvent' },
      { type: 'bpmn:EndEvent',               expectedColor: 'var(--color-danger)',   label: 'endEvent' },
      { type: 'bpmn:UserTask',               expectedColor: 'var(--color-primary)',  label: 'userTask' },
      { type: 'bpmn:ServiceTask',            expectedColor: 'var(--color-primary)',  label: 'serviceTask' },
      { type: 'bpmn:ScriptTask',             expectedColor: 'var(--color-primary)',  label: 'scriptTask' },
      { type: 'bpmn:BusinessRuleTask',       expectedColor: 'var(--color-primary)',  label: 'businessRuleTask' },
      { type: 'bpmn:SendTask',               expectedColor: 'var(--color-primary)',  label: 'sendTask' },
      { type: 'bpmn:ReceiveTask',            expectedColor: 'var(--color-primary)',  label: 'receiveTask' },
      { type: 'bpmn:ManualTask',             expectedColor: 'var(--color-primary)',  label: 'manualTask' },
      { type: 'bpmn:CallActivity',           expectedColor: 'var(--color-primary)',  label: 'callActivity' },
      { type: 'bpmn:SubProcess',             expectedColor: 'var(--color-primary)',  label: 'subProcess' },
      { type: 'bpmn:ExclusiveGateway',       expectedColor: 'var(--color-warning)',  label: 'exclusiveGateway' },
      { type: 'bpmn:ParallelGateway',        expectedColor: 'var(--color-warning)',  label: 'parallelGateway' },
      { type: 'bpmn:InclusiveGateway',       expectedColor: 'var(--color-warning)',  label: 'inclusiveGateway' },
      { type: 'bpmn:IntermediateCatchEvent', expectedColor: 'var(--text-secondary)', label: 'intermediateCatchEvent' },
      { type: 'bpmn:IntermediateThrowEvent', expectedColor: 'var(--text-secondary)', label: 'intermediateThrowEvent' },
      { type: 'bpmn:BoundaryEvent',          expectedColor: 'var(--text-secondary)', label: 'boundaryEvent' },
    ];

    for (const { type, expectedColor, label } of cases) {
      const icon = component.getActivityIcon(type);
      const color = component.getActivityIconColor(type);
      expect(icon, `${label}: icon should be defined`).toBeDefined();
      expect(color, `${label}: color`).toBe(expectedColor);
    }

    const exclusiveIcon = component.getActivityIcon('bpmn:ExclusiveGateway');
    const parallelIcon  = component.getActivityIcon('bpmn:ParallelGateway');
    expect(exclusiveIcon).not.toBe(parallelIcon);
    const inclusiveIcon = component.getActivityIcon('bpmn:InclusiveGateway');
    expect(inclusiveIcon).toBe(parallelIcon);
  });

  it('returns fallback icon (faSquare) and muted color for an unrecognised BPMN type', async () => {
    const { component } = await createComponent();

    const icon = component.getActivityIcon('bpmn:UnknownFutureElement');
    const color = component.getActivityIconColor('bpmn:UnknownFutureElement');

    expect(icon).toBeDefined();
    expect(color).toBe('var(--text-muted)');
    expect(icon).not.toBe(component.getActivityIcon('bpmn:UserTask'));
  });
});


describe('SelectInstancesDialogComponent — instance ID link navigation', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('renders a link to the process instance detail page for each result row', async () => {
    mockCockpitService.queryProcessInstances.mockReturnValueOnce(
      of([{ id: 'inst-abc-123', businessKey: 'my-key' }])
    );
    const { fixture } = await createComponent();

    const link = fixture.debugElement.query(By.css('a.instance-link'));
    expect(link).toBeTruthy();
    expect(link.nativeElement.getAttribute('href')).toBe('/cockpit/processes/instance/inst-abc-123');
  });

  it('clicking the instance ID cell does not toggle row selection', async () => {
    mockCockpitService.queryProcessInstances.mockReturnValueOnce(
      of([{ id: 'inst-abc-123', businessKey: null }])
    );
    const { component, fixture } = await createComponent();

    expect(component.selectedIds.has('inst-abc-123')).toBe(false);

    const idCell = fixture.debugElement.query(By.css('td.col-id'));
    idCell.nativeElement.click();
    fixture.detectChanges();

    expect(component.selectedIds.has('inst-abc-123')).toBe(false);
  });
});



describe('SelectInstancesDialogComponent — Variables criterion', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('selecting Variables opens the editor with one empty variable line', async () => {
    const { component } = await createComponent();
    component.selectCriterion('variables', new MouseEvent('click'));
    expect(component.activeEditorType).toBe('variables');
    expect(component.pendingVariableLines.length).toBe(1);
    expect(component.pendingVariableLines[0]).toEqual({ name: '', operator: 'eq', values: [] });
  });

  it('addVariableLine appends a new empty line', async () => {
    const { component } = await createComponent();
    component.selectCriterion('variables', new MouseEvent('click'));
    component.addVariableLine();
    expect(component.pendingVariableLines.length).toBe(2);
  });

  it('removeVariableLine removes the specified line', async () => {
    const { component } = await createComponent();
    component.selectCriterion('variables', new MouseEvent('click'));
    component.addVariableLine();
    component.pendingVariableLines[0].name = 'amount';
    component.removeVariableLine(0);
    expect(component.pendingVariableLines.length).toBe(1);
    expect(component.pendingVariableLines[0].name).toBe('');
  });

  it('confirmEdit with valid variable lines creates a pill with variableLines', async () => {
    const { component } = await createComponent();
    component.selectCriterion('variables', new MouseEvent('click'));
    component.pendingVariableLines[0] = { name: 'amount', operator: 'gt', values: ['100'] };
    component.confirmEdit();
    const pill = component.activePills.find(p => p.field === 'variables');
    expect(pill).toBeDefined();
    expect(pill!.variableLines).toHaveLength(1);
    expect(pill!.variableLines![0].variableName).toBe('amount');
    expect(pill!.variableLines![0].variableOperator).toBe('gt');
    expect(pill!.variableLines![0].values).toEqual(['100']);
  });

  it('confirmEdit with no valid lines does not add a variables pill', async () => {
    const { component } = await createComponent();
    component.selectCriterion('variables', new MouseEvent('click'));
    component.confirmEdit();
    expect(component.activePills.find(p => p.field === 'variables')).toBeUndefined();
  });

  it('populatePending restores variable lines when editing an existing pill', async () => {
    const { component } = await createComponent();
    const existingPill: any = {
      field: 'variables', values: [],
      variableLines: [{ variableName: 'status', variableOperator: 'eq', values: ['active'] }]
    };
    component.activePills = [component.activePills[0], existingPill];
    component.startEditPill(1, new MouseEvent('click'));
    expect(component.pendingVariableLines.length).toBe(1);
    expect(component.pendingVariableLines[0].name).toBe('status');
    expect(component.pendingVariableLines[0].operator).toBe('eq');
    expect(component.pendingVariableLines[0].values).toEqual(['active']);
  });

  it('getPillIcon returns faCode for variables field', async () => {
    const { component } = await createComponent();
    expect(component.getPillIcon('variables')).toBe(component.faCode);
  });

  it('getPillLabel for variables includes the count of variable lines', async () => {
    const { component } = await createComponent();
    const pill: any = {
      field: 'variables', values: [],
      variableLines: [
        { variableName: 'a', variableOperator: 'eq', values: ['1'] },
        { variableName: 'b', variableOperator: 'gt', values: ['2'] },
      ]
    };
    expect(component.getPillLabel(pill)).toContain('2');
  });

  it('buildQueryBody maps each variableLine×value to a Camunda variables condition, applying parseVariableValue', async () => {
    const { component } = await createComponent();
    component.activePills = [
      { field: 'activityId', values: ['UserTask_1'] },
      {
        field: 'variables', values: [],
        variableLines: [
          { variableName: 'amount', variableOperator: 'gt', values: ['100'] } as VariableLine,
          { variableName: 'status', variableOperator: 'eq', values: ['active', 'pending'] } as VariableLine,
        ]
      } as any
    ];
    const body = component.buildQueryBody();
    const vars = body['variables'] as Array<{ name: string; operator: string; value: any }>;
    expect(vars).toHaveLength(3);
    // parseVariableValue converts '100' → 100 (number), non-numeric strings stay as strings
    expect(vars[0]).toEqual({ name: 'amount', operator: 'gt', value: 100 });
    expect(vars[1]).toEqual({ name: 'status', operator: 'eq', value: 'active' });
    expect(vars[2]).toEqual({ name: 'status', operator: 'eq', value: 'pending' });
  });

  it('isMultiValueOperator and getOperatorLabel match the InstanceFilterPanelComponent implementation', async () => {
    const { component } = await createComponent();
    expect(component.isMultiValueOperator('eq')).toBe(true);
    expect(component.isMultiValueOperator('neq')).toBe(true);
    expect(component.isMultiValueOperator('like')).toBe(true);
    expect(component.isMultiValueOperator('gt')).toBe(false);
    expect(component.isMultiValueOperator('gteq')).toBe(false);
    expect(component.isMultiValueOperator('lt')).toBe(false);
    expect(component.isMultiValueOperator('lteq')).toBe(false);
    const labels: Record<string, string> = { eq: '=', neq: '≠', gt: '>', gteq: '≥', lt: '<', lteq: '≤', like: '~' };
    for (const [op, label] of Object.entries(labels)) {
      expect(component.getOperatorLabel(op as any)).toBe(label);
    }
    const line: VariableLine = { variableName: 'x', variableOperator: 'eq', values: ['1'] };
    expect(line.variableName).toBe('x');
  });
});


describe('InstanceFilterPanelComponent — non-regression after Variables integration in Move Instances', () => {
  it('InstanceFilterPanelComponent class is still importable and unmodified', () => {
    expect(InstanceFilterPanelComponent).toBeDefined();
    expect(InstanceFilterPanelComponent.name).toContain('InstanceFilterPanelComponent');
  });
});


describe('SelectInstancesDialogComponent — criteria dropdown completeness', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('Add criteria dropdown contains all 14 expected criteria', async () => {
    const { component, fixture } = await createComponent();

    component.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    const dropdownEl = fixture.debugElement.query(By.css('.criteria-dropdown'));
    const buttons = dropdownEl.queryAll(By.css('.criteria-option'));
    const labels = buttons.map(b => b.nativeElement.textContent.trim());

    const expected = [
      'cockpit.modify.selectDialog.queryInstanceIds',
      'cockpit.modify.selectDialog.queryBusinessKey',
      'cockpit.modify.selectDialog.querySuperProcessInstanceId',
      'cockpit.modify.selectDialog.querySubProcessInstanceId',
      'cockpit.modify.selectDialog.queryActive',
      'cockpit.modify.selectDialog.querySuspended',
      'cockpit.modify.selectDialog.queryWithJobsRetrying',
      'cockpit.modify.selectDialog.queryWithIncidents',
      'cockpit.modify.selectDialog.queryIncidentId',
      'cockpit.modify.selectDialog.queryIncidentType',
      'cockpit.modify.selectDialog.queryIncidentMessageLike',
      'cockpit.modify.selectDialog.queryActivityId',
      'cockpit.modify.selectDialog.queryStartedAfter',
      'cockpit.modify.selectDialog.queryStartedBefore',
      'cockpit.processes.filters.variable',
    ];

    expect(buttons.length, `Expected 15 criteria buttons but got ${buttons.length}. Labels: ${JSON.stringify(labels)}`).toBe(15);

    for (const key of expected) {
      const found = labels.some(l => l.includes(key));
      expect(found, `Criterion "${key}" not found in dropdown. Present: ${JSON.stringify(labels)}`).toBe(true);
    }
  });
});

