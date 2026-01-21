import { Component, Output, EventEmitter, HostListener, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TenantService } from '../../../../services/admin/tenant.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { CreateTenantRequest } from '../../../../models/admin/tenant.model';

@Component({
  selector: 'app-tenant-create-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './tenant-create-dialog.html',
  styleUrls: ['./tenant-create-dialog.css']
})
export class TenantCreateDialogComponent {
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private tenantService = inject(TenantService);
  private notifications = inject(NotificationsService);

  @Output() created = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  tenantForm: FormGroup;
  saving = false;

  constructor() {
    this.tenantForm = this.fb.group({
      id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      name: ['']
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  onSubmit(): void {
    if (!this.tenantForm.valid || this.saving) return;

    this.saving = true;
    const formValue = this.tenantForm.value;

    const tenant: CreateTenantRequest = {
      id: formValue.id,
      name: formValue.name || undefined
    };

    this.tenantService.createTenant(tenant)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.tenantCreated', 'Tenant created successfully');
          this.created.emit();
        },
        error: (err) => {
          this.saving = false;
          const message = err?.error?.message || 'Failed to create tenant';
          this.notifications.addError({
            status: 'admin.tenants.createError',
            message
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

  get idError(): string | null {
    const control = this.tenantForm.get('id');
    if (control?.hasError('required') && control?.touched) {
      return 'admin.tenants.idRequired';
    }
    if (control?.hasError('pattern') && control?.touched) {
      return 'admin.tenants.idInvalid';
    }
    return null;
  }
}
