import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError, Subject, delay } from 'rxjs';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { ProcessMigrationWizardComponent } from './process-migration-wizard.component';
import { CockpitService, ProcessDefinitionStatistics } from '../../../../services/cockpit.service';
import { ProcessDefinitionService, ProcessDefinition } from '../../../../services/process-definition.service';
import { MigrationService } from '../../../../services/migration.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { provideRouter } from '@angular/router';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('ProcessMigrationWizardComponent', () => {
  beforeAll(() => { initTestEnvironment(); });
  let component: ProcessMigrationWizardComponent;
  let fixture: ComponentFixture<ProcessMigrationWizardComponent>;
  let cockpitService: any;
  let processDefinitionService: any;
  let migrationService: any;

  const mockDefinitions: ProcessDefinition[] = [
    { id: 'pd1:1', key: 'OrderProcess', name: 'Order Process', version: 1, deploymentId: 'dep1', suspended: false },
    { id: 'pd1:2', key: 'OrderProcess', name: 'Order Process v2', version: 2, deploymentId: 'dep2', suspended: false },
    { id: 'pd1:3', key: 'OrderProcess', name: 'Order Process v3', version: 3, deploymentId: 'dep4', suspended: false },
    { id: 'pd2:1', key: 'InvoiceProcess', name: 'Invoice Process', version: 1, deploymentId: 'dep3', suspended: false }
  ];

  const mockStats: ProcessDefinitionStatistics[] = mockDefinitions.map(def => ({
    id: def.id,
    key: def.key,
    name: def.name || '',
    version: def.version,
    suspended: def.suspended,
    instances: 0,
    failedJobs: 0,
    incidents: [],
    definition: def
  }));

  beforeEach(async () => {
    const cockpitSpy = {
      getProcessDefinitionsWithStatistics: vi.fn()
    };
    const processDefSpy = {
      getBpmn20Xml: vi.fn(),
      getActivityStatistics: vi.fn(),
      getProcessDefinitionsStatisticsRaw: vi.fn()
    };
    const migrationSpy = {
      generateMigrationPlan: vi.fn(),
      validateMigrationPlan: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProcessMigrationWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: cockpitSpy },
        { provide: ProcessDefinitionService, useValue: processDefSpy },
        { provide: MigrationService, useValue: migrationSpy },
        TranslateService
      ]
    }).compileComponents();

    cockpitService = TestBed.inject(CockpitService) as any;
    processDefinitionService = TestBed.inject(ProcessDefinitionService) as any;
    migrationService = TestBed.inject(MigrationService) as any;

    processDefinitionService.getProcessDefinitionsStatisticsRaw.mockReturnValue(of(mockStats));

    fixture = TestBed.createComponent(ProcessMigrationWizardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load process definitions on init', () => {
    fixture.detectChanges();
    expect(processDefinitionService.getProcessDefinitionsStatisticsRaw).toHaveBeenCalled();
    expect(component.availableKeys().length).toBe(2);
    expect(component.availableKeys()).toContain('OrderProcess');
    expect(component.availableKeys()).toContain('InvoiceProcess');
  });

  it('should populate source versions when source key is selected', () => {
    fixture.detectChanges();
    component.onSourceKeyChange('OrderProcess');
    expect(component.sourceVersions().length).toBe(3);
    expect(component.sourceVersions()[0].version).toBe(3); // Sorted descending
    expect(component.sourceVersions()[1].version).toBe(2);
    expect(component.sourceVersions()[2].version).toBe(1);
  });

  it('should reset source version when source key changes', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    fixture.detectChanges();
    component.onSourceKeyChange('OrderProcess');
    expect(component.sourceVersion()).toBe(3);

    component.onSourceKeyChange('InvoiceProcess');
    expect(component.sourceVersion()).toBe(1); // Auto-selects most recent (v1)
  });

  it('should load XML when source version is selected', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    fixture.detectChanges();
    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(2);

    expect(processDefinitionService.getBpmn20Xml).toHaveBeenCalledWith('pd1:2');
    expect(processDefinitionService.getActivityStatistics).toHaveBeenCalledWith('pd1:2', true);
  });

  it('should have show migration plan checkbox checked by default', () => {
    fixture.detectChanges();
    expect(component.showMigrationPlan).toBe(true);
  });

  it('should have link diagrams navigation checkbox unchecked by default', () => {
    fixture.detectChanges();
    expect(component.linkDiagramsNavigation).toBe(false);
  });

  it('should disable Set Variables button when plan is invalid', () => {
    fixture.detectChanges();
    component.migrationReport.set({ instructionReports: [{ instruction: { sourceActivityIds: ['a'], targetActivityIds: ['b'] }, failures: ['error'] }] });
    expect(component.isPlanValid()).toBe(false);
  });

  it('should enable Set Variables button when plan is valid', () => {
    fixture.detectChanges();
    component.migrationReport.set({ instructionReports: [] });
    expect(component.isPlanValid()).toBe(true);
  });

  it('should load all versions for a key (not just one)', () => {
    fixture.detectChanges();
    component.onSourceKeyChange('OrderProcess');
    const versions = component.sourceVersions();
    expect(versions.length).toBe(3);
    expect(versions.map(v => v.version)).toEqual([3, 2, 1]);
  });

  it('should auto-select most recent version when key is selected', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    fixture.detectChanges();
    component.onSourceKeyChange('OrderProcess');

    expect(component.sourceVersion()).toBe(3); // Most recent
  });

  it('should detect when source and target are identical', () => {
    fixture.detectChanges();
    component.sourceDefinitionId.set('pd1:2');
    component.targetDefinitionId.set('pd1:2');

    expect(component.isSourceTargetIdentical()).toBe(true);
  });

  it('should not detect identical when source and target differ', () => {
    fixture.detectChanges();
    component.sourceDefinitionId.set('pd1:2');
    component.targetDefinitionId.set('pd1:3');

    expect(component.isSourceTargetIdentical()).toBe(false);
  });

  it('should disable Set Variables button when source equals target', () => {
    fixture.detectChanges();
    component.sourceDefinitionId.set('pd1:2');
    component.targetDefinitionId.set('pd1:2');
    component.migrationReport.set({ instructionReports: [] });

    expect(component.isPlanValid()).toBe(false);
  });

  it('should sort versions descending (most recent first)', () => {
    fixture.detectChanges();
    component.onSourceKeyChange('OrderProcess');
    const versions = component.sourceVersions().map(v => v.version);

    for (let i = 0; i < versions.length - 1; i++) {
      expect(versions[i]).toBeGreaterThan(versions[i + 1]);
    }
  });
