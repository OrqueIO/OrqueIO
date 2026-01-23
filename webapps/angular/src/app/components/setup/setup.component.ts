/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { InitialUserService, UserProfile } from '../../services/initial-user.service';
import { NotificationsService } from '../../services/notifications.service';
import { TranslateService } from '../../i18n/translate.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

type SetupStatus = 'FORM' | 'LOADING' | 'SUCCESS';

/**
 * Setup component for creating the initial administrator account.
 *
 * This page is displayed when no admin user exists in the system.
 * It allows creating the first admin user with:
 * - Username (required)
 * - Password with policy validation (required)
 * - First name (required)
 * - Last name (required)
 * - Email (optional)
 *
 * After successful creation, displays a success message with link to login.
 */
@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent implements OnInit, OnDestroy {
  setupForm!: FormGroup;
  status: SetupStatus = 'FORM';

  showPassword = false;
  showConfirmPassword = false;

  /** Password validation state */
  passwordValid = true;
  passwordValidating = false;
  passwordValidationError: string | null = null;

  private destroy$ = new Subject<void>();
  private passwordValidation$ = new Subject<string>();

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private initialUserService = inject(InitialUserService);
  private notifications = inject(NotificationsService);
  private translateService = inject(TranslateService);

  ngOnInit(): void {
    this.setupForm = this.fb.group({
      // Account credentials
      userId: ['', [Validators.required]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],

      // Profile information
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.email]]
    }, {
      validators: this.passwordMatchValidator
    });

    // Setup password validation with debounce
    this.setupPasswordValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Custom validator to ensure password and confirmPassword match
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    // Clear the error if passwords match
    if (confirmPassword?.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }

    return null;
  }

  /**
   * Setup password validation against server policy with debounce
   */
  private setupPasswordValidation(): void {
    this.passwordValidation$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(password => {
      if (password && password.length > 0) {
        this.validatePasswordOnServer(password);
      } else {
        this.passwordValid = true;
        this.passwordValidating = false;
      }
    });

    // Listen to password changes
    this.setupForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.passwordValidating = true;
        this.passwordValidation$.next(value);
      });
  }

  /**
   * Validates password against server policy
   */
  private validatePasswordOnServer(password: string): void {
    const profile = this.buildProfile();

    this.initialUserService.validatePassword(password, profile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.passwordValid = response.valid;
          this.passwordValidating = false;
          this.passwordValidationError = null;
        },
        error: () => {
          // On error, assume password is valid (let server validate on submit)
          this.passwordValid = true;
          this.passwordValidating = false;
        }
      });
  }

  /**
   * Builds the user profile from form values
   */
  private buildProfile(): UserProfile {
    const form = this.setupForm.getRawValue();
    return {
      id: form.userId,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || undefined
    };
  }

  // Form getters for template access
  get userId() { return this.setupForm.get('userId'); }
  get password() { return this.setupForm.get('password'); }
  get confirmPassword() { return this.setupForm.get('confirmPassword'); }
  get firstName() { return this.setupForm.get('firstName'); }
  get lastName() { return this.setupForm.get('lastName'); }
  get email() { return this.setupForm.get('email'); }

  /**
   * Checks if the form is valid for submission
   */
  get isFormValid(): boolean {
    return this.setupForm.valid && this.passwordValid && !this.passwordValidating;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Handles form submission to create the initial admin user
   */
  onSubmit(): void {
    if (!this.isFormValid) {
      this.setupForm.markAllAsTouched();
      return;
    }

    this.status = 'LOADING';
    this.setupForm.disable();

    const form = this.setupForm.getRawValue();
    const request = {
      profile: {
        id: form.userId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined
      },
      credentials: {
        password: form.password
      }
    };

    this.initialUserService.createInitialUser(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.status = 'SUCCESS';
        },
        error: (error) => {
          this.status = 'FORM';
          this.setupForm.enable();

          const message = error.error?.message ||
            this.translateService.instant('SETUP_COULD_NOT_CREATE_USER');

          this.notifications.addError({
            status: this.translateService.instant('NOTIFICATIONS_STATUS_ERROR'),
            message
          });
        }
      });
  }

  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
