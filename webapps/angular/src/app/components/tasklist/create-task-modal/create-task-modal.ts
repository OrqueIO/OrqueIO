import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import { UserService } from '../../../services/admin/user.service';
import { TenantService } from '../../../services/admin/tenant.service';
import { User } from '../../../models/admin/user.model';
import { Tenant } from '../../../models/admin/tenant.model';
import { Subscription } from 'rxjs';

export interface CreateTaskData {
  name: string;
  assignee: string | null;
  tenantId: string | null;
  description: string | null;
  priority: number;
}

@Component({
  selector: 'app-create-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './create-task-modal.html',
  styleUrl: './create-task-modal.css'
})
export class CreateTaskModalComponent implements OnChanges, OnDestroy {
  private readonly tasklistService = inject(TasklistService);
  private readonly userService = inject(UserService);
  private readonly tenantService = inject(TenantService);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() taskCreated = new EventEmitter<string>();

  task: CreateTaskData = this.getEmptyTask();
  submitting = false;
  error: string | null = null;

  // Assignee autocomplete state
  private allUsers: User[] = [];
  userSuggestions: User[] = [];
  showAssigneeSuggestions = false;
  assigneeSelectedIndex = -1;
  loadingUsers = false;

  // Tenant autocomplete state
  private allTenants: Tenant[] = [];
  tenantSuggestions: Tenant[] = [];
  showTenantSuggestions = false;
  tenantSelectedIndex = -1;
  loadingTenants = false;

  private subscriptions: Subscription[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.task = this.getEmptyTask();
      this.error = null;
      this.submitting = false;
      this.resetAutocompleteState();
      this.loadUsers();
      this.loadTenants();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private getEmptyTask(): CreateTaskData {
    return {
      name: '',
      assignee: null,
      tenantId: null,
      description: null,
      priority: 50
    };
  }

  private resetAutocompleteState(): void {
    this.userSuggestions = [];
    this.tenantSuggestions = [];
    this.showAssigneeSuggestions = false;
    this.showTenantSuggestions = false;
    this.assigneeSelectedIndex = -1;
    this.tenantSelectedIndex = -1;
  }

  private loadUsers(): void {
    this.loadingUsers = true;
    const sub = this.userService.getUsers({ maxResults: 1000 }).subscribe({
      next: (users) => {
        this.allUsers = users;
        this.loadingUsers = false;
      },
      error: () => {
        this.allUsers = [];
        this.loadingUsers = false;
      }
    });
    this.subscriptions.push(sub);
  }

  private loadTenants(): void {
    this.loadingTenants = true;
    const sub = this.tenantService.getTenants({ maxResults: 1000 }).subscribe({
      next: (tenants) => {
        this.allTenants = tenants;
        this.loadingTenants = false;
      },
      error: () => {
        this.allTenants = [];
        this.loadingTenants = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // --- Assignee autocomplete ---

  onAssigneeInput(): void {
    const term = (this.task.assignee || '').toLowerCase();
    if (term.length === 0) {
      this.userSuggestions = this.allUsers.slice(0, 10);
    } else {
      this.userSuggestions = this.allUsers
        .filter(u =>
          u.id.toLowerCase().includes(term) ||
          (u.firstName && u.firstName.toLowerCase().includes(term)) ||
          (u.lastName && u.lastName.toLowerCase().includes(term)) ||
          (u.email && u.email.toLowerCase().includes(term))
        )
        .slice(0, 10);
    }
    this.showAssigneeSuggestions = this.userSuggestions.length > 0;
    this.assigneeSelectedIndex = -1;
  }

  onAssigneeFocus(): void {
    this.onAssigneeInput();
  }

  onAssigneeBlur(): void {
    setTimeout(() => {
      this.showAssigneeSuggestions = false;
    }, 200);
  }

  onAssigneeKeyDown(event: KeyboardEvent): void {
    if (!this.showAssigneeSuggestions || this.userSuggestions.length === 0) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.assigneeSelectedIndex = Math.min(this.assigneeSelectedIndex + 1, this.userSuggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.assigneeSelectedIndex = Math.max(this.assigneeSelectedIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.assigneeSelectedIndex >= 0) {
          this.selectAssignee(this.userSuggestions[this.assigneeSelectedIndex]);
        }
        break;
      case 'Escape':
        this.showAssigneeSuggestions = false;
        this.assigneeSelectedIndex = -1;
        break;
    }
  }

  selectAssignee(user: User): void {
    this.task.assignee = user.id;
    this.showAssigneeSuggestions = false;
    this.assigneeSelectedIndex = -1;
  }

  getUserDisplayName(user: User): string {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.id;
  }

  // --- Tenant autocomplete ---

  onTenantInput(): void {
    const term = (this.task.tenantId || '').toLowerCase();
    if (term.length === 0) {
      this.tenantSuggestions = this.allTenants.slice(0, 10);
    } else {
      this.tenantSuggestions = this.allTenants
        .filter(t =>
          t.id.toLowerCase().includes(term) ||
          (t.name && t.name.toLowerCase().includes(term))
        )
        .slice(0, 10);
    }
    this.showTenantSuggestions = this.tenantSuggestions.length > 0;
    this.tenantSelectedIndex = -1;
  }

  onTenantFocus(): void {
    this.onTenantInput();
  }

  onTenantBlur(): void {
    setTimeout(() => {
      this.showTenantSuggestions = false;
    }, 200);
  }

  onTenantKeyDown(event: KeyboardEvent): void {
    if (!this.showTenantSuggestions || this.tenantSuggestions.length === 0) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.tenantSelectedIndex = Math.min(this.tenantSelectedIndex + 1, this.tenantSuggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.tenantSelectedIndex = Math.max(this.tenantSelectedIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.tenantSelectedIndex >= 0) {
          this.selectTenant(this.tenantSuggestions[this.tenantSelectedIndex]);
        }
        break;
      case 'Escape':
        this.showTenantSuggestions = false;
        this.tenantSelectedIndex = -1;
        break;
    }
  }

  selectTenant(tenant: Tenant): void {
    this.task.tenantId = tenant.id;
    this.showTenantSuggestions = false;
    this.tenantSelectedIndex = -1;
  }

  getTenantDisplayName(tenant: Tenant): string {
    if (tenant.name) return tenant.name;
    return tenant.id;
  }

  // --- Modal actions ---

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onClose();
    }
  }

  onClose(): void {
    if (!this.submitting) {
      this.close.emit();
    }
  }

  isValid(): boolean {
    return this.task.name?.trim().length > 0;
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid() || this.submitting) {
      return;
    }

    this.submitting = true;
    this.error = null;

    try {
      const taskData = {
        name: this.task.name.trim(),
        assignee: this.task.assignee?.trim() || null,
        tenantId: this.task.tenantId?.trim() || null,
        description: this.task.description?.trim() || null,
        priority: this.task.priority
      };

      const result = await this.tasklistService.createTask(taskData);
      this.taskCreated.emit(result?.id ?? '');
      this.close.emit();
    } catch (err: any) {
      this.error = err.message || 'Failed to create task';
    } finally {
      this.submitting = false;
    }
  }
}
