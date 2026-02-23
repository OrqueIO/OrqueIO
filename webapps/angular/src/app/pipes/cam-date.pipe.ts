import { Pipe, PipeTransform, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateService } from '../i18n/translate.service';
import { CamDateFormatService } from './cam-date-format.service';

/**
 * Pipe to format dates in various formats
 * Equivalent to AngularJS camDate filter with moment.js
 *
 * Supports dynamic locale based on current language setting.
 *
 * Usage:
 *   {{ date | camDate }}           → Default 'normal' format
 *   {{ date | camDate:'short' }}   → Short format (date only)
 *   {{ date | camDate:'long' }}    → Long format with weekday
 *   {{ date | camDate:'day' }}     → Day number only
 *   {{ date | camDate:'monthName' }} → Full month name
 *   {{ date | camDate:'time' }}    → Time only
 *   {{ date | camDate:'iso' }}     → ISO 8601 string
 */
@Pipe({
  name: 'camDate',
  standalone: true,
  pure: false // Impure to react to language changes
})
export class CamDatePipe implements PipeTransform, OnDestroy {
  private readonly translateService = inject(TranslateService);
  private readonly formatService = inject(CamDateFormatService);
  private readonly cdr = inject(ChangeDetectorRef);

  private langSubscription: Subscription | null = null;
  private cachedLocale: string = 'en';
  private cachedValue: string | Date | number | null = null;
  private cachedFormat: string = 'normal';
  private cachedResult: string = '';

  constructor() {
    // Subscribe to language changes
    this.langSubscription = this.translateService.currentLang$.subscribe(lang => {
      this.cachedLocale = this.getLocaleFromLang(lang);
      // Clear cache to force recalculation
      this.cachedValue = null;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.langSubscription?.unsubscribe();
  }

  transform(value: string | Date | number | null | undefined, format: string = 'normal'): string {
    if (!value) {
      return '';
    }

    // Use cache if same value and format
    if (this.cachedValue === value && this.cachedFormat === format) {
      return this.cachedResult;
    }

    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      date = new Date(value);
    } else {
      // Parse ISO 8601 string
      date = new Date(value);
    }

    if (isNaN(date.getTime())) {
      return '';
    }

    // Special case for ISO format
    if (format === 'iso') {
      this.cachedValue = value;
      this.cachedFormat = format;
      this.cachedResult = date.toISOString();
      return this.cachedResult;
    }

    const formatOptions = this.formatService.getFormat(format);

    try {
      this.cachedResult = new Intl.DateTimeFormat(this.cachedLocale, formatOptions).format(date);
    } catch {
      // Fallback to en locale if current locale fails
      this.cachedResult = new Intl.DateTimeFormat('en', formatOptions).format(date);
    }

    this.cachedValue = value;
    this.cachedFormat = format;
    return this.cachedResult;
  }

  /**
   * Convert language code to full locale
   */
  private getLocaleFromLang(lang: string): string {
    const localeMap: Record<string, string> = {
      'fr': 'fr-FR',
      'en': 'en-US',
      'de': 'de-DE',
      'es': 'es-ES',
      'it': 'it-IT',
      'pt': 'pt-PT',
      'nl': 'nl-NL'
    };
    return localeMap[lang] || 'en-US';
  }
}
