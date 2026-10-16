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
 * COLORED TILES TEST
 *
 * Verifies batch type icons have rounded colored tiles matching wizard badges exactly:
 * - 24x24px tiles with 6px border-radius
 * - Same rgba backgrounds as wizard .badge--<color>
 * - Same color values as wizard badges
 * - ~12px icon size
 *
 * Ticket #114 - Batch type filter visual refinements
 */
describe('InstanceFilterPanel — Batch Type Colored Tiles', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;

  // Expected mapping: iconColor → { background, color }
  const WIZARD_BADGE_STYLES: Record<string, { background: string; color: string }> = {
    'amber':     { background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' },
    'green':     { background: 'rgba(22, 163, 74, 0.12)',  color: '#16a34a' },
    'red':       { background: 'rgba(220, 38, 38, 0.12)',  color: '#dc2626' },
    'blue':      { background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
    'purple':    { background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' },
    'gray':      { background: 'rgba(107, 114, 128, 0.12)', color: '#6b7280' },
    'secondary': { background: 'rgba(107, 114, 128, 0.08)', color: 'var(--text-secondary)' }
  };

  beforeEach(async () => {
    initTestEnvironment();

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

  describe('[TILE DIMENSIONS] 24x24px with 6px border-radius', () => {
    it('should have width 24px in CSS', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const iconCss = cssContent.match(/\.batch-type-icon\s*\{[^}]+\}/s);
      expect(iconCss).toBeTruthy();
      expect(iconCss![0]).toMatch(/width:\s*24px/);
    });

    it('should have min-width 24px in CSS', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const iconCss = cssContent.match(/\.batch-type-icon\s*\{[^}]+\}/s);
      expect(iconCss).toBeTruthy();
      expect(iconCss![0]).toMatch(/min-width:\s*24px/);
    });

    it('should have height 24px in CSS', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const iconCss = cssContent.match(/\.batch-type-icon\s*\{[^}]+\}/s);
      expect(iconCss).toBeTruthy();
      expect(iconCss![0]).toMatch(/height:\s*24px/);
    });

    it('should have border-radius 6px in CSS', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const iconCss = cssContent.match(/\.batch-type-icon\s*\{[^}]+\}/s);
      expect(iconCss).toBeTruthy();
      expect(iconCss![0]).toMatch(/border-radius:\s*6px/);
    });

    it('should have font-size ~12px for icon', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const iconCss = cssContent.match(/\.batch-type-icon\s*\{[^}]+\}/s);
      expect(iconCss).toBeTruthy();
      expect(iconCss![0]).toMatch(/font-size:\s*12px/);
    });
  });

  describe('[WIZARD BADGE SYNC] Exact background + color from wizard', () => {
    it('should extract wizard badge styles from batch-operation-list.css', () => {
      const wizardCssPath = path.resolve(__dirname, '../../components/cockpit/cockpit-batch/batch-operation-list/batch-operation-list.css');
      const wizardCssContent = fs.readFileSync(wizardCssPath, 'utf-8');

      // Extract .badge--amber/green/red/blue/purple/gray
      const badgeRegex = /\.badge--(amber|green|red|blue|purple|gray)\s*\{\s*background:\s*([^;]+);\s*color:\s*([^;]+);/g;
      let match;
      const extractedBadges: Record<string, { background: string; color: string }> = {};

      while ((match = badgeRegex.exec(wizardCssContent)) !== null) {
        const colorFamily = match[1];
        const background = match[2].trim();
        const color = match[3].trim();
        extractedBadges[colorFamily] = { background, color };
      }

      // Verify all 6 families extracted
      expect(Object.keys(extractedBadges).length).toBe(6);
      expect(extractedBadges['amber']).toBeDefined();
      expect(extractedBadges['green']).toBeDefined();
      expect(extractedBadges['red']).toBeDefined();
      expect(extractedBadges['blue']).toBeDefined();
      expect(extractedBadges['purple']).toBeDefined();
      expect(extractedBadges['gray']).toBeDefined();

      // Verify they match our expected values
      Object.entries(extractedBadges).forEach(([family, styles]) => {
        expect(styles.background).toBe(WIZARD_BADGE_STYLES[family].background);
        expect(styles.color).toBe(WIZARD_BADGE_STYLES[family].color);
      });
    });

    const testCases = Object.entries(WIZARD_BADGE_STYLES)
      .filter(([family]) => family !== 'secondary') // secondary not in wizard
      .map(([family, styles]) => ({ family, ...styles }));

    it.each(testCases)(
      'family=$family should have background=$background and color=$color matching wizard',
      ({ family, background, color }) => {
        const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
        const cssContent = fs.readFileSync(cssPath, 'utf-8');

        // Extract .batch-type-icon--<family>
        const iconFamilyRegex = new RegExp(`\\.batch-type-icon--${family}\\s*\\{[^}]+\\}`, 's');
        const iconFamilyCss = cssContent.match(iconFamilyRegex);

        expect(iconFamilyCss).toBeTruthy();

        // Extract background and color
        const bgMatch = iconFamilyCss![0].match(/background:\s*([^;]+);/);
        const colorMatch = iconFamilyCss![0].match(/color:\s*([^;]+);/);

        expect(bgMatch).toBeTruthy();
        expect(colorMatch).toBeTruthy();

        const actualBackground = bgMatch![1].trim();
        const actualColor = colorMatch![1].trim();

        // Compare with wizard badge values
        expect(actualBackground).toBe(background);
        expect(actualColor).toBe(color);
      }
    );

    it('should have secondary with gray-based background', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const secondaryCss = cssContent.match(/\.batch-type-icon--secondary\s*\{[^}]+\}/s);
      expect(secondaryCss).toBeTruthy();

      // Secondary uses gray base with lower opacity
      expect(secondaryCss![0]).toMatch(/background:\s*rgba\(107,\s*114,\s*128,\s*0\.08\)/);
      expect(secondaryCss![0]).toMatch(/color:\s*var\(--text-secondary\)/);
    });
  });

  describe('[DOM RENDERING] All options have correct color family class', () => {
    it('should render all 12 batch type options with icon color classes', () => {
      component.selectCriteriaType('type');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const iconWrappers = compiled.querySelectorAll('.batch-type-icon');

      expect(iconWrappers.length).toBe(12);

      // Expected iconColor per option (from BATCH_TYPE_OPTIONS order)
      const expectedColors = [
        'blue',      // instance-modification
        'red',       // instance-deletion
        'amber',     // instance-update-suspension-state
        'red',       // historic-instance-deletion
        'red',       // historic-decision-instance-deletion
        'blue',      // set-job-retries
        'blue',      // set-external-task-retries
        'purple',    // set-variables
        'blue',      // correlate-message
        'gray',      // process-set-removal-time
        'gray',      // decision-set-removal-time
        'gray'       // batch-set-removal-time
      ];

      iconWrappers.forEach((wrapper, index) => {
        const expectedColor = expectedColors[index];
        const expectedClass = `batch-type-icon--${expectedColor}`;

        expect(wrapper.classList.contains('batch-type-icon')).toBe(true);
        expect(wrapper.classList.contains(expectedClass)).toBe(true);
      });
    });

    it('should have exactly one color family class per icon', () => {
      component.selectCriteriaType('type');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const iconWrappers = compiled.querySelectorAll('.batch-type-icon');

      const colorFamilies = ['amber', 'green', 'red', 'blue', 'purple', 'gray', 'secondary'];

      iconWrappers.forEach((wrapper) => {
        const matchingClasses = colorFamilies.filter(family =>
          wrapper.classList.contains(`batch-type-icon--${family}`)
        );

        expect(matchingClasses.length).toBe(1);
      });
    });
  });

  describe('[LAYOUT PRESERVATION] Row height, card width, scrolling unchanged', () => {
    it('should preserve row min-height 36px', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const rowCss = cssContent.match(/\.batch-type-row\s*\{[^}]+\}/s);
      expect(rowCss).toBeTruthy();
      expect(rowCss![0]).toMatch(/min-height:\s*36px/);
    });

    it('should preserve card width 300px', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const cardCss = cssContent.match(/\.criterion-editor-popover--batch-type\s*\{[^}]+\}/s);
      expect(cardCss).toBeTruthy();
      expect(cardCss![0]).toMatch(/width:\s*300px/);
    });

    it('should preserve 6 visible rows calculation', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const listCss = cssContent.match(/\.batch-type-list--scrollable\s*\{[^}]+\}/s);
      expect(listCss).toBeTruthy();
      expect(listCss![0]).toMatch(/--batch-type-visible-rows:\s*6/);
    });
  });

  describe('[MUTATION PROOF] Detect changes to rgba or color classes', () => {
    it('should FAIL if purple rgba background changes', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const purpleCss = cssContent.match(/\.batch-type-icon--purple\s*\{[^}]+\}/s);
      const bgMatch = purpleCss![0].match(/background:\s*([^;]+);/);

      // Should match wizard exactly
      expect(bgMatch![1].trim()).toBe('rgba(124, 58, 237, 0.12)');
      expect(bgMatch![1].trim()).not.toBe('rgba(0, 0, 255, 0.12)'); // Not generic blue
    });

    it('should FAIL if red color value changes', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const redCss = cssContent.match(/\.batch-type-icon--red\s*\{[^}]+\}/s);
      const colorMatch = redCss![0].match(/color:\s*([^;]+);/);

      // Should match wizard exactly
      expect(colorMatch![1].trim()).toBe('#dc2626');
      expect(colorMatch![1].trim()).not.toBe('#ff0000'); // Not generic red
    });

    it('should FAIL if a batch type option loses its color family class', () => {
      component.selectCriteriaType('type');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const firstIcon = compiled.querySelector('.batch-type-icon');

      // First option (instance-modification) should have blue
      expect(firstIcon?.classList.contains('batch-type-icon--blue')).toBe(true);
    });

    it('should FAIL if tile dimensions change from 24px', () => {
      const cssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const iconCss = cssContent.match(/\.batch-type-icon\s*\{[^}]+\}/s);

      expect(iconCss![0]).toMatch(/width:\s*24px/);
      expect(iconCss![0]).toMatch(/height:\s*24px/);
      expect(iconCss![0]).not.toMatch(/width:\s*20px/); // Old value
    });
  });
});
