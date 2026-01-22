import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSave, faTrash, faArrowLeft, faPlus, faUnlock, faTimes, faUsers, faBuilding, faUser, faShield, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { AuthService } from '../../../../services/auth';
import { UserService } from '../../../../services/admin/user.service';
import { GroupService } from '../../../../services/admin/group.service';
import { TenantService } from '../../../../services/admin/tenant.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
import { AddMembershipDialogComponent, MembershipType } from '../add-membership-dialog/add-membership-dialog';
import { AdminPageHeaderComponent } from '../../../../shared/admin-page-header/admin-page-header';
import { UserProfile } from '../../../../models/admin/user.model';
import { Group } from '../../../../models/admin/group.model';
import { Tenant } from '../../../../models/admin/tenant.model';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TranslatePipe,
    ConfirmDialogComponent,
    AddMembershipDialogComponent,
    AdminPageHeaderComponent
  ],
  templateUrl: './user-detail.html',
  styleUrls: ['./user-detail.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class UserDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private groupService = inject(GroupService);
  private tenantService = inject(TenantService);
  private notifications = inject(NotificationsService);
  private translateService = inject(TranslateService);

  faSave = faSave;
  faTrash = faTrash;
  faArrowLeft = faArrowLeft;
  faPlus = faPlus;
  faUnlock = faUnlock;
  faCheckCircle = faCheckCircle;
  faTimes = faTimes;
  faUsers = faUsers;
  faBuilding = faBuilding;
  faUser = faUser;
  faShield = faShield;

  userId: string = '';
  user: UserProfile | null = null;
  loading: boolean = false;

  // Forms
  profileForm!: FormGroup;
  credentialsForm!: FormGroup;

  // Sections navigation
  activeSection: 'profile' | 'security' | 'memberships' = 'profile';

  // Loading states
  savingProfile: boolean = false;
  savingPassword: boolean = false;
  unlocking: boolean = false;

  // Groups & Tenants
  userGroups: Group[] = [];
  userTenants: Tenant[] = [];
  loadingGroups: boolean = false;
  loadingTenants: boolean = false;

  // Dialogs
  showDeleteConfirm: boolean = false;
  showAddMembershipDialog: boolean = false;
  membershipDialogType: MembershipType = 'group';

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['id'];
    this.initializeForms();
    this.loadUser();
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: ['', Validators.email]
    });

    this.credentialsForm = this.fb.group({
      authenticatedUserPassword: ['', Validators.required],
      password: ['', Validators.required],
      password2: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const password2 = group.get('password2')?.value;
    return password === password2 ? null : { passwordMismatch: true };
  }

  private loadUser(): void {
    this.loading = true;
    this.userService.getUserProfile(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: user => {
          this.user = user;
          this.profileForm.patchValue({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          });
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
          this.notifications.addError({
            status: this.translateService.instant('admin.users.loadError'),
            message: this.translateService.instant('admin.users.loadError')
          });
          this.router.navigate(['/admin/users']);
        }
      });
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
          this.notifications.addSuccess('admin.users.profileUpdated', 'Profile updated successfully');
          this.loadUser();
        },
        error: () => {
          this.savingProfile = false;
          this.notifications.addError({
            status: this.translateService.instant('admin.users.updateError'),
            message: this.translateService.instant('admin.users.updateError')
          });
          this.cdr.markForCheck();
        }
      });
  }

  resetProfileForm(): void {
    if (this.user) {
      this.profileForm.patchValue({
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email
      });
      this.profileForm.markAsPristine();
    }
  }

  updateCredentials(): void {
    if (!this.credentialsForm.valid || this.savingPassword) return;

    this.savingPassword = true;
    const { authenticatedUserPassword, password } = this.credentialsForm.value;
    this.userService.updateUserCredentials(this.userId, {
      authenticatedUserPassword,
      password
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingPassword = false;
          this.notifications.addSuccess('admin.users.passwordUpdated', 'Password updated successfully');
          this.credentialsForm.reset();
          this.cdr.markForCheck();
        },
        error: () => {
          this.savingPassword = false;
          this.notifications.addError({
            status: this.translateService.instant('admin.users.passwordUpdateError'),
            message: this.translateService.instant('admin.users.passwordUpdateError')
          });
          this.cdr.markForCheck();
        }
      });
  }

  deleteUser(): void {
    this.showDeleteConfirm = true;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    this.showDeleteConfirm = false;
    const currentUser = this.authService.currentAuthentication;
    const isSelfDeletion = currentUser?.name === this.userId;

    this.userService.deleteUser(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.users.userDeleted', 'User deleted successfully');

          // If user deleted their own account, logout from all engines
          if (isSelfDeletion) {
            this.authService.logout()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: () => {
                  // Logout will redirect to login page
                },
                error: () => {
                  // Force redirect to login even if logout fails
                  this.router.navigate(['/login']);
                }
              });
          } else {
            this.router.navigate(['/admin/users']);
          }
        },
        error: () => {
          this.notifications.addError({
            status: this.translateService.instant('admin.users.deleteError'),
            message: this.translateService.instant('admin.users.deleteError')
          });
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.cdr.markForCheck();
  }

  unlockUser(): void {
    if (this.unlocking) return;

    this.unlocking = true;
    this.userService.unlockUser(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.unlocking = false;
          this.notifications.addSuccess('admin.users.userUnlocked', 'User unlocked successfully');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.unlocking = false;
          this.notifications.addError({
            status: 'admin.users.unlockError',
            message: err?.error?.message || 'Failed to unlock user'
          });
          this.cdr.markForCheck();
        }
      });
  }

  setActiveSection(section: 'profile' | 'security' | 'memberships'): void {
    this.activeSection = section;
    this.cdr.markForCheck();
    if (section === 'memberships') {
      if (this.userGroups.length === 0) {
        this.loadGroups();
      }
      if (this.userTenants.length === 0) {
        this.loadTenants();
      }
    }
  }

  getInitials(): string {
    const first = this.user?.firstName?.charAt(0) || '';
    const last = this.user?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || this.user?.id?.charAt(0)?.toUpperCase() || '?';
  }

  getTotalMemberships(): number {
    return this.userGroups.length + this.userTenants.length;
  }

  private loadGroups(): void {
    this.loadingGroups = true;
    this.groupService.getGroups({ member: this.userId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: groups => {
          this.userGroups = groups;
          this.loadingGroups = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingGroups = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadTenants(): void {
    this.loadingTenants = true;
    this.tenantService.getTenants({ userMember: this.userId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tenants => {
          this.userTenants = tenants;
          this.loadingTenants = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingTenants = false;
          this.cdr.markForCheck();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  loadData(): void {
    this.loadUser();
    if (this.activeSection === 'memberships') {
      this.loadGroups();
      this.loadTenants();
    }
  }

  // Group membership management
  openAddGroupDialog(): void {
    this.membershipDialogType = 'group';
    this.showAddMembershipDialog = true;
    this.cdr.markForCheck();
  }

  onGroupAdded(): void {
    this.showAddMembershipDialog = false;
    this.loadGroups();
    this.cdr.markForCheck();
  }

  removeGroup(groupId: string): void {
    this.groupService.removeUserFromGroup(groupId, this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.users.groupRemoved', 'User removed from group');
          this.loadGroups();
        },
        error: (err) => {
          this.notifications.addError({
            status: 'admin.users.groupRemoveError',
            message: err?.error?.message || 'Failed to remove user from group'
          });
        }
      });
  }

  // Tenant membership management
  openAddTenantDialog(): void {
    this.membershipDialogType = 'tenant';
    this.showAddMembershipDialog = true;
    this.cdr.markForCheck();
  }

  onTenantAdded(): void {
    this.showAddMembershipDialog = false;
    this.loadTenants();
    this.cdr.markForCheck();
  }

  removeTenant(tenantId: string): void {
    this.tenantService.removeUserFromTenant(tenantId, this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.users.tenantRemoved', 'User removed from tenant');
          this.loadTenants();
        },
        error: (err) => {
          this.notifications.addError({
            status: 'admin.users.tenantRemoveError',
            message: err?.error?.message || 'Failed to remove user from tenant'
          });
        }
      });
  }

  onMembershipDialogCancel(): void {
    this.showAddMembershipDialog = false;
    this.cdr.markForCheck();
  }

  get excludedGroupIds(): string[] {
    return this.userGroups.map(g => g.id);
  }

  get excludedTenantIds(): string[] {
    return this.userTenants.map(t => t.id);
  }
}
