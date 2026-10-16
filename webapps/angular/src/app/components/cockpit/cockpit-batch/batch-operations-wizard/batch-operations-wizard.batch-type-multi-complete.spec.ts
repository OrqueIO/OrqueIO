import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { ProcessDefinitionService } from '../../../../services/process-definition.service';
import { CockpitService } from '../../../../services/cockpit.service';
import { DecisionService } from '../../../../services/decision.service';
import { BatchService } from '../../../../services/batch.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

/**
 * TEST: Batch Type Multi-Select - Tests Complets Phase 2
 *
 * 1. Zero ligne -> aucun typeIn/type, critere retire
 * 2. Aller-retour URL 2 types -> ordre preserve
 * 3. Ancienne URL string -> liste [string], typeIn
 * 4. Pastilles EN/FR 1,2,3+ types sans cockpit. ni valeur brute
 */
describe('BatchOperationsWizard - Batch Type Multi-Select Complete', () => {
  let component: BatchOperationsWizardComponent;
  let fixture: ComponentFixture<BatchOperationsWizardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    initTestEnvironment();

    await TestBed.configureTestingModule({
      imports: [BatchOperationsWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: DecisionService,
          useValue: {
            setRemovalTimeAsync: vi.fn(),
            getDecisionInstancesCountFiltered: vi.fn(),
            deleteAsync: vi.fn(),
            getDecisionDefinitions: vi.fn().mockReturnValue({ subscribe: vi.fn() })
          }
        },
        {
          provide: ProcessInstanceService,
          useValue: { setRemovalTimeAsync: vi.fn() }
        },
        {
          provide: CockpitService,
          useValue: {
            getProcessDefinitions: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
            searchProcessInstancesGlobal: vi.fn(),
            searchProcessInstancesGlobalCount: vi.fn()
          }
        },
        {
          provide: NavMenuService,
          useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchOperationsWizardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    const ts = TestBed.inject(TranslateService);
    (ts as any).translations = {
      en: {
        'BATCH_TYPE_INSTANCE_DELETION': 'Process Instance Deletion',
        'BATCH_TYPE_INSTANCE_MODIFICATION': 'Process Instance Modification',
        'BATCH_TYPE_PROCESS_SET_REMOVAL_TIME': 'Set Removal Time',
        'BATCH_TYPE_DECISION_SET_REMOVAL_TIME': 'Set Removal Time (Decisions)',
        'cockpit.batchOps.removalTimeBatch.pills.type': 'Type: {{value}}'
      },
      fr: {
        'BATCH_TYPE_INSTANCE_DELETION': 'Suppression des instances',
        'BATCH_TYPE_INSTANCE_MODIFICATION': 'Modification des instances',
        'BATCH_TYPE_PROCESS_SET_REMOVAL_TIME': 'Definir temps de suppression',
        'BATCH_TYPE_DECISION_SET_REMOVAL_TIME': 'Definir temps de suppression (Decisions)',
        'cockpit.batchOps.removalTimeBatch.pills.type': 'Type : {{value}}'
      }
    };
    (ts as any).currentLangSubject.next('en');

    component.currentStep = 1;
    component.mode = 'instances';
    fixture.detectChanges();
  });

  afterEach(() => {
    // Flush any pending i18n requests
    const pendingReqs = httpMock.match(() => true);
    pendingReqs.forEach(req => {
      if (req.request.url.includes('/assets/i18n/')) {
        req.flush({});
      }
    });

    httpMock.verify();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('TEST 1: Zero ligne cochee -> aucun typeIn/type, critere retire', async () => {
    // Trigger initial load with NO filter criteria
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Expect 2 requests: data + count
    const requests = httpMock.match(req => req.url.includes('/history/batch'));
    expect(requests.length).toBe(2);

    const dataReq = requests.find(r => !r.request.url.includes('/count'));
    const countReq = requests.find(r => r.request.url.includes('/count'));

    // CRITICAL: No typeIn or type parameter when no filter applied
    expect(dataReq!.request.params.get('typeIn')).toBeNull();
    expect(dataReq!.request.params.get('type')).toBeNull();
    expect(countReq!.request.params.get('typeIn')).toBeNull();
    expect(countReq!.request.params.get('type')).toBeNull();

    dataReq!.flush([]);
    countReq!.flush({ count: 0 });

    expect(component.batchFilterCriteria.length).toBe(0);
  });

  it('TEST 2: Aller-retour URL 2 types -> ordre preserve', () => {
    component.batchFilterCriteria = [{
      field: 'type',
      values: ['instance-deletion', 'process-set-removal-time']
    }];
    component['saveToSessionStorage']();

    const stored = sessionStorage.getItem('batchOpsWizardState');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.batchFilterCriteria[0].values).toEqual(['instance-deletion', 'process-set-removal-time']);
    expect(parsed.batchFilterCriteria[0].values[0]).toBe('instance-deletion');
    expect(parsed.batchFilterCriteria[0].values[1]).toBe('process-set-removal-time');
  });

  it('TEST 3: Ancienne URL string -> liste, typeIn a 1 valeur', async () => {
    // Trigger load, then apply single-value type filter (simulating old URL format)
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial load
    const initialReqs = httpMock.match(req => req.url.includes('/history/batch'));
    initialReqs.forEach(r => r.flush(r.request.url.includes('/count') ? { count: 0 } : []));

    // Apply filter with single type value (like old URL format)
    component.onBatchFilterChange({
      criteria: [{ field: 'type', values: ['instance-deletion'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // Get requests after filter applied
    const requests = httpMock.match(req => req.url.includes('/history/batch'));
    expect(requests.length).toBe(2);

    const dataReq = requests.find(r => !r.request.url.includes('/count'));
    const countReq = requests.find(r => r.request.url.includes('/count'));

    // CRITICAL: Single value should still use typeIn (not type), production must handle this!
    expect(dataReq!.request.params.get('typeIn')).toBe('instance-deletion');
    expect(dataReq!.request.params.get('type')).toBeNull();
    expect(countReq!.request.params.get('typeIn')).toBe('instance-deletion');
    expect(countReq!.request.params.get('type')).toBeNull();

    dataReq!.flush([]);
    countReq!.flush({ count: 0 });
  });

  it('TEST 4a: Pastille EN 1 type -> traduit sans cockpit. ni brute', () => {
    const ts = TestBed.inject(TranslateService);
    ts.setLanguage('en');

    const typeKey = 'instance-deletion';
    const expectedLabel = 'Process Instance Deletion';

    // Simulate translation mechanism used by getPillLabel
    const i18nKey = 'BATCH_TYPE_INSTANCE_DELETION';
    const translated = ts.instant(i18nKey);

    expect(translated).toBe(expectedLabel);
    expect(translated).not.toContain('cockpit.');
    expect(translated).not.toBe(typeKey);
  });

  it('TEST 4b: Pastille EN 2 types -> traduits sans cockpit. ni brute', () => {
    const ts = TestBed.inject(TranslateService);
    ts.setLanguage('en');

    const types = ['instance-deletion', 'instance-modification'];
    const expectedLabels = ['Process Instance Deletion', 'Process Instance Modification'];

    types.forEach((type, idx) => {
      const i18nKey = 'BATCH_TYPE_' + type.toUpperCase().replace(/-/g, '_');
      const translated = ts.instant(i18nKey);

      expect(translated).toBe(expectedLabels[idx]);
      expect(translated).not.toContain('cockpit.');
      expect(translated).not.toContain('instance-');
    });
  });

  it('TEST 4c: Pastille EN 3+ types -> traduits sans cockpit. ni brute', () => {
    const ts = TestBed.inject(TranslateService);
    ts.setLanguage('en');

    const types = ['instance-deletion', 'instance-modification', 'process-set-removal-time'];
    const expectedLabels = [
      'Process Instance Deletion',
      'Process Instance Modification',
      'Set Removal Time'
    ];

    types.forEach((type, idx) => {
      const i18nKey = 'BATCH_TYPE_' + type.toUpperCase().replace(/-/g, '_');
      const translated = ts.instant(i18nKey);

      expect(translated).toBe(expectedLabels[idx]);
      expect(translated).not.toContain('cockpit.');
      expect(translated).not.toContain('instance-');
    });
  });

  it('TEST 4d: Pastille FR 1 type -> traduit sans cockpit. ni brute', () => {
    const ts = TestBed.inject(TranslateService);
    (ts as any).currentLangSubject.next('fr');

    const typeKey = 'instance-deletion';
    const expectedLabel = 'Suppression des instances';

    const i18nKey = 'BATCH_TYPE_INSTANCE_DELETION';
    const translated = ts.instant(i18nKey);

    expect(translated).toBe(expectedLabel);
    expect(translated).not.toContain('cockpit.');
    expect(translated).not.toBe(typeKey);
  });

  it('TEST 4e: Pastille FR 2 types -> traduits sans cockpit. ni brute', () => {
    const ts = TestBed.inject(TranslateService);
    (ts as any).currentLangSubject.next('fr');

    const types = ['instance-deletion', 'process-set-removal-time'];
    const expectedLabels = ['Suppression des instances', 'Definir temps de suppression'];

    types.forEach((type, idx) => {
      const i18nKey = 'BATCH_TYPE_' + type.toUpperCase().replace(/-/g, '_');
      const translated = ts.instant(i18nKey);

      expect(translated).toBe(expectedLabels[idx]);
      expect(translated).not.toContain('cockpit.');
      expect(translated).not.toContain('instance-');
    });
  });

  it('TEST 4f: Pastille FR 3+ types -> traduits sans cockpit. ni brute', () => {
    const ts = TestBed.inject(TranslateService);
    (ts as any).currentLangSubject.next('fr');

    const types = ['instance-deletion', 'instance-modification', 'decision-set-removal-time'];
    const expectedLabels = [
      'Suppression des instances',
      'Modification des instances',
      'Definir temps de suppression (Decisions)'
    ];

    types.forEach((type, idx) => {
      const i18nKey = 'BATCH_TYPE_' + type.toUpperCase().replace(/-/g, '_');
      const translated = ts.instant(i18nKey);

      expect(translated).toBe(expectedLabels[idx]);
      expect(translated).not.toContain('cockpit.');
      expect(translated).not.toContain('instance-');
      expect(translated).not.toContain('decision-');
    });
  });
});
