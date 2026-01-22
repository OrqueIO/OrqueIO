import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators';
import { AuthorizationService } from '../../../services/admin/authorization.service';
import { NotificationsService } from '../../../services/notifications.service';
import { normalizeAuthorization } from '../../../models/admin/authorization.model';
import * as AuthorizationsActions from './authorizations.actions';
import { selectAuthorizationsQueryParams } from './authorizations.selectors';

@Injectable()
export class AuthorizationsEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private authorizationService = inject(AuthorizationService);
  private notifications = inject(NotificationsService);

  loadAuthorizations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthorizationsActions.loadAuthorizations),
      withLatestFrom(this.store.select(selectAuthorizationsQueryParams)),
      switchMap(([{ params }, storeParams]) => {
        const queryParams = params || storeParams;
        return this.authorizationService.getAuthorizationsWithCount(queryParams).pipe(
          map(response => AuthorizationsActions.loadAuthorizationsSuccess({
            authorizations: response.data.map(normalizeAuthorization),
            total: response.total
          })),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.authorizations.loadError',
              message: 'Failed to load authorizations'
            });
            return of(AuthorizationsActions.loadAuthorizationsFailure({ error }));
          })
        );
      })
    )
  );

  createAuthorization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthorizationsActions.createAuthorization),
      switchMap(({ authorization }) =>
        this.authorizationService.createAuthorization(authorization).pipe(
          map(createdAuth => {
            this.notifications.addSuccess(
              'admin.authorizations.created',
              'Authorization created successfully'
            );
            return AuthorizationsActions.createAuthorizationSuccess({ authorization: normalizeAuthorization(createdAuth) });
          }),
          catchError(error => {
            // Check for duplicate authorization error
            const errorMessage = error?.error?.message || error?.message || '';
            const isDuplicate = errorMessage.includes('Unique index') ||
                               errorMessage.includes('primary key violation') ||
                               error?.status === 500 && errorMessage.includes('ACT_UNIQ_AUTH');

            this.notifications.addError({
              status: isDuplicate ? 'admin.authorizations.duplicate' : 'admin.authorizations.createError',
              message: isDuplicate
                ? 'An authorization with this combination already exists'
                : 'Failed to create authorization'
            });
            return of(AuthorizationsActions.createAuthorizationFailure({ error }));
          })
        )
      )
    )
  );

  updateAuthorization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthorizationsActions.updateAuthorization),
      switchMap(({ authorizationId, updates }) =>
        this.authorizationService.updateAuthorization(authorizationId, updates).pipe(
          switchMap(() => this.authorizationService.getAuthorization(authorizationId)),
          map(authorization => {
            this.notifications.addSuccess(
              'admin.authorizations.updated',
              'Authorization updated successfully'
            );
            return AuthorizationsActions.updateAuthorizationSuccess({ authorization: normalizeAuthorization(authorization) });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.authorizations.updateError',
              message: 'Failed to update authorization'
            });
            return of(AuthorizationsActions.updateAuthorizationFailure({ error }));
          })
        )
      )
    )
  );

  deleteAuthorization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthorizationsActions.deleteAuthorization),
      switchMap(({ authorizationId }) =>
        this.authorizationService.deleteAuthorization(authorizationId).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.authorizations.deleted',
              'Authorization deleted successfully'
            );
            return AuthorizationsActions.deleteAuthorizationSuccess({ authorizationId });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.authorizations.deleteError',
              message: 'Failed to delete authorization'
            });
            return of(AuthorizationsActions.deleteAuthorizationFailure({ error }));
          })
        )
      )
    )
  );

  // Reload authorizations when resource type changes
  setSelectedResourceType$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthorizationsActions.setSelectedResourceType),
      map(() => AuthorizationsActions.loadAuthorizations({}))
    )
  );
}
