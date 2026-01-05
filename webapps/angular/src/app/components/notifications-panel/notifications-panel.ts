import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationsService, Notification, NotificationType } from '../../services/notifications.service';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-panel.html',
  styleUrls: ['./notifications-panel.css']
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  @Input() filter?: NotificationType[];

  notifications: Notification[] = [];
  private subscription?: Subscription;
  private cdr = inject(ChangeDetectorRef);

  constructor(private notificationsService: NotificationsService) {}

  ngOnInit(): void {
    this.subscription = this.notificationsService.notifications$.subscribe(notifications => {
      if (this.filter && this.filter.length > 0) {
        this.notifications = notifications.filter(n => this.filter!.includes(n.type));
      } else {
        this.notifications = notifications;
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  removeNotification(notification: Notification): void {
    this.notificationsService.remove(notification.id);
  }

  getNotificationClass(notification: Notification): string {
    const type = notification.type === 'error' ? 'danger' : notification.type;
    return `alert-${type}`;
  }

  trackByNotification(index: number, notification: Notification): string {
    return notification.id;
  }
}
