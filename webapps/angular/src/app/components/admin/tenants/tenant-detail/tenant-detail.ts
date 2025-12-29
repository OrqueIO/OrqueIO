import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSave, faTrash, faArrowLeft, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
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
    ConfirmDialogComponent
  ],
  templateUrl: './tenant-detail.html',
  styleUrls: ['./tenant-detail.css']
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

  faSave = faSave;
  faTrash = faTrash;
  faArrowLeft = faArrowLeft;
  faPlus = faPlus;
  faTimes = faTimes;

  tenantId: string = '';
  tenant: Tenant | null = null;
  loading: boolean = false;

  // Form
  tenantForm!: FormGroup;

  // Tabs
  activeTab: 'info' | 'users' | 'groups' = 'info';

  // Users & Groups
  tenantUsers: User[] = [];
  tenantGroups: Group[] = [];
  loadingUsers: boolean = false;
  loadingGroups: boolean = false;

  // Add User/Group dialogs
  showAddUserDialog: boolean = false;
  showAddGroupDialog: boolean = false;
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
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
          this.notifications.addError({
            status: 'admin.tenants.loadError',
            message: 'Failed to load tenant'
          });
          this.router.navigate(['/admin/tenants']);
        }
      });
  }

  saveTenant(): void {
    if (!this.tenantForm.valid) return;

    const updates = {
      name: this.tenantForm.value.name
    };

    this.tenantService.updateTenant(this.tenantId, updates)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.tenantUpdated', 'Tenant updated successfully');
          this.loadTenant();
        },
        error: () => {
          this.notifications.addError({
            status: 'admin.tenants.updateError',
            message: 'Failed to update tenant'
          });
        }
      });
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
        error: () => {
          this.notifications.addError({
            status: 'admin.tenants.deleteError',
            message: 'Failed to delete tenant'
          });
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  setActiveTab(tab: 'info' | 'users' | 'groups'): void {
    this.activeTab = tab;
    if (tab === 'users' && this.tenantUsers.length === 0) {
      this.loadUsers();
    } else if (tab === 'groups' && this.tenantGroups.length === 0) {
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
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingUsers = false;
          this.cdr.detectChanges();
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
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingGroups = false;
          this.cdr.detectChanges();
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
    this.loadAvailableUsers();
  }

  closeAddUserDialog(): void {
    this.showAddUserDialog = false;
    this.availableUsers = [];
  }

  loadAvailableUsers(): void {
    this.loadingAvailableUsers = true;
    const existingUserIds = this.tenantUsers.map(u => u.id);

    this.userService.getUsers({ id: this.userSearchTerm || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: users => {
          this.availableUsers = users.filter(u => !existingUserIds.includes(u.id));
          this.loadingAvailableUsers = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingAvailableUsers = false;
          this.cdr.detectChanges();
        }
      });
  }

  onUserSearch(): void {
    this.loadAvailableUsers();
  }

  addUser(user: User): void {
    this.tenantService.addUserToTenant(this.tenantId, user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.userAdded', 'User added to tenant');
          this.tenantUsers = [...this.tenantUsers, user];
          this.availableUsers = this.availableUsers.filter(u => u.id !== user.id);
          this.cdr.detectChanges();
        },
        error: () => {
          this.notifications.addError({
            status: 'admin.tenants.userAddError',
            message: 'Failed to add user to tenant'
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
          this.cdr.detectChanges();
        },
        error: () => {
          this.notifications.addError({
            status: 'admin.tenants.userRemoveError',
            message: 'Failed to remove user from tenant'
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
    this.loadAvailableGroups();
  }

  closeAddGroupDialog(): void {
    this.showAddGroupDialog = false;
    this.availableGroups = [];
  }

  loadAvailableGroups(): void {
    this.loadingAvailableGroups = true;
    const existingGroupIds = this.tenantGroups.map(g => g.id);

    this.groupService.getGroups({ id: this.groupSearchTerm || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: groups => {
          this.availableGroups = groups.filter(g => !existingGroupIds.includes(g.id));
          this.loadingAvailableGroups = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingAvailableGroups = false;
          this.cdr.detectChanges();
        }
      });
  }

  onGroupSearch(): void {
    this.loadAvailableGroups();
  }

  addGroup(group: Group): void {
    this.tenantService.addGroupToTenant(this.tenantId, group.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.groupAdded', 'Group added to tenant');
          this.tenantGroups = [...this.tenantGroups, group];
          this.availableGroups = this.availableGroups.filter(g => g.id !== group.id);
          this.cdr.detectChanges();
        },
        error: () => {
          this.notifications.addError({
            status: 'admin.tenants.groupAddError',
            message: 'Failed to add group to tenant'
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
          this.cdr.detectChanges();
        },
        error: () => {
          this.notifications.addError({
            status: 'admin.tenants.groupRemoveError',
            message: 'Failed to remove group from tenant'
          });
          this.groupToRemove = null;
        }
      });
  }

  cancelRemoveGroup(): void {
    this.showRemoveGroupConfirm = false;
    this.groupToRemove = null;
  }
}
