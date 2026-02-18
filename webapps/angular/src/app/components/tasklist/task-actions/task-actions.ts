import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { Task } from '../../../models/tasklist/task.model';

export interface TaskAction {
  type: 'claim' | 'unclaim' | 'complete' | 'delegate' | 'setAssignee' | 'addComment' | 'setDueDate' | 'setFollowUp';
  payload?: any;
}

@Component({
  selector: 'app-task-actions',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './task-actions.html',
  styleUrl: './task-actions.css'
})
export class TaskActionsComponent {
  @Input() task!: Task;
  @Input() currentUserId = '';
  @Input() loading = false;

  @Output() action = new EventEmitter<TaskAction>();

  showMoreMenu = false;

  get isAssigned(): boolean {
    return !!this.task?.assignee;
  }

  get isAssignedToMe(): boolean {
    return this.task?.assignee === this.currentUserId;
  }

  get canClaim(): boolean {
    return !this.isAssigned;
  }

  get canUnclaim(): boolean {
    return this.isAssignedToMe;
  }

  get canComplete(): boolean {
    return this.isAssignedToMe;
  }

  onClaim(): void {
    this.action.emit({ type: 'claim' });
    this.showMoreMenu = false;
  }

  onUnclaim(): void {
    this.action.emit({ type: 'unclaim' });
    this.showMoreMenu = false;
  }

  onComplete(): void {
    this.action.emit({ type: 'complete' });
    this.showMoreMenu = false;
  }

  onDelegate(): void {
    this.action.emit({ type: 'delegate' });
    this.showMoreMenu = false;
  }

  onSetAssignee(): void {
    this.action.emit({ type: 'setAssignee' });
    this.showMoreMenu = false;
  }

  onAddComment(): void {
    this.action.emit({ type: 'addComment' });
    this.showMoreMenu = false;
  }

  onSetDueDate(): void {
    this.action.emit({ type: 'setDueDate' });
    this.showMoreMenu = false;
  }

  onSetFollowUp(): void {
    this.action.emit({ type: 'setFollowUp' });
    this.showMoreMenu = false;
  }

  toggleMoreMenu(): void {
    this.showMoreMenu = !this.showMoreMenu;
  }

  closeMoreMenu(): void {
    this.showMoreMenu = false;
  }
}
