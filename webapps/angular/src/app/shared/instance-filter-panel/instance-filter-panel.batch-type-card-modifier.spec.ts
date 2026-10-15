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
 * CARD MODIFIER TEST: criterion-editor-popover--batch-type class
 *
 * Tests that verify the popover card receives the modifier class:
 * 1. Class applied ONLY when activeEditorType === 'type' && criteriaSet === 'batch'
 * 2. NOT applied for other criteria (businessKey, state, processDefinition, etc.)
 * 3. NOT applied for type filter on process/decision criteriaSet
 *
 * Part of ticket #114 - Set removal time for batches - Corrections (overflow fix)
 */
describe('InstanceFilterPanel — Batch Type Card Modifier Class', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let compiled: HTMLElement;

  const cssFilePath = path.resolve(__dirname, 'instance-filter-panel.css');
  let cssContent: string;

  beforeEach(async () => {
    initTestEnvironment();

    // Read CSS file to verify modifier class exists
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
        'BATCH_TYPE_RESTART': 'Process Instance Restart'
      }
    };

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  describe('[CARD MODIFIER] Class applied to popover card', () => {
    it('should apply criterion-editor-popover--batch-type when type filter is opened for batch', () => {
      // Open batch Type filter
      component.selectCriteriaType('type');
      fixture.detectChanges();

      const popoverCard = compiled.querySelector('.criterion-editor-popover');
      expect(popoverCard).toBeTruthy();
      expect(popoverCard?.classList.contains('criterion-editor-popover--batch-type')).toBe(true);
    });

    it('should NOT apply batch-type modifier for other criteria (businessKey, state)', () => {
      // Open businessKey filter
      component.selectCriteriaType('businessKey');
      fixture.detectChanges();

      let popoverCard = compiled.querySelector('.criterion-editor-popover');
      expect(popoverCard?.classList.contains('criterion-editor-popover--batch-type')).toBe(false);

      // Close and open state filter
      component.cancelCriterion();
      fixture.detectChanges();
      component.selectCriteriaType('completed');
      fixture.detectChanges();

      popoverCard = compiled.querySelector('.criterion-editor-popover');
      expect(popoverCard?.classList.contains('criterion-editor-popover--batch-type')).toBe(false);
    });

    it('should NOT apply batch-type modifier for type filter on process criteriaSet', () => {
      // Change to process criteriaSet
      component.criteriaSet = 'process';
      fixture.detectChanges();

      component.selectCriteriaType('type');
      fixture.detectChanges();

      const popoverCard = compiled.querySelector('.criterion-editor-popover');
      // Type filter for process uses multi-value chip input, not batch type list
      expect(popoverCard?.classList.contains('criterion-editor-popover--batch-type')).toBe(false);
    });
  });

  describe('[CSS] Width rules on modifier class', () => {
    it('should have width rules on .criterion-editor-popover--batch-type, not on body/list/row', () => {
      // Verify modifier class has width
      const modifierRules = cssContent.match(/\.criterion-editor-popover--batch-type\s*\{[^}]+\}/g);
      expect(modifierRules).toBeTruthy();

      const hasWidth = modifierRules?.some(rule => rule.includes('width:') || rule.includes('min-width:'));
      expect(hasWidth).toBe(true);

      // Verify list and row do NOT have fixed min-width in px
      const listRules = cssContent.match(/\.batch-type-list--scrollable\s*\{[^}]+\}/g);
      const rowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);

      const listHasFixedWidth = listRules?.some(rule => /min-width:\s*\d+px/.test(rule) || /width:\s*\d+px/.test(rule));
      const rowHasFixedWidth = rowRules?.some(rule => /min-width:\s*\d+px/.test(rule));

      expect(listHasFixedWidth).toBe(false);
      expect(rowHasFixedWidth).toBe(false);
    });

    it('should have box-sizing: border-box on .batch-type-row', () => {
      const rowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(rowRules).toBeTruthy();

      const hasBoxSizing = rowRules?.some(rule => rule.includes('box-sizing: border-box'));
      expect(hasBoxSizing).toBe(true);
    });

    it('should have width: 100% on .batch-type-row', () => {
      const rowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(rowRules).toBeTruthy();

      const hasWidth100 = rowRules?.some(rule => rule.includes('width: 100%'));
      expect(hasWidth100).toBe(true);
    });

    it('should have overflow-x: hidden on .batch-type-list--scrollable', () => {
      const listRules = cssContent.match(/\.batch-type-list--scrollable\s*\{[^}]+\}/g);
      expect(listRules).toBeTruthy();

      const hasOverflowX = listRules?.some(rule => rule.includes('overflow-x: hidden'));
      expect(hasOverflowX).toBe(true);
    });
  });

  describe('[MUTATION PROOF] Width on wrong element', () => {
    it('should fail if min-width is added to .batch-type-list--scrollable', () => {
      // This test verifies the CSS file does NOT have min-width: XXXpx on list
      const listRules = cssContent.match(/\.batch-type-list--scrollable\s*\{[^}]+\}/g);
      expect(listRules).toBeTruthy();

      const hasFixedMinWidth = listRules?.some(rule => /min-width:\s*\d+px/.test(rule));
      expect(hasFixedMinWidth).toBe(false);
      expect(hasFixedMinWidth).not.toBe(true); // Double negative for mutation detection
    });

    it('should fail if min-width is added to .batch-type-row', () => {
      // This test verifies the CSS file does NOT have min-width: XXXpx on row
      const rowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(rowRules).toBeTruthy();

      const hasFixedMinWidth = rowRules?.some(rule => /min-width:\s*\d+px/.test(rule));
      expect(hasFixedMinWidth).toBe(false);
      expect(hasFixedMinWidth).not.toBe(true); // Double negative for mutation detection
    });

    it('should fail if box-sizing is removed from .batch-type-row', () => {
      const rowRules = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/g);
      expect(rowRules).toBeTruthy();

      const hasBoxSizing = rowRules?.some(rule => rule.includes('box-sizing'));
      expect(hasBoxSizing).toBe(true);
      expect(hasBoxSizing).not.toBe(false); // Double negative for mutation detection
    });
  });
});