/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { InitialUserService } from '../services/initial-user.service';

/**
 * Route guard that controls access to the setup page.
 *
 * The setup page should only be accessible when:
 * - No admin user has been created yet (setupAvailable = true)
 *
 * If setup is not available (admin already exists), redirects to login page.
 */
export const setupGuard: CanActivateFn = () => {
  const initialUserService = inject(InitialUserService);
  const router = inject(Router);

  return initialUserService.isSetupAvailable().pipe(
    map(isAvailable => {
      if (isAvailable) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};
