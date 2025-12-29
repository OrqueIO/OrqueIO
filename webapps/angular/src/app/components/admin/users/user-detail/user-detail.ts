import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSave, faTrash, faArrowLeft, faPlus, faUnlock, faTimes } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { UserService } from '../../../../services/admin/user.service';
import { GroupService } from '../../../../services/admin/group.service';
import { TenantService } from '../../../../services/admin/tenant.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
import { AddMembershipDialogComponent, MembershipType } from '../add-membership-dialog/add-membership-dialog';
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
    AddMembershipDialogComponent
  ],
  templateUrl: './user-detail.html',
  styleUrls: ['./user-detail.css']
})
export class UserDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private groupService = inject(GroupService);
  private tenantService = inject(TenantService);
  private notifications = inject(NotificationsService);

  faSave = faSave;
  faTrash = faTrash;
  faArrowLeft = faArrowLeft;
  faPlus = faPlus;
  faUnlock = faUnlock;
  faTimes = faTimes;

  userId: string = '';
  user: UserProfile | null = null;
  loading: boolean = false;

  // Forms
  profileForm!: FormGroup;
  credentialsForm!: FormGroup;

  // Tabs
  activeTab: 'profile' | 'credentials' | 'groups' | 'tenants' = 'profile';

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
      password: ['', [Validators.required, Validators.minLength(8)]],
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
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
          this.notifications.addError({
            status: 'admin.users.loadError',
            message: 'Failed to load user'
          });
          this.router.navigate(['/admin/users']);
        }
      });
  }

  saveProfile(): void {
    if (!this.profileForm.valid) return;

    const updates = this.profileForm.value;
    this.userService.updateUserProfile(this.userId, updates)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.users.profileUpdated', 'Profile updated successfully');
          this.loadUser();
        },
        error: () => {
          this.notifications.addError({
            status: 'admin.users.updateError',
            message: 'Failed to update profile'
          });
        }
      });
  }

  updateCredentials(): void {
    if (!this.credentialsForm.valid) return;

    const { authenticatedUserPassword, password } = this.credentialsForm.value;
    this.userService.updateUserCredentials(this.userId, {
      authenticatedUserPassword,
      password
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.users.passwordUpdated', 'Password updated successfully');
          this.credentialsForm.reset();
        },
        error: () => {
          this.notifications.addError({
            status: 'admin.users.passwordUpdateError',
            message: 'Failed to update password'
          });
        }
      });
  }

  deleteUser(): void {
    this.showDeleteConfirm = true;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    this.showDeleteConfirm = false;
    this.userService.deleteUser(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.users.userDeleted', 'User deleted successfully');
          this.router.navigate(['/admin/users']);
        },
        error: () => {
          this.notifications.addError({
            status: 'admin.users.deleteError',
            message: 'Failed to delete user'
          });
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.cdr.markForCheck();
  }

  unlockUser(): void {
    this.userService.unlockUser(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.users.userUnlocked', 'User unlocked successfully');
        },
        error: (err) => {
          this.notifications.addError({
            status: 'admin.users.unlockError',
            message: err?.error?.message || 'Failed to unlock user'
          });
        }
      });
  }

  setActiveTab(tab: 'profile' | 'credentials' | 'groups' | 'tenants'): void {
    this.activeTab = tab;
    if (tab === 'groups' && this.userGroups.length === 0) {
      this.loadGroups();
    } else if (tab === 'tenants' && this.userTenants.length === 0) {
      this.loadTenants();
    }
  }

  private loadGroups(): void {
    this.loadingGroups = true;
    this.groupService.getGroups({ member: this.userId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: groups => {
          this.userGroups = groups;
          this.loadingGroups = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingGroups = false;
          this.cdr.detectChanges();
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
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingTenants = false;
          this.cdr.detectChanges();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
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
