import { Pipe, PipeTransform, inject } from '@angular/core';
import { CamDatePipe } from './cam-date.pipe';

/**
 * Pipe to format values in search pills and query components
 * Equivalent to AngularJS camQueryComponent filter
 *
 * Automatically detects ISO 8601 date strings and formats them using camDate.
 * Returns '??' for null/undefined values.
 * Passes through other values unchanged.
 *
 * Usage:
 *   {{ value | camQueryComponent }}
 */
@Pipe({
  name: 'camQueryComponent',
  standalone: true,
  pure: false // Impure because camDate is impure (reacts to language changes)
})
export class CamQueryComponentPipe implements PipeTransform {
  private readonly camDatePipe = inject(CamDatePipe);

  /**
   * ISO 8601 date regex pattern (same as AngularJS)
   * Matches: 2025-12-29T14:30:45.123 or 2025-12-29T14:30:45
   */
  private readonly dateRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(?:Z|[+-]\d{2}:\d{2})?$/;

  transform(value: any): string {
    // Return '??' for null/undefined (same as AngularJS)
    if (value === null || value === undefined) {
      return '??';
    }

    // Check if value is an ISO 8601 date string
    if (typeof value === 'string' && this.isDateValue(value)) {
      return this.camDatePipe.transform(value, 'normal');
    }

    // Pass through other values as strings
    return String(value);
  }

  /**
   * Check if a string matches ISO 8601 date format
   */
  private isDateValue(value: string): boolean {
    return this.dateRegex.test(value);
  }
}
