import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to escape special characters for URI encoding
 * Equivalent to AngularJS escape filter
 *
 * Encodes URI components with additional escaping for:
 * - Forward slashes (/) → %252F
 * - Asterisks (*) → %2A
 * - Backslashes (\) → %255C
 *
 * Usage:
 *   {{ value | escape }}
 */
@Pipe({
  name: 'escape',
  standalone: true
})
export class EscapePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    // First encode using standard URI component encoding
    let encoded = encodeURIComponent(value);

    // Additional escaping for special characters (same as AngularJS)
    // Forward slash: encode twice for safety
    encoded = encoded.replace(/%2F/g, '%252F');

    // Asterisk
    encoded = encoded.replace(/\*/g, '%2A');

    // Backslash: encode twice for safety
    encoded = encoded.replace(/%5C/g, '%255C');

    return encoded;
  }
}
