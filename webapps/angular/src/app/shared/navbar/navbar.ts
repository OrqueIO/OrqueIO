import { Component, Input, Output, EventEmitter, OnInit, DestroyRef, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUser, faSignOutAlt, faEllipsisH, faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';
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

export interface LanguageOption {
  value: Language;
  label: string;
  shortLabel: string;
  flag: string;
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

  currentLang: Language = 'en';
  userName = '';
  isAuthenticated = false;
  navActions: NavAction[] = [];
  moreMenuItems: NavMenuItem[] = [];
  moreMenuOpen = false;
  languageMenuOpen = false;

  /**
   * Language dropdown options.
   * - value: Language code passed to TranslateService
   * - label: Name displayed in the dropdown menu
   * - shortLabel: Short label displayed on the trigger button
   * - flag: Inline SVG flag
   */
readonly languageOptions: LanguageOption[] = [
  {
    value: 'fr',
    label: 'Français',
    shortLabel: 'FR',
    flag: `<svg viewBox="0 0 3 2" width="22" height="14">
      <rect width="1" height="2" fill="#002395"/>
      <rect width="1" height="2" x="1" fill="#fff"/>
      <rect width="1" height="2" x="2" fill="#ED2939"/>
    </svg>`
  },
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN',
    flag: `<svg viewBox="0 0 50 30" width="22" height="14">
      <rect width="50" height="30" fill="#012169"/>
      <path d="M0,0 L50,30 M50,0 L0,30" stroke="#fff" stroke-width="6"/>
      <path d="M0,0 L50,30" stroke="#C8102E" stroke-width="2"/>
      <path d="M50,0 L0,30" stroke="#C8102E" stroke-width="2"/>
      <path d="M25,0 V30 M0,15 H50" stroke="#fff" stroke-width="10"/>
      <path d="M25,0 V30 M0,15 H50" stroke="#C8102E" stroke-width="6"/>
    </svg>`
  },
  {
    value: 'zh-CN',
    label: '简体中文',
    shortLabel: '简',
    flag: `<svg viewBox="0 0 30 20" width="22" height="14">
      <rect width="30" height="20" fill="#DE2910"/>
      <g fill="#FFDE00">
        <path d="M5,3 l0.9,2.8 h2.9 l-2.4,1.7 l0.9,2.8 l-2.3,-1.8 l-2.3,1.8 l0.9,-2.8 l-2.4,-1.7 h2.9 z"/>
        <circle cx="10" cy="3.2" r="0.9"/>
        <circle cx="12" cy="5" r="0.9"/>
        <circle cx="12" cy="7.5" r="0.9"/>
        <circle cx="10" cy="9.3" r="0.9"/>
      </g>
    </svg>`
  },
  {
    value: 'zh-TW',
    label: '繁體中文',
    shortLabel: '繁',
    flag: `<svg viewBox="0 0 30 20" width="22" height="14">
      <rect width="30" height="20" fill="#DE2910"/>
      <g fill="#fff" transform="translate(15,10)">
        <ellipse cx="0" cy="-1.8" rx="0.9" ry="2" transform="rotate(0)"/>
        <ellipse cx="0" cy="-1.8" rx="0.9" ry="2" transform="rotate(72)"/>
        <ellipse cx="0" cy="-1.8" rx="0.9" ry="2" transform="rotate(144)"/>
        <ellipse cx="0" cy="-1.8" rx="0.9" ry="2" transform="rotate(216)"/>
        <ellipse cx="0" cy="-1.8" rx="0.9" ry="2" transform="rotate(288)"/>
      </g>
    </svg>`
  }
];


  // Icons
  faUser = faUser;
  faSignOut = faSignOutAlt;
  faEllipsisH = faEllipsisH;
  faChevronDown = faChevronDown;
  faCheck = faCheck;

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
    // Initialize the current language to prevent incorrect display on the first frame
    this.currentLang = this.translateService.currentLang;

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

    // Subscribe to more menu items from service
    this.navMenuService.moreMenuItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(items => {
        this.moreMenuItems = items;
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.more-dropdown')) {
      this.moreMenuOpen = false;
    }
    if (!target.closest('.language-dropdown')) {
      this.languageMenuOpen = false;
    }
  }

  toggleMoreMenu(event: Event): void {
    event.stopPropagation();
    this.moreMenuOpen = !this.moreMenuOpen;
    this.languageMenuOpen = false;
  }

  closeMoreMenu(): void {
    this.moreMenuOpen = false;
  }

  onActionClick(action: NavAction): void {
    action.callback();
  }

  /**
   * Toggle the language dropdown menu
   */
  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.languageMenuOpen = !this.languageMenuOpen;
    this.moreMenuOpen = false;
  }

  /**
   * Select a language
   */
  selectLanguage(lang: Language, event?: Event): void {
    event?.stopPropagation();
    if (lang !== this.currentLang) {
      this.translateService.setLanguage(lang);
    }
    this.languageMenuOpen = false;
  }

  /**
   * Get the display option for the current language
   */
  getCurrentLanguageOption(): LanguageOption {
    return (
      this.languageOptions.find(opt => opt.value === this.currentLang) ||
      this.languageOptions[1]
    );
  }

  onLogout(): void {
    this.logoutClick.emit();
  }
}
