import { Component, Input, Output, EventEmitter, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslateService, Language } from '../../i18n/translate.service';
import { AuthService } from '../../services/auth';
import { NavMenuService } from '../../services/nav-menu.service';
import { NavActionsService, NavAction } from '../../services/nav-actions.service';

export interface NavMenuItem {
  icon: any;
  label: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FontAwesomeModule, TranslatePipe],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  @Input() showAuth = true;
  @Input() transparent = false;
  @Input() menuItems: NavMenuItem[] = [];
  @Output() logoutClick = new EventEmitter<void>();

  currentLang: Language = 'fr';
  userName = '';
  isAuthenticated = false;
  navActions: NavAction[] = [];

  // Icons
  faUser = faUser;
  faSignOut = faSignOutAlt;

  private destroyRef = inject(DestroyRef);

  constructor(
    public translateService: TranslateService,
    private authService: AuthService,
    private navMenuService: NavMenuService,
    private navActionsService: NavActionsService,
    private sanitizer: DomSanitizer
  ) {}

  sanitizeSvg(svg: string | undefined): SafeHtml {
    if (!svg) return '';
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  ngOnInit(): void {
    this.translateService.currentLang$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(lang => {
        this.currentLang = lang;
      });

    if (this.showAuth) {
      this.authService.authentication$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(auth => {
          this.isAuthenticated = !!auth;
          this.userName = auth?.name || '';
        });
    }

    // Subscribe to dynamic menu items from service
    this.navMenuService.menuItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(items => {
        this.menuItems = items;
      });

    // Subscribe to dynamic action buttons from service
    this.navActionsService.actions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(actions => {
        this.navActions = actions;
      });
  }

  onActionClick(action: NavAction): void {
    action.callback();
  }

  toggleLanguage(): void {
    const newLang = this.currentLang === 'fr' ? 'en' : 'fr';
    this.translateService.setLanguage(newLang);
  }

  onLogout(): void {
    this.logoutClick.emit();
  }
}
