import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, take } from 'rxjs/operators';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getAuthentication().pipe(
    take(1),
    map(auth => {
      if (!auth) {
        console.log('GuestGuard: User not authenticated, access granted');
        return true;
      }
      console.log('GuestGuard: User authenticated, redirecting to home');
      return router.createUrlTree(['/']);
    })
  );
};
