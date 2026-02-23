import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { of } from 'rxjs';
import { map, take } from 'rxjs/operators';

/**
 * Guard that prevents authenticated users from accessing guest-only pages (like login).
 * Also handles post-OAuth2 login redirection to the originally requested URL.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If we already know user is authenticated (cached), redirect immediately
  if (authService.currentAuthentication) {
    if (authService.hasReturnUrl()) {
      const returnUrl = authService.consumeReturnUrl();
      return router.createUrlTree([returnUrl]);
    }
    return router.createUrlTree(['/']);
  }

  // For SSO flow, we need to verify with backend
  if (authService.isSsoSession()) {
    return authService.getAuthentication().pipe(
      take(1),
      map(auth => {
        if (!auth) {
          return true;
        }
        if (authService.hasReturnUrl()) {
          const returnUrl = authService.consumeReturnUrl();
          return router.createUrlTree([returnUrl]);
        }
        return router.createUrlTree(['/']);
      })
    );
  }

  // No cached auth and no SSO session - allow access to login page without HTTP call
  return of(true);
};
