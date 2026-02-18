import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

export type Language = 'fr' | 'en';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  private readonly STORAGE_KEY = 'orqueio_language';
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
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') {
      return saved;
    }
    // Detect browser language
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'fr' ? 'fr' : 'en';
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
    return ['fr', 'en'];
  }

  /**
   * Check if translations are loaded for current language
   */
  isLoaded(): boolean {
    return this.loadedLanguages.has(this.currentLang);
  }
}
