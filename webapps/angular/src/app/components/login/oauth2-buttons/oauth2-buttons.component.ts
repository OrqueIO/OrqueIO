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

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { OAuth2ProviderService, OAuth2Provider } from '../../../services/oauth2-provider.service';
import { AuthService } from '../../../services/auth';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TranslateService } from '../../../i18n/translate.service';

/**
 * Component that displays OAuth2/OIDC login buttons.
 *
 * This component:
 * - Fetches available OAuth2 providers from the backend
 * - Displays login buttons for each configured provider
 * - Handles the setup-required state (disables buttons if no admin exists)
 * - Saves the return URL before redirecting to OAuth2 provider
 * - Redirects directly to the OAuth2 authorization endpoint (no client-side token handling)
 *
 * The actual authentication is handled entirely by the backend via Spring Security.
 * This component only initiates the redirect flow.
 *
 * @example
 * ```html
 * <app-oauth2-buttons></app-oauth2-buttons>
 * ```
 */
@Component({
  selector: 'app-oauth2-buttons',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './oauth2-buttons.component.html',
  styleUrls: ['./oauth2-buttons.component.css']
})
export class OAuth2ButtonsComponent implements OnInit, OnDestroy {
  /** List of configured OAuth2 providers */
  providers: OAuth2Provider[] = [];

  /** Whether initial admin setup is required (SSO disabled until admin exists) */
  setupRequired = false;

  /** Loading state */
  loading = true;

  /** Demo mode - set to true to show static SSO buttons for testing UI */
  private readonly DEMO_MODE = false;

  private subscription?: Subscription;
  private oauth2Service = inject(OAuth2ProviderService);
  private authService = inject(AuthService);
  private translateService = inject(TranslateService);

  ngOnInit(): void {
    if (this.DEMO_MODE) {
      this.loadDemoProviders();
    } else {
      this.loadProviders();
    }
  }

  /**
   * Loads static demo providers for UI testing
   */
  private loadDemoProviders(): void {
    this.providers = [
      { id: 'google', name: 'Google', loginUrl: '/oauth2/authorization/google' },
      { id: 'keycloak', name: 'Keycloak', loginUrl: '/oauth2/authorization/keycloak' },
      { id: 'github', name: 'GitHub', loginUrl: '/oauth2/authorization/github' }
    ];
    this.setupRequired = false;
    this.loading = false;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Loads OAuth2 providers and setup status from the backend
   */
  private loadProviders(): void {
    this.loading = true;
    this.subscription = this.oauth2Service.getState().subscribe({
      next: ({ providers, setupRequired }) => {
        this.providers = providers;
        this.setupRequired = setupRequired;
        this.loading = false;
      },
      error: () => {
        this.providers = [];
        this.setupRequired = false;
        this.loading = false;
      }
    });
  }

  /**
   * Initiates OAuth2 login flow for a provider.
   * Saves the current/intended URL for post-login redirect,
   * then redirects to the OAuth2 authorization endpoint.
   *
   * @param provider The OAuth2 provider to login with
   * @param event The click event
   */
  onProviderClick(provider: OAuth2Provider, event: Event): void {
    if (this.setupRequired) {
      event.preventDefault();
      return;
    }

    // Save return URL before redirect (will be restored after OAuth2 callback)
    this.authService.saveReturnUrl();

    // Mark this as an SSO login session (used for smart logout)
    this.authService.markSsoLogin();

    // Let the browser navigate to the OAuth2 authorization endpoint
    // The backend Spring Security will handle the OAuth2 flow
    // No need to prevent default - we want the native navigation
  }

  /**
   * Gets the tooltip text for a provider button
   */
  getTooltip(provider: OAuth2Provider): string {
    if (this.setupRequired) {
      return this.translateService.instant('PAGE_LOGIN_SSO_DISABLED_SETUP');
    }
    return this.translateService.instant('PAGE_LOGIN_SSO_WITH', { provider: provider.name });
  }

  /**
   * Gets the aria-label for accessibility
   */
  getAriaLabel(provider: OAuth2Provider): string {
    return this.translateService.instant('PAGE_LOGIN_SSO_WITH', { provider: provider.name });
  }

  /**
   * Gets the CSS class for the provider icon
   */
  getIconClass(provider: OAuth2Provider): string {
    return `oauth2-icon oauth2-icon-${provider.id}`;
  }

  /**
   * Builds the full OAuth2 login URL.
   * This URL redirects to Spring Security's OAuth2 authorization endpoint.
   */
  getLoginUrl(provider: OAuth2Provider): string {
    // Build the base URL (origin without Angular app path)
    const baseUrl = this.getBaseUrl();
    return baseUrl + provider.loginUrl;
  }

  /**
   * Gets the application base URL (before the Angular app path)
   */
  private getBaseUrl(): string {
    // Get the app-root from <base> tag if available
    const baseElement = document.querySelector('base');
    const appRoot = baseElement?.getAttribute('app-root') || '/orqueio';

    // Find where app-root starts in current URL
    const currentUrl = window.location.href;
    const idx = currentUrl.indexOf(appRoot);

    if (idx !== -1) {
      return currentUrl.substring(0, idx + appRoot.length);
    }

    // Fallback to origin + app-root
    return window.location.origin + appRoot;
  }
}
