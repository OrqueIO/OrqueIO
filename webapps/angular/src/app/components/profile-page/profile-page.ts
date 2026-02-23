import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUser, faShield, faSave, faSignOutAlt, faHome, faChevronRight, faSync } from '@fortawesome/free-solid-svg-icons';
import { RouterModule, Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslateService } from '../../i18n/translate.service';
import { AuthService } from '../../services/auth';
import { NotificationsService } from '../../services/notifications.service';
import { UserService } from '../../services/admin/user.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TranslatePipe
  ],
  templateUrl: './profile-page.html',
  styleUrls: ['./profile-page.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProfilePageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private notifications = inject(NotificationsService);
  private translateService = inject(TranslateService);

  // Icons
  faUser = faUser;
  faShield = faShield;
  faSave = faSave;
  faSignOut = faSignOutAlt;
  faHome = faHome;
  faChevronRight = faChevronRight;
  faSync = faSync;

  // User data
  userId: string = '';
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  loading: boolean = true;

  // Forms
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // Sections navigation
  activeSection: 'profile' | 'security' = 'profile';

  // Loading states
  savingProfile: boolean = false;
  savingPassword: boolean = false;

  ngOnInit(): void {
    this.initializeForms();
    this.loadUserProfile();
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: ['', Validators.email]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private loadUserProfile(): void {
    this.loading = true;
    const auth = this.authService.currentAuthentication;

    if (auth) {
      this.userId = auth.name;

      // Load full profile from user service
      this.userService.getUserProfile(this.userId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: profile => {
            this.firstName = profile.firstName || '';
            this.lastName = profile.lastName || '';
            this.email = profile.email || '';

            this.profileForm.patchValue({
              firstName: this.firstName,
              lastName: this.lastName,
              email: this.email
            });

            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
    } else {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setActiveSection(section: 'profile' | 'security'): void {
    this.activeSection = section;
  }

  saveProfile(): void {
    if (!this.profileForm.valid || this.savingProfile) return;

    this.savingProfile = true;
    const updates = {
      id: this.userId,
      firstName: this.profileForm.value.firstName || '',
      lastName: this.profileForm.value.lastName || '',
      email: this.profileForm.value.email || ''
    };

    this.userService.updateUserProfile(this.userId, updates)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingProfile = false;
          this.notifications.addSuccess('profile.updated', 'Profile updated successfully');
          this.firstName = updates.firstName;
          this.lastName = updates.lastName;
          this.email = updates.email;
          this.profileForm.markAsPristine();
          this.cdr.detectChanges();
        },
        error: () => {
          this.savingProfile = false;
          this.notifications.addError({
            status: this.translateService.instant('profile.updateError'),
            message: this.translateService.instant('profile.updateError')
          });
          this.cdr.detectChanges();
        }
      });
  }

  resetProfileForm(): void {
    this.profileForm.patchValue({
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email
    });
    this.profileForm.markAsPristine();
  }

  updatePassword(): void {
    if (!this.passwordForm.valid || this.savingPassword) return;

    this.savingPassword = true;
    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword(currentPassword, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingPassword = false;
          this.notifications.addSuccess('profile.passwordUpdated', 'Password updated successfully');
          this.passwordForm.reset();
          this.cdr.detectChanges();
        },
        error: () => {
          this.savingPassword = false;
          this.notifications.addError({
            status: this.translateService.instant('profile.passwordUpdateError'),
            message: this.translateService.instant('profile.passwordUpdateError')
          });
          this.cdr.detectChanges();
        }
      });
  }

  logout(): void {
    this.authService.smartLogout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  refresh(): void {
    this.loadUserProfile();
  }

  getInitials(): string {
    const first = this.firstName?.charAt(0) || '';
    const last = this.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || this.userId?.charAt(0)?.toUpperCase() || '?';
  }

  getFullName(): string {
    const name = `${this.firstName} ${this.lastName}`.trim();
    return name || this.userId;
  }
}
