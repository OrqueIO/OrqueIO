import { Component, Input, Output, EventEmitter, OnInit, DestroyRef, inject, HostListener, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
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
        <rect width="30" height="20" fill="#FE0000"/>
        <rect width="15" height="10" fill="#000095"/>
        <polygon fill="#fff" points="7.50,1.40 8.04,2.97 9.30,1.88 8.98,3.52 10.62,3.20 9.53,4.46 11.10,5.00 9.53,5.54 10.62,6.80 8.98,6.48 9.30,8.12 8.04,7.03 7.50,8.60 6.96,7.03 5.70,8.12 6.02,6.48 4.38,6.80 5.47,5.54 3.90,5.00 5.47,4.46 4.38,3.20 6.02,3.52 5.70,1.88 6.96,2.97"/>
        <circle cx="7.5" cy="5" r="2.1" fill="#000095"/>
        <circle cx="7.5" cy="5" r="1.8" fill="#fff"/>
      </svg>`
    }
  ];

  // Icons
  faUser = faUser;
  faSignOut = faSignOutAlt;
  faEllipsisH = faEllipsisH;
  faChevronDown = faChevronDown;
  faCheck = faCheck;

  @ViewChild('langToggle') private langToggle?: ElementRef<HTMLButtonElement>;
  @ViewChildren('langItem') private langItems!: QueryList<ElementRef<HTMLButtonElement>>;

  private destroyRef = inject(DestroyRef);

  // Sanitized once so the template does not re-render the SVG on every change detection
  readonly languageFlags: Record<Language, SafeHtml>;
  currentLanguageOption: LanguageOption;

  constructor(
    public translateService: TranslateService,
    private authService: AuthService,
    private navMenuService: NavMenuService,
    private navActionsService: NavActionsService,
    private sanitizer: DomSanitizer
  ) {
    this.languageFlags = Object.fromEntries(
      this.languageOptions.map(opt => [opt.value, this.sanitizeSvg(opt.flag)])
    ) as Record<Language, SafeHtml>;
    this.currentLanguageOption = this.getLanguageOption(this.currentLang);
  }

  sanitizeSvg(svg: string | undefined): SafeHtml {
    if (!svg) return '';
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  ngOnInit(): void {
    // Initialize the current language to prevent incorrect display on the first frame
    this.setCurrentLang(this.translateService.currentLang);

    this.translateService.currentLang$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(lang => this.setCurrentLang(lang));

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
    if (this.languageMenuOpen) {
      this.closeLanguageMenu();
    } else {
      this.openLanguageMenu();
    }
  }

  /**
   * Open the language menu and move focus into it
   */
  private openLanguageMenu(focusIndex = this.getCurrentLanguageIndex()): void {
    this.languageMenuOpen = true;
    this.moreMenuOpen = false;
    // The menu is rendered by *ngIf, so wait for it to be in the DOM before focusing
    setTimeout(() => this.focusLanguageItem(focusIndex));
  }

  private closeLanguageMenu(returnFocus = false): void {
    this.languageMenuOpen = false;
    if (returnFocus) {
      this.langToggle?.nativeElement.focus();
    }
  }

  /**
   * Keyboard support on the trigger: ArrowDown / ArrowUp open the menu
   */
  onLanguageToggleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openLanguageMenu(event.key === 'ArrowUp' ? this.languageOptions.length - 1 : this.getCurrentLanguageIndex());
    } else if (event.key === 'Escape' && this.languageMenuOpen) {
      this.closeLanguageMenu();
    }
  }

  /**
   * Keyboard support inside the menu: arrows, Home / End, Escape and Tab.
   * Enter / Space are handled natively by the item buttons.
   */
  onLanguageMenuKeydown(event: KeyboardEvent): void {
    const items = this.langItems.toArray();
    const current = items.findIndex(item => item.nativeElement === document.activeElement);
    const last = items.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusLanguageItem(current >= last ? 0 : current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusLanguageItem(current <= 0 ? last : current - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusLanguageItem(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusLanguageItem(last);
        break;
      case 'Escape':
        event.preventDefault();
        this.closeLanguageMenu(true);
        break;
      case 'Tab':
        this.closeLanguageMenu();
        break;
    }
  }

  private focusLanguageItem(index: number): void {
    this.langItems?.get(index)?.nativeElement.focus();
  }

  private getCurrentLanguageIndex(): number {
    return Math.max(0, this.languageOptions.findIndex(opt => opt.value === this.currentLang));
  }

  /**
   * Select a language
   */
  selectLanguage(lang: Language, event?: Event): void {
    event?.stopPropagation();
    if (lang !== this.currentLang) {
      this.translateService.setLanguage(lang);
    }
    this.closeLanguageMenu(true);
  }

  private setCurrentLang(lang: Language): void {
    this.currentLang = lang;
    this.currentLanguageOption = this.getLanguageOption(lang);
  }

  /**
   * Get the display option for a language, defaulting to English
   */
  private getLanguageOption(lang: Language): LanguageOption {
    return (
      this.languageOptions.find(opt => opt.value === lang) ||
      this.languageOptions.find(opt => opt.value === 'en')!
    );
  }

  onLogout(): void {
    this.logoutClick.emit();
  }
}
