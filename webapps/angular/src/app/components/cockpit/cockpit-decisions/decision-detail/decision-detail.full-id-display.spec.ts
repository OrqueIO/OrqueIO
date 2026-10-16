/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Tests for full ID display (36 characters) in decision instances list.
 * These tests verify that decision IDs are displayed in full, not truncated.
 *
 * Requirement: Display full UUIDs (36 chars) like process instances do.
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { of } from 'rxjs';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { DecisionDetailComponent } from './decision-detail';
import { CockpitService, DecisionDefinition, DecisionInstance } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

// Stub components for routing tests
@Component({ template: '', standalone: true })
class DecisionInstanceStubComponent {}

@Component({ template: '', standalone: true })
class ProcessInstanceStubComponent {}

describe('DecisionDetailComponent - Full ID Display (36 chars)', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: DecisionDetailComponent;
  let fixture: ComponentFixture<DecisionDetailComponent>;
  let compiled: HTMLElement;
  let cockpitService: any;
  let navMenuService: any;

  const fullInstanceId = '579b4c57-1234-5678-90ab-cdef12345678';
  const fullProcessInstanceId = '567198c6-abcd-ef12-3456-7890abcdef12';
  const fullCaseInstanceId = 'aabbccdd-1122-3344-5566-778899aabbcc';

  const mockDefinition: DecisionDefinition = {
    id: 'dd-uuid',
    key: 'assignApprover',
    name: 'Assign Approver',
    version: 1,
    deploymentId: 'dep-1',
  };

  const mockInstanceWithProcess: DecisionInstance = {
    id: fullInstanceId,
    decisionDefinitionId: 'dd-uuid',
    decisionDefinitionKey: 'assignApprover',
    decisionDefinitionName: 'Assign Approver',
    evaluationTime: '2026-01-15T12:00:00.000+0000',
    processInstanceId: fullProcessInstanceId,
    processDefinitionKey: 'invoice',
    activityId: 'Task_Approve',
  };

  const mockInstanceWithCase: DecisionInstance = {
    id: fullInstanceId,
    decisionDefinitionId: 'dd-uuid',
    decisionDefinitionKey: 'assignApprover',
    decisionDefinitionName: 'Assign Approver',
    evaluationTime: '2026-01-15T12:00:00.000+0000',
    caseInstanceId: fullCaseInstanceId,
    caseDefinitionKey: 'caseKey',
    activityId: 'Task_Approve',
  };

  function setupComponent(instances: DecisionInstance[]): void {
    cockpitService = {
      getDecisionDefinition: vi.fn().mockReturnValue(of(mockDefinition)),
      getDecisionDefinitionVersions: vi.fn().mockReturnValue(of([mockDefinition])),
      getDecisionXml: vi.fn().mockReturnValue(of({ id: 'dd-uuid', dmnXml: '<definitions/>' })),
      getDecisionInstancesCount: vi.fn().mockReturnValue(of(instances.length)),
      getDecisionInstancesPaginated: vi.fn().mockReturnValue(of(instances)),
    };
    navMenuService = {
      setMenuItems: vi.fn(),
      clearMenuItems: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DecisionDetailComponent],
      providers: [
        provideRouter([
          { path: 'cockpit/decision-instance/:id', component: DecisionInstanceStubComponent },
          { path: 'cockpit/processes/instance/:id', component: ProcessInstanceStubComponent },
        ]),
        { provide: CockpitService, useValue: cockpitService },
        { provide: NavMenuService, useValue: navMenuService },
        {
          provide: ActivatedRoute,
          useValue: { params: of({ id: 'dd-uuid' }) },
        },
      ],
    });

    fixture = TestBed.createComponent(DecisionDetailComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
    fixture.detectChanges();
  }

  // Helper function to find column index by header i18n key
  function findColumnIndexByHeader(headerKey: string): number {
    const headers = Array.from(compiled.querySelectorAll('.data-table thead th'));
    return headers.findIndex(th => th.textContent?.includes(headerKey));
  }

  // ============================================
  // INSTANCE ID COLUMN
  // ============================================

  describe('INSTANCE ID column', () => {
    it('should display full instance ID (36 chars), not truncated', () => {
      setupComponent([mockInstanceWithProcess]);

      const rows = compiled.querySelectorAll('.data-table tbody tr');
      expect(rows.length).toBe(1);

      const firstRow = rows[0];
      const idCell = firstRow.querySelector('td:first-child');
      expect(idCell).toBeTruthy();

      const linkText = idCell?.textContent?.trim();
      expect(linkText).toBe(fullInstanceId);
      expect(linkText?.length).toBe(36);
    });

    it('should have routerLink pointing to correct instance', () => {
      setupComponent([mockInstanceWithProcess]);

      const idLink = compiled.querySelector('.data-table tbody tr td:first-child a');
      expect(idLink).toBeTruthy();
      expect(idLink?.getAttribute('title')).toBe(fullInstanceId);
      expect(idLink?.textContent?.trim()).toBe(fullInstanceId);
    });

    it('should have title attribute with full ID', () => {
      setupComponent([mockInstanceWithProcess]);

      const idLink = compiled.querySelector('.data-table tbody tr td:first-child a') as HTMLAnchorElement;
      expect(idLink).toBeTruthy();
      expect(idLink?.getAttribute('title')).toBe(fullInstanceId);
    });

    it('should have href attribute pointing to correct instance detail route', () => {
      setupComponent([mockInstanceWithProcess]);

      const idLink = compiled.querySelector('.data-table tbody tr td:first-child a') as HTMLAnchorElement;
      expect(idLink).toBeTruthy();

      const href = idLink?.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toBe(`/cockpit/decision-instance/${fullInstanceId}`);
    });
  });

  // ============================================
  // PROCESS INSTANCE ID COLUMN
  // ============================================

  describe('PROCESS INSTANCE ID column', () => {
    it('should display full process instance ID (36 chars), not truncated', () => {
      setupComponent([mockInstanceWithProcess]);

      const rows = compiled.querySelectorAll('.data-table tbody tr');
      const firstRow = rows[0];
      const cells = firstRow.querySelectorAll('td');

      const columnIndex = findColumnIndexByHeader('cockpit.decisionDetail.instances.processInstanceId');
      expect(columnIndex).toBeGreaterThanOrEqual(0);

      const processInstanceCell = cells[columnIndex];
      expect(processInstanceCell).toBeTruthy();

      const linkText = processInstanceCell?.textContent?.trim();
      expect(linkText).toBe(fullProcessInstanceId);
      expect(linkText?.length).toBe(36);
    });

    it('should have routerLink pointing to correct process instance', () => {
      setupComponent([mockInstanceWithProcess]);

      const rows = compiled.querySelectorAll('.data-table tbody tr');
      const cells = rows[0].querySelectorAll('td');

      const columnIndex = findColumnIndexByHeader('cockpit.decisionDetail.instances.processInstanceId');
      const processInstanceCell = cells[columnIndex];
      const link = processInstanceCell?.querySelector('a');

      expect(link).toBeTruthy();
      expect(link?.getAttribute('title')).toBe(fullProcessInstanceId);
      expect(link?.textContent?.trim()).toBe(fullProcessInstanceId);
    });

    it('should have title attribute with full process instance ID', () => {
      setupComponent([mockInstanceWithProcess]);

      const rows = compiled.querySelectorAll('.data-table tbody tr');
      const cells = rows[0].querySelectorAll('td');

      const columnIndex = findColumnIndexByHeader('cockpit.decisionDetail.instances.processInstanceId');
      const link = cells[columnIndex]?.querySelector('a') as HTMLAnchorElement;

      expect(link).toBeTruthy();
      expect(link?.getAttribute('title')).toBe(fullProcessInstanceId);
    });

    it('should have href attribute pointing to correct process instance route', () => {
      setupComponent([mockInstanceWithProcess]);

      const rows = compiled.querySelectorAll('.data-table tbody tr');
      const cells = rows[0].querySelectorAll('td');

      const columnIndex = findColumnIndexByHeader('cockpit.decisionDetail.instances.processInstanceId');
      const link = cells[columnIndex]?.querySelector('a') as HTMLAnchorElement;

      expect(link).toBeTruthy();

      const href = link?.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toBe(`/cockpit/processes/instance/${fullProcessInstanceId}`);
    });
  });

  // ============================================
  // CASE INSTANCE ID
  // ============================================

  describe('CASE INSTANCE ID (when no process instance)', () => {
    it('should display full case instance ID (36 chars), not truncated', () => {
      setupComponent([mockInstanceWithCase]);

      const rows = compiled.querySelectorAll('.data-table tbody tr');
      const cells = rows[0].querySelectorAll('td');

      const columnIndex = findColumnIndexByHeader('cockpit.decisionDetail.instances.processInstanceId');
      const caseCell = cells[columnIndex];

      const spanText = caseCell?.textContent?.trim();
      expect(spanText).toBe(fullCaseInstanceId);
      expect(spanText?.length).toBe(36);
    });

    it('should have title attribute with full case instance ID', () => {
      setupComponent([mockInstanceWithCase]);

      const rows = compiled.querySelectorAll('.data-table tbody tr');
      const cells = rows[0].querySelectorAll('td');

      const columnIndex = findColumnIndexByHeader('cockpit.decisionDetail.instances.processInstanceId');
      const span = cells[columnIndex]?.querySelector('span') as HTMLSpanElement;

      expect(span).toBeTruthy();
      expect(span?.getAttribute('title')).toBe(fullCaseInstanceId);
    });
  });

  // ============================================
  // NON-REGRESSION: Links still work
  // ============================================

  describe('Non-regression: Links', () => {
    it('should maintain correct routerLink for instance detail', () => {
      setupComponent([mockInstanceWithProcess]);

      const idLink = compiled.querySelector('.data-table tbody tr td:first-child a');

      expect(idLink?.getAttribute('title')).toBe(fullInstanceId);
      expect(idLink?.textContent?.trim()).toBe(fullInstanceId);
    });

    it('should maintain correct routerLink for process instance', () => {
      setupComponent([mockInstanceWithProcess]);

      const rows = compiled.querySelectorAll('.data-table tbody tr');
      const cells = rows[0].querySelectorAll('td');

      const columnIndex = findColumnIndexByHeader('cockpit.decisionDetail.instances.processInstanceId');
      const link = cells[columnIndex]?.querySelector('a');

      expect(link?.getAttribute('title')).toBe(fullProcessInstanceId);
      expect(link?.textContent?.trim()).toBe(fullProcessInstanceId);
    });
  });

  // ============================================
  // MUTATION TEST: Verify this test FAILS on truncated code
  // ============================================

  describe('Mutation proof: These tests MUST FAIL with truncateId()', () => {
    it('MUTATION TEST: should NOT show truncated instance ID like "579b4c57..."', () => {
      setupComponent([mockInstanceWithProcess]);

      const idCell = compiled.querySelector('.data-table tbody tr td:first-child');
      const linkText = idCell?.textContent?.trim();

      expect(linkText).not.toMatch(/^[a-f0-9]{8}\.\.\.$/);
      expect(linkText).not.toBe('579b4c57...');
    });

    it('MUTATION TEST: should NOT show truncated process instance ID', () => {
      setupComponent([mockInstanceWithProcess]);

      const rows = compiled.querySelectorAll('.data-table tbody tr');
      const cells = rows[0].querySelectorAll('td');

      const columnIndex = findColumnIndexByHeader('cockpit.decisionDetail.instances.processInstanceId');
      const linkText = cells[columnIndex]?.textContent?.trim();

      expect(linkText).not.toMatch(/^[a-f0-9]{8}\.\.\.$/);
      expect(linkText).not.toBe('567198c6...');
    });
  });
});
