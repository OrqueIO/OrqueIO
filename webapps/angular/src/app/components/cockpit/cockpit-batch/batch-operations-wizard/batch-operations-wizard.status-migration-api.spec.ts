import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { CockpitService } from '../../../../services/cockpit.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';

describe('BatchOperationsWizard — Status Migration and API Params', () => {
  let component: BatchOperationsWizardComponent;
  let fixture: ComponentFixture<BatchOperationsWizardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'use', 'currentLang$']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.returnValue(of(''));
    translateSpy.currentLang$ = of('en');

    const cockpitSpy = jasmine.createSpyObj('CockpitService', ['getBatches', 'getProcessInstances']);
    cockpitSpy.getBatches.and.returnValue(of({ items: [], total: 0 }));

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
        selectedOperationId: 'removal-time-batch',
        step: 1,
        batchFilterCriteria: [
          { field: 'completed', values: ['true'] }
        ]
      };
      sessionStorage.setItem('batchOperationsWizardState', JSON.stringify(oldState));

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.batchFilterCriteria.length).toBe(1);
      expect(component.batchFilterCriteria[0].field).toBe('batchCompleted');
      expect(component.batchFilterCriteria[0].values).toEqual([]);
    });

    it('should migrate { field: "completed", values: ["false"] } to { field: "batchRunning", values: [] }', () => {
      const oldState = {
        selectedOperationId: 'removal-time-batch',
        step: 1,
        batchFilterCriteria: [
          { field: 'completed', values: ['false'] }
        ]
      };
      sessionStorage.setItem('batchOperationsWizardState', JSON.stringify(oldState));

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.batchFilterCriteria.length).toBe(1);
      expect(component.batchFilterCriteria[0].field).toBe('batchRunning');
      expect(component.batchFilterCriteria[0].values).toEqual([]);
    });

    it('should preserve new format batchCompleted pill', () => {
      const newState = {
        selectedOperationId: 'removal-time-batch',
        step: 1,
        batchFilterCriteria: [
          { field: 'batchCompleted', values: [] }
        ]
      };
      sessionStorage.setItem('batchOperationsWizardState', JSON.stringify(newState));

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.batchFilterCriteria.length).toBe(1);
      expect(component.batchFilterCriteria[0].field).toBe('batchCompleted');
      expect(component.batchFilterCriteria[0].values).toEqual([]);
    });

    it('should preserve new format batchRunning pill', () => {
      const newState = {
        selectedOperationId: 'removal-time-batch',
        step: 1,
        batchFilterCriteria: [
          { field: 'batchRunning', values: [] }
        ]
      };
      sessionStorage.setItem('batchOperationsWizardState', JSON.stringify(newState));

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.batchFilterCriteria.length).toBe(1);
      expect(component.batchFilterCriteria[0].field).toBe('batchRunning');
      expect(component.batchFilterCriteria[0].values).toEqual([]);
    });

    it('should migrate completed pill while preserving Type pill in same state', () => {
      const oldState = {
        selectedOperationId: 'removal-time-batch',
        step: 1,
        batchFilterCriteria: [
          { field: 'type', values: ['instance-deletion', 'process-set-removal-time'] },
          { field: 'completed', values: ['true'] }
        ]
      };
      sessionStorage.setItem('batchOperationsWizardState', JSON.stringify(oldState));

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
        selectedOperationId: 'delete-finished',
        step: 1,
        filterCriteria: [
          { field: 'state', values: ['completed'] } // Process uses 'completed' as a VALUE in 'state' field
        ]
      };
      sessionStorage.setItem('batchOperationsWizardState', JSON.stringify(processState));

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
      const params = component.getListQueryParams();
      expect(params['completed']).toBe(true);
    });

    it('should map batchRunning to completed=false in getListQueryParams', () => {
      component.batchFilterCriteria = [{ field: 'batchRunning', values: [] }];
      const params = component.getListQueryParams();
      expect(params['completed']).toBe(false);
    });

    it('should map batchCompleted to completed=true in getCountQueryParams', () => {
      component.batchFilterCriteria = [{ field: 'batchCompleted', values: [] }];
      const params = component.getCountQueryParams();
      expect(params['completed']).toBe(true);
    });

    it('should map batchRunning to completed=false in getCountQueryParams', () => {
      component.batchFilterCriteria = [{ field: 'batchRunning', values: [] }];
      const params = component.getCountQueryParams();
      expect(params['completed']).toBe(false);
    });

    it('should include completed=true with other filters in list query', () => {
      component.batchFilterCriteria = [
        { field: 'type', values: ['instance-deletion'] },
        { field: 'batchCompleted', values: [] }
      ];
      const params = component.getListQueryParams();
      expect(params['typeIn']).toEqual(['instance-deletion']);
      expect(params['completed']).toBe(true);
    });

    it('should include completed=false with other filters in count query', () => {
      component.batchFilterCriteria = [
        { field: 'batchId', values: ['ABC123'] },
        { field: 'batchRunning', values: [] }
      ];
      const params = component.getCountQueryParams();
      expect(params['batchId']).toBe('ABC123');
      expect(params['completed']).toBe(false);
    });

    it('should send correct HTTP request with completed=true when batchCompleted is active', (done) => {
      component.batchFilterCriteria = [{ field: 'batchCompleted', values: [] }];
      component.loadBatchInstances();

      const req = httpMock.expectOne(req => req.url.includes('/history/batch') && req.params.get('completed') === 'true');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('completed')).toBe('true');
      req.flush({ items: [], total: 0 });
      done();
    });

    it('should send correct HTTP request with completed=false when batchRunning is active', (done) => {
      component.batchFilterCriteria = [{ field: 'batchRunning', values: [] }];
      component.loadBatchInstances();

      const req = httpMock.expectOne(req => req.url.includes('/history/batch') && req.params.get('completed') === 'false');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('completed')).toBe('false');
      req.flush({ items: [], total: 0 });
      done();
    });
  });
});