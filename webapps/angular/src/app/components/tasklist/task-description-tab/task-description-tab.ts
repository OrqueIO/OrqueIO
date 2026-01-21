import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { Task } from '../../../models/tasklist';

@Component({
  selector: 'app-task-description-tab',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './task-description-tab.html',
  styleUrl: './task-description-tab.css'
})
export class TaskDescriptionTabComponent {
  @Input() task!: Task;

  get hasDescription(): boolean {
    return !!this.task?.description?.trim();
  }

  get sanitizedDescription(): string {
    if (!this.task?.description) return '';

    // Basic HTML sanitization
    // In production, use DOMPurify or Angular's built-in sanitizer
    return this.task.description
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
}
