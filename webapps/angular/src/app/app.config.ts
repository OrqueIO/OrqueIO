import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER, isDevMode } from '@angular/core';
import { provideRouter, withRouterConfig, TitleStrategy, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withXsrfConfiguration, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { TranslateService } from './i18n/translate.service';
import { errorInterceptor } from './interceptors/error.interceptor';
import { PageTitleStrategy } from './services/page-title.strategy';

function initializeTranslations(translateService: TranslateService) {
  return () => translateService.loadLanguage(translateService.currentLang);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload'
      }),
      withPreloading(PreloadAllModules)
    ),
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN'
      }),
      withInterceptors([errorInterceptor])
    ),
    provideStore({}),
    provideEffects([]),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
      autoPause: true,
      trace: false,
      traceLimit: 75,
      connectInZone: true
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTranslations,
      deps: [TranslateService],
      multi: true
    },
    {
      provide: TitleStrategy,
      useClass: PageTitleStrategy
    }
  ]
};
