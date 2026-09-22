import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

export type Language = 'fr' | 'en' | 'zh-CN' | 'zh-TW';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  private readonly STORAGE_KEY = 'orqueio_language';
  private readonly SUPPORTED_LANGUAGES: Language[] = ['fr', 'en', 'zh-CN', 'zh-TW'];
  private translations: { [lang: string]: { [key: string]: string } } = {};
  private loadedLanguages: Set<Language> = new Set();

  private currentLangSubject: BehaviorSubject<Language>;
  public currentLang$: Observable<Language>;

  constructor(private http: HttpClient) {
    const savedLang = this.getSavedLanguage();
    this.currentLangSubject = new BehaviorSubject<Language>(savedLang);
    this.currentLang$ = this.currentLangSubject.asObservable();

    // Load the initial language
    this.loadLanguage(savedLang);
  }

  private getSavedLanguage(): Language {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Language | null;
    if (saved && this.SUPPORTED_LANGUAGES.includes(saved)) {
      return saved;
    }
    return this.detectBrowserLanguage();
  }

  private detectBrowserLanguage(): Language {
    const browserLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();

    // Simplified Chinese：zh-CN, zh-SG, zh-Hans, zh-Hans-CN ...
    if (/^zh-(cn|sg|hans)/.test(browserLang)) {
      return 'zh-CN';
    }

    // Traditional Chinese：zh-TW, zh-HK, zh-MO, zh-Hant, zh-Hant-TW ...
    if (/^zh-(tw|hk|mo|hant)/.test(browserLang)) {
      return 'zh-TW';
    }

    // When the general Chinese language cannot distinguish between simplified and traditional characters,
    // simplified Chinese is used by default
    if (browserLang === 'zh' || browserLang.startsWith('zh-')) {
      return 'zh-CN';
    }

    // Français
    if (browserLang.startsWith('fr')) {
      return 'fr';
    }

    // English
    return 'en';
  }

  get currentLang(): Language {
    return this.currentLangSubject.value;
  }

  /**
   * Load translations from JSON file
   */
  async loadLanguage(lang: Language): Promise<void> {
    if (this.loadedLanguages.has(lang)) {
      return;
    }

    try {
      const translations = await firstValueFrom(
        this.http.get<{ [key: string]: string }>(`assets/i18n/${lang}.json`)
      );
      this.translations[lang] = translations;
      this.loadedLanguages.add(lang);
    } catch (error) {
      console.error(`Failed to load translations for language: ${lang}`, error);
      this.translations[lang] = {};
    }
  }

  async setLanguage(lang: Language): Promise<void> {
    await this.loadLanguage(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.currentLangSubject.next(lang);
  }

  /**
   * Get translation for a key
   */
  instant(key: string, params?: { [key: string]: string }): string {
    const langTranslations = this.translations[this.currentLang];
    let translation = langTranslations?.[key] || key;

    // Replace parameters like {{param}}
    if (params) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
      });
    }

    return translation;
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages(): Language[] {
    return this.SUPPORTED_LANGUAGES;
  }

  /**
   * Check if translations are loaded for current language
   */
  isLoaded(): boolean {
    return this.loadedLanguages.has(this.currentLang);
  }
}
