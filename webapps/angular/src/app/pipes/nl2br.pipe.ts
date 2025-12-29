import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Pipe to convert newlines to <br> tags
 * Equivalent to AngularJS nl2br directive
 */
@Pipe({
  name: 'nl2br',
  standalone: true
})
export class Nl2brPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return '';
    }

    // Escape HTML entities first for security
    const escaped = this.escapeHtml(value);

    // Convert newlines to <br>
    const withBreaks = escaped.replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(withBreaks);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
