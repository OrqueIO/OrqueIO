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

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { CsrfTokenService } from './csrf-token.service';

/**
 * User profile for initial admin creation
 */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

/**
 * Credentials for initial admin creation
 */
export interface UserCredentials {
  password: string;
}

/**
 * Request payload for creating initial user
 */
export interface CreateInitialUserRequest {
  profile: UserProfile;
  credentials: UserCredentials;
}

/**
 * Password policy rule from the server
 */
export interface PasswordPolicyRule {
  placeholder: string;
  parameter?: Record<string, unknown>;
}

/**
 * Password policy response from server
 */
export interface PasswordPolicy {
  rules: PasswordPolicyRule[];
}

/**
 * Password validation response from server
 */
export interface PasswordValidationResponse {
  valid: boolean;
  rules?: PasswordPolicyRule[];
}

/**
 * Service for creating the initial admin user during setup.
 *
 * This service communicates with the backend setup endpoint to:
 * - Create the first administrator user
 * - Validate passwords against the password policy
 *
 * The setup endpoint is only available when no admin user exists.
 */
@Injectable({
  providedIn: 'root'
})
export class InitialUserService {
  private readonly setupUrl = '/orqueio/api/admin/setup';
  private readonly engine = 'default';

  private http = inject(HttpClient);
  private csrfService = inject(CsrfTokenService);

  /**
   * Creates the initial administrator user.
   *
   * @param request The user profile and credentials
   * @returns Observable that completes on success or errors on failure
   */
  createInitialUser(request: CreateInitialUserRequest): Observable<void> {
    // First GET request to ensure we have an up-to-date CSRF cookie
    return this.csrfService.refreshToken().pipe(
      switchMap(() => {
        return this.http.post<void>(
          `${this.setupUrl}/${this.engine}/user/create`,
          request,
          { headers: this.csrfService.buildHeaders(), withCredentials: true }
        );
      }),
      catchError(error => {
        console.error('Failed to create initial user:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches the password policy from the server.
   *
   * @returns Observable of password policy rules
   */
  getPasswordPolicy(): Observable<PasswordPolicy> {
    return this.http.get<PasswordPolicy>(
      `${this.setupUrl}/${this.engine}/user/password-policy`,
      { withCredentials: true }
    ).pipe(
      catchError(error => {
        console.warn('Failed to fetch password policy:', error);
        // Return empty policy on error (password will be accepted)
        return throwError(() => error);
      })
    );
  }

  /**
   * Validates a password against the server's password policy.
   *
   * @param password The password to validate
   * @param profile The user profile (some policies may depend on user data)
   * @returns Observable of validation response
   */
  validatePassword(password: string, profile: UserProfile): Observable<PasswordValidationResponse> {
    return this.csrfService.refreshToken().pipe(
      switchMap(() => {
        return this.http.post<PasswordValidationResponse>(
          `${this.setupUrl}/${this.engine}/user/password-policy`,
          { password, profile },
          { headers: this.csrfService.buildHeaders(), withCredentials: true }
        );
      }),
      catchError(error => {
        console.warn('Failed to validate password:', error);
        // Return valid on error (allow password)
        return throwError(() => error);
      })
    );
  }

  /**
   * Checks if setup is available (no admin user exists).
   * Uses the OAuth2 setup-required endpoint which checks for admin users.
   *
   * @returns Observable of boolean indicating if setup is available
   */
  isSetupAvailable(): Observable<boolean> {
    return this.http.get<{ setupRequired: boolean }>(
      '/orqueio/api/oauth2/setup-required',
      { withCredentials: true }
    ).pipe(
      map(response => response.setupRequired === true),
      catchError(() => {
        // On error, assume setup is not available
        return of(false);
      })
    );
  }
}
