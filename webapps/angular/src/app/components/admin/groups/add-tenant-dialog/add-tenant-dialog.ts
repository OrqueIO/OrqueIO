import { Component, Input, Output, EventEmitter, OnInit, inject, DestroyRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TenantService } from '../../../../services/admin/tenant.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { Tenant } from '../../../../models/admin/tenant.model';

@Component({
  selector: 'app-add-tenant-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './add-tenant-dialog.html',
  styleUrls: ['./add-tenant-dialog.css']
})
export class AddTenantDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private tenantService = inject(TenantService);
  private notifications = inject(NotificationsService);

  @Input() groupId!: string;
  @Input() excludeTenantIds: string[] = [];

  @Output() added = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  availableTenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  selectedTenantId: string = '';
  searchTerm: string = '';
  loading = true;
  saving = false;

  ngOnInit(): void {
    this.loadAvailableTenants();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  private loadAvailableTenants(): void {
    this.loading = true;

    this.tenantService.getTenants({ maxResults: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tenants) => {
          this.availableTenants = tenants.filter(t => !this.excludeTenantIds.includes(t.id));
          this.filteredTenants = [...this.availableTenants];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  onSearchChange(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredTenants = this.availableTenants.filter(tenant =>
      tenant.id.toLowerCase().includes(term) ||
      (tenant.name && tenant.name.toLowerCase().includes(term))
    );
  }

  onSubmit(): void {
    if (!this.selectedTenantId || this.saving) return;

    this.saving = true;

    this.tenantService.addGroupToTenant(this.selectedTenantId, this.groupId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.groups.tenantAdded', 'Group added to tenant');
          this.added.emit();
        },
        error: (err) => {
          this.saving = false;
          this.notifications.addError({
            status: 'admin.groups.tenantAddError',
            message: err?.error?.message || 'Failed to add group to tenant'
          });
        }
      });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }

  selectTenant(tenantId: string): void {
    this.selectedTenantId = tenantId;
  }
}
