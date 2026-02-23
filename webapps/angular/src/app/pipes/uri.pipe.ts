import { Pipe, PipeTransform, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Pipe to convert relative paths to full application URIs
 * Equivalent to AngularJS uri filter
 *
 * Resolves relative paths against the application base URL.
 *
 * Usage:
 *   {{ '/app/tasklist' | uri }}  → 'http://localhost:8080/camunda/app/tasklist'
 *   {{ 'api/task' | uri }}       → 'http://localhost:8080/camunda/api/task'
 */
@Pipe({
  name: 'uri',
  standalone: true
})
export class UriPipe implements PipeTransform {
  private readonly document = inject(DOCUMENT);

  // Base path for the application (can be made configurable)
  private readonly basePath = '/camunda';

  transform(path: string | null | undefined): string {
    if (!path) {
      return '';
    }

    const origin = this.document.location.origin;

    // Handle absolute URLs (already complete)
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Handle paths starting with /
    if (path.startsWith('/')) {
      return `${origin}${this.basePath}${path}`;
    }

    // Handle relative paths
    return `${origin}${this.basePath}/${path}`;
  }
}
