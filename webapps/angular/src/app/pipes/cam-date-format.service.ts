import { Injectable } from '@angular/core';

/**
 * Service to configure date formats for CamDatePipe
 * Equivalent to AngularJS camDateFormat provider
 */
export interface DateFormatConfig {
  normal: Intl.DateTimeFormatOptions;
  short: Intl.DateTimeFormatOptions;
  long: Intl.DateTimeFormatOptions;
  day: Intl.DateTimeFormatOptions;
  monthName: Intl.DateTimeFormatOptions;
  monthShort: Intl.DateTimeFormatOptions;
  year: Intl.DateTimeFormatOptions;
  time: Intl.DateTimeFormatOptions;
  timeShort: Intl.DateTimeFormatOptions;
  dateOnly: Intl.DateTimeFormatOptions;
  datetime: Intl.DateTimeFormatOptions;
  abbr: Intl.DateTimeFormatOptions;
  [key: string]: Intl.DateTimeFormatOptions;
}

@Injectable({ providedIn: 'root' })
export class CamDateFormatService {
  /**
   * Default formats matching moment.js patterns from AngularJS:
   * - normal: 'LLL' → "December 29, 2025 2:30 PM"
   * - short: 'LL' → "December 29, 2025"
   * - long: 'LLLL' → "Sunday, December 29, 2025 2:30 PM"
   */
  private formats: DateFormatConfig = {
    // 'LLL' - December 29, 2025 2:30 PM
    normal: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    },
    // 'LL' - December 29, 2025
    short: {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    },
    // 'LLLL' - Sunday, December 29, 2025 2:30 PM
    long: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    },
    // 'DD' - 29
    day: {
      day: '2-digit'
    },
    // 'MMMM' - December
    monthName: {
      month: 'long'
    },
    // 'MMM' - Dec
    monthShort: {
      month: 'short'
    },
    // 'YYYY' - 2025
    year: {
      year: 'numeric'
    },
    // 'HH:mm:ss' - 14:30:45
    time: {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    },
    // 'HH:mm' - 14:30
    timeShort: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    // Date only - December 29, 2025
    dateOnly: {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    },
    // DateTime - 12/29/2025 2:30:45 PM
    datetime: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    },
    // Abbreviated - Dec 29, 2025
    abbr: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  };

  /**
   * Get format options for a specific variant
   */
  getFormat(variant: string): Intl.DateTimeFormatOptions {
    return this.formats[variant] || this.formats['normal'];
  }
}
