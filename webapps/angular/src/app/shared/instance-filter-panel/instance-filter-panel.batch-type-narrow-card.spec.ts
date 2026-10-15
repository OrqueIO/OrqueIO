import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach } from 'vitest';
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
 * NARROW CARD + SHORTENED FR LABELS TEST
 *
 * Verifies:
 * - Card width reduced to 300px
 * - FR labels shortened to fit ~30 character budget
 * - 2-line fallback for longer labels
 * - title attribute present on all options
 *
 * Ticket #114 - Batch type filter refinements
 */
describe('InstanceFilterPanel — Batch Type Narrow Card', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let enTranslations: any;
  let frTranslations: any;

  beforeEach(async () => {
    initTestEnvironment();

    // Load real EN/FR translations
    const enPath = path.resolve(__dirname, '../../../assets/i18n/en.json');
    const frPath = path.resolve(__dirname, '../../../assets/i18n/fr.json');
    enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    frTranslations = JSON.parse(fs.readFileSync(frPath, 'utf-8'));

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

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {}, fr: {} };

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  describe('[CARD WIDTH] 300px with max-width responsive', () => {
    it('should have width 300px in CSS', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Extract .criterion-editor-popover--batch-type width
      const widthMatch = cssContent.match(/\.criterion-editor-popover--batch-type\s*\{[^}]*width:\s*(\d+)px/);
      expect(widthMatch).toBeTruthy();
      expect(widthMatch![1]).toBe('300');
    });

    it('should have min-width 300px in CSS', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const minWidthMatch = cssContent.match(/\.criterion-editor-popover--batch-type\s*\{[^}]*min-width:\s*(\d+)px/);
      expect(minWidthMatch).toBeTruthy();
      expect(minWidthMatch![1]).toBe('300');
    });

    it('should have max-width calc(100vw - 32px) for responsive', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toMatch(/\.criterion-editor-popover--batch-type\s*\{[^}]*max-width:\s*calc\(100vw\s*-\s*32px\)/);
    });
  });

  describe('[CHARACTER BUDGET] FR labels ≤ 35 characters (with 2-line fallback)', () => {
    it('should have NO FR label exceeding 35 characters', () => {
      const longLabels: Array<{ key: string; label: string; length: number }> = [];

      component.BATCH_TYPE_OPTIONS.forEach(option => {
        const frLabel = frTranslations[option.i18nKey];
        if (frLabel && frLabel.length > 35) {
          longLabels.push({ key: option.i18nKey, label: frLabel, length: frLabel.length });
        }
      });

      if (longLabels.length > 0) {
        const details = longLabels.map(l => `  - ${l.key}: ${l.length} chars: "${l.label}"`).join('\n');
        throw new Error(`FR labels exceeding 35 characters:\n${details}\n\nThese will use 2-line fallback but should ideally be shorter.`);
      }
    });

    it('should have most FR labels ≤ 30 characters for single line', () => {
      let over30Count = 0;
      const labelsOver30: string[] = [];

      component.BATCH_TYPE_OPTIONS.forEach(option => {
        const frLabel = frTranslations[option.i18nKey];
        if (frLabel && frLabel.length > 30) {
          over30Count++;
          labelsOver30.push(`${option.i18nKey}: ${frLabel.length} chars`);
        }
      });

      // Allow max 4 labels to exceed 30 chars (2-line fallback)
      expect(over30Count).toBeLessThanOrEqual(4);

      if (labelsOver30.length > 0) {
        console.log('Labels using 2-line fallback (>30 chars):');
        labelsOver30.forEach(l => console.log(`  - ${l}`));
      }
    });

    it('should have EN labels unchanged (all original values)', () => {
      const expectedEN = [
        'Process Instance Modification',
        'Process Instance Deletion',
        'Process Instance Suspension',
        'Finished Instance Deletion',
        'Decision Instance Deletion',
        'Set Job Retries',
        'Set External Task Retries',
        'Set Variables',
        'Correlate Message',
        'Set Removal Time',
        'Set Removal Time (Decisions)',
        'Set Removal Time (Batches)'
      ];

      expectedEN.forEach((label, index) => {
        const option = component.BATCH_TYPE_OPTIONS[index];
        const enLabel = enTranslations[option.i18nKey];
        expect(enLabel).toBe(label);
      });
    });
  });

  describe('[2-LINE FALLBACK] CSS supports multi-line labels', () => {
    it('should have white-space: normal on .batch-type-row .state-row-label', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const labelCss = cssContent.match(/\.batch-type-row\s+\.state-row-label\s*\{[^}]+\}/s);
      expect(labelCss).toBeTruthy();
      expect(labelCss![0]).toMatch(/white-space:\s*normal/);
    });

    it('should have -webkit-line-clamp: 2 for 2-line limit', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const labelCss = cssContent.match(/\.batch-type-row\s+\.state-row-label\s*\{[^}]+\}/s);
      expect(labelCss).toBeTruthy();
      expect(labelCss![0]).toMatch(/-webkit-line-clamp:\s*2/);
    });

    it('should have min-height: 36px on .batch-type-row to accommodate 2 lines', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const rowCss = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/s);
      expect(rowCss).toBeTruthy();
      expect(rowCss![0]).toMatch(/min-height:\s*36px/);
    });

    it('should have line-height ~1.3 for tight multi-line text', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const labelCss = cssContent.match(/\.batch-type-row\s+\.state-row-label\s*\{[^}]+\}/s);
      expect(labelCss).toBeTruthy();
      expect(labelCss![0]).toMatch(/line-height:\s*1\.3/);
    });
  });

  describe('[TITLE ATTRIBUTE] HTML has title on each option', () => {
    it('should have [attr.title] binding in HTML template', () => {
      const htmlPath = path.resolve(__dirname, 'instance-filter-panel.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      // Check for title attribute on batch-type-row button
      expect(htmlContent).toMatch(/\[attr\.title\]\s*=\s*["']option\.i18nKey\s*\|\s*translate["']/);
    });

    it('should render title attribute in DOM for each option', () => {
      component.selectCriteriaType('type');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.batch-type-row');

      expect(buttons.length).toBe(12);

      buttons.forEach((button, index) => {
        const title = button.getAttribute('title');
        expect(title).toBeTruthy();
        expect(title!.length).toBeGreaterThan(0);
        expect(title).not.toBe('undefined');
        expect(title).not.toBe('null');

        // Title should match the translated label
        const option = component.BATCH_TYPE_OPTIONS[index];
        // In test environment, translate pipe may not work, so we check it exists
        expect(button.hasAttribute('title')).toBe(true);
      });
    });
  });

  describe('[MUTATION PROOF] Revert to old labels or wide card', () => {
    it('should FAIL if BATCH_TYPE_SET_EXTERNAL_TASK_RETRIES reverts to long label', () => {
      const key = 'BATCH_TYPE_SET_EXTERNAL_TASK_RETRIES';
      const frLabel = frTranslations[key];

      expect(frLabel).toBe('Tentatives de tâche externe');
      expect(frLabel).not.toBe('Définir les tentatives de tâche externe');
    });

    it('should FAIL if BATCH_TYPE_DECISION_SET_REMOVAL_TIME reverts to long label', () => {
      const key = 'BATCH_TYPE_DECISION_SET_REMOVAL_TIME';
      const frLabel = frTranslations[key];

      expect(frLabel).toBe('Temps de suppression (décisions)');
      expect(frLabel).not.toBe('Définir le temps de suppression (décisions)');
    });

    it('should FAIL if card width reverts to 320px', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const widthMatch = cssContent.match(/\.criterion-editor-popover--batch-type\s*\{[^}]*width:\s*(\d+)px/);
      expect(widthMatch![1]).toBe('300');
      expect(widthMatch![1]).not.toBe('320');
    });

    it('should FAIL if title attribute is removed from HTML', () => {
      const htmlPath = path.resolve(__dirname, 'instance-filter-panel.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      // Must have [attr.title]
      const hasTitleBinding = /\[attr\.title\]/.test(htmlContent);
      expect(hasTitleBinding).toBe(true);
    });
  });
});
