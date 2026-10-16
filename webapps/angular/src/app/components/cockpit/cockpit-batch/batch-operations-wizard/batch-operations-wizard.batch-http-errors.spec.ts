import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { TranslateService } from '../../../../i18n/translate.service';
import { initTestEnvironment } from '../../../../testing/test-utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TEST: Batch instances HTTP error handling
 *
 * Verifies:
 * - HTTP 200 + empty list → displays exact EN/FR text "No batches found for current criteria"
 * - HTTP 500/401/403/network → displays exact EN/FR text "Could not load data"
 * - Error state clears on successful reload
 * - No raw i18n keys displayed (no "cockpit." or "common.")
 *
 * Part of batch filter error handling (#114)
 */
describe('Batch Operations Wizard - HTTP Errors', () => {
  let httpMock: HttpTestingController;
  let enTranslations: any;
  let frTranslations: any;

  // Load translations from JSON files
  try {
    const enPath = path.resolve(__dirname, '../../../../../assets/i18n/en.json');
    const frPath = path.resolve(__dirname, '../../../../../assets/i18n/fr.json');
    enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    frTranslations = JSON.parse(fs.readFileSync(frPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load translation files:', error);
  }

  async function setupTest(lang: 'en' | 'fr' = 'en') {
    initTestEnvironment();

    await TestBed.configureTestingModule({
      imports: [BatchOperationsWizardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(BatchOperationsWizardComponent);
    const component = fixture.componentInstance;
    const translateService = TestBed.inject(TranslateService);

    // Load real translations
    (translateService as any).translations = {
      en: enTranslations,
      fr: frTranslations
    };
    // Set language via BehaviorSubject
    (translateService as any).currentLangSubject.next(lang);

    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    return { component, fixture };
  }

  it('[EN] HTTP 200 + empty list → displays exact EN text "No batches found for current criteria"', async () => {
    const { component, fixture } = await setupTest('en');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial requests with empty results
    const requests = httpMock.match(req => req.url.includes('/history/batch'));
    requests.forEach(req => {
      if (req.request.url.includes('/count')) {
        req.flush({ count: 0 });
      } else {
        req.flush([]);
      }
    });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify: no error, empty list
    expect(component.batchInstances.length).toBe(0);
    expect(component.batchInstancesError).toBe(false);
    expect(component.batchInstancesLoading).toBe(false);

    // Template should show exact EN text from removalTimeBatch.noBatches
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent?.trim()).toBe(enTranslations['cockpit.batchOps.removalTimeBatch.noBatches']);

    // error-state must be absent
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeNull();

    // No raw i18n keys
    expect(compiled.textContent).not.toContain('cockpit.');
    expect(compiled.textContent).not.toContain('common.');
  });

  it('[FR] HTTP 200 + empty list → displays exact FR text', async () => {
    const { component, fixture } = await setupTest('fr');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial requests with empty results
    const requests = httpMock.match(req => req.url.includes('/history/batch'));
    requests.forEach(req => {
      if (req.request.url.includes('/count')) {
        req.flush({ count: 0 });
      } else {
        req.flush([]);
      }
    });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify exact FR text
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent?.trim()).toBe(frTranslations['cockpit.batchOps.removalTimeBatch.noBatches']);

    // error-state must be absent
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeNull();
  });

  it('[EN] HTTP 500 → displays exact EN text "Could not load data" (NOT "No batches found")', async () => {
    const { component, fixture } = await setupTest('en');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush initial data request with HTTP 500 error (forkJoin will cancel count request)
    const dataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    dataReq.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify: error flag set, empty list, loading stopped
    expect(component.batchInstancesError).toBe(true);
    expect(component.batchInstances.length).toBe(0);
    expect(component.batchInstancesLoading).toBe(false);

    // Template should show exact EN text from common.loadError
    const compiled = fixture.nativeElement as HTMLElement;
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState?.textContent?.trim()).toContain(enTranslations['common.loadError']);

    // empty-state must be absent
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeNull();

    // No raw i18n keys
    expect(compiled.textContent).not.toMatch(/\bcockpit\./);
    expect(compiled.textContent).not.toMatch(/\bcommon\./);
  });

  it('[FR] HTTP 500 → displays exact FR text', async () => {
    const { component, fixture } = await setupTest('fr');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush with HTTP 500
    const dataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    dataReq.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify exact FR text
    const compiled = fixture.nativeElement as HTMLElement;
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState?.textContent?.trim()).toContain(frTranslations['common.loadError']);

    // empty-state must be absent
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeNull();
  });

  it('[EN] HTTP 401 → displays exact EN text "Could not load data"', async () => {
    const { component, fixture } = await setupTest('en');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush data request with 401 (forkJoin will cancel count request)
    const dataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    dataReq.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify: error flag set, empty list, loading stopped
    expect(component.batchInstancesError).toBe(true);
    expect(component.batchInstances.length).toBe(0);
    expect(component.batchInstancesLoading).toBe(false);

    // Template should show exact EN text from common.loadError
    const compiled = fixture.nativeElement as HTMLElement;
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState?.textContent?.trim()).toContain(enTranslations['common.loadError']);

    // empty-state must be absent
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeNull();

    // No raw i18n keys
    expect(compiled.textContent).not.toMatch(/\bcockpit\./);
    expect(compiled.textContent).not.toMatch(/\bcommon\./);
  });

  it('[FR] HTTP 401 → displays exact FR text', async () => {
    const { component, fixture } = await setupTest('fr');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush with HTTP 401
    const dataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    dataReq.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify exact FR text
    const compiled = fixture.nativeElement as HTMLElement;
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState?.textContent?.trim()).toContain(frTranslations['common.loadError']);

    // empty-state must be absent
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeNull();
  });

  it('[EN] HTTP 403 → displays exact EN text "Could not load data"', async () => {
    const { component, fixture } = await setupTest('en');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush data request with 403 (forkJoin will cancel count request)
    const dataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    dataReq.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify: error flag set, empty list, loading stopped
    expect(component.batchInstancesError).toBe(true);
    expect(component.batchInstances.length).toBe(0);
    expect(component.batchInstancesLoading).toBe(false);

    // Template should show exact EN text from common.loadError
    const compiled = fixture.nativeElement as HTMLElement;
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState?.textContent?.trim()).toContain(enTranslations['common.loadError']);

    // empty-state must be absent
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeNull();

    // No raw i18n keys
    expect(compiled.textContent).not.toMatch(/\bcockpit\./);
    expect(compiled.textContent).not.toMatch(/\bcommon\./);
  });

  it('[FR] HTTP 403 → displays exact FR text', async () => {
    const { component, fixture } = await setupTest('fr');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush with HTTP 403
    const dataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    dataReq.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify exact FR text
    const compiled = fixture.nativeElement as HTMLElement;
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState?.textContent?.trim()).toContain(frTranslations['common.loadError']);

    // empty-state must be absent
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeNull();
  });

  it('[EN] Network error → displays exact EN text "Could not load data"', async () => {
    const { component, fixture } = await setupTest('en');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush data request with network error (forkJoin will cancel count request)
    const dataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    dataReq.error(new ProgressEvent('error'));

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify: error flag set, empty list, loading stopped
    expect(component.batchInstancesError).toBe(true);
    expect(component.batchInstances.length).toBe(0);
    expect(component.batchInstancesLoading).toBe(false);

    // Template should show exact EN text from common.loadError
    const compiled = fixture.nativeElement as HTMLElement;
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState?.textContent?.trim()).toContain(enTranslations['common.loadError']);

    // empty-state must be absent
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeNull();

    // No raw i18n keys
    expect(compiled.textContent).not.toMatch(/\bcockpit\./);
    expect(compiled.textContent).not.toMatch(/\bcommon\./);
  });

  it('[FR] Network error → displays exact FR text', async () => {
    const { component, fixture } = await setupTest('fr');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // Flush with network error
    const dataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    dataReq.error(new ProgressEvent('error'));

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify exact FR text
    const compiled = fixture.nativeElement as HTMLElement;
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState?.textContent?.trim()).toContain(frTranslations['common.loadError']);

    // empty-state must be absent
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeNull();
  });

  it('[Reload after error] Real component: error state clears on successful reload after filter change', async () => {
    const { component, fixture } = await setupTest('en');

    // Select operation
    component.onOperationSelect('removal-time-batch');
    fixture.detectChanges();

    // First load: HTTP 500 error
    const firstDataReq = httpMock.expectOne(req => req.url.includes('/history/batch') && !req.url.includes('/count'));
    firstDataReq.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify error state displayed
    expect(component.batchInstancesError).toBe(true);
    expect(component.batchInstances.length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    let errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState?.textContent).toContain('Could not load data');

    // Change filter: trigger reload by directly calling the load subject
    // (Real filter click would be too complex as it requires full filter panel setup)
    (component as any).batchInstanceLoad$.next();
    fixture.detectChanges();

    // Second load: successful response
    const mockBatch = {
      id: 'batch-123',
      type: 'process-set-removal-time',
      startTime: new Date().toISOString(),
      completed: true
    };

    // Find and flush only non-cancelled requests
    const allRequests = httpMock.match(req => req.url.includes('/history/batch'));
    allRequests.forEach(req => {
      if (!req.cancelled) {
        if (req.request.url.includes('/count')) {
          req.flush({ count: 1 });
        } else {
          req.flush([mockBatch]);
        }
      }
    });

    fixture.detectChanges();
    await fixture.whenStable();

    // Verify error cleared and list displayed
    expect(component.batchInstancesError).toBe(false);
    expect(component.batchInstances.length).toBe(1);
    expect(component.batchInstances[0].id).toBe('batch-123');

    // Verify .error-state is absent, table has 1 row
    errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeNull();

    // Check that at least some content is displayed (not just empty state)
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeNull();
  });
});