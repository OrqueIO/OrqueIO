import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSave, faTrash, faArrowLeft, faPlus, faTimes, faBuilding, faUsers, faUser, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
import { AdminPageHeaderComponent } from '../../../../shared/admin-page-header/admin-page-header';
import { TenantService } from '../../../../services/admin/tenant.service';
import { UserService } from '../../../../services/admin/user.service';
import { GroupService } from '../../../../services/admin/group.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { Tenant } from '../../../../models/admin/tenant.model';
import { User } from '../../../../models/admin/user.model';
import { Group } from '../../../../models/admin/group.model';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    FontAwesomeModule,
    TranslatePipe,
    ConfirmDialogComponent,
    AdminPageHeaderComponent
  ],
  templateUrl: './tenant-detail.html',
  styleUrls: ['./tenant-detail.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class TenantDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private tenantService = inject(TenantService);
  private userService = inject(UserService);
  private groupService = inject(GroupService);
  private notifications = inject(NotificationsService);
  private translateService = inject(TranslateService);

  faSave = faSave;
  faTrash = faTrash;
  faArrowLeft = faArrowLeft;
  faPlus = faPlus;
  faTimes = faTimes;
  faBuilding = faBuilding;
  faUsers = faUsers;
  faUser = faUser;
  faInfoCircle = faInfoCircle;

  tenantId: string = '';
  tenant: Tenant | null = null;
  loading: boolean = false;
  savingTenant: boolean = false;

  // Form
  tenantForm!: FormGroup;

  // Sections navigation
  activeSection: 'info' | 'users' | 'groups' = 'info';

  // Users & Groups
  tenantUsers: User[] = [];
  tenantGroups: Group[] = [];
  loadingUsers: boolean = false;
  loadingGroups: boolean = false;

  // Add User/Group dialogs
  showAddUserDialog: boolean = false;
  showAddGroupDialog: boolean = false;
  allAvailableUsers: User[] = [];
  allAvailableGroups: Group[] = [];
  availableUsers: User[] = [];
  availableGroups: Group[] = [];
  userSearchTerm: string = '';
  groupSearchTerm: string = '';
  loadingAvailableUsers: boolean = false;
  loadingAvailableGroups: boolean = false;

  // Confirm dialogs
  showDeleteConfirm: boolean = false;
  showRemoveUserConfirm: boolean = false;
  showRemoveGroupConfirm: boolean = false;
  userToRemove: User | null = null;
  groupToRemove: Group | null = null;

  ngOnInit(): void {
    this.tenantId = this.route.snapshot.params['id'];
    this.initializeForm();
    this.loadTenant();
  }

  private initializeForm(): void {
    this.tenantForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: ['']
    });
  }

  private loadTenant(): void {
    this.loading = true;
    this.tenantService.getTenant(this.tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tenant => {
          this.tenant = tenant;
          this.tenantForm.patchValue({
            id: tenant.id,
            name: tenant.name
          });
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.loadError'),
            message: this.extractErrorMessage(err) || this.translateService.instant('admin.tenants.loadError')
          });
          this.router.navigate(['/admin/tenants']);
        }
      });
  }

  saveTenant(): void {
    if (!this.tenantForm.valid || this.savingTenant) return;

    this.savingTenant = true;
    const updates = {
      id: this.tenantId,
      name: this.tenantForm.value.name || ''
    };

    this.tenantService.updateTenant(this.tenantId, updates)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingTenant = false;
          this.notifications.addSuccess('admin.tenants.tenantUpdated', 'Tenant updated successfully');
          this.loadTenant();
        },
        error: (err) => {
          this.savingTenant = false;
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.updateError'),
            message: this.extractErrorMessage(err) || this.translateService.instant('admin.tenants.updateError')
          });
          this.cdr.markForCheck();
        }
      });
  }

  resetTenantForm(): void {
    if (this.tenant) {
      this.tenantForm.patchValue({
        id: this.tenant.id,
        name: this.tenant.name
      });
      this.tenantForm.markAsPristine();
    }
  }

  deleteTenant(): void {
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    this.showDeleteConfirm = false;
    this.tenantService.deleteTenant(this.tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.tenantDeleted', 'Tenant deleted successfully');
          this.router.navigate(['/admin/tenants']);
        },
        error: (err) => {
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.deleteError'),
            message: this.extractErrorMessage(err) || this.translateService.instant('admin.tenants.deleteError')
          });
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  setActiveSection(section: 'info' | 'users' | 'groups'): void {
    this.activeSection = section;
    this.cdr.markForCheck();
    if (section === 'users' && this.tenantUsers.length === 0) {
      this.loadUsers();
    } else if (section === 'groups' && this.tenantGroups.length === 0) {
      this.loadGroups();
    }
  }

  loadData(): void {
    this.loadTenant();
    if (this.activeSection === 'users') {
      this.loadUsers();
    } else if (this.activeSection === 'groups') {
      this.loadGroups();
    }
  }

  private loadUsers(): void {
    this.loadingUsers = true;
    this.userService.getUsers({ memberOfTenant: this.tenantId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: users => {
          this.tenantUsers = users;
          this.loadingUsers = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingUsers = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadGroups(): void {
    this.loadingGroups = true;
    this.groupService.getGroups({ memberOfTenant: this.tenantId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: groups => {
          this.tenantGroups = groups;
          this.loadingGroups = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingGroups = false;
          this.cdr.markForCheck();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/tenants']);
  }

  // User membership methods
  openAddUserDialog(): void {
    this.showAddUserDialog = true;
    this.userSearchTerm = '';
    this.cdr.markForCheck();
    this.loadAvailableUsers();
  }

  closeAddUserDialog(): void {
    this.showAddUserDialog = false;
    this.availableUsers = [];
    this.cdr.markForCheck();
  }

  loadAvailableUsers(): void {
    this.loadingAvailableUsers = true;
    this.cdr.markForCheck();
    const existingUserIds = this.tenantUsers.map(u => u.id);

    this.userService.getUsers({ maxResults: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: users => {
          this.allAvailableUsers = users.filter(u => !existingUserIds.includes(u.id));
          this.availableUsers = [...this.allAvailableUsers];
          this.loadingAvailableUsers = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingAvailableUsers = false;
          this.cdr.markForCheck();
        }
      });
  }

  onUserSearch(): void {
    const term = this.userSearchTerm.toLowerCase();
    this.availableUsers = this.allAvailableUsers.filter(user =>
      user.id.toLowerCase().includes(term) ||
      (user.firstName && user.firstName.toLowerCase().includes(term)) ||
      (user.lastName && user.lastName.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term))
    );
    this.cdr.markForCheck();
  }

  addUser(user: User): void {
    this.tenantService.addUserToTenant(this.tenantId, user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.userAdded', 'User added to tenant');
          this.tenantUsers = [...this.tenantUsers, user];
          this.availableUsers = this.availableUsers.filter(u => u.id !== user.id);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.userAddError'),
            message: this.extractErrorMessage(err) || this.translateService.instant('admin.tenants.userAddError')
          });
        }
      });
  }

  confirmRemoveUser(user: User): void {
    this.userToRemove = user;
    this.showRemoveUserConfirm = true;
  }

  removeUser(): void {
    if (!this.userToRemove) return;

    const userId = this.userToRemove.id;
    this.showRemoveUserConfirm = false;

    this.tenantService.removeUserFromTenant(this.tenantId, userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.userRemoved', 'User removed from tenant');
          this.tenantUsers = this.tenantUsers.filter(u => u.id !== userId);
          this.userToRemove = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.userRemoveError'),
            message: this.extractErrorMessage(err) || this.translateService.instant('admin.tenants.userRemoveError')
          });
          this.userToRemove = null;
        }
      });
  }

  cancelRemoveUser(): void {
    this.showRemoveUserConfirm = false;
    this.userToRemove = null;
  }

  // Group membership methods
  openAddGroupDialog(): void {
    this.showAddGroupDialog = true;
    this.groupSearchTerm = '';
    this.cdr.markForCheck();
    this.loadAvailableGroups();
  }

  closeAddGroupDialog(): void {
    this.showAddGroupDialog = false;
    this.availableGroups = [];
    this.cdr.markForCheck();
  }

  loadAvailableGroups(): void {
    this.loadingAvailableGroups = true;
    this.cdr.markForCheck();
    const existingGroupIds = this.tenantGroups.map(g => g.id);

    this.groupService.getGroups({ maxResults: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: groups => {
          this.allAvailableGroups = groups.filter(g => !existingGroupIds.includes(g.id));
          this.availableGroups = [...this.allAvailableGroups];
          this.loadingAvailableGroups = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingAvailableGroups = false;
          this.cdr.markForCheck();
        }
      });
  }

  onGroupSearch(): void {
    const term = this.groupSearchTerm.toLowerCase();
    this.availableGroups = this.allAvailableGroups.filter(group =>
      group.id.toLowerCase().includes(term) ||
      (group.name && group.name.toLowerCase().includes(term))
    );
    this.cdr.markForCheck();
  }

  addGroup(group: Group): void {
    this.tenantService.addGroupToTenant(this.tenantId, group.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.groupAdded', 'Group added to tenant');
          this.tenantGroups = [...this.tenantGroups, group];
          this.availableGroups = this.availableGroups.filter(g => g.id !== group.id);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.groupAddError'),
            message: this.extractErrorMessage(err) || this.translateService.instant('admin.tenants.groupAddError')
          });
        }
      });
  }

  confirmRemoveGroup(group: Group): void {
    this.groupToRemove = group;
    this.showRemoveGroupConfirm = true;
  }

  removeGroup(): void {
    if (!this.groupToRemove) return;

    const groupId = this.groupToRemove.id;
    this.showRemoveGroupConfirm = false;

    this.tenantService.removeGroupFromTenant(this.tenantId, groupId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.groupRemoved', 'Group removed from tenant');
          this.tenantGroups = this.tenantGroups.filter(g => g.id !== groupId);
          this.groupToRemove = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.groupRemoveError'),
            message: this.extractErrorMessage(err) || this.translateService.instant('admin.tenants.groupRemoveError')
          });
          this.groupToRemove = null;
        }
      });
  }

  cancelRemoveGroup(): void {
    this.showRemoveGroupConfirm = false;
    this.groupToRemove = null;
  }

  /**
   * Extract error message from API error response
   */
  private extractErrorMessage(err: any): string | null {
    if (!err) return null;
    if (err.error?.message) return err.error.message;
    if (err.error?.error?.message) return err.error.error.message;
    if (err.message) return err.message;
    if (typeof err.error === 'string') return err.error;
    return null;
  }
}
