import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
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
});
