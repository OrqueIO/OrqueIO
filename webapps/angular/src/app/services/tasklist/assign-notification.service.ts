import { Injectable, inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { TasklistService } from './tasklist.service';

export interface AssignNotification {
  type: 'assigned' | 'unassigned';
  taskId: string;
  taskName: string;
  assignee: string;
  processInstanceId?: string;
  caseInstanceId?: string;
}

/**
 * Service to handle task assignment notifications
 * Equivalent to AngularJS cam-tasklist-assign-notification service
 */
@Injectable({
  providedIn: 'root'
})
export class AssignNotificationService {
  private readonly tasklistService = inject(TasklistService);
  private readonly notifications$ = new Subject<AssignNotification>();

  /**
   * Observable for assignment notifications
   */
  get notifications(): Observable<AssignNotification> {
    return this.notifications$.asObservable();
  }

  /**
   * Check for tasks assigned to a user in a process instance
   */
  checkAssignedTasksForProcess(processInstanceId: string, userId: string): void {
    this.tasklistService.getTasks({
      processInstanceId,
      assignee: userId,
      maxResults: 10
    }).subscribe({
      next: (response) => {
        if (response._embedded?.task) {
          for (const task of response._embedded.task) {
            this.notifications$.next({
              type: 'assigned',
              taskId: task.id,
              taskName: task.name || 'Task',
              assignee: userId,
              processInstanceId
            });
          }
        }
      },
      error: (err) => {
        console.error('Failed to check assigned tasks:', err);
      }
    });
  }

  /**
   * Check for tasks assigned to a user in a case instance
   */
  checkAssignedTasksForCase(caseInstanceId: string, userId: string): void {
    this.tasklistService.getTasks({
      caseInstanceId,
      assignee: userId,
      maxResults: 10
    }).subscribe({
      next: (response) => {
        if (response._embedded?.task) {
          for (const task of response._embedded.task) {
            this.notifications$.next({
              type: 'assigned',
              taskId: task.id,
              taskName: task.name || 'Task',
              assignee: userId,
              caseInstanceId
            });
          }
        }
      },
      error: (err) => {
        console.error('Failed to check assigned tasks:', err);
      }
    });
  }

  /**
   * Notify that a task was assigned
   */
  notifyAssigned(task: { id: string; name?: string; processInstanceId?: string; caseInstanceId?: string }, assignee: string): void {
    this.notifications$.next({
      type: 'assigned',
      taskId: task.id,
      taskName: task.name || 'Task',
      assignee,
      processInstanceId: task.processInstanceId,
      caseInstanceId: task.caseInstanceId
    });
  }

  /**
   * Notify that a task was unassigned
   */
  notifyUnassigned(task: { id: string; name?: string; processInstanceId?: string; caseInstanceId?: string }, previousAssignee: string): void {
    this.notifications$.next({
      type: 'unassigned',
      taskId: task.id,
      taskName: task.name || 'Task',
      assignee: previousAssignee,
      processInstanceId: task.processInstanceId,
      caseInstanceId: task.caseInstanceId
    });
  }
}
