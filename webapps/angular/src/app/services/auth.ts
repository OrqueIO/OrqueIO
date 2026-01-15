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

  // Authentication events
  private authEventsSubject = new Subject<AuthEvent>();
  public authEvents$ = this.authEventsSubject.asObservable();

  private readonly baseUrl = '/orqueio/api/admin/auth/user';
  private readonly engineUrl = '/orqueio/api/engine/engine';
  private readonly appName = 'welcome';
  private readonly engine = 'default';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

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
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        this.emit('authentication.logout.failure', null, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current authentication status
   */
  getAuthentication(): Observable<Authentication | null> {
    // Si on a déjà vérifié et qu'on a une authentification, retourner la valeur en cache
    if (this.currentAuthentication) {
      return of(this.currentAuthentication);
    }

    // Si une requête est déjà en cours, retourner la même Observable
    if (this.authCheckPending) {
      return this.authCheckPending;
    }

    // Créer une nouvelle requête avec shareReplay pour partager le résultat
    this.authCheckPending = this.http.get<LoginResponse>(`${this.baseUrl}/${this.engine}`, { withCredentials: true }).pipe(
      map(response => this.parseResponse(response)),
      tap(authentication => {
        this.updateAuthentication(authentication);
      }),
      catchError(() => {
        return of(null);
      }),
      shareReplay(1),
      finalize(() => {
        // Réinitialiser après un court délai pour permettre les futures vérifications
        setTimeout(() => {
          this.authCheckPending = null;
        }, 100);
      })
    );

    return this.authCheckPending;
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
          `/orqueio/api/user/${userId}/credentials`,
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
   * Update authentication state
   */
  private updateAuthentication(authentication: Authentication | null): void {
    this.authenticationSubject.next(authentication);
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
}
