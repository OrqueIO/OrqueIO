import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, Subject } from 'rxjs';
import { map, catchError, switchMap, tap, shareReplay, finalize, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CsrfTokenService } from './csrf-token.service';

// Authentication event types 
export type AuthEventType =
  | 'authentication.changed'
  | 'authentication.login.success'
  | 'authentication.login.failure'
  | 'authentication.login.required'
  | 'authentication.logout.success'
  | 'authentication.logout.failure';

export interface AuthEvent {
  type: AuthEventType;
  data?: Authentication | null;
  error?: any;
}

export interface Authentication {
  name: string;
  email?: string;
  authorizedApps: string[];
}

export interface ProfileUpdate {
  name?: string;
  email?: string;
}

export interface LoginResponse {
  userId: string;
  authorizedApps: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authenticationSubject = new BehaviorSubject<Authentication | null>(null);
  public authentication$ = this.authenticationSubject.asObservable();
  private authCheckPending: Observable<Authentication | null> | null = null;
  private authInitialized = false;

  // Authentication events
  private authEventsSubject = new Subject<AuthEvent>();
  public authEvents$ = this.authEventsSubject.asObservable();

  // Cross-tab synchronization channel
  private authChannel: BroadcastChannel | null = null;
  private readonly AUTH_CHANNEL_NAME = 'orqueio_auth_sync';


  private readonly LEGACY_AUTH_STORAGE_KEY = 'orqueio_auth';
  private readonly SESSION_ACTIVE_KEY = 'orqueio_session_active';

  private readonly baseUrl = '/orqueio/api/admin/auth/user';
  private readonly engineUrl = '/orqueio/api/engine/engine';
  private readonly appName = 'welcome';
  private readonly engine = 'default';

  private csrfService = inject(CsrfTokenService);

  constructor(
    private http: HttpClient,
    private router: Router,
    private injector: Injector
  ) {
    this.initCrossTabSync();
    // Clean up any legacy localStorage data from previous versions
    this.clearLegacyStorage();
  }

  /**
   * Clear any legacy authentication data from localStorage.
   * This ensures we don't have stale/manipulable data persisted.
   */
  private clearLegacyStorage(): void {
    try {
      localStorage.removeItem(this.LEGACY_AUTH_STORAGE_KEY);
    } catch (e) {
      // localStorage might be disabled - ignore
    }
  }

