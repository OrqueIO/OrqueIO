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
import { BATCH_OPERATIONS } from '../../components/cockpit/cockpit-batch/batch-operations-wizard/batch-operations-wizard';
import { initTestEnvironment } from '../../testing/test-utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * WIZARD SYNCHRONIZATION TEST
 *
 * Ensures batch type filter icons and colors match BATCH_OPERATIONS wizard exactly.
 * For each batch type with an associated wizard operation:
 * - Verifies same FontAwesome icon
 * - Verifies same color extracted from badge CSS classes
 *
 * Mutation: Change icon or color in filter → test fails (RED)
 *
 * Ticket #114 - Batch type filter corrections
 */
describe('InstanceFilterPanel — Batch Type Wizard Synchronization', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let badgeColors: Map<string, string>;

  // Mapping: batch type value → wizard operation ID
  const TYPE_TO_OPERATION_MAP: Record<string, string> = {
    'instance-update-suspension-state': 'suspend',
    'instance-deletion': 'delete-running',
    'historic-instance-deletion': 'delete-finished',
    'historic-decision-instance-deletion': 'delete-decision',
    'set-job-retries': 'set-retries-jobs',
    'set-external-task-retries': 'set-retries-external',
    'set-variables': 'set-variables',
    'instance-modification': 'move-instances',
    'correlate-message': 'correlate',
    'process-set-removal-time': 'removal-time-process',
    'decision-set-removal-time': 'removal-time-decision',
    'batch-set-removal-time': 'removal-time-batch'
    // instance-restart: NO wizard operation (not in map)
  };

  beforeEach(async () => {
    initTestEnvironment();

    // Extract badge colors from batch-operation-list.css
    const cssPath = path.resolve(__dirname, '../../components/cockpit/cockpit-batch/batch-operation-list/batch-operation-list.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    badgeColors = new Map();
    const badgeRegex = /\.badge--(amber|green|red|blue|purple|gray)\s*\{[^}]*color:\s*([^;]+);/g;
    let match;
    while ((match = badgeRegex.exec(cssContent)) !== null) {
      badgeColors.set(match[1], match[2].trim());
    }

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
    (translateService as any).translations = { en: {} };

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  describe('[WIZARD SYNC] Icons match BATCH_OPERATIONS', () => {
    it('should have same icons as wizard operations for all mapped types', () => {
      const failedMatches: string[] = [];

      Object.entries(TYPE_TO_OPERATION_MAP).forEach(([typeValue, operationId]) => {
        const filterOption = component.BATCH_TYPE_OPTIONS.find(o => o.value === typeValue);
        const wizardOperation = BATCH_OPERATIONS.find(o => o.id === operationId);

        expect(filterOption).toBeDefined();
        expect(wizardOperation).toBeDefined();

        // Compare icon references
        if (filterOption!.icon !== wizardOperation!.icon) {
          failedMatches.push(
            `${typeValue}: filter icon ${filterOption!.icon.iconName} !== wizard icon ${wizardOperation!.icon.iconName}`
          );
        }
      });

      if (failedMatches.length > 0) {
        throw new Error('Icon mismatch:\n' + failedMatches.join('\n'));
      }
    });

    it('should display wizard icon correspondence table', () => {
      const table: Array<{type: string, operation: string, icon: string, matches: boolean}> = [];

      Object.entries(TYPE_TO_OPERATION_MAP).forEach(([typeValue, operationId]) => {
        const filterOption = component.BATCH_TYPE_OPTIONS.find(o => o.value === typeValue);
        const wizardOperation = BATCH_OPERATIONS.find(o => o.id === operationId);

        table.push({
          type: typeValue,
          operation: operationId,
          icon: wizardOperation!.icon.iconName,
          matches: filterOption!.icon === wizardOperation!.icon
        });
      });

      // All should match
      expect(table.every(row => row.matches)).toBe(true);

      // Log table for documentation
      console.log('\n=== WIZARD ICON SYNCHRONIZATION ===');
      table.forEach(row => {
        console.log(`${row.type} → ${row.operation}: ${row.icon} ${row.matches ? '✓' : '✗'}`);
      });
    });
  });

  describe('[WIZARD SYNC] Colors match badge classes (real hex values)', () => {
    let filterColors: Map<string, string>;

    beforeEach(() => {
      // Extract filter icon colors from instance-filter-panel.css
      const filterCssPath = path.resolve(__dirname, 'instance-filter-panel.css');
      const filterCssContent = fs.readFileSync(filterCssPath, 'utf-8');

      filterColors = new Map();
      const filterColorRegex = /\.batch-type-icon--(amber|green|red|blue|purple|gray|secondary)\s*\{[^}]*color:\s*([^;]+);/g;
      let match;
      while ((match = filterColorRegex.exec(filterCssContent)) !== null) {
        filterColors.set(match[1], match[2].trim());
      }
    });

    it('should have same hex color values as wizard badge classes for all mapped types', () => {
      const failedMatches: string[] = [];

      Object.entries(TYPE_TO_OPERATION_MAP).forEach(([typeValue, operationId]) => {
        const filterOption = component.BATCH_TYPE_OPTIONS.find(o => o.value === typeValue);
        const wizardOperation = BATCH_OPERATIONS.find(o => o.id === operationId);

        expect(filterOption).toBeDefined();
        expect(wizardOperation).toBeDefined();

        // Extract badge class name (e.g., "badge--amber" → "amber")
        const badgeClass = wizardOperation!.badgeClass.replace('badge--', '');
        const wizardHexColor = badgeColors.get(badgeClass);
        const filterHexColor = filterColors.get(filterOption!.iconColor);

        expect(wizardHexColor).toBeDefined();
        expect(filterHexColor).toBeDefined();

        // Compare ACTUAL hex values, not just family names
        if (wizardHexColor !== filterHexColor) {
          failedMatches.push(
            `${typeValue}: wizard ${wizardHexColor} !== filter ${filterHexColor}`
          );
        }
      });

      if (failedMatches.length > 0) {
        throw new Error('Hex color mismatch:\n' + failedMatches.join('\n'));
      }
    });

    const testCases = Object.entries(TYPE_TO_OPERATION_MAP).map(([typeValue, operationId]) => ({
      type: typeValue,
      operationId
    }));

    it.each(testCases)(
      'type=$type → operation=$operationId should have same icon and hex color',
      ({ type: typeValue, operationId }) => {
        const filterOption = component.BATCH_TYPE_OPTIONS.find(o => o.value === typeValue);
        const wizardOperation = BATCH_OPERATIONS.find(o => o.id === operationId);

        expect(filterOption).toBeDefined();
        expect(wizardOperation).toBeDefined();

        // Icon match
        expect(filterOption!.icon).toBe(wizardOperation!.icon);
        expect(filterOption!.icon.iconName).toBe(wizardOperation!.icon.iconName);

        // Hex color match
        const badgeClass = wizardOperation!.badgeClass.replace('badge--', '');
        const wizardHexColor = badgeColors.get(badgeClass);
        const filterHexColor = filterColors.get(filterOption!.iconColor);

        expect(wizardHexColor).toBe(filterHexColor);
      }
    );
  });

  describe('[MUTATION PROOF] Icon or color change detection', () => {
    it('should fail if instance-deletion icon differs from delete-running wizard operation', () => {
      const filterOption = component.BATCH_TYPE_OPTIONS.find(o => o.value === 'instance-deletion');
      const wizardOperation = BATCH_OPERATIONS.find(o => o.id === 'delete-running');

      // This should FAIL if icon is changed in filter
      expect(filterOption!.icon).toBe(wizardOperation!.icon);
      expect(filterOption!.icon.iconName).toBe('trash');
    });

    it('should fail if set-variables color differs from wizard badge--purple', () => {
      const filterOption = component.BATCH_TYPE_OPTIONS.find(o => o.value === 'set-variables');
      const wizardOperation = BATCH_OPERATIONS.find(o => o.id === 'set-variables');

      const badgeClass = wizardOperation!.badgeClass.replace('badge--', '');

      // This should FAIL if color is changed in filter
      expect(filterOption!.iconColor).toBe(badgeClass);
      expect(filterOption!.iconColor).toBe('purple');
    });

    it('should fail if correlate-message icon differs from wizard envelope', () => {
      const filterOption = component.BATCH_TYPE_OPTIONS.find(o => o.value === 'correlate-message');
      const wizardOperation = BATCH_OPERATIONS.find(o => o.id === 'correlate');

      // This should FAIL if icon is changed
      expect(filterOption!.icon).toBe(wizardOperation!.icon);
      expect(filterOption!.icon.iconName).toBe('envelope');
    });
  });
});
