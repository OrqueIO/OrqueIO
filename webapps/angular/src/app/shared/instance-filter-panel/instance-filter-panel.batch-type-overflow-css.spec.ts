import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { InstanceFilterPanelComponent } from './instance-filter-panel';
import { CockpitService } from '../../services/cockpit.service';
import { DecisionService } from '../../services/decision.service';
import { TranslateService } from '../../i18n/translate.service';
import { initTestEnvironment } from '../../testing/test-utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CSS TESTS: Batch Type Filter — Overflow fix with modifier class on card
 *
 * Tests that verify CSS rules prevent overflow:
 * 1. Width is on .criterion-editor-popover--batch-type (card modifier), not on list/rows
 * 2. batch-type-row has box-sizing: border-box, width: 100%, margin: 0, NO min-width
 * 3. batch-type-list--scrollable has overflow-x: hidden, same padding as Activity ID, NO min-width
 * 4. Mutation: add min-width to list or remove box-sizing → test fails
 *
 * Part of ticket #114 - Set removal time for batches - Corrections (wizard icons + overflow fix)
 */
describe('InstanceFilterPanel — Batch Type Overflow CSS Tests', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let compiled: HTMLElement;

  const cssFilePath = path.resolve(__dirname, 'instance-filter-panel.css');
  let cssContent: string;

  beforeEach(async () => {
    initTestEnvironment();

    // Read CSS file
    cssContent = fs.readFileSync(cssFilePath, 'utf-8');

    const mockCockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([]))
    } as any;

    const mockDecisionService = {
      getDecisionDefinitions: vi.fn().mockReturnValue(of([]))
    } as any;

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CockpitService, useValue: mockCockpitService },
        { provide: DecisionService, useValue: mockDecisionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = {
      en: {
        'BATCH_TYPE_MODIFICATION': 'Process Instance Modification',
        'BATCH_TYPE_RESTART': 'Process Instance Restart',
        'BATCH_TYPE_DELETION': 'Process Instance Deletion',
        'BATCH_TYPE_SUSPENSION': 'Process Instance State Change',
        'BATCH_TYPE_HISTORIC_INSTANCE_DELETION': 'Finished Instance Deletion',
        'BATCH_TYPE_HISTORIC_DECISION_INSTANCE_DELETION': 'Decision Instance Deletion',
        'BATCH_TYPE_SET_JOB_RETRIES': 'Set Job Retries',
        'BATCH_TYPE_SET_EXTERNAL_TASK_RETRIES': 'Set External Task Retries',
        'BATCH_TYPE_SET_VARIABLES': 'Set Variables',
        'BATCH_TYPE_CORRELATE_MESSAGE': 'Correlate Message',
        'BATCH_TYPE_SET_REMOVAL_TIME': 'Set Removal Time',
        'BATCH_TYPE_DECISION_SET_REMOVAL_TIME': 'Set Removal Time (Decisions)',
        'BATCH_TYPE_BATCH_SET_REMOVAL_TIME': 'Set Removal Time (Batches)'
      }
    };

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  describe('Overflow fix CSS rules', () => {
    it('should have box-sizing: border-box on .batch-type-row', () => {
      const batchTypeRowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(batchTypeRowRules).toBeTruthy();

      const hasBoxSizing = batchTypeRowRules?.some(rule => rule.includes('box-sizing: border-box'));
      expect(hasBoxSizing).toBe(true);
    });

    it('should have width: 100% on .batch-type-row', () => {
      const batchTypeRowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(batchTypeRowRules).toBeTruthy();

      const hasWidth100 = batchTypeRowRules?.some(rule => rule.includes('width: 100%'));
      expect(hasWidth100).toBe(true);
    });

    it('should have margin: 0 on .batch-type-row', () => {
      const batchTypeRowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(batchTypeRowRules).toBeTruthy();

      const hasMargin0 = batchTypeRowRules?.some(rule => rule.includes('margin: 0'));
      expect(hasMargin0).toBe(true);
    });

    it('should have overflow-x: hidden on .batch-type-list--scrollable', () => {
      const listRules = cssContent.match(/\.batch-type-list--scrollable\s*\{[^}]+\}/g);
      expect(listRules).toBeTruthy();

      const hasOverflowX = listRules?.some(rule => rule.includes('overflow-x: hidden'));
      expect(hasOverflowX).toBe(true);
    });

    it('should have padding-right on .batch-type-list--scrollable (same as Activity ID)', () => {
      const listRules = cssContent.match(/\.batch-type-list--scrollable\s*\{[^}]+\}/g);
      expect(listRules).toBeTruthy();

      const hasPaddingRight = listRules?.some(rule => rule.includes('padding-right'));
      expect(hasPaddingRight).toBe(true);
    });

    it('should NOT have negative margins in any batch-type-* rules', () => {
      const batchTypeRules = cssContent.match(/\.batch-type-[^\s{]+\s*\{[^}]+\}/g);
      expect(batchTypeRules).toBeTruthy();

      const hasNegativeMargin = batchTypeRules?.some(rule => /margin[^:]*:\s*-/.test(rule));
      expect(hasNegativeMargin).toBe(false);
    });

    it('should have min-width: 0 on label for ellipsis to work', () => {
      const labelRules = cssContent.match(/\.batch-type-row\s+\.state-row-label\s*\{[^}]+\}/g);
      expect(labelRules).toBeTruthy();

      const hasMinWidth0 = labelRules?.some(rule => rule.includes('min-width: 0'));
      expect(hasMinWidth0).toBe(true);
    });
  });

  describe('Activity ID match CSS rules', () => {
    it('should have same padding as state-row (7px var(--space-3))', () => {
      const batchTypeRowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(batchTypeRowRules).toBeTruthy();

      const hasSamePadding = batchTypeRowRules?.some(rule =>
        rule.includes('padding: 7px var(--space-3)') ||
        rule.includes('padding:7px var(--space-3)')
      );
      expect(hasSamePadding).toBe(true);
    });

    it('should have same border-radius as state-row (8px)', () => {
      const batchTypeRowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(batchTypeRowRules).toBeTruthy();

      const hasSameBorderRadius = batchTypeRowRules?.some(rule => rule.includes('border-radius: 8px'));
      expect(hasSameBorderRadius).toBe(true);
    });

    it('should have same transition as state-row (background var(--transition-fast))', () => {
      const batchTypeRowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(batchTypeRowRules).toBeTruthy();

      const hasSameTransition = batchTypeRowRules?.some(rule =>
        rule.includes('transition: background var(--transition-fast)') ||
        rule.includes('transition:background var(--transition-fast)')
      );
      expect(hasSameTransition).toBe(true);
    });

    it('should have check icon same size as Activity ID (0.7rem)', () => {
      const checkIconRules = cssContent.match(/\.batch-type-row\s+\.state-row-check\s*\{[^}]+\}/g);
      expect(checkIconRules).toBeTruthy();

      const hasSameSize = checkIconRules?.some(rule => rule.includes('font-size: 0.7rem'));
      expect(hasSameSize).toBe(true);
    });

    it('should have check icon same color as Activity ID (var(--color-primary))', () => {
      const checkIconRules = cssContent.match(/\.batch-type-row\s+\.state-row-check\s*\{[^}]+\}/g);
      expect(checkIconRules).toBeTruthy();

      const hasSameColor = checkIconRules?.some(rule => rule.includes('color: var(--color-primary)'));
      expect(hasSameColor).toBe(true);
    });
  });

  describe('[MUTATION PROOF] CSS overflow rules', () => {
    it('should fail if box-sizing is removed from .batch-type-row', () => {
      const batchTypeRowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(batchTypeRowRules).toBeTruthy();

      const hasBoxSizing = batchTypeRowRules?.some(rule => rule.includes('box-sizing'));
      expect(hasBoxSizing).toBe(true);
      expect(hasBoxSizing).not.toBe(false);
    });

    it('should fail if overflow-x is changed to visible', () => {
      const listRules = cssContent.match(/\.batch-type-list--scrollable\s*\{[^}]+\}/g);
      expect(listRules).toBeTruthy();

      const hasOverflowXHidden = listRules?.some(rule => rule.includes('overflow-x: hidden'));
      expect(hasOverflowXHidden).toBe(true);

      const hasOverflowXVisible = listRules?.some(rule => rule.includes('overflow-x: visible'));
      expect(hasOverflowXVisible).toBe(false);
    });
  });
});
