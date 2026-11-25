import 'zone.js';
import 'zone.js/testing';
import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, provideRouter } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NavigationHistoryService } from './navigation-history.service';
import { initTestEnvironment } from '../testing/test-utils';

initTestEnvironment();

describe('NavigationHistoryService', () => {
  let service: NavigationHistoryService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        NavigationHistoryService,
      ],
    }).compileComponents();

    service = TestBed.inject(NavigationHistoryService);
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with null previousUrl and currentUrl', () => {
    expect(service.previousUrl).toBeNull();
    expect(service.currentUrl).toBeNull();
  });

  it('should update currentUrl on first NavigationEnd', () => {
    const event = new NavigationEnd(1, '/cockpit/processes', '/cockpit/processes');
    (router as any).events.next(event);

    expect(service.currentUrl).toBe('/cockpit/processes');
    expect(service.previousUrl).toBeNull();
  });

  it('should update previousUrl and currentUrl on subsequent NavigationEnd', () => {
    const event1 = new NavigationEnd(1, '/cockpit/dashboard', '/cockpit/dashboard');
    (router as any).events.next(event1);

    expect(service.currentUrl).toBe('/cockpit/dashboard');
    expect(service.previousUrl).toBeNull();

    const event2 = new NavigationEnd(2, '/cockpit/processes/search', '/cockpit/processes/search');
    (router as any).events.next(event2);

    expect(service.currentUrl).toBe('/cockpit/processes/search');
    expect(service.previousUrl).toBe('/cockpit/dashboard');
  });

  it('should track multiple navigations correctly', () => {
    const navigations = [
      { url: '/cockpit/dashboard', urlAfterRedirects: '/cockpit/dashboard' },
      { url: '/cockpit/processes', urlAfterRedirects: '/cockpit/processes' },
      { url: '/cockpit/batch/operations', urlAfterRedirects: '/cockpit/batch/operations' },
      { url: '/cockpit/processes/search', urlAfterRedirects: '/cockpit/processes/search' },
    ];

    navigations.forEach((nav, index) => {
      const event = new NavigationEnd(index + 1, nav.url, nav.urlAfterRedirects);
      (router as any).events.next(event);

      expect(service.currentUrl).toBe(nav.urlAfterRedirects);
      if (index > 0) {
        expect(service.previousUrl).toBe(navigations[index - 1].urlAfterRedirects);
      }
    });

    expect(service.currentUrl).toBe('/cockpit/processes/search');
    expect(service.previousUrl).toBe('/cockpit/batch/operations');
  });

  it('should prefer urlAfterRedirects over url', () => {
    const event = new NavigationEnd(1, '/old-url', '/new-redirected-url');
    (router as any).events.next(event);

    expect(service.currentUrl).toBe('/new-redirected-url');
  });

  it('should use url if urlAfterRedirects is not available', () => {
    const event = new NavigationEnd(1, '/cockpit/processes', '');
    (router as any).events.next(event);

    expect(service.currentUrl).toBe('/cockpit/processes');
  });
});