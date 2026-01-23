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

  return authService.getAuthentication().pipe(
    take(1),
    map(auth => {
      if (auth) {
        console.log('AuthGuard: User authenticated, access granted');
        return true;
      }

      // Save the requested URL for post-login redirect
      console.log('AuthGuard: User not authenticated, saving URL and redirecting to login');
      authService.saveReturnUrl(state.url);
      authService.emitLoginRequired();

      return router.createUrlTree(['/login']);
    })
  );
};
