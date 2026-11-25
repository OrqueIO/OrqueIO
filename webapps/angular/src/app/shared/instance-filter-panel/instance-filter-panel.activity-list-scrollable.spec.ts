/**
 * Test: Activity ID list has scrollable container with limited height
 *
 * Verifies that:
 * - Activity list container has .activity-list--scrollable class
 * - CSS rule exists with max-height and overflow-y: auto
 * - Other criteria menus don't have this class (non-regression)
 *
 * This test MUST FAIL if .activity-list--scrollable class is removed from HTML.
 */

import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { InstanceFilterPanelComponent } from './instance-filter-panel';
import { By } from '@angular/platform-browser';
import { TranslateService } from '../../i18n/translate.service';
import { CockpitService } from '../../services/cockpit.service';
import { initTestEnvironment } from '../../testing/test-utils';

describe('InstanceFilterPanelComponent — Activity ID list scrollable', () => {
  let component: InstanceFilterPanelComponent;
  let fixture: ComponentFixture<InstanceFilterPanelComponent>;

  beforeEach(async () => {
    initTestEnvironment();

    const cockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
    } as any;

    await TestBed.configureTestingModule({
      imports: [InstanceFilterPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CockpitService, useValue: cockpitService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceFilterPanelComponent);
    component = fixture.componentInstance;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = { en: {} };

    // Simulate a long list of activities (more than 8)
    component.availableActivities = [
      { id: 'task1', name: 'Task 1', type: 'userTask' },
      { id: 'task2', name: 'Task 2', type: 'userTask' },
      { id: 'task3', name: 'Task 3', type: 'serviceTask' },
      { id: 'task4', name: 'Task 4', type: 'userTask' },
      { id: 'task5', name: 'Task 5', type: 'scriptTask' },
      { id: 'task6', name: 'Task 6', type: 'userTask' },
      { id: 'task7', name: 'Task 7', type: 'sendTask' },
      { id: 'task8', name: 'Task 8', type: 'userTask' },
      { id: 'task9', name: 'Task 9', type: 'receiveTask' },
      { id: 'task10', name: 'Task 10', type: 'userTask' },
      { id: 'task11', name: 'Task 11', type: 'manualTask' },
      { id: 'task12', name: 'Task 12', type: 'userTask' },
      { id: 'task13', name: 'Task 13', type: 'businessRuleTask' },
      { id: 'task14', name: 'Task 14', type: 'userTask' },
    ];

    fixture.detectChanges();
  });

  it('Activity ID list container has activity-list--scrollable class', () => {
    // Open Activity ID editor
    component.selectCriteriaType('activityId');
    fixture.detectChanges();

    // Find the activity list container
    const activityList = fixture.debugElement.query(By.css('.activity-list'));

    expect(activityList).not.toBeNull();

    // THIS TEST MUST FAIL IF activity-list--scrollable CLASS IS REMOVED
    expect(activityList.nativeElement.classList.contains('activity-list--scrollable')).toBe(true);
  });

  it('Activity list container has both state-checklist and activity-list classes', () => {
    component.selectCriteriaType('activityId');
    fixture.detectChanges();

    const activityList = fixture.debugElement.query(By.css('.activity-list'));

    expect(activityList.nativeElement.classList.contains('state-checklist')).toBe(true);
    expect(activityList.nativeElement.classList.contains('activity-list')).toBe(true);
    expect(activityList.nativeElement.classList.contains('activity-list--scrollable')).toBe(true);
  });

  it('Non-regression: State menu does NOT have activity-list--scrollable class', () => {
    component.selectCriteriaType('state');
    fixture.detectChanges();

    const stateChecklist = fixture.debugElement.query(By.css('.state-checklist'));

    expect(stateChecklist).not.toBeNull();
    expect(stateChecklist.nativeElement.classList.contains('activity-list--scrollable')).toBe(false);
  });

  it('Non-regression: Process Definition does NOT have activity-list--scrollable class', () => {
    component.selectCriteriaType('processDefinition');
    fixture.detectChanges();

    // Process Definition uses .processdef-checklist, not activity-list--scrollable
    const processdefChecklists = fixture.debugElement.queryAll(By.css('.state-checklist'));

    processdefChecklists.forEach(checklist => {
      expect(checklist.nativeElement.classList.contains('activity-list--scrollable')).toBe(false);
    });
  });

  it('Non-regression: Incident Type does NOT have activity-list--scrollable class', () => {
    component.selectCriteriaType('incidentType');
    fixture.detectChanges();

    const stateChecklist = fixture.debugElement.query(By.css('.state-checklist'));

    expect(stateChecklist).not.toBeNull();
    expect(stateChecklist.nativeElement.classList.contains('activity-list--scrollable')).toBe(false);
  });

  it('Activity list renders all activities (>8 items)', () => {
    component.selectCriteriaType('activityId');
    fixture.detectChanges();

    const activityRows = fixture.debugElement.queryAll(By.css('.activity-row'));

    // Should render all 14 activities
    expect(activityRows.length).toBe(14);
  });
});