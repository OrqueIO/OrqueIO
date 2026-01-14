import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSave, faTrash, faArrowLeft, faPlus, faUsers, faBuilding, faUser, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { GroupService } from '../../../../services/admin/group.service';
import { UserService } from '../../../../services/admin/user.service';
import { TenantService } from '../../../../services/admin/tenant.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { Group } from '../../../../models/admin/group.model';
import { User } from '../../../../models/admin/user.model';
import { Tenant } from '../../../../models/admin/tenant.model';
import { AddMemberDialogComponent } from '../add-member-dialog/add-member-dialog';
import { AddTenantDialogComponent } from '../add-tenant-dialog/add-tenant-dialog';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
import { AdminPageHeaderComponent } from '../../../../shared/admin-page-header/admin-page-header';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TranslatePipe,
    AddMemberDialogComponent,
    AddTenantDialogComponent,
    ConfirmDialogComponent,
    AdminPageHeaderComponent
  ],
  templateUrl: './group-detail.html',
  styleUrls: ['./group-detail.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class GroupDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private groupService = inject(GroupService);
  private userService = inject(UserService);
  private tenantService = inject(TenantService);
  private notifications = inject(NotificationsService);

  faSave = faSave;
  faTrash = faTrash;
  faArrowLeft = faArrowLeft;
  faPlus = faPlus;
  faUsers = faUsers;
  faBuilding = faBuilding;
  faUser = faUser;
  faInfoCircle = faInfoCircle;
  faTimes = faTimes;

  groupId: string = '';
  group: Group | null = null;
  loading: boolean = false;
  savingGroup: boolean = false;

  // Form
  groupForm!: FormGroup;

  // Sections navigation
  activeSection: 'info' | 'members' | 'tenants' = 'info';

  // Members & Tenants
  groupMembers: User[] = [];
  groupTenants: Tenant[] = [];
  loadingMembers: boolean = false;
  loadingTenants: boolean = false;

  // Dialogs
  showAddMemberDialog: boolean = false;
  showAddTenantDialog: boolean = false;
  showDeleteConfirm: boolean = false;
  showRemoveMemberConfirm: boolean = false;
  showRemoveTenantConfirm: boolean = false;
  memberToRemove: User | null = null;
  tenantToRemove: Tenant | null = null;

  ngOnInit(): void {
    this.groupId = this.route.snapshot.params['id'];
    this.initializeForm();
    this.loadGroup();
  }

  private initializeForm(): void {
    this.groupForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: [''],
      type: ['']
    });
  }

  private loadGroup(): void {
    this.loading = true;
    this.groupService.getGroup(this.groupId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: group => {
          this.group = group;
          this.groupForm.patchValue({
            id: group.id,
            name: group.name,
            type: group.type
          });
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
          this.notifications.addError({
            status: 'admin.groups.loadError',
            message: 'Failed to load group'
          });
          this.router.navigate(['/admin/groups']);
        }
      });
  }

  saveGroup(): void {
    if (!this.groupForm.valid || this.savingGroup) return;

    this.savingGroup = true;
    const updates = {
      name: this.groupForm.value.name,
      type: this.groupForm.value.type
    };

    this.groupService.updateGroup(this.groupId, updates)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingGroup = false;
          this.notifications.addSuccess('admin.groups.groupUpdated', 'Group updated successfully');
          this.loadGroup();
        },
        error: () => {
          this.savingGroup = false;
          this.notifications.addError({
            status: 'admin.groups.updateError',
            message: 'Failed to update group'
          });
          this.cdr.detectChanges();
        }
      });
  }

  resetGroupForm(): void {
    if (this.group) {
      this.groupForm.patchValue({
        id: this.group.id,
        name: this.group.name,
        type: this.group.type
      });
      this.groupForm.markAsPristine();
    }
  }

  deleteGroup(): void {
    this.showDeleteConfirm = true;
  }

  confirmDeleteGroup(): void {
    this.showDeleteConfirm = false;
    this.groupService.deleteGroup(this.groupId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.groups.groupDeleted', 'Group deleted successfully');
          this.router.navigate(['/admin/groups']);
        },
        error: () => {
          this.notifications.addError({
            status: 'admin.groups.deleteError',
            message: 'Failed to delete group'
          });
        }
      });
  }

  cancelDeleteGroup(): void {
    this.showDeleteConfirm = false;
  }

  setActiveSection(section: 'info' | 'members' | 'tenants'): void {
    this.activeSection = section;
    if (section === 'members' && this.groupMembers.length === 0) {
      this.loadMembers();
    } else if (section === 'tenants' && this.groupTenants.length === 0) {
      this.loadTenants();
    }
  }

  loadData(): void {
    this.loadGroup();
    if (this.activeSection === 'members') {
      this.loadMembers();
    } else if (this.activeSection === 'tenants') {
      this.loadTenants();
    }
  }

  private loadMembers(): void {
    this.loadingMembers = true;
    this.userService.getUsers({ memberOfGroup: this.groupId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: members => {
          this.groupMembers = members;
          this.loadingMembers = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingMembers = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadTenants(): void {
    this.loadingTenants = true;
    this.tenantService.getTenants({ groupMember: this.groupId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tenants => {
          this.groupTenants = tenants;
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
    this.router.navigate(['/admin/groups']);
  }

  // Member management
  openAddMemberDialog(): void {
    this.showAddMemberDialog = true;
  }

  onMemberAdded(): void {
    this.showAddMemberDialog = false;
    this.loadMembers();
  }

  cancelAddMember(): void {
    this.showAddMemberDialog = false;
  }

  confirmRemoveMember(member: User): void {
    this.memberToRemove = member;
    this.showRemoveMemberConfirm = true;
  }

  removeMember(): void {
    if (!this.memberToRemove) return;

    const userId = this.memberToRemove.id;
    this.showRemoveMemberConfirm = false;

    this.groupService.removeUserFromGroup(this.groupId, userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.groups.memberRemoved', 'User removed from group');
          this.memberToRemove = null;
          this.loadMembers();
        },
        error: (err) => {
          this.memberToRemove = null;
          this.notifications.addError({
            status: 'admin.groups.memberRemoveError',
            message: err?.error?.message || 'Failed to remove user from group'
          });
        }
      });
  }

  cancelRemoveMember(): void {
    this.showRemoveMemberConfirm = false;
    this.memberToRemove = null;
  }

  get excludeMemberIds(): string[] {
    return this.groupMembers.map(m => m.id);
  }

  // Tenant management
  openAddTenantDialog(): void {
    this.showAddTenantDialog = true;
  }

  onTenantAdded(): void {
    this.showAddTenantDialog = false;
    this.loadTenants();
  }

  cancelAddTenant(): void {
    this.showAddTenantDialog = false;
  }

  confirmRemoveTenant(tenant: Tenant): void {
    this.tenantToRemove = tenant;
    this.showRemoveTenantConfirm = true;
  }

  removeTenant(): void {
    if (!this.tenantToRemove) return;

    const tenantId = this.tenantToRemove.id;
    this.showRemoveTenantConfirm = false;

    this.tenantService.removeGroupFromTenant(tenantId, this.groupId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.groups.tenantRemoved', 'Group removed from tenant');
          this.tenantToRemove = null;
          this.loadTenants();
        },
        error: (err) => {
          this.tenantToRemove = null;
          this.notifications.addError({
            status: 'admin.groups.tenantRemoveError',
            message: err?.error?.message || 'Failed to remove group from tenant'
          });
        }
      });
  }

  cancelRemoveTenant(): void {
    this.showRemoveTenantConfirm = false;
    this.tenantToRemove = null;
  }

  get excludeTenantIds(): string[] {
    return this.groupTenants.map(t => t.id);
  }
}
