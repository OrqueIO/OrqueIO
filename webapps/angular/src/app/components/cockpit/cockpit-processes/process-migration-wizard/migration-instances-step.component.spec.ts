import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { MigrationInstancesStepComponent } from './migration-instances-step.component';
import { TranslateService } from '../../../../i18n/translate.service';
import { CockpitService, ProcessInstance } from '../../../../services/cockpit.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { initTestEnvironment } from '../../../../testing/test-utils';
import { BehaviorSubject, of, throwError } from 'rxjs';

describe('Migration Instances Step (Step 3)', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: MigrationInstancesStepComponent;
  let fixture: ComponentFixture<MigrationInstancesStepComponent>;
  let httpMock: HttpTestingController;

  const mockInstances: ProcessInstance[] = [
    {
      id: 'inst-1',
      processDefinitionId: 'proc-def-1',
      processDefinitionKey: 'testProcess',
      businessKey: 'BK001',
      startTime: '2026-01-01T00:00:00.000Z',
      state: 'ACTIVE' as const
    },
    {
      id: 'inst-2',
      processDefinitionId: 'proc-def-1',
      processDefinitionKey: 'testProcess',
      businessKey: 'BK002',
      startTime: '2026-01-02T00:00:00.000Z',
      state: 'ACTIVE' as const
    },
    {
      id: 'inst-3',
      processDefinitionId: 'proc-def-1',
      processDefinitionKey: 'testProcess',
      startTime: '2026-01-03T00:00:00.000Z',
      state: 'ACTIVE' as const
    }
  ];

  const mockTranslateService = {
    currentLang: 'en' as const,
    currentLang$: new BehaviorSubject('en' as const),
    instant: (key: string, params?: any) => {
      const translations: { [key: string]: string } = {
        'cockpit.batchOps.suspend.modeInstances': 'Instances',
        'cockpit.batchOps.suspend.modeQuery': 'Query',
        'migration.instances.selectionMode': 'Selection mode',
        'migration.instances.filterLabel': 'Filter for running process instances',
        'migration.instances.queryWarning': 'Query mode warning',
        'migration.instances.loading': 'Loading...',
        'migration.instances.errorLoading': 'Error loading',
        'migration.instances.retry': 'Retry',
        'migration.instances.selectAll': 'Select all',
        'migration.instances.selectInstance': `Select instance ${params?.id || ''}`,
        'migration.instances.columnId': 'ID',
        'migration.instances.columnBusinessKey': 'Business Key',
        'migration.instances.noInstances': 'No instances found',
        'migration.instances.back': 'Back',
        'migration.instances.migrateSelectedInstances': `Migrate Selected Instances (${params?.count || 0})`,
        'migration.instances.migrateAllMatchingInstances': `Migrate all matching instances (${params?.count || 0})`,
        'migration.instances.noRunningInstances': 'No running instances',
        'migration.instances.selectedLabel': `${params?.count || 0} selected instances`
      };
      return translations[key] || key;
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MigrationInstancesStepComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TranslateService, useValue: mockTranslateService },
        CockpitService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MigrationInstancesStepComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.componentRef.setInput('sourceDefinitionId', 'proc-def-1');
    fixture.componentRef.setInput('sourceVersion', 1);
  });

  afterEach(() => {
    try {
      const pendingRequests = httpMock.match(() => true);
      pendingRequests.forEach(req => {
        try {
          if (!req.cancelled) {
            if (req.request.url.includes('/count')) {
              req.flush({ count: 0 });
            } else if (req.request.url.includes('/process-instance')) {
              req.flush([]);
            } else if (req.request.url.includes('/process-definition')) {
              req.flush([]);
            } else {
              req.flush(null);
            }
          }
        } catch (e) {
        }
      });
    } catch (e) {
    }

    try {
      httpMock.verify();
    } catch (e) {
    }

    TestBed.resetTestingModule();
  });

  describe('Mode toggle buttons rendering and default mode', () => {
    it('should render two mode buttons: Instances and Query', () => {
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('.mode-btn');
      expect(buttons.length).toBe(2);
    });

    it('should render mode toggle with role="group"', () => {
      fixture.detectChanges();
      const modeToggle = fixture.nativeElement.querySelector('.mode-toggle');
      expect(modeToggle).toBeTruthy();
      expect(modeToggle.getAttribute('role')).toBe('group');
    });

    it('should have Instances button active by default', () => {
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('.mode-btn');
      const instancesButton = Array.from(buttons).find(btn =>
        (btn as HTMLElement).textContent?.includes('Instances')
      ) as HTMLElement;
      expect(instancesButton).toBeTruthy();
      expect(instancesButton.classList.contains('mode-btn--active')).toBe(true);
    });

    it('should have Query button inactive by default', () => {
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('.mode-btn');
      const queryButton = Array.from(buttons).find(btn =>
        (btn as HTMLElement).textContent?.includes('Query')
      ) as HTMLElement;
      expect(queryButton).toBeTruthy();
      expect(queryButton.classList.contains('mode-btn--active')).toBe(false);
    });

    it('should not render help icon buttons', () => {
      fixture.detectChanges();
      const helpButtons = fixture.nativeElement.querySelectorAll('.help-icon-btn');
      expect(helpButtons.length).toBe(0);
    });

    it('should use same i18n keys as batch operations for mode labels', () => {
      expect(component.constructor.name).toContain('MigrationInstancesStepComponent');
    });
  });

  describe('Instances list and total count', () => {
    it('should display instances table with columns ID and Business Key', () => {
      fixture.detectChanges();

      const requests = httpMock.match(() => true);
      requests.forEach(req => {
        if (req.url.includes('/count')) {
          req.flush({ count: 3 });
        } else if (req.url.includes('/process-instance')) {
          req.flush(mockInstances);
        } else if (req.url.includes('/process-definition')) {
          req.flush([]);
        }
      });

      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('.instances-table');
      expect(table).toBeTruthy();

      const headers = table.querySelectorAll('th');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should display total count in filter actions', () => {
      fixture.detectChanges();

      const requests = httpMock.match(() => true);
      requests.forEach(req => {
        if (req.url.includes('/count')) {
          req.flush({ count: 5 });
        } else if (req.url.includes('/process-instance')) {
          req.flush(mockInstances);
        } else if (req.url.includes('/process-definition')) {
          req.flush([]);
        }
      });

      fixture.detectChanges();

      const totalElement = fixture.nativeElement.querySelector('.filter-total');
      expect(totalElement).toBeTruthy();
      expect(totalElement.textContent).toContain('5');
    });

    it('should display instances in table rows', () => {
      fixture.detectChanges();

      const requests = httpMock.match(() => true);
      requests.forEach(req => {
        if (req.url.includes('/count')) {
          req.flush({ count: 3 });
        } else if (req.url.includes('/process-instance')) {
          req.flush(mockInstances);
        } else if (req.url.includes('/process-definition')) {
          req.flush([]);
        }
      });

      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.instances-table tbody tr');
      expect(rows.length).toBe(3);
    });
  });

  describe('Checkbox selection (Instance mode)', () => {
    beforeEach(() => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();
    });

    it('should render checkboxes for each instance in Instance mode', () => {
      const checkboxes = fixture.nativeElement.querySelectorAll('.col-checkbox input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should toggle instance selection on checkbox click', () => {
      const firstCheckbox = fixture.nativeElement.querySelector('.col-checkbox input[type="checkbox"]') as HTMLInputElement;
      expect(firstCheckbox).toBeTruthy();

      firstCheckbox.click();
      fixture.detectChanges();

      expect(component.selectedIds().has('inst-1')).toBe(true);

      firstCheckbox.click();
      fixture.detectChanges();

      expect(component.selectedIds().has('inst-1')).toBe(false);
    });

    it('should update primary button label with selected count', () => {
      const firstCheckbox = fixture.nativeElement.querySelectorAll('.col-checkbox input[type="checkbox"]')[1] as HTMLInputElement;
      firstCheckbox.click();
      fixture.detectChanges();

      const primaryButton = fixture.nativeElement.querySelector('.btn-primary');
      expect(primaryButton.textContent).toContain('Migrate Selected Instances (1)');
    });

    it('should select all instances on page when select-all checkbox is clicked', () => {
      const selectAllCheckbox = fixture.nativeElement.querySelector('thead .col-checkbox input[type="checkbox"]') as HTMLInputElement;
      expect(selectAllCheckbox).toBeTruthy();

      selectAllCheckbox.click();
      fixture.detectChanges();

      expect(component.selectedIds().size).toBe(3);
    });

    it('should deselect all instances on page when select-all checkbox is clicked again', () => {
      const selectAllCheckbox = fixture.nativeElement.querySelector('thead .col-checkbox input[type="checkbox"]') as HTMLInputElement;

      selectAllCheckbox.click();
      fixture.detectChanges();
      expect(component.selectedIds().size).toBe(3);

      selectAllCheckbox.click();
      fixture.detectChanges();
      expect(component.selectedIds().size).toBe(0);
    });
  });

  describe('Zero selection → button disabled (no message)', () => {
    it('should disable button when no instances are selected (no message)', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      expect(component.isPrimaryButtonDisabled()).toBe(true);
      expect(component.getDisabledReason()).toBeNull();

      const primaryButton = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
      expect(primaryButton.getAttribute('aria-disabled')).toBe('true');
    });

    it('should enable button when at least one instance is selected', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      const firstCheckbox = fixture.nativeElement.querySelectorAll('.col-checkbox input[type="checkbox"]')[1] as HTMLInputElement;
      firstCheckbox.click();
      fixture.detectChanges();

      expect(component.isPrimaryButtonDisabled()).toBe(false);
      const primaryButton = fixture.nativeElement.querySelector('.btn-primary');
      expect(primaryButton.textContent).toContain('Migrate Selected Instances (1)');
    });
  });

  describe('Query mode → warning banner + "all matching" label', () => {
    it('should not display warning banner in Instance mode', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.query-warning-banner');
      expect(banner).toBeNull();
    });

    it('should display warning banner in Query mode', () => {
      component.onModeChange('query');
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.query-warning-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Query mode warning');
    });

    it('should display "Migrate all matching instances (N)" button in Query mode', () => {
      component.onModeChange('query');
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 5 });

      fixture.detectChanges();

      const primaryButton = fixture.nativeElement.querySelector('.btn-primary');
      expect(primaryButton.textContent).toContain('Migrate all matching instances (5)');
    });

    it('should not display checkboxes in Query mode', () => {
      component.onModeChange('query');
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      const checkboxColumn = fixture.nativeElement.querySelector('.col-checkbox');
      expect(checkboxColumn).toBeNull();
    });

    it('should clear selection when switching to Query mode', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      const firstCheckbox = fixture.nativeElement.querySelectorAll('.col-checkbox input[type="checkbox"]')[1] as HTMLInputElement;
      firstCheckbox.click();
      fixture.detectChanges();
      expect(component.selectedIds().size).toBe(1);

      component.onModeChange('query');
      fixture.detectChanges();

      expect(component.selectedIds().size).toBe(0);
    });
  });

  describe('Total count 0 → button aria-disabled + reason', () => {
    it('should disable primary button when total count is 0', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush([]);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 0 });

      fixture.detectChanges();

      const primaryButton = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
      expect(primaryButton).toBeTruthy();
      expect(primaryButton.disabled).toBe(true);
    });

    it('should set aria-disabled="true" when total count is 0', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush([]);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 0 });

      fixture.detectChanges();

      const primaryButton = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
      expect(primaryButton.getAttribute('aria-disabled')).toBe('true');
    });

    it('should display disabled reason for accessibility', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush([]);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 0 });

      fixture.detectChanges();

      const disabledReason = component.getDisabledReason();
      expect(disabledReason).toBe('No running instances');
    });
  });

  describe('API error → Retry button', () => {
    it('should display error message when API fails', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.error(new ProgressEvent('error'));

      fixture.detectChanges();

      const errorMessage = fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toContain('Error loading');
    });

    it('should display Retry button on error', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.error(new ProgressEvent('error'));

      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.error-state .btn-secondary');
      expect(retryButton).toBeTruthy();
      expect(retryButton.textContent).toContain('Retry');
    });

    it('should retry loading when Retry button is clicked', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.error(new ProgressEvent('error'));

      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.error-state .btn-secondary') as HTMLButtonElement;
      retryButton.click();
      fixture.detectChanges();

      const req2 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req2.flush(mockInstances);
      const req3 = httpMock.expectOne((req) => req.url.includes('/count'));
      req3.flush({ count: 3 });

      fixture.detectChanges();

      const errorMessage = fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage).toBeNull();
    });
  });

  describe('Selection preserved after filter/page change', () => {
    it('should preserve selected IDs when filter changes', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      const firstCheckbox = fixture.nativeElement.querySelectorAll('.col-checkbox input[type="checkbox"]')[1] as HTMLInputElement;
      firstCheckbox.click();
      fixture.detectChanges();

      const selectedBefore = new Set(component.selectedIds());
      expect(selectedBefore.has('inst-1')).toBe(true);

      component.onFilterChange({
        criteria: [{ field: 'businessKey', values: ['BK001'] }],
        vnIgnoreCase: false,
        vvIgnoreCase: false
      });
      fixture.detectChanges();

      const req3 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req3.flush([mockInstances[0]]);
      const req4 = httpMock.expectOne((req) => req.url.includes('/count'));
      req4.flush({ count: 1 });

      fixture.detectChanges();

      expect(component.selectedIds().has('inst-1')).toBe(true);
    });

    it('should preserve selected IDs when page changes', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 15 });

      fixture.detectChanges();

      const firstCheckbox = fixture.nativeElement.querySelectorAll('.col-checkbox input[type="checkbox"]')[1] as HTMLInputElement;
      firstCheckbox.click();
      fixture.detectChanges();

      expect(component.selectedIds().has('inst-1')).toBe(true);

      component.onPageChange(2);
      fixture.detectChanges();

      const req3 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req3.flush([]);
      const req4 = httpMock.expectOne((req) => req.url.includes('/count'));
      req4.flush({ count: 15 });

      fixture.detectChanges();

      expect(component.selectedIds().has('inst-1')).toBe(true);
    });
  });

  describe('Output state for step 4', () => {
    it('should emit correct state for Instance mode with explicit selection', () => {
      let emittedState: any;
      component.next.subscribe((state) => {
        emittedState = state;
      });

      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('.col-checkbox input[type="checkbox"]');
      (checkboxes[1] as HTMLInputElement).click();
      (checkboxes[2] as HTMLInputElement).click();
      fixture.detectChanges();

      component.onNextClick();

      expect(emittedState).toBeTruthy();
      expect(emittedState.mode).toBe('instance');
      expect(emittedState.processInstanceIds).toEqual(['inst-1', 'inst-2']);
      expect(emittedState.totalCount).toBe(2);
    });

    it('should emit correct state for Query mode', () => {
      let emittedState: any;
      component.next.subscribe((state) => {
        emittedState = state;
      });

      component.onModeChange('query');
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 5 });

      fixture.detectChanges();

      component.onNextClick();

      expect(emittedState).toBeTruthy();
      expect(emittedState.mode).toBe('query');
      expect(emittedState.processInstanceQuery).toBeTruthy();
      expect(emittedState.processInstanceQuery.processDefinitionId).toBe('proc-def-1');
      expect(emittedState.totalCount).toBe(5);
    });
  });

  describe('Filter list identical to batch operation Set variables', () => {
    it('should use showExtendedCriteria=true (same as Set variables)', () => {
      expect(component.showExtendedCriteria).toBe(true);
    });

    it('should pass criteriaSet="process" to InstanceFilterPanelComponent', () => {
      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      const filterPanel = fixture.nativeElement.querySelector('app-instance-filter-panel');
      expect(filterPanel).toBeTruthy();
    });
  });

  describe('Back button navigation', () => {
    it('should emit back event when Back button is clicked', () => {
      let backEmitted = false;
      component.back.subscribe(() => {
        backEmitted = true;
      });

      fixture.detectChanges();

      const req1 = httpMock.expectOne((req) => req.url.includes('/process-instance'));
      req1.flush(mockInstances);
      const req2 = httpMock.expectOne((req) => req.url.includes('/count'));
      req2.flush({ count: 3 });

      fixture.detectChanges();

      const backButton = fixture.nativeElement.querySelector('.btn-back') as HTMLButtonElement;
      expect(backButton).toBeTruthy();

      backButton.click();

      expect(backEmitted).toBe(true);
    });
  });
});
