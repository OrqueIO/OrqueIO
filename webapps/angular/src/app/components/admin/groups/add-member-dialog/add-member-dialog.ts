import { Component, Input, Output, EventEmitter, OnInit, inject, DestroyRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { UserService } from '../../../../services/admin/user.service';
import { GroupService } from '../../../../services/admin/group.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { User } from '../../../../models/admin/user.model';

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './add-member-dialog.html',
  styleUrls: ['./add-member-dialog.css']
})
export class AddMemberDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private userService = inject(UserService);
  private groupService = inject(GroupService);
  private notifications = inject(NotificationsService);
  private translateService = inject(TranslateService);

  @Input() groupId!: string;
  @Input() excludeUserIds: string[] = [];

  @Output() added = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  availableUsers: User[] = [];
  filteredUsers: User[] = [];
  selectedUserId: string = '';
  searchTerm: string = '';
  loading = true;
  saving = false;

  ngOnInit(): void {
    this.loadAvailableUsers();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  private loadAvailableUsers(): void {
    this.loading = true;

    this.userService.getUsers({ maxResults: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.availableUsers = users.filter(u => !this.excludeUserIds.includes(u.id));
          this.filteredUsers = [...this.availableUsers];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onSearchChange(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.availableUsers.filter(user =>
      user.id.toLowerCase().includes(term) ||
      (user.firstName && user.firstName.toLowerCase().includes(term)) ||
      (user.lastName && user.lastName.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term))
    );
  }

  onSubmit(): void {
    if (!this.selectedUserId || this.saving) return;

    // Double-check for duplicate membership (defensive check)
    if (this.excludeUserIds.includes(this.selectedUserId)) {
      this.notifications.addError({
        status: this.translateService.instant('admin.groups.memberAddError'),
        message: this.translateService.instant('admin.groups.memberAlreadyExists') || 'User is already a member of this group'
      });
      return;
    }

    this.saving = true;

    this.groupService.addUserToGroup(this.groupId, this.selectedUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.groups.memberAdded', 'User added to group');
          this.added.emit();
        },
        error: (err) => {
          this.saving = false;
          this.cdr.markForCheck();
          this.notifications.addError({
            status: this.translateService.instant('admin.groups.memberAddError'),
            message: this.extractErrorMessage(err) || this.translateService.instant('admin.groups.memberAddError')
          });
        }
      });
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

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }

  selectUser(userId: string): void {
    this.selectedUserId = userId;
  }
}
