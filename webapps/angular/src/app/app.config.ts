import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER, isDevMode } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withXsrfConfiguration, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { TranslateService } from './i18n/translate.service';
import { errorInterceptor } from './interceptors/error.interceptor';

// Admin State
import { adminReducers } from './store/admin';
import { UsersEffects } from './store/admin/users/users.effects';
import { AuthorizationsEffects } from './store/admin/authorizations/authorizations.effects';
import { TenantsEffects } from './store/admin/tenants/tenants.effects';
import { SystemEffects } from './store/admin/system/system.effects';

// Cockpit State
import { cockpitReducers } from './store/cockpit';
import { DashboardEffects } from './store/cockpit/dashboard/dashboard.effects';
import { ProcessesEffects } from './store/cockpit/processes/processes.effects';
import { DecisionsEffects } from './store/cockpit/decisions/decisions.effects';
import { TasksEffects } from './store/cockpit/tasks/tasks.effects';

// Tasklist State
import { tasklistReducer } from './store/tasklist/tasklist.reducer';
import { TasklistEffects } from './store/tasklist/tasklist.effects';

function initializeTranslations(translateService: TranslateService) {
  return () => translateService.loadLanguage(translateService.currentLang);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload'
      })
    ),
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN'
      }),
      withInterceptors([errorInterceptor])
    ),
    provideStore({
      ...adminReducers,
      ...cockpitReducers,
      tasklist: tasklistReducer
    }),
    provideEffects([
      // Admin Effects
      UsersEffects,
      AuthorizationsEffects,
      TenantsEffects,
      SystemEffects,
      // Cockpit Effects
      DashboardEffects,
      ProcessesEffects,
      DecisionsEffects,
      TasksEffects,
      // Tasklist Effects
      TasklistEffects
    ]),
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
    }
  ]
};
