import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { CockpitService } from '../../../../services/cockpit.service';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('Batch Operations Wizard - Preselection from Search', () => {
  let component: BatchOperationsWizardComponent;
  let fixture: ComponentFixture<BatchOperationsWizardComponent>;
  let httpMock: HttpTestingController;

  // Mock sessionStorage for testing environment
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      key: (index: number) => Object.keys(store)[index] || null,
      get length() { return Object.keys(store).length; }
    };
  })();

  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
  });

  let mockNavMenuService: any;
  let mockTranslateService: any;

  beforeEach(async () => {
    sessionStorage.clear();

    if (TestBed.inject) {
      TestBed.resetTestingModule();
    }

    initTestEnvironment();

    mockNavMenuService = {
      setTitle: vi.fn(),
      setBreadcrumbs: vi.fn(),
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn()
    };

    mockTranslateService = {
      instant: vi.fn((key: string) => key),
      currentLang$: of('en')
    };

    await TestBed.configureTestingModule({
      imports: [BatchOperationsWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        CockpitService,
        ProcessInstanceService,
        { provide: NavMenuService, useValue: mockNavMenuService },
        { provide: TranslateService, useValue: mockTranslateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchOperationsWizardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
    sessionStorage.clear();
  });

  it('should load preselected instances with processInstanceIdIn filter (activate operation)', async () => {
    const preselectedIds = ['inst-suspended-1', 'inst-suspended-2'];
    const sessionState = {
      operationId: 'activate',
      mode: 'instances',
      step: 1,
      filterCriteria: [],
      selectedIds: preselectedIds,
      fromSearch: true
    };
    sessionStorage.setItem('batchOpsWizardState', JSON.stringify(sessionState));

    fixture.detectChanges();

    const processDefReq = httpMock.expectOne(req => req.url.includes('/process-definition'));
    processDefReq.flush([]);

    await fixture.whenStable();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 200));

    const historyRequest = httpMock.expectOne(req =>
      req.url.includes('/history/process-instance') &&
      req.method === 'POST' &&
      !req.url.includes('/count')
    );

    expect(historyRequest.request.body).toBeDefined();

    const body = historyRequest.request.body as any;
    expect(body.processInstanceIds).toBeDefined();
    expect(body.processInstanceIds).toEqual(preselectedIds);

    expect(body.suspended).toBe(true);

    const mockInstances = [
      {
        id: 'inst-suspended-1',
        state: 'SUSPENDED',
        processDefinitionId: 'invoice:1:abc123',
        processDefinitionKey: 'invoice',
        businessKey: 'INV-001',
        startTime: '2025-01-15T10:00:00.000Z',
        endTime: null
      },
      {
        id: 'inst-suspended-2',
        state: 'SUSPENDED',
        processDefinitionId: 'invoice:1:abc123',
        processDefinitionKey: 'invoice',
        businessKey: 'INV-002',
        startTime: '2025-01-15T10:05:00.000Z',
        endTime: null
      }
    ];

    historyRequest.flush(mockInstances);

    // Flush count request
    const countRequest = httpMock.expectOne(req => req.url.includes('/count'));
    countRequest.flush({ count: 2 });

    await new Promise(resolve => setTimeout(resolve, 10));
    fixture.detectChanges();

    expect(component.instances.length).toBe(2);
    expect(component.instances[0].id).toBe('inst-suspended-1');
    expect(component.instances[1].id).toBe('inst-suspended-2');

    expect(component.selectedIds.size).toBe(2);
    expect(component.selectedIds.has('inst-suspended-1')).toBe(true);
    expect(component.selectedIds.has('inst-suspended-2')).toBe(true);

    expect(component.selectedCount).toBe(2);
  });

  it('should load preselected ACTIVE instances with processInstanceIdIn filter (suspend operation)', async () => {
    const preselectedIds = ['inst-active-1', 'inst-active-2'];
    const sessionState = {
      operationId: 'suspend',
      mode: 'instances',
      step: 1,
      filterCriteria: [],
      selectedIds: preselectedIds,
      fromSearch: true
    };
    sessionStorage.setItem('batchOpsWizardState', JSON.stringify(sessionState));

    fixture.detectChanges();
    const processDefReq = httpMock.expectOne(req => req.url.includes('/process-definition'));
    processDefReq.flush([]);

    await fixture.whenStable();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 200));

    const historyRequest = httpMock.expectOne(req =>
      req.url.includes('/history/process-instance') &&
      req.method === 'POST' &&
      !req.url.includes('/count')
    );

    const body = historyRequest.request.body as any;
    expect(body.processInstanceIds).toEqual(preselectedIds);
    expect(body.active).toBe(true);

    // Mock response
    const mockInstances = [
      {
        id: 'inst-active-1',
        state: 'ACTIVE',
        processDefinitionId: 'payment:1:xyz456',
        processDefinitionKey: 'payment',
        businessKey: 'PAY-001',
        startTime: '2025-01-15T11:00:00.000Z',
        endTime: null
      },
      {
        id: 'inst-active-2',
        state: 'ACTIVE',
        processDefinitionId: 'payment:1:xyz456',
        processDefinitionKey: 'payment',
        businessKey: 'PAY-002',
        startTime: '2025-01-15T11:05:00.000Z',
        endTime: null
      }
    ];

    historyRequest.flush(mockInstances);

    const countRequest = httpMock.expectOne(req => req.url.includes('/count'));
    countRequest.flush({ count: 2 });

    await new Promise(resolve => setTimeout(resolve, 10));
    fixture.detectChanges();

    // ASSERT
    expect(component.instances.length).toBe(2);
    expect(component.selectedIds.size).toBe(2);
    expect(component.selectedCount).toBe(2);
  });

  it('should NOT add processInstanceIdIn filter when launched without preselection', async () => {
    fixture.detectChanges();

    const processDefReqs = httpMock.match(req => req.url.includes('/process-definition'));
    processDefReqs.forEach(req => req.flush([]));

    component.selectedOperationId = 'activate';
    component.mode = 'instances';
    component['loadInstances']();

    await fixture.whenStable();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 200));

    const historyRequest = httpMock.expectOne(req =>
      req.url.includes('/history/process-instance') &&
      req.method === 'POST' &&
      !req.url.includes('/count')
    );

    const body = historyRequest.request.body as any;
    expect(body.processInstanceIds).toBeUndefined();
    expect(body.suspended).toBe(true);

    historyRequest.flush([]);

    const countRequest = httpMock.expectOne(req => req.url.includes('/count'));
    countRequest.flush({ count: 0 });

    const remainingProcessDefReqs = httpMock.match(req => req.url.includes('/process-definition'));
    remainingProcessDefReqs.forEach(req => req.flush([]));
  });
});
