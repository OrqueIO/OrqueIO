import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, Subject } from 'rxjs';
import { map, catchError, switchMap, tap, shareReplay, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

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

  // Storage key for persisting authentication
  private readonly AUTH_STORAGE_KEY = 'orqueio_auth';

  private readonly baseUrl = '/orqueio/api/admin/auth/user';
  private readonly engineUrl = '/orqueio/api/engine/engine';
  private readonly appName = 'welcome';
  private readonly engine = 'default';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initCrossTabSync();
    this.restoreAuthFromStorage();
  }

  /**
   * Restore authentication state from localStorage on app initialization.
   * This allows the app to immediately show the authenticated state on page refresh,
   * while still verifying with the server in the background.
   */
  private restoreAuthFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.AUTH_STORAGE_KEY);
      if (stored) {
        const auth = JSON.parse(stored) as Authentication;
        if (auth && auth.name) {
          console.log('AuthService: Restoring authentication from storage for user:', auth.name);
          this.authenticationSubject.next(auth);
        }
      }
    } catch (e) {
      // Invalid JSON or other error - clear storage
      localStorage.removeItem(this.AUTH_STORAGE_KEY);
    }
  }

  /**
   * Save authentication state to localStorage for persistence across page refreshes.
   */
  private saveAuthToStorage(auth: Authentication | null): void {
    try {
      if (auth) {
        localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(auth));
      } else {
        localStorage.removeItem(this.AUTH_STORAGE_KEY);
      }
    } catch (e) {
      // localStorage might be full or disabled - ignore
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
          console.log(`Received ${type} event from another tab`);
          // Clear local authentication state without making API call
          this.authenticationSubject.next(null);
          this.saveAuthToStorage(null); // Also clear localStorage
          this.authCheckPending = null;
          this.emit('authentication.logout.success');
          // Redirect to login page if not already there
          if (!this.router.url.startsWith('/login')) {
            this.router.navigate(['/login']);
          }
        } else if (type === 'login' && data) {
          console.log('Received login event from another tab');
          // Update local authentication state
          this.authenticationSubject.next(data);
          this.saveAuthToStorage(data); // Also update localStorage
          this.emit('authentication.login.success', data);
        }
      };
    } else {
      // Fallback to localStorage for older browsers
      window.addEventListener('storage', (event) => {
        if (event.key === this.AUTH_CHANNEL_NAME) {
          const message = event.newValue ? JSON.parse(event.newValue) : null;
          if (message?.type === 'logout' || message?.type === 'session_expired') {
            console.log(`Received ${message.type} event from another tab (localStorage)`);
            this.authenticationSubject.next(null);
            this.saveAuthToStorage(null); // Also clear localStorage
            this.authCheckPending = null;
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
      console.log('Session expired, notifying other tabs');
      this.updateAuthentication(null); // This also clears localStorage
      this.authCheckPending = null;
      this.emit('authentication.login.required');
      // Notify other tabs about session expiration
      this.broadcastAuthEvent('session_expired');
    }
  }

  /**
   * Get CSRF token from cookie
   */
  private getCsrfTokenFromCookie(): string | null {
    const name = 'XSRF-TOKEN=';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name)) {
        return cookie.substring(name.length);
      }
    }
    return null;
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
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', username);

    const formData = new URLSearchParams();
    formData.set('username', username);
    formData.set('password', password);

    // First GET request to ensure we have an up-to-date CSRF cookie
    return this.http.get(this.engineUrl, { withCredentials: true }).pipe(
      switchMap(() => {
        // Get CSRF token from cookie (set by the GET request)
        const csrfToken = this.getCsrfTokenFromCookie();
        console.log('CSRF Token from cookie:', csrfToken);

        // Build headers with CSRF token
        let headers = new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        });
        if (csrfToken) {
          headers = headers.set('X-XSRF-TOKEN', csrfToken);
        }

        console.log('Sending login request to:', `${this.baseUrl}/${this.engine}/login/${this.appName}`);

        // Then perform the login POST request
        return this.http.post<LoginResponse>(
          `${this.baseUrl}/${this.engine}/login/${this.appName}`,
          formData.toString(),
          { headers, withCredentials: true }
        );
      }),
      tap(response => {
        console.log('=== LOGIN RESPONSE ===');
        console.log('Response:', response);
      }),
      map(response => this.parseResponse(response)),
      tap(authentication => {
        console.log('=== LOGIN SUCCESS ===');
        console.log('User:', authentication.name);
        console.log('Authorized Apps:', authentication.authorizedApps);
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
        console.log('=== LOGIN ERROR ===');
        console.log('Status:', error.status);
        console.log('Error:', error);
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
    return this.http.get(this.engineUrl, { withCredentials: true }).pipe(
      switchMap(() => {
        // Get CSRF token from cookie
        const csrfToken = this.getCsrfTokenFromCookie();
        console.log('Logout CSRF Token from cookie:', csrfToken);

        let headers = new HttpHeaders();
        if (csrfToken) {
          headers = headers.set('X-XSRF-TOKEN', csrfToken);
        }

        return this.http.post<void>(
          `${this.baseUrl}/${this.engine}/logout`,
          {},
          { headers, withCredentials: true }
        );
      }),
      tap(() => {
        this.updateAuthentication(null);
        this.emit('authentication.logout.success');
        // Notify other tabs about logout
        this.broadcastAuthEvent('logout');
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        this.emit('authentication.logout.failure', null, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current authentication status.
   *
   * On page refresh, this method:
   * 1. Returns cached auth from localStorage immediately (for fast UI response)
   * 2. Verifies with server in background
   * 3. Updates state if server says user is not authenticated
   */
  getAuthentication(): Observable<Authentication | null> {
    // If we already have verified authentication, return it
    if (this.authInitialized && this.currentAuthentication) {
      return of(this.currentAuthentication);
    }

    // If a verification request is already pending, return the same Observable
    if (this.authCheckPending) {
      return this.authCheckPending;
    }

    // If we have cached auth from storage (not yet verified with server),
    // return it but also trigger a background verification
    const cachedAuth = this.currentAuthentication;
    if (cachedAuth && !this.authInitialized) {
      // Start background verification
      this.verifyAuthWithServer();
      // Return cached auth immediately for fast UI response
      return of(cachedAuth);
    }

    // No cached auth - must verify with server
    this.authCheckPending = this.http.get<LoginResponse>(`${this.baseUrl}/${this.engine}`, { withCredentials: true }).pipe(
      map(response => this.parseResponse(response)),
      tap(authentication => {
        this.authInitialized = true;
        this.updateAuthentication(authentication);
      }),
      catchError(() => {
        this.authInitialized = true;
        // Clear any stale auth from storage
        this.updateAuthentication(null);
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
   * Verify authentication with server in the background.
   * If server says user is not authenticated, clear local state and redirect to login.
   */
  private verifyAuthWithServer(): void {
    this.http.get<LoginResponse>(`${this.baseUrl}/${this.engine}`, { withCredentials: true }).pipe(
      map(response => this.parseResponse(response)),
      catchError(() => of(null))
    ).subscribe(serverAuth => {
      this.authInitialized = true;
      if (!serverAuth) {
        // Server says not authenticated - clear local state
        console.log('AuthService: Server verification failed, clearing authentication');
        this.updateAuthentication(null);
        // Redirect to login if on a protected route
        if (!this.router.url.startsWith('/login')) {
          this.saveReturnUrl(this.router.url);
          this.router.navigate(['/login']);
        }
      } else if (serverAuth.name !== this.currentAuthentication?.name) {
        // User changed - update local state
        this.updateAuthentication(serverAuth);
      }
    });
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
    return this.http.get(this.engineUrl, { withCredentials: true }).pipe(
      switchMap(() => {
        const csrfToken = this.getCsrfTokenFromCookie();
        let headers = new HttpHeaders({
          'Content-Type': 'application/json'
        });
        if (csrfToken) {
          headers = headers.set('X-XSRF-TOKEN', csrfToken);
        }

        return this.http.put<LoginResponse>(
          `${this.baseUrl}/${this.engine}/profile`,
          updates,
          { headers, withCredentials: true }
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

    return this.http.get(this.engineUrl, { withCredentials: true }).pipe(
      switchMap(() => {
        const csrfToken = this.getCsrfTokenFromCookie();
        let headers = new HttpHeaders({
          'Content-Type': 'application/json'
        });
        if (csrfToken) {
          headers = headers.set('X-XSRF-TOKEN', csrfToken);
        }

        return this.http.put<void>(
          `${this.engineUrl}/${this.engine}/user/${userId}/credentials`,
          {
            authenticatedUserPassword: currentPassword,
            password: newPassword
          },
          { headers, withCredentials: true }
        );
      }),
      catchError(error => {
        return throwError(() => this.parseError(error));
      })
    );
  }

  /**
   * Update authentication state and persist to storage
   */
  private updateAuthentication(authentication: Authentication | null): void {
    this.authenticationSubject.next(authentication);
    this.saveAuthToStorage(authentication);
    // Clear pending check when explicitly setting authentication (e.g., logout)
    if (authentication === null) {
      this.authCheckPending = null;
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

    console.log('Error message:', message);
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

  /**
   * Performs SSO logout by redirecting to the backend logout endpoint.
   * This triggers OIDC back-channel logout if configured.
   */
  ssoLogout(): void {
    this.updateAuthentication(null);
    this.emit('authentication.logout.success');
    // Notify other tabs about logout
    this.broadcastAuthEvent('logout');
    window.location.href = this.getSsoLogoutUrl();
  }

  /**
   * Gets the SSO logout URL.
   */
  private getSsoLogoutUrl(): string {
    const baseElement = document.querySelector('base');
    const appRoot = baseElement?.getAttribute('app-root') || '/orqueio';
    return appRoot + '/logout';
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

  /**
   * Smart logout that automatically chooses between SSO and regular logout.
   * - If session was authenticated via SSO, performs SSO logout (redirect to /logout)
   * - Otherwise, performs regular REST logout
   */
  smartLogout(): Observable<void> {
    if (this.isSsoSession()) {
      // SSO logout - redirect to backend logout endpoint
      this.clearSsoMarker();
      this.ssoLogout();
      // Return an observable that never completes since we're redirecting
      return new Observable<void>();
    } else {
      // Regular logout via REST API
      return this.logout().pipe(
        tap(() => this.clearSsoMarker())
      );
    }
  }
}
