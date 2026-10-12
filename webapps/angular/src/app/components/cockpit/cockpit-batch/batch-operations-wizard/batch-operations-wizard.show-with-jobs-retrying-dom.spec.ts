/**
 * Test: DOM verification that "With jobs retrying" button is visible for removal-time-process
 *
 * This test MUST FAIL if [showWithJobsRetrying]="true" is changed back to false
 * in batch-operations-wizard.html line 678.
 *
 * Verifies:
 * - removal-time-process: button is visible
 * - set-retries-external: button is hidden (non-regression)
 */

import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { By } from '@angular/platform-browser';
import { TranslateService } from '../../../../i18n/translate.service';
import { CockpitService } from '../../../../services/cockpit.service';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { DecisionService } from '../../../../services/decision.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('BatchOperationsWizardComponent — DOM: With jobs retrying button visibility for removal-time-process', () => {
  let component: BatchOperationsWizardComponent;
  let fixture: ComponentFixture<BatchOperationsWizardComponent>;

  beforeEach(async () => {
    initTestEnvironment();

    const mockCockpitService = {
      getProcessDefinitions: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobal: vi.fn().mockReturnValue(of([])),
      searchProcessInstancesGlobalCount: vi.fn().mockReturnValue(of(0)),
    } as any;

    const mockProcessInstanceService = {
      setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' })),
      queryProcessInstances: vi.fn().mockReturnValue(of([])),
    } as any;

    const mockDecisionService = {} as any;

    await TestBed.configureTestingModule({
      imports: [BatchOperationsWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CockpitService, useValue: mockCockpitService },
        { provide: ProcessInstanceService, useValue: mockProcessInstanceService },
        { provide: DecisionService, useValue: mockDecisionService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchOperationsWizardComponent);
    component = fixture.componentInstance;

    const translateService = TestBed.inject(TranslateService);
    (translateService as any).translations = {
      en: {
        'cockpit.processes.filters.withJobsRetrying': 'With jobs retrying',
        'cockpit.processes.globalSearch.desc.withJobsRetrying': 'Instances with jobs retrying',
      }
    };

    fixture.detectChanges();
  });

  it('removal-time-process: "With jobs retrying" button is visible in DOM', async () => {
    // Select removal-time-process operation
    component.onOperationSelect('removal-time-process');
    fixture.detectChanges();

    // Wait for async operations
    await fixture.whenStable();
    fixture.detectChanges();

    // Find the app-instance-filter-panel component instance
    const filterPanelDebugElement = fixture.debugElement.query(
      By.css('app-instance-filter-panel')
    );

    expect(filterPanelDebugElement).not.toBeNull();

    // Verify showWithJobsRetrying input is true
    const filterPanelComponent = filterPanelDebugElement.componentInstance;

    // THIS TEST MUST FAIL IF [showWithJobsRetrying]="false" in batch-operations-wizard.html:678
    expect(filterPanelComponent.showWithJobsRetrying).toBe(true);

    // Open the criteria dropdown to reveal buttons
    filterPanelComponent.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    // Find the "With jobs retrying" button using the exact selector from instance-filter-panel.html:167-175
    // The button has *ngIf="!finishedScope && showWithJobsRetrying"
    const allButtons = filterPanelDebugElement.queryAll(By.css('button[role="menuitem"]'));
    const withJobsRetryingButton = allButtons.find(btn => {
      const text = btn.nativeElement.textContent;
      return text && (text.toLowerCase().includes('jobs') && text.toLowerCase().includes('retrying'));
    });

    // THIS TEST MUST FAIL IF [showWithJobsRetrying]="false" in batch-operations-wizard.html:678
    expect(withJobsRetryingButton).toBeDefined();
    expect(withJobsRetryingButton).not.toBeNull();
  });

  it('Non-regression: set-retries-external does NOT show "With jobs retrying" button', async () => {
    // Select set-retries-external operation
    component.onOperationSelect('set-retries-external');
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    // Find the app-instance-filter-panel component instance (shared panel for generic operations)
    const filterPanelDebugElements = fixture.debugElement.queryAll(
      By.css('app-instance-filter-panel')
    );

    // Find the panel that has showWithJobsRetrying=false (for set-retries-external)
    const filterPanelForExternalRetries = filterPanelDebugElements.find(el => {
      const comp = el.componentInstance;
      return comp.showWithJobsRetrying === false;
    });

    expect(filterPanelForExternalRetries).toBeDefined();

    const filterPanelComponent = filterPanelForExternalRetries!.componentInstance;

    // Verify showWithJobsRetrying input is false for set-retries-external
    expect(filterPanelComponent.showWithJobsRetrying).toBe(false);

    // Open the criteria dropdown
    filterPanelComponent.toggleCriteriaDropdown(new MouseEvent('click'));
    fixture.detectChanges();

    // Verify "With jobs retrying" button is NOT present
    const allButtons = filterPanelForExternalRetries!.queryAll(By.css('button[role="menuitem"]'));
    const withJobsRetryingButton = allButtons.find(btn => {
      const text = btn.nativeElement.textContent;
      return text && (text.toLowerCase().includes('jobs') && text.toLowerCase().includes('retrying'));
    });

    // For set-retries-external, button should be absent
    expect(withJobsRetryingButton).toBeUndefined();
  });
});
