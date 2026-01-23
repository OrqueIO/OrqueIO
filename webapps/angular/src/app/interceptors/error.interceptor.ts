import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);

  // Lazy inject Router and AuthService to avoid circular dependency during app initialization
  const getRouter = () => injector.get(Router);
  const getAuthService = () => injector.get(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

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
            // Don't redirect if already on login page or if it's a login request
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

      // Log error to console (components can handle specific cases)
      console.error('HTTP Error:', errorMessage, error);

      return throwError(() => error);
    })
  );
};
