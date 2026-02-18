import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { NotificationService, Notification } from '../../services/tasklist/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="notifications-container">
      <div *ngFor="let notification of notifications"
           class="notification"
           [class]="'notification-' + notification.type"
           [@slideIn]>
        <div class="notification-content">
          <span class="notification-icon">
            <!-- Success Icon -->
            <svg *ngIf="notification.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <!-- Error Icon -->
            <svg *ngIf="notification.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <!-- Warning Icon -->
            <svg *ngIf="notification.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <!-- Info Icon -->
            <svg *ngIf="notification.type === 'info'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </span>
          <div class="notification-text">
            <strong *ngIf="notification.title" class="notification-title">{{ notification.title | translate }}</strong>
            <span class="notification-message">{{ notification.message | translate }}</span>
          </div>
        </div>
        <button *ngIf="notification.dismissible"
                class="dismiss-btn"
                (click)="dismiss(notification.id)"
                type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notifications-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .notification {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .notification-success {
      border-left: 4px solid #28a745;
    }

    .notification-success .notification-icon {
      color: #28a745;
    }

    .notification-error {
      border-left: 4px solid #dc3545;
    }

    .notification-error .notification-icon {
      color: #dc3545;
    }

    .notification-warning {
      border-left: 4px solid #ffc107;
    }

    .notification-warning .notification-icon {
      color: #ffc107;
    }

    .notification-info {
      border-left: 4px solid #17a2b8;
    }

    .notification-info .notification-icon {
      color: #17a2b8;
    }

    .notification-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
    }

    .notification-icon {
      display: flex;
      flex-shrink: 0;
      padding-top: 2px;
    }

    .notification-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notification-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .notification-message {
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }

    .dismiss-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      border-radius: 4px;
      color: #999;
      cursor: pointer;
      transition: background-color 0.15s, color 0.15s;
      flex-shrink: 0;
    }

    .dismiss-btn:hover {
      background-color: #f0f0f0;
      color: #333;
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  notifications: Notification[] = [];

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        this.notifications.push(notification);
      });

    this.notificationService.dismiss$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        if (id === '*') {
          this.notifications = [];
        } else {
          this.notifications = this.notifications.filter(n => n.id !== id);
        }
      });
  }

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
