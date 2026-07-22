import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';

import { NavbarComponent, NavMenuItem } from './navbar';
import { NavMenuService } from '../../services/nav-menu.service';
import { NavActionsService } from '../../services/nav-actions.service';
import { AuthService } from '../../services/auth';
import { TranslateService } from '../../i18n/translate.service';
import { initTestEnvironment } from '../../testing/test-utils';

const mockTranslateService = {
  currentLang$: new BehaviorSubject('fr' as const),
  instant: (key: string) => key,
  setLanguage: () => {}
};

const mockAuthService = {
  authentication$: new BehaviorSubject<any>(null)
};

const mockNavMenuService = {
  menuItems$: new BehaviorSubject<NavMenuItem[]>([]),
  moreMenuItems$: new BehaviorSubject<NavMenuItem[]>([])
};

const mockNavActionsService = {
  actions$: new BehaviorSubject<any[]>([])
};

const mockSanitizer = {
  bypassSecurityTrustHtml: (s: string) => s
};

describe('NavbarComponent – Processes sub-dropdown', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  const processesItem: NavMenuItem = {
    icon: null,
    label: 'cockpit.menu.processes',
    route: '/cockpit/processes',
    exact: false,
    subItems: [
      { icon: null, label: 'cockpit.processes.tabs.definitions',     route: '/cockpit/processes/definitions', exact: true },
      { icon: null, label: 'cockpit.processes.tabs.searchInstances', route: '/cockpit/processes/search',       exact: true }
    ]
  };

  beforeAll(() => { initTestEnvironment(); });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterModule.forRoot([])],
      providers: [
        { provide: TranslateService,   useValue: mockTranslateService },
        { provide: AuthService,        useValue: mockAuthService },
        { provide: NavMenuService,     useValue: mockNavMenuService },
        { provide: NavActionsService,  useValue: mockNavActionsService },
        { provide: DomSanitizer,       useValue: mockSanitizer }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── 1. Clicking the chevron opens the dropdown ─────────────────────────────

  it('should open the Processes sub-menu when the chevron is toggled', () => {
    const event = new MouseEvent('click');
    vi.spyOn(event, 'stopPropagation');

    component.openSubMenuLabel = null;
    component.toggleSubMenu(processesItem, event);

    expect(component.openSubMenuLabel).toBe('cockpit.menu.processes');
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  // ── 2. Clicking a sub-item closes the dropdown ─────────────────────────────

  it('should close the Processes sub-menu when a sub-item is selected', () => {
    component.openSubMenuLabel = 'cockpit.menu.processes';

    component.closeSubMenu();

    expect(component.openSubMenuLabel).toBeNull();
  });

  // ── 3. Clicking outside the .sub-dropdown closes the dropdown ──────────────

  it('should close the Processes sub-menu on click outside .sub-dropdown', () => {
    component.openSubMenuLabel = 'cockpit.menu.processes';

    // Simulate a click on a plain element that is NOT inside .sub-dropdown
    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    const event = new MouseEvent('click');
    Object.defineProperty(event, 'target', { value: outsideEl, writable: false });

    component.onDocumentClick(event);

    expect(component.openSubMenuLabel).toBeNull();
    document.body.removeChild(outsideEl);
  });

  // ── Bonus: click inside .sub-dropdown does NOT close the dropdown ───────────

  it('should keep the Processes sub-menu open on click inside .sub-dropdown', () => {
    component.openSubMenuLabel = 'cockpit.menu.processes';

    const wrapper = document.createElement('div');
    wrapper.classList.add('sub-dropdown');
    const inner = document.createElement('button');
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);
    const event = new MouseEvent('click');
    Object.defineProperty(event, 'target', { value: inner, writable: false });

    component.onDocumentClick(event);

    expect(component.openSubMenuLabel).toBe('cockpit.menu.processes');
    document.body.removeChild(wrapper);
  });
});
