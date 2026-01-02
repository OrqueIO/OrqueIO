import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TasklistService } from '../../../services/tasklist/tasklist.service';

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
export class CreateTaskModalComponent implements OnChanges {
  private readonly tasklistService = inject(TasklistService);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() taskCreated = new EventEmitter<string>();

  task: CreateTaskData = this.getEmptyTask();
  submitting = false;
  error: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      // Reset form when modal opens
      this.task = this.getEmptyTask();
      this.error = null;
      this.submitting = false;
    }
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
      this.taskCreated.emit(result.id);
      this.close.emit();
    } catch (err: any) {
      this.error = err.message || 'Failed to create task';
    } finally {
      this.submitting = false;
    }
  }
}
