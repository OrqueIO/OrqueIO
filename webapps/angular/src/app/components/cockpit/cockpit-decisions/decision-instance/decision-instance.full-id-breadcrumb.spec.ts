/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Tests for full ID display (36 characters) in decision instance breadcrumb.
 * These tests verify that the instance ID in breadcrumb is displayed in full, not truncated.
 *
 * Requirement: Display full UUIDs (36 chars) like process instances do.
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DecisionInstanceComponent } from './decision-instance';
import { CockpitService, DecisionDefinition, DecisionInstance } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('DecisionInstanceComponent - Full ID in Breadcrumb (36 chars)', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: DecisionInstanceComponent;
  let fixture: ComponentFixture<DecisionInstanceComponent>;
  let cockpitService: any;
  let navMenuService: any;
  let routeParams$: Subject<any>;

  const fullInstanceId = '579b4c57-1234-5678-90ab-cdef12345678';

  const mockDefinition: DecisionDefinition = {
    id: 'dd-uuid',
    key: 'assignApprover',
    name: 'Assign Approver',
    version: 1,
    deploymentId: 'dep-1',
  };

  const mockInstance: DecisionInstance = {
    id: fullInstanceId,
    decisionDefinitionId: 'dd-uuid',
    decisionDefinitionKey: 'assignApprover',
    decisionDefinitionName: 'Assign Approver',
    evaluationTime: '2026-01-15T12:00:00.000+0000',
    processInstanceId: 'pi-1',
    processDefinitionKey: 'invoice',
    activityId: 'Task_Approve',
    inputs: [],
    outputs: [],
  };

  beforeEach(() => {
    routeParams$ = new Subject();
    cockpitService = {
      getDecisionInstance: vi.fn().mockReturnValue(of(mockInstance)),
      getDecisionDefinition: vi.fn().mockReturnValue(of(mockDefinition)),
      getDecisionXml: vi.fn().mockReturnValue(of({ id: 'dd-uuid', dmnXml: '<definitions/>' })),
    };
    navMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DecisionInstanceComponent, RouterModule.forRoot([])],
      providers: [
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: navMenuService },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
    });

    fixture = TestBed.createComponent(DecisionInstanceComponent);
    component = fixture.componentInstance;
  });

  // ============================================
  // BREADCRUMB FULL ID
  // ============================================

  describe('Breadcrumb instance ID', () => {
    it('should display full instance ID (36 chars) in breadcrumb', () => {
      component.ngOnInit();
      routeParams$.next({ id: fullInstanceId });
      fixture.detectChanges();

      expect(component.breadcrumbs.length).toBeGreaterThanOrEqual(3);

      const lastBreadcrumb = component.breadcrumbs[component.breadcrumbs.length - 1];
      expect(lastBreadcrumb.label).toBe(fullInstanceId);
      expect(lastBreadcrumb.label?.length).toBe(36);
    });

    it('should NOT truncate instance ID to 8 characters', () => {
      component.ngOnInit();
      routeParams$.next({ id: fullInstanceId });
      fixture.detectChanges();

      const lastBreadcrumb = component.breadcrumbs[component.breadcrumbs.length - 1];
      expect(lastBreadcrumb.label).not.toBe('579b4c57...');
      expect(lastBreadcrumb.label).not.toMatch(/^[a-f0-9]{8}\.\.\.$/);
    });

    it('should have exactly 3 breadcrumb items', () => {
      component.ngOnInit();
      routeParams$.next({ id: fullInstanceId });
      fixture.detectChanges();

      expect(component.breadcrumbs.length).toBe(3);
    });

    it('should have breadcrumb structure: Decisions > Definition > Instance', () => {
      component.ngOnInit();
      routeParams$.next({ id: fullInstanceId });
      fixture.detectChanges();

      expect(component.breadcrumbs[0].translateKey).toBe('cockpit.menu.decisions');
      expect(component.breadcrumbs[0].route).toBe('/cockpit/decisions');

      expect(component.breadcrumbs[1].label).toBe('Assign Approver');
      expect(component.breadcrumbs[1].route).toBe('/cockpit/decisions/dd-uuid');

      expect(component.breadcrumbs[2].label).toBe(fullInstanceId);
      expect(component.breadcrumbs[2].route).toBeUndefined();
    });
  });

  // ============================================
  // COMPARISON WITH PROCESS INSTANCES
  // ============================================

  describe('Alignment with process instances behavior', () => {
    it('should match process instance breadcrumb pattern (full ID)', () => {
      component.ngOnInit();
      routeParams$.next({ id: fullInstanceId });
      fixture.detectChanges();

      const instanceBreadcrumb = component.breadcrumbs[2];

      expect(instanceBreadcrumb.label).toBe(fullInstanceId);
      expect(instanceBreadcrumb.label?.includes('...')).toBe(false);
    });
  });

  // ============================================
  // MUTATION TEST: Verify this test FAILS on truncated code
  // ============================================

  describe('Mutation proof: These tests MUST FAIL with truncateId()', () => {
    it('MUTATION TEST: breadcrumb label should be full UUID, not truncated', () => {
      component.ngOnInit();
      routeParams$.next({ id: fullInstanceId });
      fixture.detectChanges();

      const lastBreadcrumb = component.breadcrumbs[component.breadcrumbs.length - 1];

      expect(lastBreadcrumb.label).toBe(fullInstanceId);
      expect(lastBreadcrumb.label).not.toMatch(/\.\.\./);
    });

    it('MUTATION TEST: breadcrumb label length should be 36, not 11 (8 + "...")', () => {
      component.ngOnInit();
      routeParams$.next({ id: fullInstanceId });
      fixture.detectChanges();

      const lastBreadcrumb = component.breadcrumbs[component.breadcrumbs.length - 1];

      expect(lastBreadcrumb.label?.length).toBe(36);
      expect(lastBreadcrumb.label?.length).not.toBe(11);
    });
  });
});
