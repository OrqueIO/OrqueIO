import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { CockpitService } from '../../../../services/cockpit.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('BatchOperationsWizard — Status Migration and API Params', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: BatchOperationsWizardComponent;
  let fixture: ComponentFixture<BatchOperationsWizardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    const translateSpy = {
      instant: vi.fn((key: string) => key),
      get: vi.fn(() => of('')),
      use: vi.fn(),
      currentLang$: of('en')
    };

    const cockpitSpy = {
      getBatches: vi.fn(() => of({ items: [], total: 0 })),
      getProcessInstances: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [BatchOperationsWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CockpitService, useValue: cockpitSpy },
        { provide: TranslateService, useValue: translateSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchOperationsWizardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('SessionStorage migration (old "completed" → new format)', () => {
    it('should migrate { field: "completed", values: ["true"] } to { field: "batchCompleted", values: [] }', () => {
      const oldState = {
        operationId: 'removal-time-batch',
        step: 2,
        batchFilterCriteria: [
          { field: 'completed', values: ['true'] }
        ]
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(oldState));

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.batchFilterCriteria.length).toBe(1);
      expect(component.batchFilterCriteria[0].field).toBe('batchCompleted');
      expect(component.batchFilterCriteria[0].values).toEqual([]);
    });

    it('should migrate { field: "completed", values: ["false"] } to { field: "batchRunning", values: [] }', () => {
      const oldState = {
        operationId: 'removal-time-batch',
        step: 2,
        batchFilterCriteria: [
          { field: 'completed', values: ['false'] }
        ]
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(oldState));

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.batchFilterCriteria.length).toBe(1);
      expect(component.batchFilterCriteria[0].field).toBe('batchRunning');
      expect(component.batchFilterCriteria[0].values).toEqual([]);
    });

    it('should preserve new format batchCompleted pill', () => {
      const newState = {
        operationId: 'removal-time-batch',
        step: 2,
        batchFilterCriteria: [
          { field: 'batchCompleted', values: [] }
        ]
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(newState));

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.batchFilterCriteria.length).toBe(1);
      expect(component.batchFilterCriteria[0].field).toBe('batchCompleted');
      expect(component.batchFilterCriteria[0].values).toEqual([]);
    });

    it('should preserve new format batchRunning pill', () => {
      const newState = {
        operationId: 'removal-time-batch',
        step: 2,
        batchFilterCriteria: [
          { field: 'batchRunning', values: [] }
        ]
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(newState));

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.batchFilterCriteria.length).toBe(1);
      expect(component.batchFilterCriteria[0].field).toBe('batchRunning');
      expect(component.batchFilterCriteria[0].values).toEqual([]);
    });

    it('should migrate completed pill while preserving Type pill in same state', () => {
      const oldState = {
        operationId: 'removal-time-batch',
        step: 2,
        batchFilterCriteria: [
          { field: 'type', values: ['instance-deletion', 'process-set-removal-time'] },
          { field: 'completed', values: ['true'] }
        ]
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(oldState));

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.batchFilterCriteria.length).toBe(2);
      const typePill = component.batchFilterCriteria.find(p => p.field === 'type');
      const completedPill = component.batchFilterCriteria.find(p => p.field === 'batchCompleted');
      expect(typePill).toBeTruthy('Type pill should be preserved');
      expect(typePill!.values).toEqual(['instance-deletion', 'process-set-removal-time']);
      expect(completedPill).toBeTruthy('Completed pill should be migrated');
      expect(completedPill!.values).toEqual([]);
    });

    it('should NOT migrate process "completed" criterion (state:completed)', () => {
      // This test proves that the migration ONLY affects batch criteria, not process state
      const processState = {
        operationId: 'delete-finished',
        step: 2,
        filterCriteria: [
          { field: 'state', values: ['completed'] } // Process uses 'completed' as a VALUE in 'state' field
        ]
      };
      sessionStorage.setItem('batchOpsWizardState', JSON.stringify(processState));

      component.ngOnInit();
      fixture.detectChanges();

      // batchFilterCriteria should be empty (not affected by process filterCriteria)
      expect(component.batchFilterCriteria.length).toBe(0);
      // Process filterCriteria would remain unchanged (but wizard doesn't process it for batches)
    });
  });

  describe('API parameter mapping (batchCompleted/batchRunning → completed=true/false)', () => {
    beforeEach(() => {
      component.selectedOperationId = 'removal-time-batch';
      component.currentStep = 1;
      component.batchFilterCriteria = [];
      fixture.detectChanges();
    });

    it('should map batchCompleted to completed=true in getListQueryParams', () => {
      component.batchFilterCriteria = [{ field: 'batchCompleted', values: [] }];
      component.loadBatchInstances();

      const listReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
      expect(listReq.request.params.get('completed')).toBe('true');
      listReq.flush({ items: [], total: 0 });

      const countReq = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
      countReq.flush(0);
    });

    it('should map batchRunning to completed=false in getListQueryParams', () => {
      component.batchFilterCriteria = [{ field: 'batchRunning', values: [] }];
      component.loadBatchInstances();

      const listReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
      expect(listReq.request.params.get('completed')).toBe('false');
      listReq.flush({ items: [], total: 0 });

      const countReq = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
      countReq.flush(0);
    });

    it('should map batchCompleted to completed=true in getCountQueryParams', () => {
      component.batchFilterCriteria = [{ field: 'batchCompleted', values: [] }];
      component.loadBatchInstances();

      const listReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
      listReq.flush({ items: [], total: 0 });

      const countReq = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
      expect(countReq.request.params.get('completed')).toBe('true');
      countReq.flush(10);
    });

    it('should map batchRunning to completed=false in getCountQueryParams', () => {
      component.batchFilterCriteria = [{ field: 'batchRunning', values: [] }];
      component.loadBatchInstances();

      const listReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
      listReq.flush({ items: [], total: 0 });

      const countReq = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
      expect(countReq.request.params.get('completed')).toBe('false');
      countReq.flush(5);
    });

    it('should include completed=true with other filters in list query', () => {
      component.batchFilterCriteria = [
        { field: 'type', values: ['instance-deletion'] },
        { field: 'batchCompleted', values: [] }
      ];
      component.loadBatchInstances();

      const listReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
      expect(listReq.request.params.get('typeIn')).toBe('instance-deletion');
      expect(listReq.request.params.get('completed')).toBe('true');
      listReq.flush({ items: [], total: 0 });

      const countReq = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
      countReq.flush(0);
    });

    it('should include completed=false with other filters in count query', () => {
      component.batchFilterCriteria = [
        { field: 'batchId', values: ['ABC123'] },
        { field: 'batchRunning', values: [] }
      ];
      component.loadBatchInstances();

      const listReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
      listReq.flush({ items: [], total: 0 });

      const countReq = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
      expect(countReq.request.params.get('batchId')).toBe('ABC123');
      expect(countReq.request.params.get('completed')).toBe('false');
      countReq.flush(3);
    });

    it('should send correct HTTP request with completed=true when batchCompleted is active', () => {
      component.batchFilterCriteria = [{ field: 'batchCompleted', values: [] }];
      component.loadBatchInstances();

      const listReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
      expect(listReq.request.method).toBe('GET');
      expect(listReq.request.params.get('completed')).toBe('true');
      listReq.flush({ items: [], total: 0 });

      const countReq = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
      countReq.flush(0);
    });

    it('should send correct HTTP request with completed=false when batchRunning is active', () => {
      component.batchFilterCriteria = [{ field: 'batchRunning', values: [] }];
      component.loadBatchInstances();

      const listReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
      expect(listReq.request.method).toBe('GET');
      expect(listReq.request.params.get('completed')).toBe('false');
      listReq.flush({ items: [], total: 0 });

      const countReq = httpMock.expectOne(req => req.url.includes('/history/batch/count'));
      countReq.flush(0);
    });
  });
});