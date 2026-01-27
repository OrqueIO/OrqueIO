import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

// URLs where errors are expected and should be handled silently
// These are optional endpoints that may not exist depending on configuration
const SILENT_ERROR_URLS = [
  '/api/admin/auth/user/',      // Auth check - fails when not logged in
  '/api/oauth2/setup-required', // OAuth2 setup check - fails if OAuth2 not configured
  '/api/oauth2/providers'       // OAuth2 providers - fails if OAuth2 not configured
];

/**
 * Check if the error should be silently handled (not logged and no redirect)
 */
function shouldSuppressError(url: string, status: number): boolean {
  // Suppress 404 and 401 errors for expected-to-fail endpoints
  if (status !== 404 && status !== 401) return false;
  return SILENT_ERROR_URLS.some(pattern => url.includes(pattern));
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);

  // Lazy inject Router and AuthService to avoid circular dependency during app initialization
  const getRouter = () => injector.get(Router);
  const getAuthService = () => injector.get(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      // Check if this error should be silently handled
      const suppressLogging = shouldSuppressError(req.url, error.status);

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error - try to extract actual message from response body
        const serverMessage = error.error?.message || error.error?.errorMessage;

        switch (error.status) {
          case 401:
            errorMessage = serverMessage || 'Unauthorized access';
            // Handle 401 - session expired or not authenticated
            // Don't redirect if:
            // - Already on login page
            // - It's a login request
            // - It's an auth check request (these are handled by AuthService)
            if (!suppressLogging) {
              const router = getRouter();
              const authService = getAuthService();
              if (!req.url.includes('/login') && !router.url.startsWith('/login')) {
                console.warn('Session expired or unauthorized, redirecting to login');
                // Save current URL for redirect after login
                authService.saveReturnUrl(router.url);
                // Handle session expiration and notify other tabs
                authService.handleSessionExpired();
                // Redirect to login
                router.navigate(['/login']);
              }
            }
            break;
          case 403:
            errorMessage = serverMessage || 'Access forbidden';
            break;
          case 404:
            errorMessage = serverMessage || 'Resource not found';
            break;
          case 500:
            // For 500 errors, show the actual backend error message if available
            errorMessage = serverMessage || 'Internal server error';
            break;
          default:
            errorMessage = serverMessage || error.message;
        }
      }

      // Log error to console unless it's an expected 404
      if (!suppressLogging) {
        console.error('HTTP Error:', errorMessage, error);
      }

      return throwError(() => error);
    })
  );
};