  /**
   * Initialize cross-tab authentication synchronization.
   * When a user logs out in one tab, all other tabs are notified and redirected to login.
   */
  private initCrossTabSync(): void {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel !== 'undefined') {
      this.authChannel = new BroadcastChannel(this.AUTH_CHANNEL_NAME);

      this.authChannel.onmessage = (event) => {
        const { type, data } = event.data;

        if (type === 'logout' || type === 'session_expired') {
          // Clear local authentication state without making API call
          this.clearSessionMarker();
          this.authenticationSubject.next(null);
          this.authCheckPending = null;
          this.authInitialized = false;
          this.emit('authentication.logout.success');
          // Redirect to login page if not already there
          if (!this.router.url.startsWith('/login')) {
            this.router.navigate(['/login']);
          }
        } else if (type === 'login' && data) {
          // Update local authentication state (in memory only)
          this.setSessionMarker();
          this.authenticationSubject.next(data);
          this.authInitialized = true;
          this.emit('authentication.login.success', data);
        }
      };
    } else {
      // Fallback to localStorage events for older browsers (for cross-tab sync only)
      window.addEventListener('storage', (event) => {
        if (event.key === this.AUTH_CHANNEL_NAME) {
          const message = event.newValue ? JSON.parse(event.newValue) : null;
          if (message?.type === 'logout' || message?.type === 'session_expired') {
            this.clearSessionMarker();
            this.authenticationSubject.next(null);
            this.authCheckPending = null;
            this.authInitialized = false;
            this.emit('authentication.logout.success');
            if (!this.router.url.startsWith('/login')) {
              this.router.navigate(['/login']);
            }
          }
        }
      });
    }
  }

  /**
   * Broadcast authentication event to other tabs.
   */
  private broadcastAuthEvent(type: 'login' | 'logout' | 'session_expired', data?: Authentication | null): void {
    const message = { type, data, timestamp: Date.now() };

    if (this.authChannel) {
      this.authChannel.postMessage(message);
    } else {
      // Fallback to localStorage
      localStorage.setItem(this.AUTH_CHANNEL_NAME, JSON.stringify(message));
      // Clean up immediately (we just need the storage event to fire)
      localStorage.removeItem(this.AUTH_CHANNEL_NAME);
    }
  }

  /**
   * Handle session expired event (401 error).
   * Clears local state and notifies other tabs.
   * Called by the error interceptor when a 401 is received.
   */
  handleSessionExpired(): void {
    // Only broadcast if we were previously authenticated
    if (this.currentAuthentication) {
      this.clearSessionMarker();
      this.updateAuthentication(null); // This also clears localStorage
      this.authCheckPending = null;
      this.emit('authentication.login.required');
      // Notify other tabs about session expiration
      this.broadcastAuthEvent('session_expired');
    }
  }

  get currentAuthentication(): Authentication | null {
    return this.authenticationSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.authenticationSubject.value !== null;
  }

  /**
   * Login into the application with the given credentials
   */
  login(username: string, password: string): Observable<Authentication> {
    const formData = new URLSearchParams();
    formData.set('username', username);
    formData.set('password', password);

    // First GET request to ensure we have an up-to-date CSRF cookie
    return this.csrfService.refreshToken().pipe(
      switchMap(() => {
        // Build headers with CSRF token for form-urlencoded content
        const headers = this.csrfService.buildHeaders('application/x-www-form-urlencoded;charset=UTF-8');

        // Then perform the login POST request
        return this.http.post<LoginResponse>(
          `${this.baseUrl}/${this.engine}/login/${this.appName}`,
          formData.toString(),
          { headers, withCredentials: true }
        );
      }),
      map(response => this.parseResponse(response)),
      tap(authentication => {
        this.setSessionMarker();
        this.updateAuthentication(authentication);
        this.emit('authentication.login.success', authentication);
        // Notify other tabs about login
        this.broadcastAuthEvent('login', authentication);
      }),
      // Refresh CSRF token after successful login
      switchMap(authentication => {
        return this.http.get(this.engineUrl, { withCredentials: true }).pipe(
          map(() => authentication)
        );
      }),
      catchError(error => {
        this.emit('authentication.login.failure', null, error);
        return throwError(() => this.parseError(error));
      })
    );
  }

  /**
   * Logout from the application
   */
  logout(): Observable<void> {
    // First GET request to get CSRF token
    return this.csrfService.refreshToken().pipe(
      switchMap(() => {
        return this.http.post<void>(
          `${this.baseUrl}/${this.engine}/logout`,
          {},
          { headers: this.csrfService.buildHeadersWithoutContentType(), withCredentials: true }
        );
      }),
      tap(() => {
        this.clearSessionMarker();
        this.updateAuthentication(null);
        this.emit('authentication.logout.success');
        // Notify other tabs about logout
        this.broadcastAuthEvent('logout');
        // Note: Navigation is handled by the component calling this method
      }),
      catchError(error => {
        this.emit('authentication.logout.failure', null, error);
        return throwError(() => error);
      })
    );
  }

  getAuthentication(): Observable<Authentication | null> {
    // If we already have backend-verified authentication in this session, return it
    if (this.authInitialized && this.currentAuthentication) {
      return of(this.currentAuthentication);
    }

    // If a verification request is already pending, return the same Observable
    if (this.authCheckPending) {
      return this.authCheckPending;
    }

    // Check if we might have an active session (user logged in previously in this browser session)
    // If no session marker exists, assume not authenticated to avoid 404 errors
    if (!this.hasActiveSessionMarker()) {
      this.authInitialized = true;
      return of(null);
    }

    // Verify with backend only if session marker exists
    this.authCheckPending = this.http.get<LoginResponse>(`${this.baseUrl}/${this.engine}`, { withCredentials: true }).pipe(
      map(response => this.parseResponse(response)),
      tap(authentication => {
        this.authInitialized = true;
        this.updateAuthentication(authentication);
        if (!authentication) {
          this.clearSessionMarker();
        }
      }),
      catchError(() => {
        this.authInitialized = true;
        this.updateAuthentication(null);
        this.clearSessionMarker();
        return of(null);
      }),
      shareReplay(1),
      finalize(() => {
        // Reset after a short delay to allow future verifications
        setTimeout(() => {
          this.authCheckPending = null;
        }, 100);
      })
    );

    return this.authCheckPending;
  }

  /**
   * Check if there might be an active session (user logged in during this browser session)
   */
  private hasActiveSessionMarker(): boolean {
    try {
      return sessionStorage.getItem(this.SESSION_ACTIVE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Set the session marker when user logs in
   */
  private setSessionMarker(): void {
    try {
      sessionStorage.setItem(this.SESSION_ACTIVE_KEY, 'true');
    } catch {
      // sessionStorage might be disabled
    }
  }

  /**
   * Clear the session marker on logout or session expiry
   */
  private clearSessionMarker(): void {
    try {
      sessionStorage.removeItem(this.SESSION_ACTIVE_KEY);
    } catch {
      // sessionStorage might be disabled
    }
  }

  /**
   * Force re-verification with backend.
   * Useful when you suspect the session state might have changed.
   */
  revalidateAuthentication(): Observable<Authentication | null> {
    this.authInitialized = false;
    this.authCheckPending = null;
    return this.getAuthentication();
  }

  /**
   * Check if user can access a specific app
   */
  canAccess(app: string): boolean {
    const auth = this.currentAuthentication;
    if (!auth) return false;
    return auth.authorizedApps.includes(app);
  }

  /**
   * Update user profile
   */
  updateProfile(updates: ProfileUpdate): Observable<Authentication> {
    return this.csrfService.refreshToken().pipe(
      switchMap(() => {
        return this.http.put<LoginResponse>(
          `${this.baseUrl}/${this.engine}/profile`,
          updates,
          { headers: this.csrfService.buildHeaders(), withCredentials: true }
        );
      }),
      map(response => this.parseResponse(response)),
      tap(authentication => {
        this.updateAuthentication(authentication);
      }),
      catchError(error => {
        return throwError(() => this.parseError(error));
      })
    );
  }

  /**
   * Change user password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const userId = this.currentAuthentication?.name;
    if (!userId) {
      return throwError(() => 'User not authenticated');
    }

    return this.csrfService.refreshToken().pipe(
      switchMap(() => {
        return this.http.put<void>(
          `${this.engineUrl}/${this.engine}/user/${userId}/credentials`,
          {
            authenticatedUserPassword: currentPassword,
            password: newPassword
          },
          { headers: this.csrfService.buildHeaders(), withCredentials: true }
        );
      }),
      catchError(error => {
        return throwError(() => this.parseError(error));
      })
    );
  }

  /**
   * Update authentication state (in memory only - no localStorage persistence).
   * This follows the AngularJS pattern for security.
   */
  private updateAuthentication(authentication: Authentication | null): void {
    this.authenticationSubject.next(authentication);
    // Clear pending check when explicitly setting authentication (e.g., logout)
    if (authentication === null) {
      this.authCheckPending = null;
      this.authInitialized = false;
    }
    this.emit('authentication.changed', authentication);
  }

  /**
   * Emit authentication event (similar to AngularJS $broadcast)
   */
  private emit(type: AuthEventType, data?: Authentication | null, error?: any): void {
    this.authEventsSubject.next({ type, data, error });
  }

  /**
   * Emit login required event (for route guards)
   */
  emitLoginRequired(): void {
    this.emit('authentication.login.required');
  }

  /**
   * Parse server response to Authentication object
   */
  private parseResponse(response: LoginResponse): Authentication {
    return {
      name: response.userId,
      authorizedApps: response.authorizedApps || []
    };
  }

  /**
   * Parse error response
   */
  private parseError(error: any): string {
    let message: string;

    if (error.status === 401 || error.status === 403) {
      message = 'Wrong credentials, locked user or missing access rights to application.';
    } else if (error.status === 0) {
      message = 'Unable to connect to the server. Please check your connection.';
    } else if (error.status === 500) {
      message = 'Internal server error. Please try again later.';
    } else {
      message = error.error?.message || 'An error occurred during login.';
    }

    return message;
  }

  // ==================== SSO Methods ====================

  private readonly RETURN_URL_KEY = 'orqueio_return_url';
  private readonly SSO_LOGIN_KEY = 'orqueio_sso_login';

  /**
   * Saves the current or specified URL for post-login redirect.
   * Used before redirecting to OAuth2 provider.
   */
  saveReturnUrl(url?: string): void {
    const urlToSave = url || this.router.url;
    if (urlToSave && urlToSave !== '/login' && !urlToSave.startsWith('/login?')) {
      sessionStorage.setItem(this.RETURN_URL_KEY, urlToSave);
    }
  }

  /**
   * Retrieves and removes the saved return URL.
   * Used after successful OAuth2 login.
   */
  consumeReturnUrl(): string {
    const url = sessionStorage.getItem(this.RETURN_URL_KEY);
    sessionStorage.removeItem(this.RETURN_URL_KEY);
    return url || '/';
  }

  /**
   * Checks if there is a saved return URL.
   */
  hasReturnUrl(): boolean {
    return sessionStorage.getItem(this.RETURN_URL_KEY) !== null;
  }


  ssoLogout(): void {
    console.warn('ssoLogout() is deprecated - use smartLogout() instead');
    this.updateAuthentication(null);
    this.emit('authentication.logout.success');
    // Notify other tabs about logout
    this.broadcastAuthEvent('logout');
    window.location.href = this.getSsoLogoutUrl();
  }

  private getSsoLogoutUrl(): string {
    return '/logout';
  }

  /**
   * Checks if the current URL contains an OAuth2 error parameter.
   */
  checkOAuth2Error(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('oauth2_error') === 'true';
  }

  /**
   * Clears the OAuth2 error parameter from the URL.
   */
  clearOAuth2Error(): void {
    if (this.checkOAuth2Error()) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  /**
   * Marks the current session as SSO-authenticated.
   * Called when user logs in via OAuth2 provider.
   */
  markSsoLogin(): void {
    sessionStorage.setItem(this.SSO_LOGIN_KEY, 'true');
    this.setSessionMarker(); // Also mark session as potentially active for auth checks
  }

  /**
   * Checks if the current session was authenticated via SSO.
   */
  isSsoSession(): boolean {
    return sessionStorage.getItem(this.SSO_LOGIN_KEY) === 'true';
  }

  /**
   * Clears the SSO login marker.
   * Called during logout.
   */
  clearSsoMarker(): void {
    sessionStorage.removeItem(this.SSO_LOGIN_KEY);
  }


  smartLogout(): Observable<void> {
    // Check if this is an SSO session
    if (this.isSsoSession()) {
      this.clearSessionMarker();
      this.updateAuthentication(null);
      this.emit('authentication.logout.success');
      this.broadcastAuthEvent('logout');
      this.clearSsoMarker();

      // Redirect to SSO logout endpoint (this will cause page navigation)
      window.location.href = this.getSsoLogoutUrl();

      // Return an observable that never completes (page will redirect)
      return new Observable<void>(() => {});
    }

    // For non-SSO users, use the REST API logout
    return this.logout().pipe(
      tap(() => {
        this.clearSsoMarker();
      })
    );
  }
}
