import { Component, Input, Output, EventEmitter, OnInit, DestroyRef, inject, HostListener, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUser, faSignOutAlt, faEllipsisH, faChevronDown, faCheck, faGlobe } from '@fortawesome/free-solid-svg-icons';
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
  subItems?: NavMenuItem[];
}

export interface LanguageOption {
  value: Language;
  label: string;
  shortLabel: string;
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
  openSubMenuLabel: string | null = null;
  languageMenuOpen = false;

  /**
   * Language dropdown options.
   * - value: Language code passed to TranslateService
   * - label: Name displayed in the dropdown menu
   * - shortLabel: Short label displayed on the trigger button
   */
  readonly languageOptions: LanguageOption[] = [
    {
      value: 'fr',
      label: 'Français',
      shortLabel: 'FR'
    },
    {
      value: 'en',
      label: 'English',
      shortLabel: 'EN'
    },
    {
      value: 'de',
      label: 'Deutsch',
      shortLabel: 'DE'
    },
    {
      value: 'zh-CN',
      label: '简体中文',
      shortLabel: '简'
    },
    {
      value: 'zh-TW',
      label: '繁體中文',
      shortLabel: '繁'
    }
  ];

  // Icons
  faUser = faUser;
  faSignOut = faSignOutAlt;
  faEllipsisH = faEllipsisH;
  faChevronDown = faChevronDown;
  faGlobe = faGlobe;
  faCheck = faCheck;

  @ViewChild('langToggle') private langToggle?: ElementRef<HTMLButtonElement>;
  @ViewChildren('langItem') private langItems!: QueryList<ElementRef<HTMLButtonElement>>;

  private destroyRef = inject(DestroyRef);

  // Sanitized once so the template does not re-render the SVG on every change detection
  currentLanguageOption: LanguageOption;

  constructor(
    public translateService: TranslateService,
    private authService: AuthService,
    private navMenuService: NavMenuService,
    private navActionsService: NavActionsService,
    private sanitizer: DomSanitizer
  ) {
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
    if (!target.closest('.sub-dropdown')) {
      this.openSubMenuLabel = null;
    }
    if (!target.closest('.language-dropdown')) {
      this.languageMenuOpen = false;
    }
  }

  toggleMoreMenu(event: Event): void {
    event.stopPropagation();
    this.moreMenuOpen = !this.moreMenuOpen;
    this.openSubMenuLabel = null;
    this.languageMenuOpen = false;
  }

  closeMoreMenu(): void {
    this.moreMenuOpen = false;
  }

  toggleSubMenu(item: NavMenuItem, event: Event): void {
    event.stopPropagation();
    this.openSubMenuLabel = this.openSubMenuLabel === item.label ? null : item.label;
    this.moreMenuOpen = false;
    this.languageMenuOpen = false;
  }

  closeSubMenu(): void {
    this.openSubMenuLabel = null;
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
    this.openSubMenuLabel = null;
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
