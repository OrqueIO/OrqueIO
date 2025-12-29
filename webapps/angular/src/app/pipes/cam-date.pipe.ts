import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to format dates in various formats
 * Equivalent to AngularJS camDate filter
 */
@Pipe({
  name: 'camDate',
  standalone: true
})
export class CamDatePipe implements PipeTransform {

  private readonly locale = 'en-US'; // Can be made configurable

  transform(value: string | Date | null | undefined, format: string = 'short'): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    switch (format) {
      case 'long':
        return this.formatLong(date);
      case 'short':
        return this.formatShort(date);
      case 'day':
        return this.formatDay(date);
      case 'monthName':
        return this.formatMonthName(date);
      case 'monthShort':
        return this.formatMonthShort(date);
      case 'year':
        return this.formatYear(date);
      case 'time':
        return this.formatTime(date);
      case 'timeShort':
        return this.formatTimeShort(date);
      case 'dateOnly':
        return this.formatDateOnly(date);
      case 'datetime':
        return this.formatDateTime(date);
      case 'iso':
        return date.toISOString();
      default:
        return this.formatShort(date);
    }
  }

  /**
   * Long format: "December 29, 2025 at 2:30:45 PM"
   */
  private formatLong(date: Date): string {
    return date.toLocaleDateString(this.locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Short format: "12/29/25, 2:30 PM"
   */
  private formatShort(date: Date): string {
    return date.toLocaleDateString(this.locale, {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Day format: "29"
   */
  private formatDay(date: Date): string {
    return date.getDate().toString().padStart(2, '0');
  }

  /**
   * Month name format: "December"
   */
  private formatMonthName(date: Date): string {
    return date.toLocaleDateString(this.locale, { month: 'long' });
  }

  /**
   * Month short format: "Dec"
   */
  private formatMonthShort(date: Date): string {
    return date.toLocaleDateString(this.locale, { month: 'short' });
  }

  /**
   * Year format: "2025"
   */
  private formatYear(date: Date): string {
    return date.getFullYear().toString();
  }

  /**
   * Time format: "2:30:45 PM"
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString(this.locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Time short format: "14:30"
   */
  private formatTimeShort(date: Date): string {
    return date.toLocaleTimeString(this.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * Date only format: "December 29, 2025"
   */
  private formatDateOnly(date: Date): string {
    return date.toLocaleDateString(this.locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * DateTime format: "12/29/2025 2:30:45 PM"
   */
  private formatDateTime(date: Date): string {
    return date.toLocaleString(this.locale);
  }
}
