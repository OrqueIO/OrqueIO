import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition, faCheckCircle, faTimesCircle, faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { NotificationsService, Notification, NotificationType } from '../../services/notifications.service';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './notifications-panel.html',
  styleUrls: ['./notifications-panel.css']
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  @Input() filter?: NotificationType[];

  notifications: Notification[] = [];
  private subscription?: Subscription;
  private cdr = inject(ChangeDetectorRef);

  private iconMap: Record<string, IconDefinition> = {
    success: faCheckCircle,
    info: faInfoCircle,
    warning: faExclamationTriangle,
    danger: faTimesCircle,
    error: faTimesCircle
  };

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

  getTypeClass(notification: Notification): string {
    const type = notification.type === 'error' ? 'danger' : notification.type;
    return `notification--${type}`;
  }

  getIcon(notification: Notification): IconDefinition {
    return this.iconMap[notification.type] || faInfoCircle;
  }

  trackByNotification(index: number, notification: Notification): string {
    return notification.id;
  }
}
