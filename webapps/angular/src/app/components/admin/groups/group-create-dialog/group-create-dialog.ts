import { Component, Output, EventEmitter, HostListener, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { GroupService } from '../../../../services/admin/group.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { CreateGroupRequest } from '../../../../models/admin/group.model';

@Component({
  selector: 'app-group-create-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './group-create-dialog.html',
  styleUrls: ['./group-create-dialog.css']
})
export class GroupCreateDialogComponent {
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private groupService = inject(GroupService);
  private notifications = inject(NotificationsService);

  @Output() created = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  groupForm: FormGroup;
  saving = false;

  constructor() {
    this.groupForm = this.fb.group({
      id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      name: ['', Validators.required],
      type: ['']
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  onSubmit(): void {
    if (!this.groupForm.valid || this.saving) return;

    this.saving = true;
    const formValue = this.groupForm.value;

    const group: CreateGroupRequest = {
      id: formValue.id,
      name: formValue.name,
      type: formValue.type || undefined
    };

    this.groupService.createGroup(group)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.groups.groupCreated', 'Group created successfully');
          this.created.emit();
        },
        error: (err) => {
          this.saving = false;
          const message = err?.error?.message || 'Failed to create group';
          this.notifications.addError({
            status: 'admin.groups.createError',
            message
          });
        }
      });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.onCancel();
    }
  }

  get idError(): string | null {
    const control = this.groupForm.get('id');
    if (control?.hasError('required') && control?.touched) {
      return 'admin.groups.idRequired';
    }
    if (control?.hasError('pattern') && control?.touched) {
      return 'admin.groups.idInvalid';
    }
    return null;
  }

  get nameError(): string | null {
    const control = this.groupForm.get('name');
    if (control?.hasError('required') && control?.touched) {
      return 'admin.groups.nameRequired';
    }
    return null;
  }
}
