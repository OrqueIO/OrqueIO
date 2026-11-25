import { Pipe, PipeTransform, OnDestroy, ChangeDetectorRef, inject, NgZone } from '@angular/core';
import { TranslateService } from '../i18n/translate.service';

interface RelativeTime {
  key: string;
  params?: { [key: string]: string };
}

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
  private readonly translate = inject(TranslateService);

  // Translation key of the relative time; translated on each call so the text follows the current language
  private currentValue: RelativeTime | null = null;
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

    return this.currentValue ? this.translate.instant(this.currentValue.key, this.currentValue.params) : '';
  }

  ngOnDestroy(): void {
    this.removeTimer();
  }

  private getRelativeTime(date: Date): RelativeTime {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    const diffMonth = Math.round(diffDay / 30);
    const diffYear = Math.round(diffDay / 365);

    const abs = (n: number) => Math.abs(n);
    const prefix = diffMs > 0 ? 'common.timeAgo.future.' : 'common.timeAgo.past.';
    const unit = (name: string, count?: number): RelativeTime => ({
      key: prefix + name,
      params: count === undefined ? undefined : { count: String(abs(count)) }
    });

    if (abs(diffSec) < 45) return unit('seconds');
    if (abs(diffSec) < 90) return unit('minute');
    if (abs(diffMin) < 45) return unit('minutes', diffMin);
    if (abs(diffMin) < 90) return unit('hour');
    if (abs(diffHour) < 22) return unit('hours', diffHour);
    if (abs(diffHour) < 36) return unit('day');
    if (abs(diffDay) < 25) return unit('days', diffDay);
    if (abs(diffDay) < 45) return unit('month');
    if (abs(diffMonth) < 10) return unit('months', diffMonth);
    if (abs(diffMonth) < 18) return unit('year');
    return unit('years', diffYear);
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
