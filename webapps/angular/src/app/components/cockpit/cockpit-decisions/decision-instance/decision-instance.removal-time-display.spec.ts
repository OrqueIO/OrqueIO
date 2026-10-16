/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Tests for Removal Time field display in decision instance detail page.
 * Verifies Removal Time placement and formatting.
 *
 * Requirements:
 * - Position immediately after Evaluation Time
 * - Same icon and date format as Evaluation Time
 * - Handles null values correctly
 * - Non-regression for other fields
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DecisionInstanceComponent } from './decision-instance';
import {
  CockpitService,
  DecisionDefinition,
  DecisionInstance,
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('DecisionInstanceComponent - Removal Time Display', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: DecisionInstanceComponent;
  let compiled: HTMLElement;
  let cockpitService: any;
  let navMenuService: any;
  let routeParams$: Subject<any>;

  const mockDef: DecisionDefinition = {
    id: 'dd-1',
    key: 'testDecision',
    name: 'Test Decision',
    version: 1,
    deploymentId: 'dep-1',
  };

  function findDtByKey(key: string): HTMLElement | null {
    const dts = Array.from(compiled.querySelectorAll('.process-information dt'));
    return dts.find(dt => dt.textContent?.includes(key)) as HTMLElement || null;
  }

  function findDdForDt(dt: HTMLElement): HTMLElement | null {
    return dt.nextElementSibling as HTMLElement || null;
  }

  function setupTest(instanceData: Partial<DecisionInstance>) {
    const fullInstance: DecisionInstance = {
      id: 'di-test',
      decisionDefinitionId: 'dd-1',
      decisionDefinitionKey: 'testDecision',
      decisionDefinitionName: 'Test Decision',
      evaluationTime: '2026-01-15T12:00:00.000+0000',
      tenantId: 'tenant-1',
      processInstanceId: 'pi-1',
      processDefinitionKey: 'invoice',
      activityId: 'activity-1',
      decisionRequirementsDefinitionId: 'drd-1',
      inputs: [],
      outputs: [],
      ...instanceData,
    };

    routeParams$ = new Subject();
    cockpitService = {
      getDecisionInstance: vi.fn().mockReturnValue(of(fullInstance)),
      getDecisionDefinition: vi.fn().mockReturnValue(of(mockDef)),
      getDecisionXml: vi.fn().mockReturnValue(of({ id: 'dd-1', dmnXml: '<definitions/>' })),
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

    const fixture = TestBed.createComponent(DecisionInstanceComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;

    component.ngOnInit();
    routeParams$.next({ id: 'di-test' });
    fixture.detectChanges();

    return { fixture, fullInstance };
  }

  // ============================================
  // POSITION TESTS
  // ============================================

  describe('Field positioning', () => {
    it('should display Removal Time immediately after Evaluation Time', () => {
      setupTest({ removalTime: '2026-01-20T10:00:00.000+0000' });

      const dts = Array.from(compiled.querySelectorAll('.process-information dt'));
      const evalTimeDt = findDtByKey('cockpit.decisionInstance.evaluationTime');
      expect(evalTimeDt).toBeTruthy();

      const evalTimeIndex = dts.indexOf(evalTimeDt!);
      expect(evalTimeIndex).toBeGreaterThanOrEqual(0);

      const nextDt = dts[evalTimeIndex + 1];
      expect(nextDt).toBeTruthy();

      expect(nextDt.textContent).toContain('cockpit.decisionInstance.removalTime');
    });

    it('should maintain field count - Removal Time moved, not duplicated', () => {
      setupTest({ removalTime: '2026-01-20T10:00:00.000+0000' });

      const dts = Array.from(compiled.querySelectorAll('.process-information dt'));
      const dds = Array.from(compiled.querySelectorAll('.process-information dd'));

      expect(dts.length).toBe(dds.length);

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      expect(removalTimeDt).toBeTruthy();

      const removalTimeCount = dts.filter(dt =>
        dt.textContent?.includes('cockpit.decisionInstance.removalTime')
      ).length;
      expect(removalTimeCount).toBe(1);
    });
  });

  // ============================================
  // ICON AND FORMAT TESTS
  // ============================================

  describe('Icon and date format', () => {
    it('should display Removal Time with faClock icon like Evaluation Time', () => {
      setupTest({ removalTime: '2026-01-20T10:00:00.000+0000' });

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      expect(removalTimeDt).toBeTruthy();
      const removalTimeDd = findDdForDt(removalTimeDt!);
      expect(removalTimeDd).toBeTruthy();

      const icon = removalTimeDd?.querySelector('fa-icon');
      expect(icon).toBeTruthy();
    });

    it('should format Removal Time using formatDate() like Evaluation Time', () => {
      setupTest({ removalTime: '2026-01-20T10:00:00.000+0000' });

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      const removalTimeDd = findDdForDt(removalTimeDt!);

      const dateText = removalTimeDd?.textContent?.trim();
      expect(dateText).toBeTruthy();
      expect(dateText!.length).toBeGreaterThan(0);

      expect(dateText).not.toContain('2026-01-20T10:00:00.000+0000');
    });

    it('should have identical structure to Evaluation Time field', () => {
      setupTest({ removalTime: '2026-01-20T10:00:00.000+0000' });

      const evalTimeDt = findDtByKey('cockpit.decisionInstance.evaluationTime');
      const evalTimeDd = findDdForDt(evalTimeDt!);

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      const removalTimeDd = findDdForDt(removalTimeDt!);

      expect(evalTimeDd?.querySelector('fa-icon')).toBeTruthy();
      expect(removalTimeDd?.querySelector('fa-icon')).toBeTruthy();

      expect(evalTimeDd?.textContent?.trim().length).toBeGreaterThan(0);
      expect(removalTimeDd?.textContent?.trim().length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // NULL VALUE HANDLING TESTS
  // ============================================

  describe('Null value handling', () => {
    it('should display "null" when removalTime is absent', () => {
      setupTest({ removalTime: undefined });

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      expect(removalTimeDt).toBeTruthy();
      const removalTimeDd = findDdForDt(removalTimeDt!);
      expect(removalTimeDd).toBeTruthy();

      const nullSpan = removalTimeDd?.querySelector('.null-value');
      expect(nullSpan).toBeTruthy();
      expect(nullSpan?.textContent).toBe('null');
    });

    it('should always display Removal Time field (not conditional on value)', () => {
      setupTest({ removalTime: undefined });

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      expect(removalTimeDt).toBeTruthy();
    });

    it('should use null-value CSS class for styling', () => {
      setupTest({ removalTime: undefined });

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      const removalTimeDd = findDdForDt(removalTimeDt!);

      const nullSpan = removalTimeDd?.querySelector('.null-value');
      expect(nullSpan).toBeTruthy();
      expect(nullSpan?.classList.contains('null-value')).toBe(true);
    });
  });

  // ============================================
  // NON-REGRESSION TESTS
  // ============================================

  describe('Non-regression', () => {
    it('should not affect Evaluation Time field display', () => {
      setupTest({ removalTime: '2026-01-20T10:00:00.000+0000' });

      const evalTimeDt = findDtByKey('cockpit.decisionInstance.evaluationTime');
      const evalTimeDd = findDdForDt(evalTimeDt!);

      expect(evalTimeDd?.querySelector('fa-icon')).toBeTruthy();

      expect(evalTimeDd?.textContent?.trim().length).toBeGreaterThan(0);
    });

    it('should not affect other fields order and content', () => {
      setupTest({ removalTime: '2026-01-20T10:00:00.000+0000' });

      const dts = Array.from(compiled.querySelectorAll('.process-information dt'));

      expect(dts.length).toBeGreaterThanOrEqual(4);

      const instanceIdDt = findDtByKey('cockpit.decisionInstance.instanceId');
      expect(instanceIdDt).toBeTruthy();

      const evalTimeDt = findDtByKey('cockpit.decisionInstance.evaluationTime');
      expect(evalTimeDt).toBeTruthy();

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      expect(removalTimeDt).toBeTruthy();

      const defVersionDt = findDtByKey('cockpit.decisionInstance.definitionVersion');
      expect(defVersionDt).toBeTruthy();
    });

    it('should not duplicate Removal Time at old position (end of list)', () => {
      setupTest({ removalTime: '2026-01-20T10:00:00.000+0000' });

      const dts = Array.from(compiled.querySelectorAll('.process-information dt'));
      const dds = Array.from(compiled.querySelectorAll('.process-information dd'));

      expect(dts.length).toBe(dds.length);

      expect(dts.length).toBeGreaterThanOrEqual(4);

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      expect(removalTimeDt).toBeTruthy();

      const evalTimeDt = findDtByKey('cockpit.decisionInstance.evaluationTime');
      expect(evalTimeDt).toBeTruthy();

      const removalTimeIndex = dts.indexOf(removalTimeDt!);
      const evalTimeIndex = dts.indexOf(evalTimeDt!);

      expect(removalTimeIndex).toBe(evalTimeIndex + 1);

      const lastFieldIndex = dts.length - 1;
      expect(removalTimeIndex).not.toBe(lastFieldIndex);
      expect(removalTimeIndex).toBeLessThan(5);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration with real data', () => {
    it('should handle instance with both evaluationTime and removalTime', () => {
      setupTest({
        evaluationTime: '2026-01-15T12:00:00.000+0000',
        removalTime: '2026-01-20T10:00:00.000+0000',
      });

      const dts = Array.from(compiled.querySelectorAll('.process-information dt'));
      const dds = Array.from(compiled.querySelectorAll('.process-information dd'));

      expect(dts.length).toBeGreaterThanOrEqual(4);
      expect(dds.length).toBeGreaterThanOrEqual(4);

      const evalTimeDt = findDtByKey('cockpit.decisionInstance.evaluationTime');
      const evalTimeDd = findDdForDt(evalTimeDt!);
      expect(evalTimeDd?.querySelector('fa-icon')).toBeTruthy();

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      const removalTimeDd = findDdForDt(removalTimeDt!);
      expect(removalTimeDd?.querySelector('fa-icon')).toBeTruthy();
    });

    it('should handle instance with evaluationTime but no removalTime', () => {
      setupTest({
        evaluationTime: '2026-01-15T12:00:00.000+0000',
        removalTime: undefined,
      });

      const dds = Array.from(compiled.querySelectorAll('.process-information dd'));

      expect(dds.length).toBeGreaterThanOrEqual(3);

      const removalTimeDt = findDtByKey('cockpit.decisionInstance.removalTime');
      const removalTimeDd = findDdForDt(removalTimeDt!);
      expect(removalTimeDd?.querySelector('.null-value')).toBeTruthy();
    });
  });
});


