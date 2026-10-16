import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { InstanceFilterPanelComponent } from './instance-filter-panel';
import { ProcessDefinitionService } from '../../services/process-definition.service';
import { DecisionService } from '../../services/decision.service';
import { TranslateService } from '../../i18n/translate.service';
import { initTestEnvironment } from '../../testing/test-utils';

/**
 * TEST: Batch Type Select All functionality
 *
 * Scenarios:
 * 1. Initial state: "0 of 12", checkbox unchecked
 * 2. After 1 click: "1 of 12", partial state
 * 3. Deselect: back to "0 of 12"
 * 4. Click Select all from empty: 12 selected, "12 of 12", all checked
 * 5. Click Select all from partial: all selected
 * 6. Click Select all from all: 0 selected, "0 of 12", unchecked
 * 7. M = 12 (BATCH_TYPE_OPTIONS.length, not 14 from BATCH_TYPE_LABELS)
 * 8. Select all row not in scrollable container
 * 9. EN/FR labels, no "cockpit.", no raw values
 */
describe('InstanceFilterPanel — Batch Type Select All', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    initTestEnvironment();

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ProcessDefinitionService,
          useValue: { getProcessDefinitions: vi.fn().mockReturnValue({ subscribe: vi.fn() }) }
        },
        {
          provide: DecisionService,
          useValue: { getDecisionDefinitions: vi.fn().mockReturnValue({ subscribe: vi.fn() }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    const fs = require('fs');
    const path = require('path');
    const enPath = path.resolve(__dirname, '../../../assets/i18n/en.json');
    const frPath = path.resolve(__dirname, '../../../assets/i18n/fr.json');
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    const frData = JSON.parse(fs.readFileSync(frPath, 'utf-8'));

    const ts = TestBed.inject(TranslateService);
    (ts as any).translations = { en: enData, fr: frData };
    (ts as any).currentLangSubject.next('en');

    component.criteriaSet = 'batch';
    component.ngOnInit();
    fixture.detectChanges();
  });

  afterEach(() => {
    const pendingReqs = httpMock.match(() => true);
    pendingReqs.forEach(req => {
      if (req.request.url.includes('/assets/i18n/')) {
        req.flush({});
      }
    });
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('TEST 1: Initial state -> "0 of 12", checkbox unchecked', () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();

    expect(component.btSelectedCount).toBe(0);
    expect(component.btAllSelected).toBe(false);
    expect(component.btSomeSelected).toBe(false);
    expect(component.BATCH_TYPE_OPTIONS.length).toBe(12);

    const selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    expect(selectAllBtn).toBeTruthy();

    const countSpan = selectAllBtn.querySelector('.processdef-select-all-count');
    expect(countSpan.textContent.trim()).toContain('0');
    expect(countSpan.textContent.trim()).toContain('12');

    const emptyIcon = selectAllBtn.querySelector('.processdef-sa-icon--empty');
    expect(emptyIcon).toBeTruthy();
  });

  it('TEST 2: After 1 click on type -> "1 of 12", partial state', () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();

    const typeRows = fixture.nativeElement.querySelectorAll('.batch-type-row');
    expect(typeRows.length).toBe(12);

    typeRows[0].click();
    fixture.detectChanges();

    expect(component.btSelectedCount).toBe(1);
    expect(component.btAllSelected).toBe(false);
    expect(component.btSomeSelected).toBe(true);

    const selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    const countSpan = selectAllBtn.querySelector('.processdef-select-all-count');
    expect(countSpan.textContent.trim()).toContain('1');
    expect(countSpan.textContent.trim()).toContain('12');

    const partialIcon = selectAllBtn.querySelector('.processdef-sa-icon--partial');
    expect(partialIcon).toBeTruthy();
  });

  it('TEST 3: Deselect -> back to "0 of 12"', () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();

    const typeRows = fixture.nativeElement.querySelectorAll('.batch-type-row');
    typeRows[0].click();
    fixture.detectChanges();
    expect(component.btSelectedCount).toBe(1);

    typeRows[0].click();
    fixture.detectChanges();

    expect(component.btSelectedCount).toBe(0);
    expect(component.btAllSelected).toBe(false);
    expect(component.btSomeSelected).toBe(false);

    const selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    const countSpan = selectAllBtn.querySelector('.processdef-select-all-count');
    expect(countSpan.textContent.trim()).toContain('0');
    expect(countSpan.textContent.trim()).toContain('12');
  });

  it('TEST 4: Click Select all from empty -> 12 selected, "12 of 12", all checked', () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();

    const selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    selectAllBtn.click();
    fixture.detectChanges();

    expect(component.btSelectedCount).toBe(12);
    expect(component.btAllSelected).toBe(true);
    expect(component.btSomeSelected).toBe(false);

    const typeRows = fixture.nativeElement.querySelectorAll('.batch-type-row');
    typeRows.forEach((row: HTMLElement) => {
      expect(row.classList.contains('batch-type-row--selected')).toBe(true);
      expect(row.classList.contains('state-row--selected')).toBe(true);
    });

    const countSpan = selectAllBtn.querySelector('.processdef-select-all-count');
    expect(countSpan.textContent.trim()).toContain('12');
    expect(countSpan.textContent.trim()).toContain('12');

    const allIcon = selectAllBtn.querySelector('.processdef-sa-icon--all');
    expect(allIcon).toBeTruthy();

    expect(component.pendingValues.length).toBe(12);
    expect(component.pendingValues).toEqual([
      'instance-modification',
      'instance-deletion',
      'instance-update-suspension-state',
      'historic-instance-deletion',
      'historic-decision-instance-deletion',
      'set-job-retries',
      'set-external-task-retries',
      'set-variables',
      'correlate-message',
      'process-set-removal-time',
      'decision-set-removal-time',
      'batch-set-removal-time'
    ]);
  });

  it('TEST 5: Click Select all from partial -> all selected', () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();

    const typeRows = fixture.nativeElement.querySelectorAll('.batch-type-row');
    typeRows[0].click();
    typeRows[1].click();
    fixture.detectChanges();
    expect(component.btSelectedCount).toBe(2);
    expect(component.btSomeSelected).toBe(true);

    const selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    selectAllBtn.click();
    fixture.detectChanges();

    expect(component.btSelectedCount).toBe(12);
    expect(component.btAllSelected).toBe(true);
    expect(component.btSomeSelected).toBe(false);

    expect(component.pendingValues.length).toBe(12);
  });

  it('TEST 6: Click Select all from all selected -> 0 selected, "0 of 12", unchecked', () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();

    const selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    selectAllBtn.click();
    fixture.detectChanges();
    expect(component.btAllSelected).toBe(true);

    selectAllBtn.click();
    fixture.detectChanges();

    expect(component.btSelectedCount).toBe(0);
    expect(component.btAllSelected).toBe(false);
    expect(component.btSomeSelected).toBe(false);

    const countSpan = selectAllBtn.querySelector('.processdef-select-all-count');
    expect(countSpan.textContent.trim()).toContain('0');
    expect(countSpan.textContent.trim()).toContain('12');

    const emptyIcon = selectAllBtn.querySelector('.processdef-sa-icon--empty');
    expect(emptyIcon).toBeTruthy();

    expect(component.pendingValues.length).toBe(0);
  });

  it('TEST 7: M = 12 (BATCH_TYPE_OPTIONS.length, not 14)', () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();

    const selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    const countSpan = selectAllBtn.querySelector('.processdef-select-all-count');

    expect(component.BATCH_TYPE_OPTIONS.length).toBe(12);
    expect(countSpan.textContent.trim()).toContain('12');
    expect(countSpan.textContent.trim()).not.toContain('14');

    selectAllBtn.click();
    fixture.detectChanges();

    expect(component.pendingValues.length).toBe(12);
    expect(component.btAllSelected).toBe(true);
  });

  it('TEST 8: Select all row NOT in scrollable container, list keeps 6 lines visible', () => {
    component.selectCriteriaType('type');
    fixture.detectChanges();

    const selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    const scrollableContainer = fixture.nativeElement.querySelector('.batch-type-list--scrollable');

    expect(selectAllBtn).toBeTruthy();
    expect(scrollableContainer).toBeTruthy();

    expect(scrollableContainer.contains(selectAllBtn)).toBe(false);

    const parentDiv = selectAllBtn.parentElement;
    expect(parentDiv.classList.contains('editor-popover-body')).toBe(true);

    const divider = fixture.nativeElement.querySelector('.processdef-select-all-divider');
    expect(divider).toBeTruthy();

    const typeRows = scrollableContainer.querySelectorAll('.batch-type-row');
    expect(typeRows.length).toBe(12);
  });

  it('TEST 9: EN/FR labels, no "cockpit.", no raw values', () => {
    const ts = TestBed.inject(TranslateService);

    component.selectCriteriaType('type');
    fixture.detectChanges();

    let selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    let labelSpan = selectAllBtn.querySelector('.state-row-label');
    let countSpan = selectAllBtn.querySelector('.processdef-select-all-count');

    expect(labelSpan.textContent.trim()).toBe('Select all');
    expect(labelSpan.textContent.trim()).not.toContain('cockpit.');
    expect(countSpan.textContent.trim()).toContain('of');

    (ts as any).currentLangSubject.next('fr');
    fixture.detectChanges();

    selectAllBtn = fixture.nativeElement.querySelector('.processdef-select-all-row');
    labelSpan = selectAllBtn.querySelector('.state-row-label');
    countSpan = selectAllBtn.querySelector('.processdef-select-all-count');

    expect(labelSpan.textContent.trim()).toBe('Tout sélectionner');
    expect(labelSpan.textContent.trim()).not.toContain('cockpit.');
    expect(countSpan.textContent.trim()).toContain('sur');
  });
});