import { Component, Input, Output, EventEmitter, OnInit, inject, DestroyRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { GroupService } from '../../../../services/admin/group.service';
import { TenantService } from '../../../../services/admin/tenant.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { Group } from '../../../../models/admin/group.model';
import { Tenant } from '../../../../models/admin/tenant.model';

export type MembershipType = 'group' | 'tenant';

@Component({
  selector: 'app-add-membership-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './add-membership-dialog.html',
  styleUrls: ['./add-membership-dialog.css']
})
export class AddMembershipDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private groupService = inject(GroupService);
  private tenantService = inject(TenantService);
  private notifications = inject(NotificationsService);

  @Input() userId!: string;
  @Input() type: MembershipType = 'group';
  @Input() excludeIds: string[] = [];

  @Output() added = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  availableItems: (Group | Tenant)[] = [];
  filteredItems: (Group | Tenant)[] = [];
  selectedId: string = '';
  searchTerm: string = '';
  loading = true;
  saving = false;

  ngOnInit(): void {
    this.loadAvailableItems();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  private loadAvailableItems(): void {
    this.loading = true;

    if (this.type === 'group') {
      this.groupService.getGroups()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (groups) => {
            this.availableItems = groups.filter(g => !this.excludeIds.includes(g.id));
            this.filteredItems = [...this.availableItems];
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Error loading groups:', err);
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    } else {
      this.tenantService.getTenants()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (tenants) => {
            this.availableItems = tenants.filter(t => !this.excludeIds.includes(t.id));
            this.filteredItems = [...this.availableItems];
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Error loading tenants:', err);
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    }
  }

  onSearchChange(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredItems = this.availableItems.filter(item =>
      item.id.toLowerCase().includes(term) ||
      (item.name && item.name.toLowerCase().includes(term))
    );
  }

  onSubmit(): void {
    if (!this.selectedId || this.saving) return;

    this.saving = true;

    if (this.type === 'group') {
      this.groupService.addUserToGroup(this.selectedId, this.userId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notifications.addSuccess('admin.users.groupAdded', 'User added to group');
            this.added.emit();
          },
          error: (err) => {
            this.saving = false;
            this.notifications.addError({
              status: 'admin.users.groupAddError',
              message: err?.error?.message || 'Failed to add user to group'
            });
          }
        });
    } else {
      this.tenantService.addUserToTenant(this.selectedId, this.userId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notifications.addSuccess('admin.users.tenantAdded', 'User added to tenant');
            this.added.emit();
          },
          error: (err) => {
            this.saving = false;
            this.notifications.addError({
              status: 'admin.users.tenantAddError',
              message: err?.error?.message || 'Failed to add user to tenant'
            });
          }
        });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }

  selectItem(id: string): void {
    this.selectedId = id;
  }

  get titleKey(): string {
    return this.type === 'group' ? 'admin.users.addToGroup' : 'admin.users.addToTenant';
  }

  get searchPlaceholderKey(): string {
    return this.type === 'group' ? 'admin.users.searchGroups' : 'admin.users.searchTenants';
  }

  get emptyMessageKey(): string {
    return this.type === 'group' ? 'admin.users.noAvailableGroups' : 'admin.users.noAvailableTenants';
  }
}
