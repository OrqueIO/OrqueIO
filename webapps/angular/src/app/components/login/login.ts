import { Component, OnInit, OnDestroy } from '@angular/core';
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
    private initialUserService: InitialUserService
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
      },
      error: () => {
        this.showSetupLink = false;
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
