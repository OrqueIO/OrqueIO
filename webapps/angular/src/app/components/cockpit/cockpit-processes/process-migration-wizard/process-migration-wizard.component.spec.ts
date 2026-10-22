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
    { id: 'pd1:2', key: 'OrderProcess', name: 'Order Process', version: 2, deploymentId: 'dep2', suspended: false },
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
      getActivityStatistics: vi.fn()
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

    cockpitService.getProcessDefinitionsWithStatistics.mockReturnValue(of(mockStats));

    fixture = TestBed.createComponent(ProcessMigrationWizardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load process definitions on init', () => {
    fixture.detectChanges();
    expect(cockpitService.getProcessDefinitionsWithStatistics).toHaveBeenCalled();
    expect(component.availableKeys().length).toBe(2);
    expect(component.availableKeys()).toContain('OrderProcess');
    expect(component.availableKeys()).toContain('InvoiceProcess');
  });

  it('should populate source versions when source key is selected', () => {
    fixture.detectChanges();
    component.onSourceKeyChange('OrderProcess');
    expect(component.sourceVersions().length).toBe(2);
    expect(component.sourceVersions()[0].version).toBe(2); // Sorted descending
    expect(component.sourceVersions()[1].version).toBe(1);
  });

  it('should reset source version when source key changes', () => {
    fixture.detectChanges();
    component.onSourceKeyChange('OrderProcess');
    component.onSourceVersionChange(2);
    expect(component.sourceVersion()).toBe(2);

    component.onSourceKeyChange('InvoiceProcess');
    expect(component.sourceVersion()).toBeNull();
    expect(component.sourceDefinitionId()).toBeNull();
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
});
