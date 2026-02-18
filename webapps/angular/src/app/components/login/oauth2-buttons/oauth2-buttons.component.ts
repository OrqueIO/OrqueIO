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

import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
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

  /** Disable OAuth2 - set to true to skip OAuth2 provider loading (avoids 404 errors when not configured) */
  private readonly DISABLE_OAUTH2 = false;

  private subscription?: Subscription;
  private oauth2Service = inject(OAuth2ProviderService);
  private authService = inject(AuthService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (this.DISABLE_OAUTH2) {
      // OAuth2 not configured - skip loading to avoid 404 errors
      this.providers = [];
      this.setupRequired = false;
      this.loading = false;
    } else if (this.DEMO_MODE) {
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
        this.cdr.detectChanges();
      },
      error: () => {
        this.providers = [];
        this.setupRequired = false;
        this.loading = false;
        this.cdr.detectChanges();
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
   * Note: OAuth2 endpoints are at the server root, not under the webapp path.
   *
   * IMPORTANT: Adds `prompt=login` parameter to force re-authentication at the IdP.
   * This ensures users must enter credentials even if they have an active IdP session,
   * allowing account switching after logout.
   */
  getLoginUrl(provider: OAuth2Provider): string {
    // Use provider.loginUrl if it contains the provider ID, otherwise construct it
    let loginPath = provider.loginUrl;
    if (!loginPath || !loginPath.includes(provider.id)) {
      // Fallback: construct the URL using the provider ID
      loginPath = `/oauth2/authorization/${provider.id}`;
    }

    // OAuth2 endpoints are at the server root (no /orqueio prefix)
    const baseUrl = window.location.origin + loginPath;

    // Add prompt=login to force re-authentication at the identity provider
    // This prevents automatic login when IdP session is still active
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}prompt=login`;
  }
}
