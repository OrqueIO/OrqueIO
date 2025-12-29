import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getAuthentication().pipe(
    take(1),
    map(auth => {
      if (auth) {
        console.log('AuthGuard: User authenticated, access granted');
        return true;
      }
      console.log('AuthGuard: User not authenticated, redirecting to login');
      return router.createUrlTree(['/login']);
    })
  );
};
