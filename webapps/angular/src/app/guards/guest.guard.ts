import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, take } from 'rxjs/operators';

/**
 * Guard that prevents authenticated users from accessing guest-only pages (like login).
 * Also handles post-OAuth2 login redirection to the originally requested URL.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getAuthentication().pipe(
    take(1),
    map(auth => {
      if (!auth) {
        return true;
      }

      // User is authenticated - redirect to saved return URL or home
      // This handles the post-OAuth2 login flow
      if (authService.hasReturnUrl()) {
        const returnUrl = authService.consumeReturnUrl();
        return router.createUrlTree([returnUrl]);
      }

      return router.createUrlTree(['/']);
    })
  );
};
