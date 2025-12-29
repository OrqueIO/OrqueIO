import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationType = 'info' | 'success' | 'warning' | 'danger' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  status: string;
  message?: string;
  duration?: number;
  exclusive?: boolean | string[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private escapeHtml(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  /**
   * Add a notification
   * @param notification - Notification object with type, status, message, duration, exclusive
   */
  add(notification: Omit<Notification, 'id'>): void {
    const notifications = [...this.notificationsSubject.value];

    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      status: this.escapeHtml(notification.status),
      message: notification.message ? this.escapeHtml(notification.message) : undefined
    };

    // Handle exclusive notifications
    if (notification.exclusive) {
      if (typeof notification.exclusive === 'boolean') {
        this.clearAll();
      } else {
        // Clear notifications matching specific attributes
        const filter = notification.exclusive as string[];
        this.clearByAttributes(filter, notification);
      }
    }

    this.notificationsSubject.next([...this.notificationsSubject.value, newNotification]);

    // Auto-dismiss after duration
    if (notification.duration) {
      setTimeout(() => {
        this.remove(newNotification.id);
      }, notification.duration);
    }
  }

  /**
   * Add an error notification
   */
  addError(error: Omit<Notification, 'id' | 'type'> & { type?: NotificationType }): void {
    this.add({
      ...error,
      type: error.type || 'danger'
    });
  }

  /**
   * Add an info message notification
   */
  addMessage(message: Omit<Notification, 'id' | 'type'> & { type?: NotificationType }): void {
    this.add({
      ...message,
      type: message.type || 'info'
    });
  }

  /**
   * Add a success notification
   */
  addSuccess(status: string, message?: string, duration: number = 5000): void {
    this.add({
      type: 'success',
      status,
      message,
      duration
    });
  }

  /**
   * Add a warning notification
   */
  addWarning(status: string, message?: string, duration?: number): void {
    this.add({
      type: 'warning',
      status,
      message,
      duration
    });
  }

  /**
   * Remove a specific notification by id
   */
  remove(id: string): void {
    const notifications = this.notificationsSubject.value.filter(n => n.id !== id);
    this.notificationsSubject.next(notifications);
  }

  /**
   * Clear notifications matching specific attributes
   */
  private clearByAttributes(attributes: string[], source: Partial<Notification>): void {
    const notifications = this.notificationsSubject.value.filter(notification => {
      return !attributes.every(attr => {
        const key = attr as keyof Notification;
        return notification[key] === source[key];
      });
    });
    this.notificationsSubject.next(notifications);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Clear notifications by type
   */
  clearByType(type: NotificationType): void {
    const notifications = this.notificationsSubject.value.filter(n => n.type !== type);
    this.notificationsSubject.next(notifications);
  }
}
