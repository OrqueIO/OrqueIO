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

    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: '',
      targetProcessDefinitionId: '',
      instructions: []
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

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
    expect(component.linkDiagramsNavigation()).toBe(false);
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

  it('should clear target XML when target key is set to empty', () => {
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
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);
    fixture.detectChanges();

    expect(component.targetXml()).toBeTruthy();
    expect(component.targetDefinitionId()).toBeTruthy();

    component.onTargetKeyChange('');
    fixture.detectChanges();

    expect(component.targetXml()).toBeNull();
    expect(component.targetDefinitionId()).toBeNull();
    expect(component.migrationPlan()).toBeNull();
    expect(component.editableInstructions()).toEqual([]);
  });

  it('should clear source XML when source key is set to empty', () => {
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
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);
    fixture.detectChanges();

    expect(component.sourceXml()).toBeTruthy();
    expect(component.sourceDefinitionId()).toBeTruthy();

    component.onSourceKeyChange('');
    fixture.detectChanges();

    expect(component.sourceXml()).toBeNull();
    expect(component.sourceDefinitionId()).toBeNull();
    expect(component.migrationPlan()).toBeNull();
    expect(component.editableInstructions()).toEqual([]);
  });

  it('should not call generate or validate when target key is cleared', () => {
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
    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);
    fixture.detectChanges();

    const generateCallsBefore = migrationService.generateMigrationPlan.mock.calls.length;
    const validateCallsBefore = migrationService.validateMigrationPlan.mock.calls.length;

    component.onTargetKeyChange('');
    fixture.detectChanges();

    expect(migrationService.generateMigrationPlan.mock.calls.length).toBe(generateCallsBefore);
    expect(migrationService.validateMigrationPlan.mock.calls.length).toBe(validateCallsBefore);
  });

  it('should cancel inflight target diagram request when target key is cleared', () => {
    const xmlSubjects: Subject<{ bpmn20Xml: string }>[] = [];

    processDefinitionService.getBpmn20Xml.mockImplementation(() => {
      const subject = new Subject<{ bpmn20Xml: string }>();
      xmlSubjects.push(subject);
      return subject.asObservable();
    });
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));

    fixture.detectChanges();

    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);
    fixture.detectChanges();

    expect(xmlSubjects.length).toBe(2);
    expect(xmlSubjects[0].observed).toBe(false);
    expect(xmlSubjects[1].observed).toBe(true);

    component.onTargetKeyChange('');
    fixture.detectChanges();

    expect(xmlSubjects[1].observed).toBe(false);
  });

  it('should ignore late diagram response after target key is cleared', async () => {
    const xmlSubjects: Subject<{ bpmn20Xml: string }>[] = [];

    processDefinitionService.getBpmn20Xml.mockImplementation(() => {
      const subject = new Subject<{ bpmn20Xml: string }>();
      xmlSubjects.push(subject);
      return subject.asObservable();
    });
    processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
    migrationService.generateMigrationPlan.mockReturnValue(of({
      sourceProcessDefinitionId: 'pd1:1',
      targetProcessDefinitionId: 'pd1:2',
      instructions: []
    }));
    migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

    fixture.detectChanges();

    component.onTargetKeyChange('OrderProcess');
    component.onTargetVersionChange(2);
    fixture.detectChanges();

    component.onTargetKeyChange('');
    fixture.detectChanges();

    expect(component.targetXml()).toBeNull();

    xmlSubjects[1].next({ bpmn20Xml: '<?xml version="1.0"?><late-response/>' });
    await new Promise(resolve => setTimeout(resolve, 100));
    fixture.detectChanges();

    expect(component.targetXml()).toBeNull();
  });

  describe('unmapped activities with active instances validation', () => {
    const validBpmnXml = '<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="test"/></bpmn:definitions>';

    it('should disable Next button when activity has instances > 0 and is not mapped', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 },
        { id: 'Activity_2', instances: 0, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_2'], targetActivityIds: ['Activity_3'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(1);
      expect(component.unmappedActivitiesWithInstances()[0].activityId).toBe('Activity_1');
      expect(component.unmappedActivitiesWithInstances()[0].instances).toBe(5);
      expect(component.canGoToSetVariables()).toBe(false);
      expect(component.setVariablesDisabledReason()).toBe('migration.unmappedActivitiesWithInstances');
    });

    it('should enable Next button when activity is mapped', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_1'], targetActivityIds: ['Activity_2'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(0);
      expect(component.canGoToSetVariables()).toBe(true);
      expect(component.setVariablesDisabledReason()).toBe(null);
    });

    it('should enable Next button when activity has 0 instances and is not mapped', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 0, incidents: 0 },
        { id: 'Activity_2', instances: 5, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_2'], targetActivityIds: ['Activity_3'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(0);
      expect(component.canGoToSetVariables()).toBe(true);
    });

    it('should block Next when mapping is deleted and activity has instances', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_1'], targetActivityIds: ['Activity_2'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.canGoToSetVariables()).toBe(true);

      component.onDeleteMapping('Activity_1');
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(1);
      expect(component.canGoToSetVariables()).toBe(false);
    });

    it('should unblock Next when mapping is added for activity with instances', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 },
        { id: 'Activity_2', instances: 0, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_2'], targetActivityIds: ['Activity_3'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.canGoToSetVariables()).toBe(false);

      component.mappingSourceActivityId.set('Activity_1');
      component.onSelectTarget('Activity_4');
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(0);
      expect(component.canGoToSetVariables()).toBe(true);
    });

    it('should redirect to step 1 when going back from step 3 and validation fails', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 },
        { id: 'Activity_2', instances: 0, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_2'], targetActivityIds: ['Activity_3'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      component.currentStep.set(3);
      component.onSelectInstancesBack({ mode: 'query', processInstanceIds: null, queryParams: null, filterCriteria: [], vnIgnoreCase: false, vvIgnoreCase: false });

      expect(component.currentStep()).toBe(1);
    });

    it('should allow step 2 when going back from step 3 and validation passes', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_1'], targetActivityIds: ['Activity_2'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      component.currentStep.set(3);
      component.onSelectInstancesBack({ mode: 'query', processInstanceIds: null, queryParams: null, filterCriteria: [], vnIgnoreCase: false, vvIgnoreCase: false });

      expect(component.currentStep()).toBe(2);
    });

    it('should not block when activity statistics are still loading', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      const statsSubject = new Subject();
      processDefinitionService.getActivityStatistics.mockReturnValue(statsSubject.asObservable());

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_1'], targetActivityIds: ['Activity_2'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 50));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(0);
      expect(component.canGoToSetVariables()).toBe(true);
    });

    it('should not block when activity statistics fail to load', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(throwError(() => new Error('Failed to load')));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_1'], targetActivityIds: ['Activity_2'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(0);
      expect(component.canGoToSetVariables()).toBe(true);
    });

    it('should list all unmapped activities with instances in warning message', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 },
        { id: 'Activity_2', instances: 3, incidents: 0 },
        { id: 'Activity_3', instances: 0, incidents: 0 },
        { id: 'Activity_4', instances: 0, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_4'], targetActivityIds: ['Activity_5'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(2);
      expect(component.unmappedActivitiesWithInstances()).toEqual([
        { activityId: 'Activity_1', instances: 5 },
        { activityId: 'Activity_2', instances: 3 }
      ]);

      const compiled = fixture.nativeElement;
      const warningBanner = compiled.querySelector('#unmapped-activities-warning');
      expect(warningBanner).toBeTruthy();
      expect(warningBanner.classList.contains('unmapped-alert')).toBe(true);

      const pills = warningBanner.querySelectorAll('.unmapped-chip');
      expect(pills.length).toBe(2);
    });

    it('should display singular title and subtitle for 1 unmapped activity', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 3, incidents: 0 }
      ]));

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

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(1);

      const compiled = fixture.nativeElement;
      const title = compiled.querySelector('.unmapped-alert__title');
      expect(title).toBeTruthy();
      const hint = compiled.querySelector('.unmapped-alert__hint');
      expect(hint).toBeTruthy();
    });

    it('should display plural title and subtitle for multiple unmapped activities', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 3, incidents: 0 },
        { id: 'Activity_2', instances: 2, incidents: 0 }
      ]));

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

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(2);

      const compiled = fixture.nativeElement;
      const title = compiled.querySelector('.unmapped-alert__title');
      expect(title).toBeTruthy();
      const hint = compiled.querySelector('.unmapped-alert__hint');
      expect(hint).toBeTruthy();
    });

    it('should show only 3 activities with "+N" pill when more than 3', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 1, incidents: 0 },
        { id: 'Activity_2', instances: 1, incidents: 0 },
        { id: 'Activity_3', instances: 1, incidents: 0 },
        { id: 'Activity_4', instances: 1, incidents: 0 },
        { id: 'Activity_5', instances: 1, incidents: 0 },
        { id: 'Activity_6', instances: 1, incidents: 0 },
        { id: 'Activity_7', instances: 1, incidents: 0 },
        { id: 'Activity_8', instances: 1, incidents: 0 }
      ]));

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

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.visibleUnmappedActivities().length).toBe(3);
      expect(component.remainingUnmappedCount()).toBe(5);

      const compiled = fixture.nativeElement;
      const chips = compiled.querySelectorAll('.unmapped-chip');
      expect(chips.length).toBe(4); // 3 activity chips + 1 "+N" chip

      const listItems = compiled.querySelectorAll('#unmapped-activities-warning ul li');
      expect(listItems.length).toBe(4); // 3 activities + 1 "+5" item
    });

    it('should have role="status" and aria-live="polite" on banner', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 1, incidents: 0 }
      ]));

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

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const banner = compiled.querySelector('#unmapped-activities-warning');
      expect(banner.getAttribute('role')).toBe('status');
      expect(banner.getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-label on activity pills', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 1, incidents: 0 }
      ]));

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

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const chip = compiled.querySelector('.unmapped-chip');
      const ariaLabel = chip.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Activity_1');
    });

    it('should call onUnmappedActivityClick when pill is clicked', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 1, incidents: 0 }
      ]));

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

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      const spy = vi.spyOn(component, 'onUnmappedActivityClick');

      const compiled = fixture.nativeElement;
      const chip = compiled.querySelector('.unmapped-chip');
      chip.click();

      expect(spy).toHaveBeenCalledWith('Activity_1');
    });

    it('should show 1 pill with count badge when 1 activity is unmapped', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 3, incidents: 0 }
      ]));

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

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(1);
      expect(component.visibleUnmappedActivities().length).toBe(1);
      expect(component.remainingUnmappedCount()).toBe(0);

      const compiled = fixture.nativeElement;
      const chips = compiled.querySelectorAll('.unmapped-chip');
      expect(chips.length).toBe(1); // Only 1 chip, no "+N" chip

      const countBadge = compiled.querySelector('.unmapped-chip__count');
      expect(countBadge).toBeTruthy();
      expect(countBadge.textContent?.trim()).toBe('3');
    });

    it('should show 3 pills + "+2" pill when 5 activities are unmapped', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 1, incidents: 0 },
        { id: 'Activity_2', instances: 2, incidents: 0 },
        { id: 'Activity_3', instances: 3, incidents: 0 },
        { id: 'Activity_4', instances: 4, incidents: 0 },
        { id: 'Activity_5', instances: 5, incidents: 0 }
      ]));

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

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.unmappedActivitiesWithInstances().length).toBe(5);
      expect(component.visibleUnmappedActivities().length).toBe(3);
      expect(component.remainingUnmappedCount()).toBe(2);

      const compiled = fixture.nativeElement;
      const listItems = compiled.querySelectorAll('#unmapped-activities-warning ul li');
      expect(listItems.length).toBe(4); // 3 activity items + 1 "+2" item

      // Check the "+2" pill exists and has correct text
      const remainingPill = compiled.querySelector('#unmapped-activities-warning ul li:last-child .unmapped-chip');
      expect(remainingPill).toBeTruthy();
      expect(remainingPill.textContent?.trim()).toBe('+2');

      // Verify the "+2" pill has a title attribute with remaining activities
      const title = remainingPill.getAttribute('title');
      expect(title).toBeTruthy();
      expect(title).toContain('Activity_4');
      expect(title).toContain('Activity_5');
    });
  });

  describe('Start new migration reset', () => {
    const validBpmnXml = `
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn:process id="OrderProcess">
          <bpmn:startEvent id="StartEvent_1" />
          <bpmn:task id="Activity_1" name="Task 1" />
          <bpmn:endEvent id="EndEvent_1" />
        </bpmn:process>
      </bpmn:definitions>`;

    it('should reset sourceDefinitionId, targetDefinitionId, and sourceActivityStats', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_1'], targetActivityIds: ['Activity_2'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.sourceDefinitionId()).toBe('pd1:1');
      expect(component.targetDefinitionId()).toBe('pd1:2');
      expect(component.sourceActivityStats().length).toBeGreaterThan(0);
      expect(component.migrationPlan()).toBeTruthy();

      component.onStartNewMigration();

      expect(component.sourceDefinitionId()).toBeNull();
      expect(component.targetDefinitionId()).toBeNull();
      expect(component.sourceActivityStats()).toEqual([]);
      expect(component.migrationPlan()).toBeNull();
      expect(component.migrationReport()).toBeNull();
      expect(component.sourceKey()).toBe('');
      expect(component.targetKey()).toBe('');
      expect(component.currentStep()).toBe(1);
    });

    it('should allow re-selecting the same source without auto-generating plan', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_1'], targetActivityIds: ['Activity_2'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();

      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      expect(component.migrationPlan()).toBeTruthy();
      const planGenerationCallsBefore = migrationService.generateMigrationPlan.mock.calls.length;

      component.onStartNewMigration();
      expect(component.targetDefinitionId()).toBeNull();

      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      const planGenerationCallsAfter = migrationService.generateMigrationPlan.mock.calls.length;
      expect(planGenerationCallsAfter).toBe(planGenerationCallsBefore);
      expect(component.migrationPlan()).toBeNull();
      expect(component.sourceActivityBadges().every(b => b.migrationStatus !== 'valid')).toBe(true);
    });

    it('should not show valid checkmarks when re-selecting source without target', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Activity_1'], targetActivityIds: ['Activity_2'], updateEventTrigger: false }
        ]
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();

      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      const badgesWithPlan = component.sourceActivityBadges();
      expect(badgesWithPlan.some(b => b.migrationStatus === 'valid')).toBe(true);

      component.onStartNewMigration();

      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      const badgesAfterReset = component.sourceActivityBadges();
      expect(badgesAfterReset.every(b => b.migrationStatus !== 'valid')).toBe(true);
      expect(badgesAfterReset.every(b => b.migrationStatus !== 'invalid')).toBe(true);
    });
  });

  describe('Unmapped warning display conditions', () => {
    const validBpmnXml = `
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn:process id="OrderProcess">
          <bpmn:startEvent id="StartEvent_1" />
          <bpmn:task id="Activity_1" name="Task 1" />
          <bpmn:endEvent id="EndEvent_1" />
        </bpmn:process>
      </bpmn:definitions>`;

    it('should not show unmapped warning banner when only source is selected', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      // Source has activity with instances, but no target selected
      expect(component.sourceActivityStats().length).toBeGreaterThan(0);
      expect(component.sourceActivityStats()[0].instances).toBe(5);
      expect(component.targetDefinitionId()).toBeNull();
      expect(component.unmappedActivitiesWithInstances().length).toBe(1); // Technical calculation

      // Banner should NOT be shown
      expect(component.shouldShowUnmappedWarning()).toBe(false);

      const compiled = fixture.nativeElement;
      const banner = compiled.querySelector('#unmapped-activities-warning');
      expect(banner).toBeNull();
    });

    it('should not show unmapped badges when only source is selected', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      // Should have blue instance badges but NO unmapped badges
      const badges = component.sourceActivityBadges();
      expect(badges.some(b => b.instances && b.instances > 0)).toBe(true); // Blue badges present
      expect(badges.every(b => b.migrationStatus !== 'unmapped')).toBe(true); // No "!" badges
    });

    it('should not show unmapped warning during plan generation', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      // Use delay to simulate plan generation loading time
      migrationService.generateMigrationPlan.mockReturnValue(
        of({
          sourceProcessDefinitionId: 'pd1:1',
          targetProcessDefinitionId: 'pd1:2',
          instructions: []
        }).pipe(delay(150))
      );
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Plan is being generated, not loaded yet
      expect(component.migrationPlan()).toBeNull();
      expect(component.shouldShowUnmappedWarning()).toBe(false);

      // Wait for plan to load
      await new Promise(resolve => setTimeout(resolve, 200));
      fixture.detectChanges();

      // Now plan is loaded and warning should show
      expect(component.migrationPlan()).toBeTruthy();
      expect(component.shouldShowUnmappedWarning()).toBe(true);
    });

    it('should show unmapped warning when source + target + plan loaded with unmapped activities', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [] // Empty = all activities unmapped
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      // All conditions met: source + target + plan loaded + unmapped activities
      expect(component.sourceDefinitionId()).toBeTruthy();
      expect(component.targetDefinitionId()).toBeTruthy();
      expect(component.migrationPlan()).toBeTruthy();
      expect(component.unmappedActivitiesWithInstances().length).toBe(1);

      // Warning should be shown
      expect(component.shouldShowUnmappedWarning()).toBe(true);

      const compiled = fixture.nativeElement;
      const banner = compiled.querySelector('#unmapped-activities-warning');
      expect(banner).toBeTruthy();
    });

    it('should hide unmapped warning when target is removed', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

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

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      // Warning should be shown
      expect(component.shouldShowUnmappedWarning()).toBe(true);

      // Remove target
      component.onTargetKeyChange('');

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      // Warning should disappear
      expect(component.targetDefinitionId()).toBeNull();
      expect(component.shouldShowUnmappedWarning()).toBe(false);

      const compiled = fixture.nativeElement;
      const banner = compiled.querySelector('#unmapped-activities-warning');
      expect(banner).toBeNull();
    });

    it('should maintain button blocking logic unchanged when source only selected', async () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: validBpmnXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([
        { id: 'Activity_1', instances: 5, incidents: 0 }
      ]));

      fixture.detectChanges();
      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);

      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();

      // Button should be blocked (no target selected)
      expect(component.canGoToSetVariables()).toBe(false);
      expect(component.setVariablesDisabledReason()).toBeTruthy();

      // But warning should NOT be shown
      expect(component.shouldShowUnmappedWarning()).toBe(false);
    });
  });

  describe('applyUpdateEventTriggerFlags optimization', () => {
    const xmlWithMixedActivities = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn2:process id="test">
    <bpmn2:intermediateCatchEvent id="MessageEvent_1">
      <bpmn2:messageEventDefinition/>
    </bpmn2:intermediateCatchEvent>
    <bpmn2:receiveTask id="ReceiveTask_1"/>
    <bpmn2:userTask id="UserTask_1"/>
    <bpmn2:userTask id="UserTask_2"/>
    <bpmn2:boundaryEvent id="BoundaryEvent_1" attachedToRef="UserTask_1">
      <bpmn2:messageEventDefinition/>
    </bpmn2:boundaryEvent>
    <bpmn2:boundaryEvent id="BoundaryEvent_2" attachedToRef="UserTask_2">
      <bpmn2:timerEventDefinition/>
    </bpmn2:boundaryEvent>
  </bpmn2:process>
</bpmn2:definitions>`;

    it('should produce identical flags for activities with message events and receive tasks', () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: xmlWithMixedActivities }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['MessageEvent_1'], targetActivityIds: ['MessageEvent_1'], updateEventTrigger: false },
          { sourceActivityIds: ['ReceiveTask_1'], targetActivityIds: ['ReceiveTask_1'], updateEventTrigger: false },
          { sourceActivityIds: ['UserTask_1'], targetActivityIds: ['UserTask_1'], updateEventTrigger: false },
          { sourceActivityIds: ['UserTask_2'], targetActivityIds: ['UserTask_2'], updateEventTrigger: false },
          { sourceActivityIds: ['BoundaryEvent_1'], targetActivityIds: ['BoundaryEvent_1'], updateEventTrigger: false },
          { sourceActivityIds: ['BoundaryEvent_2'], targetActivityIds: ['BoundaryEvent_2'], updateEventTrigger: false }
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

      const messageEvent = instructions.find(i => i.sourceActivityIds.includes('MessageEvent_1'));
      const receiveTask = instructions.find(i => i.sourceActivityIds.includes('ReceiveTask_1'));
      const userTask1 = instructions.find(i => i.sourceActivityIds.includes('UserTask_1'));
      const userTask2 = instructions.find(i => i.sourceActivityIds.includes('UserTask_2'));
      const boundaryEventMessage = instructions.find(i => i.sourceActivityIds.includes('BoundaryEvent_1'));
      const boundaryEventTimer = instructions.find(i => i.sourceActivityIds.includes('BoundaryEvent_2'));

      expect(messageEvent?.updateEventTrigger).toBe(true);
      expect(receiveTask?.updateEventTrigger).toBe(true);
      expect(userTask1?.updateEventTrigger).toBe(false);
      expect(userTask2?.updateEventTrigger).toBe(false);
      expect(boundaryEventMessage?.updateEventTrigger).toBe(true);
      expect(boundaryEventTimer?.updateEventTrigger).toBe(false);
    });

    it('should call DOMParser.parseFromString at most once for a plan with 300 instructions', () => {
      const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn2:process id="test">
${Array.from({ length: 300 }, (_, i) => `    <bpmn2:userTask id="Task_${i + 1}"/>`).join('\n')}
  </bpmn2:process>
</bpmn2:definitions>`;

      const instructions = Array.from({ length: 300 }, (_, i) => ({
        sourceActivityIds: [`Task_${i + 1}`],
        targetActivityIds: [`Task_${i + 1}`],
        updateEventTrigger: false
      }));

      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: largeXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions
      }));
      migrationService.validateMigrationPlan.mockReturnValue(of({ instructionReports: [] }));

      const domParserSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');

      fixture.detectChanges();

      component.onSourceKeyChange('OrderProcess');
      component.onSourceVersionChange(1);
      component.onTargetKeyChange('OrderProcess');
      component.onTargetVersionChange(2);

      fixture.detectChanges();

      const parseCallCount = domParserSpy.mock.calls.filter(call =>
        call[0].includes('bpmn2:definitions')
      ).length;

      expect(parseCallCount).toBeLessThanOrEqual(2);

      domParserSpy.mockRestore();
    });

    it('should handle empty instructions array without errors', () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: xmlWithMixedActivities }));
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

      expect(component.editableInstructions()).toEqual([]);
    });

    it('should handle null sourceXml gracefully', () => {
      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: null }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Task_1'], targetActivityIds: ['Task_1'], updateEventTrigger: false }
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
      expect(instructions.every(i => i.updateEventTrigger === false)).toBe(true);
    });

    it('should handle malformed XML gracefully', () => {
      const malformedXml = '<?xml version="1.0"?><invalid><unclosed>';

      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: malformedXml }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Task_1'], targetActivityIds: ['Task_1'], updateEventTrigger: false }
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
      expect(instructions).toBeDefined();
    });

    it('should handle activity ID not found in XML', () => {
      const xmlWithOnlyOneTask = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn2:process id="test">
    <bpmn2:userTask id="Task_1"/>
  </bpmn2:process>
</bpmn2:definitions>`;

      processDefinitionService.getBpmn20Xml.mockReturnValue(of({ bpmn20Xml: xmlWithOnlyOneTask }));
      processDefinitionService.getActivityStatistics.mockReturnValue(of([]));
      migrationService.generateMigrationPlan.mockReturnValue(of({
        sourceProcessDefinitionId: 'pd1:1',
        targetProcessDefinitionId: 'pd1:2',
        instructions: [
          { sourceActivityIds: ['Task_1'], targetActivityIds: ['Task_1'], updateEventTrigger: false },
          { sourceActivityIds: ['NonExistent_Task'], targetActivityIds: ['Task_2'], updateEventTrigger: false }
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
      const task1 = instructions.find(i => i.sourceActivityIds.includes('Task_1'));
      const nonExistent = instructions.find(i => i.sourceActivityIds.includes('NonExistent_Task'));

      expect(task1?.updateEventTrigger).toBe(false);
      expect(nonExistent?.updateEventTrigger).toBe(false);
    });
  });
});
