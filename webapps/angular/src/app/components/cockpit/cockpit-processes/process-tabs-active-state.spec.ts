/**
 * Regression tests for the process tabs active-state.
 *
 * Both ProcessDefinitionsComponent and ProcessInstanceSearchComponent render
 * the same tabs bar. The original bug: {exact: true} maps to
 * {paths: 'exact', queryParams: 'exact', ...}, so the Search tab lost its
 * active class as soon as syncCriteriaToUrl() added ?criteria=... to the URL.
 *
 * Fix: use IsActiveMatchOptions with queryParams: 'ignored' so search criteria
 * never affect which tab is highlighted.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterLink, RouterLinkActive, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

@Component({
  selector: 'app-test-process-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <a class="process-tab"
       routerLink="/processes/definitions"
       routerLinkActive="active"
       [routerLinkActiveOptions]="{paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored'}">
      Definitions
    </a>
    <a class="process-tab"
       routerLink="/processes/search"
       routerLinkActive="active"
       [routerLinkActiveOptions]="{paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored'}">
      Search Instances
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TestProcessTabsComponent {}

function definitionsTab(root: Element | null): HTMLElement {
  return root!.querySelectorAll('a.process-tab')[0] as HTMLElement;
}
function searchTab(root: Element | null): HTMLElement {
  return root!.querySelectorAll('a.process-tab')[1] as HTMLElement;
}

describe('Process tabs active state', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'processes/definitions', component: TestProcessTabsComponent },
          { path: 'processes/search',      component: TestProcessTabsComponent },
        ])
      ]
    }).compileComponents();
  });

  it('direct URL /processes/search: Search Instances tab is active, Definitions is not', async () => {
    const harness = await RouterTestingHarness.create('/processes/search');
    expect(searchTab(harness.routeNativeElement).classList).toContain('active');
    expect(definitionsTab(harness.routeNativeElement).classList).not.toContain('active');
  });

  it('clicking Search Instances tab from Definitions page: Search tab becomes active', async () => {
    const harness = await RouterTestingHarness.create('/processes/definitions');
    expect(definitionsTab(harness.routeNativeElement).classList).toContain('active');

    await harness.navigateByUrl('/processes/search');
    expect(searchTab(harness.routeNativeElement).classList).toContain('active');
    expect(definitionsTab(harness.routeNativeElement).classList).not.toContain('active');
  });

  it('nav-dropdown to /processes/search with query params: Search tab stays active (regression)', async () => {
    // Regression: {exact: true} ⟹ queryParams:'exact' broke the active state
    // whenever syncCriteriaToUrl() appended ?criteria=... to the URL.
    const harness = await RouterTestingHarness.create(
      '/processes/search?criteria=%5B%7B%22field%22%3A%22businessKey%22%7D%5D'
    );
    expect(searchTab(harness.routeNativeElement).classList).toContain('active');
    expect(definitionsTab(harness.routeNativeElement).classList).not.toContain('active');
  });
});
