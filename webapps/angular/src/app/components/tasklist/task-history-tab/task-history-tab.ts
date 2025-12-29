import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { CamDatePipe, Nl2brPipe } from '../../../pipes';
import { TooltipDirective } from '../../../shared/tooltip/tooltip.directive';
import { PaginationComponent, PageChangeEvent } from '../../../shared/pagination/pagination';
import { Task, TaskComment, UserOperationLogEntry } from '../../../models/tasklist';
import { TaskDetailActions } from '../../../store/tasklist';

interface HistoryDay {
  date: string;
  dayNumber: string;
  monthName: string;
  year: string;
  events: HistoryEvent[];
}

interface HistoryEvent {
  time: string;
  type: string;
  operationId?: string;
  userId: string;
  subEvents?: UserOperationLogEntry[];
  message?: string; // For comments
  isComment?: boolean;
}

@Component({
  selector: 'app-task-history-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    CamDatePipe,
    Nl2brPipe,
    TooltipDirective,
    PaginationComponent
  ],
  templateUrl: './task-history-tab.html',
  styleUrl: './task-history-tab.css'
})
export class TaskHistoryTabComponent implements OnInit, OnChanges {
  private readonly store = inject(Store);

  @Input() task!: Task;
  @Input() history: UserOperationLogEntry[] = [];
  @Input() comments: TaskComment[] = [];

  days: HistoryDay[] = [];
  newComment = '';
  addingComment = false;

  // Pagination
  pageSize = 50;
  currentPage = 1;
  totalItems = 0;

  ngOnInit(): void {
    this.processHistoryAndComments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['history'] || changes['comments']) {
      this.processHistoryAndComments();
    }
  }

  private processHistoryAndComments(): void {
    const days: Map<string, HistoryEvent[]> = new Map();

    // Process history entries
    for (const entry of this.history) {
      const dateKey = this.formatDateKey(entry.timestamp);
      const events = days.get(dateKey) || [];

      // Find or create parent event by operationId
      let parentEvent = events.find(e => e.operationId === entry.operationId);
      if (!parentEvent) {
        parentEvent = {
          time: entry.timestamp,
          type: entry.operationType,
          operationId: entry.operationId,
          userId: entry.userId,
          subEvents: []
        };
        events.push(parentEvent);
      }

      parentEvent.subEvents!.push(entry);
      days.set(dateKey, events);
    }

    // Process comments
    for (const comment of this.comments) {
      const dateKey = this.formatDateKey(comment.time);
      const events = days.get(dateKey) || [];

      events.push({
        time: comment.time,
        type: 'Comment',
        userId: comment.userId,
        message: comment.message,
        isComment: true
      });

      days.set(dateKey, events);
    }

    // Convert to array and sort
    this.days = Array.from(days.entries())
      .map(([date, events]) => {
        const dateObj = new Date(date);
        return {
          date,
          dayNumber: dateObj.getDate().toString().padStart(2, '0'),
          monthName: dateObj.toLocaleDateString(undefined, { month: 'short' }),
          year: dateObj.getFullYear().toString(),
          events: events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate total items for pagination
    this.totalItems = this.history.length + this.comments.length;
  }

  private formatDateKey(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(time: string): string {
    return new Date(time).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatFullDateTime(time: string): string {
    return new Date(time).toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getOperationIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'create': return '+';
      case 'update': return '~';
      case 'delete': return '-';
      case 'claim': return '>';
      case 'unclaim': return '<';
      case 'complete': return 'v';
      case 'assign': return '@';
      case 'setowner': return '*';
      case 'comment': return '#';
      case 'setpriority': return '!';
      case 'setduedate': return 'D';
      case 'setfollowupdate': return 'F';
      case 'addcandidateuser': return 'U';
      case 'addcandidategroup': return 'G';
      default: return '?';
    }
  }

  getOperationLabel(type: string): string {
    const labels: Record<string, string> = {
      'Claim': 'CLAIMED',
      'Unclaim': 'UNCLAIMED',
      'Complete': 'COMPLETED',
      'Assign': 'ASSIGNED',
      'SetOwner': 'OWNER_SET',
      'Create': 'CREATED',
      'Update': 'UPDATED',
      'Delete': 'DELETED',
      'SetPriority': 'PRIORITY_SET',
      'SetDueDate': 'DUE_DATE_SET',
      'SetFollowUpDate': 'FOLLOW_UP_SET',
      'AddCandidateUser': 'CANDIDATE_USER_ADDED',
      'AddCandidateGroup': 'CANDIDATE_GROUP_ADDED',
      'DeleteCandidateUser': 'CANDIDATE_USER_REMOVED',
      'DeleteCandidateGroup': 'CANDIDATE_GROUP_REMOVED',
      'Comment': 'COMMENT'
    };
    return labels[type] || type;
  }

  getPropertyLabel(property: string): string {
    // Map property names to labels
    const labels: Record<string, string> = {
      assignee: 'Assignee',
      owner: 'Owner',
      dueDate: 'Due Date',
      followUpDate: 'Follow-up Date',
      priority: 'Priority',
      name: 'Name',
      description: 'Description',
      delegationState: 'Delegation State',
      caseInstanceId: 'Case Instance',
      processInstanceId: 'Process Instance',
      taskId: 'Task',
      userId: 'User',
      groupId: 'Group'
    };
    return labels[property] || property;
  }

  isDateProperty(property: string): boolean {
    return ['dueDate', 'followUpDate', 'created', 'timestamp'].includes(property);
  }

  formatValue(value: string | null, property: string): string {
    if (value === null || value === undefined) return '-';

    // Handle dates
    if (this.isDateProperty(property)) {
      const timestamp = parseInt(value, 10);
      if (!isNaN(timestamp)) {
        return new Date(timestamp).toLocaleDateString();
      }
      // Try to parse as ISO date
      const dateVal = new Date(value);
      if (!isNaN(dateVal.getTime())) {
        return dateVal.toLocaleDateString();
      }
    }

    return value;
  }

  addComment(): void {
    if (!this.newComment.trim() || this.addingComment) return;

    this.addingComment = true;
    this.store.dispatch(TaskDetailActions.addComment({
      taskId: this.task.id,
      message: this.newComment.trim()
    }));

    // Reset after dispatch (success will update via input)
    this.newComment = '';
    this.addingComment = false;
  }

  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.current;
    this.store.dispatch(TaskDetailActions.loadHistory({
      taskId: this.task.id,
      params: {
        firstResult: (event.current - 1) * this.pageSize,
        maxResults: this.pageSize
      }
    }));
  }

  trackByDate(index: number, day: HistoryDay): string {
    return day.date;
  }

  trackByEvent(index: number, event: HistoryEvent): string {
    return event.operationId || event.time;
  }
}
