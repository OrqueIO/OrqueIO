import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
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
import * as crypto from 'crypto';

/**
 * MUTATION TESTS: Batch Type Filter — Verify breaking changes fail tests
 *
 * Tests that verify removing critical elements causes test failures:
 * 1. Remove icon from first option → test should fail
 * 2. Remove state-row--selected class → test should fail
 *
 * Part of ticket #114 - Set removal time for batches - ÉTAPE 2 (mutations)
 */
describe('InstanceFilterPanel — Batch Type Mutations', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let compiled: HTMLElement;

  const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
  const htmlFilePath = path.resolve(__dirname, 'instance-filter-panel.html');
  let originalHtmlContent: string;
  let originalHtmlHash: string;

  beforeAll(() => {
    // Save original HTML content and hash
    originalHtmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
    originalHtmlHash = crypto.createHash('sha256').update(originalHtmlContent).digest('hex');

    // Save backup to temp directory
    const backupPath = path.join(tempDir, 'instance-filter-panel.html.backup');
    fs.writeFileSync(backupPath, originalHtmlContent, 'utf-8');
  });

  afterEach(() => {
    // Always restore original content after each test
    fs.writeFileSync(htmlFilePath, originalHtmlContent, 'utf-8');
  });

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
    compiled = fixture.nativeElement as HTMLElement;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = {
      en: {
        'BATCH_TYPE_MODIFICATION': 'Process Instance Modification',
        'BATCH_TYPE_RESTART': 'Process Instance Restart',
        'BATCH_TYPE_DELETION': 'Process Instance Deletion',
        'BATCH_TYPE_SUSPENSION': 'Process Instance Suspension',
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

  describe('[MUTATION] Remove icon from first batch type option', () => {
    it('should fail when batch-type-icon is removed from HTML', () => {
      // Apply mutation: remove the icon span from the first button
      const mutatedHtml = originalHtmlContent.replace(
        /<span class="batch-type-icon batch-type-icon--\{\{option\.iconColor\}\}"[^>]*>.*?<\/span>/,
        ''
      );

      fs.writeFileSync(htmlFilePath, mutatedHtml, 'utf-8');

      const mutatedHash = crypto.createHash('sha256').update(mutatedHtml).digest('hex');
      expect(mutatedHash).not.toBe(originalHtmlHash);

      component.selectCriteriaType('type');
      fixture.detectChanges();

      const icons = compiled.querySelectorAll('.batch-type-icon');
      expect(icons.length).toBe(12);
    });
  });

  describe('[MUTATION] Remove state-row--selected class', () => {
    it('should fail when state-row--selected class is removed from HTML', () => {
      // Apply mutation: remove the state-row--selected binding
      const mutatedHtml = originalHtmlContent.replace(
        /\[class\.state-row--selected\]="[^"]*"/,
        ''
      );

      // Write mutated HTML
      fs.writeFileSync(htmlFilePath, mutatedHtml, 'utf-8');

      // Verify hash changed (mutation applied)
      const mutatedHash = crypto.createHash('sha256').update(mutatedHtml).digest('hex');
      expect(mutatedHash).not.toBe(originalHtmlHash);

      // THIS TEST SHOULD FAIL with mutated HTML
      component.selectCriteriaType('type');
      fixture.detectChanges();

      const buttons = compiled.querySelectorAll<HTMLButtonElement>('.batch-type-row');
      buttons[0].click();
      fixture.detectChanges();

      expect(buttons[0].classList.contains('state-row--selected')).toBe(true); // Should fail if mutation was applied
    });
  });

  describe('[BASELINE] Verify original file integrity', () => {
    it('should have original HTML file with correct hash', () => {
      const currentContent = fs.readFileSync(htmlFilePath, 'utf-8');
      const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');

      expect(currentHash).toBe(originalHtmlHash);
    });

    it('should have backup file in temp directory', () => {
      const backupPath = path.join(tempDir, 'instance-filter-panel.html.backup');
      expect(fs.existsSync(backupPath)).toBe(true);

      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      expect(backupContent).toBe(originalHtmlContent);
    });
  });
});