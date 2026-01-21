import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TimeAgoPipe } from '../../../pipes';
import { TooltipDirective } from '../../../shared/tooltip/tooltip.directive';
import { Task, GroupRef, IdentityLink } from '../../../models/tasklist';
import { TasklistService } from '../../../services/tasklist/tasklist.service';

@Component({
  selector: 'app-task-meta',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, TimeAgoPipe, TooltipDirective],
  templateUrl: './task-meta.html',
  styleUrl: './task-meta.css'
})
export class TaskMetaComponent implements OnInit, OnChanges {
  private readonly tasklistService = inject(TasklistService);

  @Input() task!: Task;
  @Input() isAssignee = false;
  @Input() currentUserId: string | null = null;
  @Input() identityLinks: IdentityLink[] = [];

  @Output() claim = new EventEmitter<void>();
  @Output() unclaim = new EventEmitter<void>();
  @Output() assigneeChange = new EventEmitter<string | null>();
  @Output() taskUpdate = new EventEmitter<Partial<Task>>();
  @Output() groupsEdit = new EventEmitter<void>();

  now = new Date();

  // Editing states
  editingFollowUp = false;
  editingDueDate = false;
  editingAssignee = false;

  // Edit values
  followUpValue: string | null = null;
  dueDateValue: string | null = null;
  assigneeValue = '';

  // Validation
  validatingAssignee = false;
  assigneeValid = true;
  assigneeError = '';

  // Groups
  groupNames: string[] = [];

  // Submit state
  submitting = false;

  ngOnInit(): void {
    this.initValues();
    this.loadGroups();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task']) {
      this.initValues();
    }
    if (changes['identityLinks']) {
      this.loadGroups();
    }
  }

  private initValues(): void {
    this.followUpValue = this.task.followUp ? this.toDatetimeLocal(this.task.followUp) : null;
    this.dueDateValue = this.task.due ? this.toDatetimeLocal(this.task.due) : null;
    this.assigneeValue = this.task.assignee || '';
    this.isAssignee = this.currentUserId === this.task.assignee;
    this.submitting = false;
  }

  private toDatetimeLocal(dateStr: string): string {
    const date = new Date(dateStr);
    // Format as YYYY-MM-DDTHH:mm
    return date.toISOString().slice(0, 16);
  }

  private fromDatetimeLocal(localStr: string | null): string | undefined {
    if (!localStr) return undefined;
    return new Date(localStr).toISOString();
  }

  private loadGroups(): void {
    // Extract group names from identity links
    this.groupNames = this.identityLinks
      .filter(link => link.type === 'candidate' && link.groupId)
      .map(link => link.groupId!)
      .filter((v, i, a) => a.indexOf(v) === i); // Unique
  }

  // ==================== Follow-up Date ====================

  startEditFollowUp(): void {
    this.editingFollowUp = true;
    this.followUpValue = this.task.followUp ? this.toDatetimeLocal(this.task.followUp) : null;
  }

  cancelEditFollowUp(): void {
    this.editingFollowUp = false;
    this.followUpValue = this.task.followUp ? this.toDatetimeLocal(this.task.followUp) : null;
  }

  saveFollowUpDate(): void {
    this.editingFollowUp = false;
    const isoDate = this.fromDatetimeLocal(this.followUpValue);
    this.taskUpdate.emit({ followUp: isoDate });
  }

  resetFollowUpDate(): void {
    this.followUpValue = null;
    this.taskUpdate.emit({ followUp: undefined });
  }

  // ==================== Due Date ====================

  startEditDueDate(): void {
    this.editingDueDate = true;
    this.dueDateValue = this.task.due ? this.toDatetimeLocal(this.task.due) : null;
  }

  cancelEditDueDate(): void {
    this.editingDueDate = false;
    this.dueDateValue = this.task.due ? this.toDatetimeLocal(this.task.due) : null;
  }

  saveDueDate(): void {
    this.editingDueDate = false;
    const isoDate = this.fromDatetimeLocal(this.dueDateValue);
    this.taskUpdate.emit({ due: isoDate });
  }

  resetDueDate(): void {
    this.dueDateValue = null;
    this.taskUpdate.emit({ due: undefined });
  }

  // ==================== Assignee ====================

  hasAssignee(): boolean {
    return this.task.assignee != null;
  }

  getAssigneeName(): string {
    if (!this.task.assignee) return '';

    if (this.task._embedded?.assignee?.[0]) {
      const a = this.task._embedded.assignee[0];
      if (a.firstName || a.lastName) {
        return `${a.firstName || ''} ${a.lastName || ''}`.trim();
      }
    }
    return this.task.assignee;
  }

  startEditAssignee(): void {
    this.editingAssignee = true;
    this.assigneeValue = this.task.assignee || '';
    this.assigneeValid = true;
    this.assigneeError = '';
  }

  cancelEditAssignee(): void {
    this.editingAssignee = false;
    this.assigneeValue = this.task.assignee || '';
    this.assigneeValid = true;
    this.assigneeError = '';
  }

  async validateAndSaveAssignee(): Promise<void> {
    const newAssignee = this.assigneeValue.trim();

    if (!newAssignee) {
      // Empty assignee - reset or unclaim
      if (this.isAssignee) {
        this.unclaim.emit();
      } else {
        this.assigneeChange.emit(null);
      }
      this.editingAssignee = false;
      return;
    }

    // Validate user exists
    this.validatingAssignee = true;
    this.assigneeError = '';

    this.tasklistService.validateUser(newAssignee).subscribe({
      next: (valid) => {
        this.validatingAssignee = false;
        this.assigneeValid = valid;

        if (valid) {
          this.assigneeChange.emit(newAssignee);
          this.editingAssignee = false;
        } else {
          this.assigneeError = 'User not found';
        }
      },
      error: (err) => {
        this.validatingAssignee = false;
        this.assigneeValid = false;
        this.assigneeError = err.message || 'Validation failed';
      }
    });
  }

  onClaim(): void {
    this.submitting = true;
    this.claim.emit();
  }

  onUnclaim(): void {
    this.submitting = true;
    this.unclaim.emit();
  }

  resetAssignee(): void {
    this.assigneeChange.emit(null);
  }

  // ==================== Groups ====================

  getCandidateGroups(): string[] {
    return this.identityLinks
      .filter(link => link.type === 'candidate' && link.groupId)
      .map(link => link.groupId!);
  }

  getCandidateUsers(): string[] {
    return this.identityLinks
      .filter(link => link.type === 'candidate' && link.userId)
      .map(link => link.userId!);
  }

  openGroupsModal(): void {
    this.groupsEdit.emit();
  }

  // ==================== Helpers ====================

  isOverdue(date: string | undefined): boolean {
    if (!date) return false;
    return new Date(date) < this.now;
  }

  formatDate(date: string | null): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  getFullDateTooltip(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onKeydown(event: KeyboardEvent, action: 'followUp' | 'due' | 'assignee'): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      switch (action) {
        case 'followUp':
          this.saveFollowUpDate();
          break;
        case 'due':
          this.saveDueDate();
          break;
        case 'assignee':
          this.validateAndSaveAssignee();
          break;
      }
    } else if (event.key === 'Escape') {
      switch (action) {
        case 'followUp':
          this.cancelEditFollowUp();
          break;
        case 'due':
          this.cancelEditDueDate();
          break;
        case 'assignee':
          this.cancelEditAssignee();
          break;
      }
    }
  }
}
