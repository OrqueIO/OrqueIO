import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';
import { NotificationsService } from '../../services/notifications.service';
import { TranslateService, Language } from '../../i18n/translate.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

type LoginStatus = 'INIT' | 'LOADING' | 'ERROR' | 'DONE';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  status: LoginStatus = 'INIT';
  showPassword = false;
  showFirstLogin = false;
  currentLang: Language = 'fr';

  private readonly FIRST_VISIT_KEY = 'orqueio_firstVisit';
  private langSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private notifications: NotificationsService,
    public translateService: TranslateService
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
   * Handle social login button click
   * Shows a message that the provider is not configured
   */
  onSocialLogin(provider: string): void {
    const providerMessages: { [key: string]: string } = {
      'google': 'Google OAuth',
      'keycloak': 'Keycloak',
      'auth0': 'Auth0',
      'okta': 'Okta',
      'azure': 'Azure AD'
    };
    const providerName = providerMessages[provider] || provider;
    const message = this.translateService.instant('SOCIAL_LOGIN_NOT_CONFIGURED', { provider: providerName });
    this.notifications.addError({
      status: this.translateService.instant('PAGE_LOGIN_FAILED'),
      message
    });
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
