import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstanceFilterPanelComponent } from './instance-filter-panel';
import { TranslateService } from '../../i18n/translate.service';
import { of } from 'rxjs';
import { ChangeDetectorRef, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import * as fs from 'fs';
import * as path from 'path';

describe('InstanceFilterPanel — Batch Status Independent Entries', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let translateService: jasmine.SpyObj<TranslateService>;

  const enTranslations = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../assets/i18n/en.json'), 'utf-8'));
  const frTranslations = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../assets/i18n/fr.json'), 'utf-8'));

  beforeEach(async () => {
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'use', 'currentLang$']);
    translateSpy.instant.and.callFake((key: string) => enTranslations[key] || key);
    translateSpy.get.and.returnValue(of(''));
    translateSpy.currentLang$ = of('en');

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        { provide: TranslateService, useValue: translateSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  describe('Menu rendering (criteriaSet=batch)', () => {
    beforeEach(() => {
      component.criteriaSet = 'batch';
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should render STATE section header with "State" label', () => {
      component.showCriteriaDropdown = true;
      fixture.detectChanges();
      const labels = fixture.debugElement.queryAll(By.css('.criteria-group-label'));
      const stateLabel = labels.find(l => l.nativeElement.textContent.trim() === 'State');
      expect(stateLabel).toBeTruthy('STATE section header not found');
    });

    it('should render "Completed" menu entry with blue icon and correct labels', () => {
      component.showCriteriaDropdown = true;
      fixture.detectChanges();
      const buttons = fixture.debugElement.queryAll(By.css('.criteria-option'));
      const completedBtn = buttons.find(b => {
        const nameEl = b.query(By.css('.criteria-option-name'));
        return nameEl && nameEl.nativeElement.textContent.trim() === 'Completed';
      });
      expect(completedBtn).toBeTruthy('Completed menu button not found');

      const iconWrap = completedBtn!.query(By.css('.criteria-icon-wrap--blue'));
      expect(iconWrap).toBeTruthy('Blue icon wrapper not found for Completed');

      const descEl = completedBtn!.query(By.css('.criteria-option-desc'));
      expect(descEl.nativeElement.textContent.trim()).toBe('Show completed batches only');
    });

    it('should render "Running" menu entry with amber icon and correct labels', () => {
      component.showCriteriaDropdown = true;
      fixture.detectChanges();
      const buttons = fixture.debugElement.queryAll(By.css('.criteria-option'));
      const runningBtn = buttons.find(b => {
        const nameEl = b.query(By.css('.criteria-option-name'));
        return nameEl && nameEl.nativeElement.textContent.trim() === 'Running';
      });
      expect(runningBtn).toBeTruthy('Running menu button not found');

      const iconWrap = runningBtn!.query(By.css('.criteria-icon-wrap--amber'));
      expect(iconWrap).toBeTruthy('Amber icon wrapper not found for Running');

      const descEl = runningBtn!.query(By.css('.criteria-option-desc'));
      expect(descEl.nativeElement.textContent.trim()).toBe('Show running batches only');
    });

    it('should NOT render old "Status" popover menu entry', () => {
      component.showCriteriaDropdown = true;
      fixture.detectChanges();
      const buttons = fixture.debugElement.queryAll(By.css('.criteria-option'));
      const statusBtn = buttons.find(b => {
        const nameEl = b.query(By.css('.criteria-option-name'));
        return nameEl && nameEl.nativeElement.textContent.trim() === 'Status';
      });
      expect(statusBtn).toBeFalsy('Old "Status" menu entry should not exist');
    });
  });

  describe('Pill addition and exclusion logic', () => {
    beforeEach(() => {
      component.criteriaSet = 'batch';
      component.ngOnInit();
      component.activePills = [];
      fixture.detectChanges();
    });

    it('should add batchCompleted pill when Completed is clicked', () => {
      component.selectCriteriaType('batchCompleted');
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('batchCompleted');
      expect(component.activePills[0].values).toEqual([]);
    });

    it('should add batchRunning pill when Running is clicked', () => {
      component.selectCriteriaType('batchRunning');
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('batchRunning');
      expect(component.activePills[0].values).toEqual([]);
    });

    it('should replace batchRunning with batchCompleted (mutual exclusion)', () => {
      component.selectCriteriaType('batchRunning');
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('batchRunning');

      component.selectCriteriaType('batchCompleted');
      expect(component.activePills.length).toBe(1, 'Should have exactly 1 pill after replacement');
      expect(component.activePills[0].field).toBe('batchCompleted', 'Should have Completed pill');
      expect(component.activePills.some(p => p.field === 'batchRunning')).toBe(false, 'Running pill should be removed');
    });

    it('should replace batchCompleted with batchRunning (reverse exclusion)', () => {
      component.selectCriteriaType('batchCompleted');
      expect(component.activePills[0].field).toBe('batchCompleted');

      component.selectCriteriaType('batchRunning');
      expect(component.activePills.length).toBe(1, 'Should have exactly 1 pill after replacement');
      expect(component.activePills[0].field).toBe('batchRunning', 'Should have Running pill');
      expect(component.activePills.some(p => p.field === 'batchCompleted')).toBe(false, 'Completed pill should be removed');
    });

    it('should preserve other pills when replacing status criteria', () => {
      component.selectCriteriaType('batchId');
      component.pendingTextValue = 'ABC123';
      component.confirmCriterion();
      expect(component.activePills.length).toBe(1);
      expect(component.activePills[0].field).toBe('batchId');

      component.selectCriteriaType('batchCompleted');
      expect(component.activePills.length).toBe(2, 'Should have both batchId and batchCompleted');
      expect(component.activePills.some(p => p.field === 'batchId')).toBe(true, 'batchId pill preserved');
      expect(component.activePills.some(p => p.field === 'batchCompleted')).toBe(true, 'batchCompleted pill added');

      component.selectCriteriaType('batchRunning');
      expect(component.activePills.length).toBe(2, 'Should still have 2 pills');
      expect(component.activePills.some(p => p.field === 'batchId')).toBe(true, 'batchId pill still preserved');
      expect(component.activePills.some(p => p.field === 'batchRunning')).toBe(true, 'batchRunning pill replaced');
      expect(component.activePills.some(p => p.field === 'batchCompleted')).toBe(false, 'batchCompleted pill removed');
    });
  });

  describe('Pill labels and icons', () => {
    it('should return "Completed batches" label for batchCompleted pill', () => {
      const pill = { field: 'batchCompleted' as const, values: [] };
      const label = component.getPillLabel(pill);
      expect(label).toBe('Completed batches');
    });

    it('should return "Running batches" label for batchRunning pill', () => {
      const pill = { field: 'batchRunning' as const, values: [] };
      const label = component.getPillLabel(pill);
      expect(label).toBe('Running batches');
    });

    it('should return faCheckCircle icon for batchCompleted pill', () => {
      const pill = { field: 'batchCompleted' as const, values: [] };
      const icon = component.getPillIcon(pill);
      expect(icon).toBe(component.faCheckCircle);
    });

    it('should return faPlay icon for batchRunning pill', () => {
      const pill = { field: 'batchRunning' as const, values: [] };
      const icon = component.getPillIcon(pill);
      expect(icon).toBe(component.faPlay);
    });

    it('should support legacy "completed" field with "true" value (migration compatibility)', () => {
      const pill = { field: 'completed' as const, values: ['true'] };
      const label = component.getPillLabel(pill);
      expect(label).toContain('Completed');
      expect(label).toContain('Status:');
    });

    it('should support legacy "completed" field with "false" value (migration compatibility)', () => {
      const pill = { field: 'completed' as const, values: ['false'] };
      const label = component.getPillLabel(pill);
      expect(label).toContain('Running');
      expect(label).toContain('Status:');
    });
  });

  describe('Pill click behavior (removal without edit)', () => {
    beforeEach(() => {
      component.criteriaSet = 'batch';
      component.ngOnInit();
      component.activePills = [];
      fixture.detectChanges();
    });

    it('should remove batchCompleted pill when clicked (no edit mode)', () => {
      component.selectCriteriaType('batchCompleted');
      expect(component.activePills.length).toBe(1);

      component.startEditPill(0, new Event('click'));
      expect(component.activePills.length).toBe(0, 'Pill should be removed on click');
    });

    it('should remove batchRunning pill when clicked (no edit mode)', () => {
      component.selectCriteriaType('batchRunning');
      expect(component.activePills.length).toBe(1);

      component.startEditPill(0, new Event('click'));
      expect(component.activePills.length).toBe(0, 'Pill should be removed on click');
    });
  });

  describe('i18n parity EN/FR', () => {
    it('should have all new keys in both EN and FR', () => {
      const keys = [
        'cockpit.batchOps.filters.batchCompleted',
        'cockpit.batchOps.filters.batchRunning',
        'cockpit.batchOps.globalSearch.desc.batchCompleted',
        'cockpit.batchOps.globalSearch.desc.batchRunning',
        'cockpit.batchOps.globalSearch.pill.batchCompleted',
        'cockpit.batchOps.globalSearch.pill.batchRunning'
      ];

      keys.forEach(key => {
        expect(enTranslations[key]).toBeTruthy(`EN missing: ${key}`);
        expect(frTranslations[key]).toBeTruthy(`FR missing: ${key}`);
        expect(enTranslations[key]).not.toContain('cockpit.', `EN value contains raw key: ${key}`);
        expect(frTranslations[key]).not.toContain('cockpit.', `FR value contains raw key: ${key}`);
      });
    });

    it('should not contain dashes, underscores, or "historic" in displayed labels', () => {
      const keys = [
        'cockpit.batchOps.filters.batchCompleted',
        'cockpit.batchOps.filters.batchRunning',
        'cockpit.batchOps.globalSearch.pill.batchCompleted',
        'cockpit.batchOps.globalSearch.pill.batchRunning'
      ];

      keys.forEach(key => {
        const enValue = enTranslations[key];
        const frValue = frTranslations[key];
        expect(enValue).not.toMatch(/[-_]/, `EN contains dash/underscore: ${key}`);
        expect(frValue).not.toMatch(/[-_]/, `FR contains dash/underscore: ${key}`);
        expect(enValue.toLowerCase()).not.toContain('historic', `EN contains "historic": ${key}`);
        expect(frValue.toLowerCase()).not.toContain('historic', `FR contains "historic": ${key}`);
      });
    });
  });
});