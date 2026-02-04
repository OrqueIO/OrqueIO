import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, take } from 'rxjs/operators';

/**
 * Guard that protects routes requiring authentication.
 * Saves the requested URL before redirecting to login for post-login restoration.
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If we already have cached authentication, allow access without HTTP call
  if (authService.currentAuthentication) {
    return true;
  }

  return authService.getAuthentication().pipe(
    take(1),
    map(auth => {
      if (auth) {
        return true;
      }

      // Save the requested URL for post-login redirect
      authService.saveReturnUrl(state.url);
      authService.emitLoginRequired();

      return router.createUrlTree(['/login']);
    })
  );
};
