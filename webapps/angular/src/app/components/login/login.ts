import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';
import { NotificationsService } from '../../services/notifications.service';
import { TranslateService, Language } from '../../i18n/translate.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { OAuth2ButtonsComponent } from './oauth2-buttons/oauth2-buttons.component';
import { InitialUserService } from '../../services/initial-user.service';

type LoginStatus = 'INIT' | 'LOADING' | 'ERROR' | 'DONE';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe, OAuth2ButtonsComponent],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  status: LoginStatus = 'INIT';
  showPassword = false;
  showFirstLogin = false;
  showSetupLink = false;
  currentLang: Language = 'fr';

  private readonly FIRST_VISIT_KEY = 'orqueio_firstVisit';
  private langSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private notifications: NotificationsService,
    public translateService: TranslateService,
    private initialUserService: InitialUserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(3)]]
    });

    // Subscribe to language changes
    this.langSubscription = this.translateService.currentLang$.subscribe(lang => {
      this.currentLang = lang;
    });

    // CRITICAL: Check for OAuth2 successful callback FIRST
    // This must run before other checks to handle SSO redirect properly
    if (this.handleOAuth2Callback()) {
      // OAuth2 callback detected and being handled - skip other init logic
      return;
    }

    // Check for first visit
    this.checkFirstVisit();

    // Check for OAuth2 error in URL parameters
    this.checkOAuth2Error();

    // Check if setup is available (no admin exists)
    this.checkSetupAvailable();
  }

  private checkSetupAvailable(): void {
    this.initialUserService.isSetupAvailable().subscribe({
      next: (available) => {
        this.showSetupLink = available;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showSetupLink = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.langSubscription?.unsubscribe();
  }

  private checkFirstVisit(): void {
    const isFirstVisit = localStorage.getItem(this.FIRST_VISIT_KEY) !== 'false';
    if (isFirstVisit) {
      // Check if welcome endpoint exists
      this.http.get('/orqueio-welcome', { responseType: 'text' }).subscribe({
        next: () => {
          this.showFirstLogin = true;
        },
        error: () => {
          // Welcome endpoint doesn't exist, don't show first login box
          this.dismissFirstLogin();
        }
      });
    }
  }

  dismissFirstLogin(): void {
    this.showFirstLogin = false;
    localStorage.setItem(this.FIRST_VISIT_KEY, 'false');
  }

  toggleLanguage(): void {
    const newLang = this.currentLang === 'fr' ? 'en' : 'fr';
    this.translateService.setLanguage(newLang);
  }

  get username() {
    return this.loginForm.get('username');
  }

  get password() {
    return this.loginForm.get('password');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Handle Enter key in username field - move focus to password
   */
  onUsernameEnter(event: Event, passwordInput: HTMLInputElement): void {
    event.preventDefault();
    passwordInput.focus();
  }

  /**
   * Handle OAuth2 successful callback after authentication.
   *
   * When the user authenticates via SSO, Spring Security:
   * 1. Processes the OAuth2 callback (/login/oauth2/code/*)
   * 2. Creates a session with Set-Cookie header
   * 3. Redirects to /orqueio/app/ (or saved request URL)
   *
   * Angular then:
   * 1. Loads the app at the redirect URL
   * 2. This method detects we're coming from OAuth2
   * 3. Verifies authentication with the backend
   * 4. Navigates to the intended destination
   *
   * This fixes the "double login" issue where users had to click SSO twice.
   *
   * @returns true if OAuth2 callback was detected and is being handled
   */
  private handleOAuth2Callback(): boolean {
    const currentUrl = window.location.pathname;

    // Check if we're on /login after being redirected from OAuth2
    // The presence of SSO marker indicates we initiated an OAuth2 flow
    if (this.authService.isSsoSession() && currentUrl.includes('/login')) {
      // Set loading state
      this.status = 'LOADING';

      // Verify authentication with backend
      // The session cookie should have been set by the OAuth2 callback
      this.authService.getAuthentication().subscribe({
        next: (auth) => {
          if (auth) {
            this.status = 'DONE';

            // Navigate to the saved return URL or home
            const returnUrl = this.authService.consumeReturnUrl();
            this.router.navigate([returnUrl]);
          } else {
            // No authentication found - this shouldn't happen if SSO marker is set
            console.warn('OAuth2 callback: No authentication found despite SSO marker');
            this.authService.clearSsoMarker();
            this.status = 'INIT';
          }
        },
        error: (err) => {
          // Authentication failed - session might not be ready yet
          console.error('OAuth2 callback: Authentication check failed', err);

          // Clear SSO marker to prevent infinite loop
          this.authService.clearSsoMarker();

          // Show error to user
          this.notifications.addError({
            status: this.translateService.instant('PAGE_LOGIN_OAUTH2_FAILED'),
            message: this.translateService.instant('PAGE_LOGIN_OAUTH2_SESSION_ERROR')
          });

          this.status = 'INIT';
        }
      });

      return true; // OAuth2 callback detected and being handled
    }

    return false; // Not an OAuth2 callback
  }

  /**
   * Check for OAuth2 error in URL parameters and display error notification.
   * This handles the case where the OAuth2 provider returns an error.
   */
  private checkOAuth2Error(): void {
    if (this.authService.checkOAuth2Error()) {
      this.notifications.addError({
        status: this.translateService.instant('PAGE_LOGIN_OAUTH2_FAILED'),
        message: this.translateService.instant('PAGE_LOGIN_OAUTH2_ERROR_MSG')
      });
      // Clean up the URL by removing the error parameter
      this.authService.clearOAuth2Error();
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.status = 'LOADING';
    this.loginForm.disable();

    const { username, password } = this.loginForm.getRawValue();

    this.authService.login(username, password).subscribe({
      next: () => {
        this.status = 'DONE';
        this.router.navigate(['/']);
      },
      error: (error: string) => {
        this.status = 'INIT';
        this.notifications.addError({
          status: this.translateService.instant('PAGE_LOGIN_FAILED'),
          message: error
        });
        this.loginForm.enable();
      }
    });
  }
}
