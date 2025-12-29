import { Injectable, inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  dismissible?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new Subject<Notification>();
  private dismissSubject = new Subject<string>();

  notifications$ = this.notificationsSubject.asObservable();
  dismiss$ = this.dismissSubject.asObservable();

  private idCounter = 0;

  show(notification: Omit<Notification, 'id'>): string {
    const id = `notification-${++this.idCounter}`;
    const fullNotification: Notification = {
      id,
      duration: 5000,
      dismissible: true,
      ...notification
    };

    this.notificationsSubject.next(fullNotification);

    // Auto-dismiss after duration
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, fullNotification.duration);
    }

    return id;
  }

  success(message: string, title?: string): string {
    return this.show({ type: 'success', message, title });
  }

  error(message: string, title?: string): string {
    return this.show({ type: 'error', message, title, duration: 0 });
  }

  warning(message: string, title?: string): string {
    return this.show({ type: 'warning', message, title });
  }

  info(message: string, title?: string): string {
    return this.show({ type: 'info', message, title });
  }

  dismiss(id: string): void {
    this.dismissSubject.next(id);
  }

  dismissAll(): void {
    this.dismissSubject.next('*');
  }
}
