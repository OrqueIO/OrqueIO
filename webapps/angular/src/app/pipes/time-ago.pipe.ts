import { Pipe, PipeTransform, OnDestroy, ChangeDetectorRef, inject, NgZone } from '@angular/core';

/**
 * Pipe to display relative time (e.g., "2 hours ago", "in 3 days")
 * Equivalent to AngularJS am-time-ago directive using moment.js
 */
@Pipe({
  name: 'timeAgo',
  pure: false,
  standalone: true
})
export class TimeAgoPipe implements PipeTransform, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  private currentValue: string = '';
  private lastDate: Date | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    // Check if we need to recalculate
    if (this.lastDate?.getTime() !== date.getTime()) {
      this.lastDate = date;
      this.removeTimer();
      this.currentValue = this.getRelativeTime(date);
      this.setTimer();
    }

    return this.currentValue;
  }

  ngOnDestroy(): void {
    this.removeTimer();
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    const diffWeek = Math.round(diffDay / 7);
    const diffMonth = Math.round(diffDay / 30);
    const diffYear = Math.round(diffDay / 365);

    const isFuture = diffMs > 0;
    const abs = (n: number) => Math.abs(n);

    // Past times
    if (!isFuture) {
      if (abs(diffSec) < 45) return 'a few seconds ago';
      if (abs(diffSec) < 90) return 'a minute ago';
      if (abs(diffMin) < 45) return `${abs(diffMin)} minutes ago`;
      if (abs(diffMin) < 90) return 'an hour ago';
      if (abs(diffHour) < 22) return `${abs(diffHour)} hours ago`;
      if (abs(diffHour) < 36) return 'a day ago';
      if (abs(diffDay) < 25) return `${abs(diffDay)} days ago`;
      if (abs(diffDay) < 45) return 'a month ago';
      if (abs(diffMonth) < 10) return `${abs(diffMonth)} months ago`;
      if (abs(diffMonth) < 18) return 'a year ago';
      return `${abs(diffYear)} years ago`;
    }

    // Future times
    if (abs(diffSec) < 45) return 'in a few seconds';
    if (abs(diffSec) < 90) return 'in a minute';
    if (abs(diffMin) < 45) return `in ${abs(diffMin)} minutes`;
    if (abs(diffMin) < 90) return 'in an hour';
    if (abs(diffHour) < 22) return `in ${abs(diffHour)} hours`;
    if (abs(diffHour) < 36) return 'in a day';
    if (abs(diffDay) < 25) return `in ${abs(diffDay)} days`;
    if (abs(diffDay) < 45) return 'in a month';
    if (abs(diffMonth) < 10) return `in ${abs(diffMonth)} months`;
    if (abs(diffMonth) < 18) return 'in a year';
    return `in ${abs(diffYear)} years`;
  }

  private setTimer(): void {
    if (!this.lastDate) return;

    const now = new Date();
    const diffMs = Math.abs(this.lastDate.getTime() - now.getTime());
    const diffSec = diffMs / 1000;
    const diffMin = diffSec / 60;

    // Determine refresh interval based on how old the date is
    let refreshMs: number;
    if (diffMin < 1) {
      refreshMs = 1000; // Every second for < 1 minute
    } else if (diffMin < 60) {
      refreshMs = 30000; // Every 30 seconds for < 1 hour
    } else if (diffMin < 1440) {
      refreshMs = 60000; // Every minute for < 1 day
    } else {
      refreshMs = 3600000; // Every hour for older dates
    }

    this.ngZone.runOutsideAngular(() => {
      this.timer = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.lastDate) {
            this.currentValue = this.getRelativeTime(this.lastDate);
            this.cdr.markForCheck();
            this.setTimer();
          }
        });
      }, refreshMs);
    });
  }

  private removeTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
