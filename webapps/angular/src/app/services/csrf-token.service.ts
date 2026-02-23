import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';

/**
 * CsrfTokenService - Central service for CSRF token management.
 *
 * This service provides:
 * - CSRF token extraction from cookies
 * - HTTP headers building with CSRF token
 * - Token refresh before sensitive operations
 *
 * The CSRF token is stored in a cookie named 'XSRF-TOKEN' by the backend
 * and must be sent back in the 'X-XSRF-TOKEN' header for POST/PUT/DELETE requests.
 */
@Injectable({
  providedIn: 'root'
})
export class CsrfTokenService {
  private readonly CSRF_COOKIE_NAME = 'XSRF-TOKEN';
  private readonly CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
  private readonly ENGINE_URL = '/orqueio/api/engine/engine';

  constructor(private http: HttpClient) {}

  /**
   * Get CSRF token from cookie.
   * The cookie is set by the backend on initial page load or after any GET request.
   *
   * @returns The CSRF token string or null if not found
   */
  getTokenFromCookie(): string | null {
    const name = `${this.CSRF_COOKIE_NAME}=`;
    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name)) {
        return cookie.substring(name.length);
      }
    }
    return null;
  }

  /**
   * Build HTTP headers with CSRF token.
   * Use this method to add CSRF protection to POST/PUT/DELETE requests.
   *
   * @param contentType Optional content type (default: 'application/json')
   * @returns HttpHeaders with CSRF token if available
   */
  buildHeaders(contentType: string = 'application/json'): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': contentType
    });

    const csrfToken = this.getTokenFromCookie();
    if (csrfToken) {
      headers = headers.set(this.CSRF_HEADER_NAME, csrfToken);
    }

    return headers;
  }

  /**
   * Build HTTP headers without content-type (for URL-encoded forms, etc.).
   *
   * @returns HttpHeaders with only CSRF token if available
   */
  buildHeadersWithoutContentType(): HttpHeaders {
    let headers = new HttpHeaders();

    const csrfToken = this.getTokenFromCookie();
    if (csrfToken) {
      headers = headers.set(this.CSRF_HEADER_NAME, csrfToken);
    }

    return headers;
  }

  /**
   * Refresh CSRF token by making a GET request to the engine endpoint.
   * This ensures we have a fresh token before making sensitive operations.
   *
   * @returns Observable that completes when token is refreshed
   */
  refreshToken(): Observable<unknown> {
    return this.http.get(this.ENGINE_URL, { withCredentials: true });
  }

  /**
   * Execute an operation after refreshing the CSRF token.
   * Use this for sensitive operations that require a fresh token.
   *
   * @param operation Function that returns an Observable to execute after token refresh
   * @returns Observable from the operation, chained after token refresh
   */
  withFreshToken<T>(operation: () => Observable<T>): Observable<T> {
    return this.refreshToken().pipe(
      switchMap(() => operation())
    );
  }

  /**
   * Get the CSRF header name (for reference).
   */
  get headerName(): string {
    return this.CSRF_HEADER_NAME;
  }

  /**
   * Get the CSRF cookie name (for reference).
   */
  get cookieName(): string {
    return this.CSRF_COOKIE_NAME;
  }
}
