import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { initTestEnvironment } from '../testing/test-utils';
import { Language, TranslateService } from '../i18n/translate.service';
import { TimeAgoPipe } from './time-ago.pipe';

const I18N_DIR = join(__dirname, '../../assets/i18n');

function readTranslations(lang: Language): { [key: string]: string } {
  return JSON.parse(readFileSync(join(I18N_DIR, `${lang}.json`), 'utf-8'));
}

describe('TimeAgoPipe', () => {
  beforeAll(() => { initTestEnvironment(); });

  let translate: TranslateService;
  let httpMock: HttpTestingController;
  let pipe: TimeAgoPipe;

  async function useLanguage(lang: Language): Promise<void> {
    const switching = translate.setLanguage(lang);
    // The service loads the requested language together with the English fallback
    for (const req of httpMock.match(r => r.url.endsWith('.json'))) {
      const file = req.request.url.split('/').pop()!.replace('.json', '') as Language;
      req.flush(readTranslations(file));
    }
    await switching;
  }

  const secondsAgo = (s: number) => new Date(Date.now() - s * 1000);
  const minutesAgo = (m: number) => secondsAgo(m * 60);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } }
      ]
    });
    translate = TestBed.inject(TranslateService);
    httpMock = TestBed.inject(HttpTestingController);
    pipe = TestBed.runInInjectionContext(() => new TimeAgoPipe());
  });

  afterEach(() => {
    pipe.ngOnDestroy();
    localStorage.removeItem('orqueio_language');
  });

  it('shows English relative times', async () => {
    await useLanguage('en');
    expect(pipe.transform(secondsAgo(10))).toBe('a few seconds ago');
    expect(pipe.transform(minutesAgo(5))).toBe('5 minutes ago');
  });

  it('shows French relative times', async () => {
    await useLanguage('fr');
    expect(pipe.transform(secondsAgo(10))).toBe('il y a quelques secondes');
    expect(pipe.transform(minutesAgo(5))).toBe('il y a 5 minutes');
    expect(pipe.transform(new Date(Date.now() + 3 * 3600 * 1000))).toBe('dans 3 heures');
  });

  it('shows German relative times', async () => {
    await useLanguage('de');
    expect(pipe.transform(secondsAgo(10))).toBe('vor wenigen Sekunden');
    expect(pipe.transform(minutesAgo(5))).toBe('vor 5 Minuten');
  });

  it('follows a language change for the same date', async () => {
    const date = minutesAgo(5);
    await useLanguage('en');
    expect(pipe.transform(date)).toBe('5 minutes ago');
    await useLanguage('de');
    expect(pipe.transform(date)).toBe('vor 5 Minuten');
  });

  it('returns an empty string for missing or invalid dates', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('not a date')).toBe('');
  });
});
