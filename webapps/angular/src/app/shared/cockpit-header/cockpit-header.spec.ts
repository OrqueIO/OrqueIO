import 'zone.js';
import 'zone.js/testing';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { CockpitHeaderComponent } from './cockpit-header';
import { PermissionService } from '../../services/permission.service';
import { TranslateService } from '../../i18n/translate.service';
import { initTestEnvironment } from '../../testing/test-utils';

const mockTranslateService = {
  currentLang$: new BehaviorSubject('fr' as const),
  instant: (key: string) => key,
  setLanguage: () => {}
};

const mockPermissionService = {
  canAccessTasklist: () => true,
  canAccessCockpit:  () => true,
  canAccessAdmin:    () => true,
};

describe('CockpitHeaderComponent – app switcher', () => {
  beforeAll(() => { initTestEnvironment(); });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CockpitHeaderComponent, RouterModule.forRoot([])],
      providers: [
        { provide: TranslateService,  useValue: mockTranslateService },
        { provide: PermissionService, useValue: mockPermissionService },
      ]
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(CockpitHeaderComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  }

  // ── When on /tasklist ──────────────────────────────────────────────────────

  it('when on /tasklist, visibleApps contains cockpit and admin but not tasklist', () => {
    const component = createComponent();
    vi.spyOn(component as any, 'getCurrentApp').mockReturnValue('tasklist');

    const ids = component.visibleApps.map(a => a.id);

    expect(ids).toContain('cockpit');
    expect(ids).toContain('admin');
    expect(ids).not.toContain('tasklist');
  });

  it('when on /tasklist, hasMultipleApps is true', () => {
    const component = createComponent();
    vi.spyOn(component as any, 'getCurrentApp').mockReturnValue('tasklist');

    expect(component.hasMultipleApps).toBe(true);
  });

  // ── When on /cockpit ───────────────────────────────────────────────────────

  it('when on /cockpit, visibleApps contains tasklist and admin but not cockpit', () => {
    const component = createComponent();
    vi.spyOn(component as any, 'getCurrentApp').mockReturnValue('cockpit');

    const ids = component.visibleApps.map(a => a.id);

    expect(ids).toContain('tasklist');
    expect(ids).toContain('admin');
    expect(ids).not.toContain('cockpit');
  });

  // ── Permission filtering ───────────────────────────────────────────────────

  it('excludes apps the user cannot access', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CockpitHeaderComponent, RouterModule.forRoot([])],
      providers: [
        { provide: TranslateService,  useValue: mockTranslateService },
        {
          provide: PermissionService,
          useValue: { canAccessTasklist: () => true, canAccessCockpit: () => false, canAccessAdmin: () => true }
        },
      ]
    }).compileComponents();

    const component = createComponent();
    vi.spyOn(component as any, 'getCurrentApp').mockReturnValue('tasklist');

    const ids = component.visibleApps.map(a => a.id);

    expect(ids).not.toContain('cockpit');
    expect(ids).toContain('admin');
  });
});
