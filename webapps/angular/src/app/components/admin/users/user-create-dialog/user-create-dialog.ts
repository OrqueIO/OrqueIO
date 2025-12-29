import { Component, Output, EventEmitter, HostListener, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { UserService } from '../../../../services/admin/user.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { CreateUserRequest } from '../../../../models/admin/user.model';

@Component({
  selector: 'app-user-create-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './user-create-dialog.html',
  styleUrls: ['./user-create-dialog.css']
})
export class UserCreateDialogComponent {
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private notifications = inject(NotificationsService);

  @Output() created = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  userForm: FormGroup;
  saving = false;

  constructor() {
    this.userForm = this.fb.group({
      id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', Validators.email],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const password2 = group.get('password2')?.value;
    return password === password2 ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (!this.userForm.valid || this.saving) return;

    this.saving = true;
    const formValue = this.userForm.value;

    const user: CreateUserRequest = {
      id: formValue.id,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password
    };

    this.userService.createUser(user)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.users.createSuccess', 'User created successfully');
          this.created.emit();
        },
        error: (err) => {
          this.saving = false;
          const message = err?.error?.message || 'Failed to create user';
          this.notifications.addError({
            status: 'admin.users.createError',
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
    const control = this.userForm.get('id');
    if (control?.hasError('required') && control?.touched) {
      return 'admin.users.idRequired';
    }
    if (control?.hasError('pattern') && control?.touched) {
      return 'admin.users.idInvalid';
    }
    return null;
  }

  get passwordError(): string | null {
    const control = this.userForm.get('password');
    if (control?.hasError('required') && control?.touched) {
      return 'admin.users.passwordRequired';
    }
    if (control?.hasError('minlength') && control?.touched) {
      return 'admin.users.passwordMinLength';
    }
    return null;
  }
}
