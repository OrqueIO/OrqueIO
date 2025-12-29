import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService, Authentication } from '../../services/auth';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslateService } from '../../i18n/translate.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './profile-component.html',
  styleUrls: ['./profile-component.css']
})
export class ProfileComponent implements OnInit {
  authentication: Authentication | null = null;
  isLoading = false;
  isLoggingOut = false;
  isSaving = false;

  // Edit states
  isEditingName = false;
  isEditingEmail = false;
  editName = '';
  editEmail = '';

  // Messages
  errorMessage = '';
  successMessage = '';

  private destroyRef = inject(DestroyRef);

  constructor(
    private authService: AuthService,
    private router: Router,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.authService.authentication$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(auth => {
        this.authentication = auth;
        this.isLoading = false;
      });

    if (!this.authService.isAuthenticated) {
      this.isLoading = true;
      this.authService.getAuthentication()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  get userName(): string {
    return this.authentication?.name || 'Invité';
  }

  get userEmail(): string {
    return this.authentication?.email || 'Non renseigné';
  }

  get isLoggedIn(): boolean {
    return this.authentication !== null;
  }

  // Edit Name
  startEditName(): void {
    this.isEditingName = true;
    this.editName = this.authentication?.name || '';
    this.clearMessages();
  }

  cancelEditName(): void {
    this.isEditingName = false;
    this.editName = '';
  }

  saveName(): void {
    if (!this.editName.trim()) {
      this.errorMessage = this.translateService.instant('PROFILE_NAME_EMPTY_ERROR');
      return;
    }

    this.isSaving = true;
    this.clearMessages();

    this.authService.updateProfile({ name: this.editName.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage = this.translateService.instant('PROFILE_UPDATE_SUCCESS');
          this.isEditingName = false;
          this.isSaving = false;
          this.autoHideSuccess();
        },
        error: (err: string) => {
          this.errorMessage = err || this.translateService.instant('PROFILE_UPDATE_ERROR');
          this.isSaving = false;
        }
      });
  }

  // Edit Email
  startEditEmail(): void {
    this.isEditingEmail = true;
    this.editEmail = this.authentication?.email || '';
    this.clearMessages();
  }

  cancelEditEmail(): void {
    this.isEditingEmail = false;
    this.editEmail = '';
  }

  saveEmail(): void {
    if (!this.editEmail.trim()) {
      this.errorMessage = this.translateService.instant('PROFILE_EMAIL_EMPTY_ERROR');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editEmail)) {
      this.errorMessage = this.translateService.instant('PROFILE_EMAIL_INVALID_ERROR');
      return;
    }

    this.isSaving = true;
    this.clearMessages();

    this.authService.updateProfile({ email: this.editEmail.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage = this.translateService.instant('PROFILE_UPDATE_SUCCESS');
          this.isEditingEmail = false;
          this.isSaving = false;
          this.autoHideSuccess();
        },
        error: (err: string) => {
          this.errorMessage = err || this.translateService.instant('PROFILE_UPDATE_ERROR');
          this.isSaving = false;
        }
      });
  }

  // Edit Avatar
  editAvatar(): void {
    // TODO: Implement avatar upload functionality
    this.successMessage = this.translateService.instant('PROFILE_AVATAR_COMING_SOON');
    this.autoHideSuccess();
  }

  changePassword(): void {
    this.router.navigate(['/change-password']);
  }

  signOut(): void {
    this.isLoggingOut = true;
    this.authService.logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: () => {
          this.isLoggingOut = false;
        }
      });
  }

  contact(): void {
    window.open('mailto:support@orque.io', '_blank');
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private autoHideSuccess(): void {
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
}
