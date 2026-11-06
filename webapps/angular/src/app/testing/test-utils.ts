import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

let envInitialized = false;

export function initTestEnvironment(): void {
  if (!envInitialized) {
    if (typeof ResizeObserver === 'undefined') {
      (globalThis as any).ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }

    getTestBed().initTestEnvironment(
      BrowserDynamicTestingModule,
      platformBrowserDynamicTesting(),
    );
    envInitialized = true;
  }
}
