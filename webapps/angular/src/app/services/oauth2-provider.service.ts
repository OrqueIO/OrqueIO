/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

/**
 * Represents an OAuth2/OIDC provider configured in the backend
 */
export interface OAuth2Provider {
  /** Unique identifier for the provider (e.g., 'keycloak', 'google') */
  id: string;
  /** Display name for the provider */
  name: string;
  /** Login URL to initiate OAuth2 flow (e.g., '/oauth2/authorization/keycloak') */
  loginUrl: string;
}

/**
 * Response from the setup-required endpoint
 */
interface SetupRequiredResponse {
  setupRequired: boolean;
}

/**
 * Combined state of OAuth2 providers and setup status
 */
export interface OAuth2State {
  providers: OAuth2Provider[];
  setupRequired: boolean;
}

/**
 * Service for fetching OAuth2/OIDC provider configuration from the backend.
 *
 * This service communicates with the Spring Security OAuth2 backend to:
 * - Fetch the list of configured OAuth2 providers
 * - Check if initial admin setup is required (no admin user exists)
 *
 * The backend is the sole source of truth for authentication configuration.
 * No tokens are stored or managed client-side - only server-side sessions
 * via HTTP-only cookies.
 *
 * @example
 * ```typescript
 * oauth2Service.getState().subscribe(state => {
 *   console.log('Providers:', state.providers);
 *   console.log('Setup required:', state.setupRequired);
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class OAuth2ProviderService {
  private readonly providersUrl = '/orqueio/api/oauth2/providers';
  private readonly setupRequiredUrl = '/orqueio/api/oauth2/setup-required';

  /** Cached observable for providers - shared across subscribers */
  private providersCache$: Observable<OAuth2Provider[]> | null = null;

  /** Cached observable for setup required status */
  private setupRequiredCache$: Observable<boolean> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Fetches the list of configured OAuth2 providers from the backend.
   * Results are cached and shared across all subscribers.
   *
   * @returns Observable of OAuth2 providers array, empty array on error
   */
  getProviders(): Observable<OAuth2Provider[]> {
    if (!this.providersCache$) {
      this.providersCache$ = this.http.get<OAuth2Provider[]>(this.providersUrl, {
        withCredentials: true
      }).pipe(
        catchError(() => {
          // OAuth2 may not be configured - return empty array silently
          return of([]);
        }),
        shareReplay(1)
      );
    }
    return this.providersCache$;
  }

  /**
   * Checks if initial admin setup is required (no admin user exists yet).
   * When true, SSO buttons should be disabled until first admin is created.
   * Results are cached and shared across all subscribers.
   *
   * @returns Observable of boolean, false on error
   */
  isSetupRequired(): Observable<boolean> {
    if (!this.setupRequiredCache$) {
      this.setupRequiredCache$ = this.http.get<SetupRequiredResponse>(this.setupRequiredUrl, {
        withCredentials: true
      }).pipe(
        map(response => response.setupRequired === true),
        catchError(() => {
          // Setup check may not be available - return false silently
          return of(false);
        }),
        shareReplay(1)
      );
    }
    return this.setupRequiredCache$;
  }

  /**
   * Fetches both providers and setup status in a single combined call.
   * This is the recommended method for components that need both pieces of data.
   *
   * @returns Observable of combined OAuth2State
   */
  getState(): Observable<OAuth2State> {
    return forkJoin({
      providers: this.getProviders(),
      setupRequired: this.isSetupRequired()
    });
  }

  /**
   * Checks if any OAuth2 providers are configured.
   *
   * @returns Observable of boolean indicating if SSO is available
   */
  isSsoEnabled(): Observable<boolean> {
    return this.getProviders().pipe(
      map(providers => providers.length > 0)
    );
  }

  /**
   * Clears the cached data, forcing a fresh fetch on next request.
   * Useful after configuration changes or logout.
   */
  clearCache(): void {
    this.providersCache$ = null;
    this.setupRequiredCache$ = null;
  }

  /**
   * Builds the full login URL for a provider.
   * The URL is relative to the application base URL.
   *
   * @param provider The OAuth2 provider
   * @returns The full login URL
   */
  getLoginUrl(provider: OAuth2Provider): string {
    // The loginUrl from backend is already in the correct format
    // e.g., '/oauth2/authorization/keycloak'
    return provider.loginUrl;
  }
}
