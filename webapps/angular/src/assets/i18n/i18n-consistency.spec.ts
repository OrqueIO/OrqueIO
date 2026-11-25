import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

// en.json is the reference: every other language must have the same keys, so a new screen
// cannot ship with keys that only exist in English.
const I18N_DIR = join(__dirname);
const REFERENCE = 'en';
const LANGUAGES = ['fr', 'de', 'zh-CN', 'zh-TW'];

function load(lang: string): Record<string, string> {
  return JSON.parse(readFileSync(join(I18N_DIR, `${lang}.json`), 'utf-8'));
}

// {{ name }} placeholders and HTML tags must survive translation, or the UI shows broken text
function tokens(text: string): string[] {
  return (text.match(/\{\{\s*[\w.]+\s*\}\}|<\/?\w+/g) ?? []).map(t => t.replace(/\s/g, '')).sort();
}

describe('i18n consistency with en.json', () => {
  const reference = load(REFERENCE);
  const referenceKeys = Object.keys(reference);

  for (const lang of LANGUAGES) {
    const translations = load(lang);

    it(`${lang}.json has every key of en.json`, () => {
      const missing = referenceKeys.filter(key => !(key in translations));
      expect(missing, `${missing.length} key(s) missing in ${lang}.json`).toEqual([]);
    });

    it(`${lang}.json has no key that en.json lacks`, () => {
      const extra = Object.keys(translations).filter(key => !(key in reference));
      expect(extra, `${extra.length} key(s) in ${lang}.json but not in en.json`).toEqual([]);
    });

    it(`${lang}.json keeps the placeholders and HTML tags of en.json`, () => {
      const broken = referenceKeys
        .filter(key => key in translations)
        .filter(key => tokens(reference[key]).join() !== tokens(translations[key]).join());
      expect(broken, `placeholders or HTML tags differ from en.json in ${lang}.json`).toEqual([]);
    });

    it(`${lang}.json has no empty translation`, () => {
      const empty = Object.keys(translations).filter(key => !String(translations[key]).trim());
      expect(empty).toEqual([]);
    });
  }
});