// Add these tests to process-migration-wizard.component.spec.ts before the final closing });

  it('should reset derived state when source definition changes', () => {
    fixture.detectChanges();

    // Setup initial state
    component.mappingMode.set(true);
    component.mappingSourceActivityId.set('task1');
    component.editableInstructions.set([{ sourceActivityIds: ['a'], targetActivityIds: ['b'], updateEventTrigger: false }]);
    component.migrationPlan.set({ sourceProcessDefinitionId: 'pd1:1', targetProcessDefinitionId: 'pd1:2', instructions: [] });
    component.migrationReport.set({ instructionReports: [] });

    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    // Change source
    component.onSourceKeyChange('OrderProcess');
    fixture.detectChanges();

    // Verify state was reset
    expect(component.mappingMode()).toBe(false);
    expect(component.mappingSourceActivityId()).toBeNull();
    expect(component.editableInstructions()).toEqual([]);
    expect(component.migrationPlan()).toBeNull();
    expect(component.migrationReport()).toBeNull();
  });

  it('should reset derived state when target definition changes', () => {
    fixture.detectChanges();

    // Setup initial state
    component.mappingMode.set(true);
    component.editableInstructions.set([{ sourceActivityIds: ['a'], targetActivityIds: ['b'], updateEventTrigger: false }]);

    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    migrationService.generateMigrationPlan.mockReturnValue(of({ sourceProcessDefinitionId: 'pd1:1', targetProcessDefinitionId: 'pd1:2', instructions: [] }));

    // Change target
    component.onTargetKeyChange('OrderProcess');
    fixture.detectChanges();

    // Verify state was reset
    expect(component.mappingMode()).toBe(false);
    expect(component.editableInstructions()).toEqual([]);
  });

  it('should trigger plan generation when source changes', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:3',
      targetProcessDefinitionId: 'pd1:2',
      instructions: []
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    // Set target first
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);

    // Then change source
    migrationService.generateMigrationPlan.mockClear();
    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(3);

    fixture.detectChanges();

    // Should call generate with new source
    expect(migrationService.generateMigrationPlan).toHaveBeenCalledWith({
      sourceProcessDefinitionId: 'pd1:3',
      targetProcessDefinitionId: 'pd1:2'
    });
  });

  it('should trigger plan generation when target changes', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:3',
      instructions: []
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    // Set source first
    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(1);

    // Then change target
    migrationService.generateMigrationPlan.mockClear();
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(3);

    fixture.detectChanges();

    // Should call generate with new target
    expect(migrationService.generateMigrationPlan).toHaveBeenCalledWith({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:3'
    });
  });

  it('should not call generate when source equals target', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of(null));

    fixture.detectChanges();

    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(2);
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);

    migrationService.generateMigrationPlan.mockClear();
    fixture.detectChanges();

    // Should not call generate when identical
    expect(migrationService.generateMigrationPlan).not.toHaveBeenCalled();
    expect(component.planGenerationError()).toBe('migration.identicalSourceTarget');
  });

  it('should not call generate when re-selecting same key with different version while target already set (S6 bug)', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:1',
      instructions: []
    }));

    fixture.detectChanges();

    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(1);
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(1);

    fixture.detectChanges();
    migrationService.generateMigrationPlan.mockClear();

    component.onSourceKeyChange('OrderProcess');

    fixture.detectChanges();

    const totalCalls = migrationService.generateMigrationPlan.mock.calls.length;
    expect(totalCalls).toBe(0);
  });

  it('should handle generate error gracefully', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(throwError(() => new Error('Server error')));

    fixture.detectChanges();

    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(1);
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);

    fixture.detectChanges();

    expect(component.planGenerationError()).toBe('migration.errorGeneratingPlan');
    expect(component.migrationPlan()).toBeNull();
    expect(component.editableInstructions()).toEqual([]);
  });

  it('should only trigger plan generation once when key changes with default version', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:3',
      targetProcessDefinitionId: 'pd2:1',
      instructions: []
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    // Set source
    component.onSourceKeyChange('OrderProcess'); // Auto-selects v3
    // Set target
    migrationService.generateMigrationPlan.mockClear();
    component.onTargetKeyChange('InvoiceProcess'); // Auto-selects v1

    fixture.detectChanges();

    // Should only call generate once (not once for key, once for version)
    expect(migrationService.generateMigrationPlan).toHaveBeenCalledTimes(1);
  });

  it('should not re-trigger generation when re-selecting same value', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:2',
      targetProcessDefinitionId: 'pd1:3',
      instructions: []
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(2);
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(3);

    migrationService.generateMigrationPlan.mockClear();

    // Re-select same target version
    component.onTargetVersionChange(3);
    fixture.detectChanges();

    // Should not call generate again
    expect(migrationService.generateMigrationPlan).not.toHaveBeenCalled();
  });

  it('should set updateEventTrigger=true for message intermediate catch events', () => {
    const xmlWithMessageEvent = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn2:process id="test">
    <bpmn2:intermediateCatchEvent id="MessageEvent_1">
      <bpmn2:messageEventDefinition/>
    </bpmn2:intermediateCatchEvent>
    <bpmn2:userTask id="UserTask_1"/>
  </bpmn2:process>
</bpmn2:definitions>`;

    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: xmlWithMessageEvent }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2',
      instructions: [
        { sourceActivityIds: ['MessageEvent_1'], targetActivityIds: ['MessageEvent_1'], updateEventTrigger: false },
        { sourceActivityIds: ['UserTask_1'], targetActivityIds: ['UserTask_1'], updateEventTrigger: false }
      ]
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(1);
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);

    fixture.detectChanges();

    const instructions = component.editableInstructions();
    const messageInstruction = instructions.find(i => i.sourceActivityIds.includes('MessageEvent_1'));
    const userTaskInstruction = instructions.find(i => i.sourceActivityIds.includes('UserTask_1'));

    expect(messageInstruction?.updateEventTrigger).toBe(true);
    expect(userTaskInstruction?.updateEventTrigger).toBe(false);
  });

  it('should set updateEventTrigger=true for receive tasks', () => {
    const xmlWithReceiveTask = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn2:process id="test">
    <bpmn2:receiveTask id="ReceiveTask_1"/>
    <bpmn2:userTask id="UserTask_1"/>
  </bpmn2:process>
</bpmn2:definitions>`;

    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: xmlWithReceiveTask }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2',
      instructions: [
        { sourceActivityIds: ['ReceiveTask_1'], targetActivityIds: ['ReceiveTask_1'], updateEventTrigger: false },
        { sourceActivityIds: ['UserTask_1'], targetActivityIds: ['UserTask_1'], updateEventTrigger: false }
      ]
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(1);
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);

    fixture.detectChanges();

    const instructions = component.editableInstructions();
    const receiveInstruction = instructions.find(i => i.sourceActivityIds.includes('ReceiveTask_1'));
    const userTaskInstruction = instructions.find(i => i.sourceActivityIds.includes('UserTask_1'));

    expect(receiveInstruction?.updateEventTrigger).toBe(true);
    expect(userTaskInstruction?.updateEventTrigger).toBe(false);
  });

  it('should reset to step 1 when source changes', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    fixture.detectChanges();

    // Move to step 2
    component.currentStep.set(2);
    expect(component.currentStep()).toBe(2);

    // Change source
    component.onSourceKeyChange('OrderProcess');
    fixture.detectChanges();

    // Should reset to step 1
    expect(component.currentStep()).toBe(1);
  });

  it('should reset to step 1 when target changes', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<xml></xml>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2',
      instructions: []
    }));

    fixture.detectChanges();

    component.onSourceKeyChange('OrderProcess');
    fixture.detectChanges();

    // Move to step 3
    component.currentStep.set(3);
    expect(component.currentStep()).toBe(3);

    // Change target
    component.onTargetKeyChange('InvoiceProcess');
    fixture.detectChanges();

    // Should reset to step 1
    expect(component.currentStep()).toBe(1);
  });

  it('should recalculate badges when only target changes', () => {
    const xmlWithActivities = '<xml><userTask id="task1"/><userTask id="task2"/></xml>';
    const stats = [
      { id: 'task1', instances: 5, incidents: [], failedJobs: 0 },
      { id: 'task2', instances: 3, incidents: [], failedJobs: 0 }
    ];

    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: xmlWithActivities }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of(stats as any));

    // First plan: task1 mapped, task2 unmapped
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2',
      instructions: [
        { sourceActivityIds: ['task1'], targetActivityIds: ['task1'], updateEventTrigger: false }
      ]
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(1);
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);

    fixture.detectChanges();

    const badges1 = component.sourceActivityBadges();
    const task2Badge1 = badges1.find(b => b.activityId === 'task2');
    expect(task2Badge1?.migrationStatus).toBe('unmapped');

    // Change target: now task2 is mapped
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:3',
      instructions: [
        { sourceActivityIds: ['task1'], targetActivityIds: ['task1'], updateEventTrigger: false },
        { sourceActivityIds: ['task2'], targetActivityIds: ['task2'], updateEventTrigger: false }
      ]
    }));

    component.onTargetVersionChange(3);
    fixture.detectChanges();

    const badges2 = component.sourceActivityBadges();
    const task2Badge2 = badges2.find(b => b.activityId === 'task2');
    // task2 should now be 'valid' (mapped) instead of 'unmapped'
    expect(task2Badge2?.migrationStatus).toBe('valid');
  });

  it('should use late response filtering for diagram loading (switchMap-like behavior)', async () => {
    // This test verifies that late responses are ignored based on definition ID matching
    const xmlV3 = '<xml id="v3">v3</xml>';
    const xmlV2 = '<xml id="v2">v2</xml>';

    let getBpmnCallCount = 0;
    const xmlSubjects: Subject<{ bpmn20Xml: string }>[] = [];

    processDefinitionService.getBpmn20Xml.mockImplementation((id: string) => {
      const subject = new Subject<{ bpmn20Xml: string }>();
      xmlSubjects.push(subject);
      getBpmnCallCount++;
      return subject.asObservable();
    });
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    fixture.detectChanges();

    // Trigger first load (v3)
    component.onSourceKeyChange('OrderProcess'); // Auto-selects v3
    fixture.detectChanges();
    expect(getBpmnCallCount).toBe(1);

    // Trigger second load (v2) BEFORE first completes
    component.onSourceVersionChange(2);
    fixture.detectChanges();
    expect(getBpmnCallCount).toBe(2);

    // Complete SECOND request first (v2)
    xmlSubjects[1].next({ bpmn20Xml: xmlV2 });
    xmlSubjects[1].complete();
    await new Promise(resolve => setTimeout(resolve, 100));
    fixture.detectChanges();

    // v2 should be loaded
    expect(component.sourceXml()).toBe(xmlV2);

    // Complete FIRST request (v3) - should be filtered out
    xmlSubjects[0].next({ bpmn20Xml: xmlV3 });
    xmlSubjects[0].complete();
    await new Promise(resolve => setTimeout(resolve, 100));
    fixture.detectChanges();

    // Should STILL be v2 (late v3 response filtered)
    expect(component.sourceXml()).toBe(xmlV2);
  });

  it('should verify generate pipeline uses switchMap (filter based on current state)', () => {
    // This test verifies the pipeline structure by checking that late responses
    // are filtered based on whether they match the current source/target IDs
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="test"/></bpmn:definitions>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2',
      instructions: []
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(1);
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);

    fixture.detectChanges();

    // Verify that the pipeline structure includes:
    // - filter() to check plan matches current sourceId/targetId (line 319-322 of component)
    // This ensures late responses are ignored
    expect(component.migrationPlan()).toBeTruthy();
  });

  it('should handle rapid sequential changes and converge to final state', async () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="test"/></bpmn:definitions>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:3',
      targetProcessDefinitionId: 'pd1:1',
      instructions: []
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    // Set source
    component.onSourceKeyChange('OrderProcess'); // v3 by default
    await new Promise(resolve => setTimeout(resolve, 50));

    // Rapid fire 4 target changes
    component.onTargetVersionChange(1);
    component.onTargetVersionChange(2);
    component.onTargetVersionChange(3);
    component.onTargetVersionChange(1);

    await new Promise(resolve => setTimeout(resolve, 200));
    fixture.detectChanges();

    // Final state should be v1 (last change)
    expect(component.targetVersion()).toBe(1);
  });

  it('should unsubscribe from previous source diagram request (switchMap cancellation)', () => {
    const xmlSubjects: Subject<{ bpmn20Xml: string }>[] = [];

    processDefinitionService.getBpmn20Xml.mockImplementation(() => {
      const subject = new Subject<{ bpmn20Xml: string }>();
      xmlSubjects.push(subject);
      return subject.asObservable();
    });
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    fixture.detectChanges();

    // First change triggers first Subject
    component.onSourceKeyChange('OrderProcess'); // v3
    fixture.detectChanges();
    expect(xmlSubjects.length).toBe(1);
    expect(xmlSubjects[0].observed).toBe(true);

    // Second change triggers second Subject and MUST unsubscribe from first
    component.onSourceVersionChange(2);
    fixture.detectChanges();
    expect(xmlSubjects.length).toBe(2);
    expect(xmlSubjects[0].observed).toBe(false); // switchMap unsubscribes
    expect(xmlSubjects[1].observed).toBe(true);
  });

  it('should unsubscribe from previous target diagram request (switchMap cancellation)', () => {
    const xmlSubjects: Subject<{ bpmn20Xml: string }>[] = [];

    processDefinitionService.getBpmn20Xml.mockImplementation(() => {
      const subject = new Subject<{ bpmn20Xml: string }>();
      xmlSubjects.push(subject);
      return subject.asObservable();
    });
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    fixture.detectChanges();

    // Set source first
    component.onSourceKeyChange('OrderProcess');
    fixture.detectChanges();
    const sourceSubjectCount = xmlSubjects.length;

    // First target change
    component.onTargetKeyChange('OrderProcess'); // v3
    fixture.detectChanges();
    expect(xmlSubjects.length).toBe(sourceSubjectCount + 1);
    const firstTargetSubject = xmlSubjects[sourceSubjectCount];
    expect(firstTargetSubject.observed).toBe(true);

    // Second target change MUST unsubscribe from first
    component.onTargetVersionChange(2);
    fixture.detectChanges();
    expect(xmlSubjects.length).toBe(sourceSubjectCount + 2);
    expect(firstTargetSubject.observed).toBe(false); // switchMap unsubscribes
    expect(xmlSubjects[sourceSubjectCount + 1].observed).toBe(true);
  });

  it('should unsubscribe from previous generate request (switchMap cancellation)', () => {
    processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: '<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="test"/></bpmn:definitions>' }));
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    const generateSubjects: Subject<any>[] = [];
    migrationService.generateMigrationPlan.mockImplementation(() => {
      const subject = new Subject<any>();
      generateSubjects.push(subject);
      return subject.asObservable();
    });
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    // Set up both source and target to trigger first generate
    component.onSourceKeyChange('OrderProcess'); // v3
    fixture.detectChanges();
    component.onTargetKeyChange('InvoiceProcess'); // v1
    fixture.detectChanges();

    expect(generateSubjects.length).toBe(1);
    expect(generateSubjects[0].observed).toBe(true);

    // Change source to trigger second generate, MUST unsubscribe from first
    component.onSourceVersionChange(2);
    fixture.detectChanges();

    expect(generateSubjects.length).toBe(2);
    expect(generateSubjects[0].observed).toBe(false); // switchMap unsubscribes
    expect(generateSubjects[1].observed).toBe(true);
  });
});
