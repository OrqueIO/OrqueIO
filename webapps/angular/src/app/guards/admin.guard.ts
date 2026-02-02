import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';
import { PermissionService } from '../services/permission.service';
import { map, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Guard that protects admin routes.
 * Requires user to be authenticated AND have access to the 'admin' application.
 *
 * Usage in routes:
 * ```typescript
 * {
 *   path: 'admin',
 *   canActivate: [authGuard, adminGuard],
 *   children: [...]
 * }
 * ```
 */
export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  return authService.getAuthentication().pipe(
    take(1),
    switchMap(auth => {
      if (!auth) {
        // Not authenticated - let authGuard handle this
                return of(router.createUrlTree(['/login']));
      }

      // Check if user has access to admin app
      const canAccessAdmin = permissionService.canAccessAdmin();

      if (canAccessAdmin) {
                return of(true);
      }

            return of(router.createUrlTree(['/access-denied'], {
        queryParams: {
          returnUrl: state.url,
          requiredApp: 'admin'
        }
      }));
    })
  );
};

/**
 * Guard that protects cockpit routes.
 * Requires user to be authenticated AND have access to the 'cockpit' application.
 */
export const cockpitGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  return authService.getAuthentication().pipe(
    take(1),
    switchMap(auth => {
      if (!auth) {
                return of(router.createUrlTree(['/login']));
      }

      const canAccessCockpit = permissionService.canAccessCockpit();

      if (canAccessCockpit) {
                return of(true);
      }

            return of(router.createUrlTree(['/access-denied'], {
        queryParams: {
          returnUrl: state.url,
          requiredApp: 'cockpit'
        }
      }));
    })
  );
};

/**
 * Guard that protects tasklist routes.
 * Requires user to be authenticated AND have access to the 'tasklist' application.
 */
export const tasklistGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  return authService.getAuthentication().pipe(
    take(1),
    switchMap(auth => {
      if (!auth) {
                return of(router.createUrlTree(['/login']));
      }

      const canAccessTasklist = permissionService.canAccessTasklist();

      if (canAccessTasklist) {
                return of(true);
      }

            return of(router.createUrlTree(['/access-denied'], {
        queryParams: {
          returnUrl: state.url,
          requiredApp: 'tasklist'
        }
      }));
    })
  );
};
