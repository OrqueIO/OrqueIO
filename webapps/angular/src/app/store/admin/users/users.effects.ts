import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserService } from '../../../services/admin/user.service';
import { NotificationsService } from '../../../services/notifications.service';
import * as UsersActions from './users.actions';

@Injectable()
export class UsersEffects {
  private actions$ = inject(Actions);
  private userService = inject(UserService);
  private notifications = inject(NotificationsService);
  private router = inject(Router);

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.loadUsers),
      switchMap(({ params }) =>
        this.userService.getUsersWithCount(params).pipe(
          map(response => UsersActions.loadUsersSuccess({
            users: response.data,
            total: response.total
          })),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.users.loadError',
              message: 'Failed to load users'
            });
            return of(UsersActions.loadUsersFailure({ error }));
          })
        )
      )
    )
  );

  loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.loadUser),
      switchMap(({ userId }) =>
        this.userService.getUserProfile(userId).pipe(
          map(user => UsersActions.loadUserSuccess({ user })),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.users.loadError',
              message: 'Failed to load user'
            });
            return of(UsersActions.loadUserFailure({ error }));
          })
        )
      )
    )
  );

  createUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.createUser),
      switchMap(({ user }) =>
        this.userService.createUser(user).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.users.userCreated',
              'User created successfully'
            );
            return UsersActions.createUserSuccess({ user: { id: user.id } });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.users.createError',
              message: 'Failed to create user'
            });
            return of(UsersActions.createUserFailure({ error }));
          })
        )
      )
    )
  );

  updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.updateUser),
      switchMap(({ userId, updates }) =>
        this.userService.updateUserProfile(userId, updates).pipe(
          switchMap(() => this.userService.getUserProfile(userId)),
          map(user => {
            this.notifications.addSuccess(
              'admin.users.profileUpdated',
              'Profile updated successfully'
            );
            return UsersActions.updateUserSuccess({ user });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.users.updateError',
              message: 'Failed to update profile'
            });
            return of(UsersActions.updateUserFailure({ error }));
          })
        )
      )
    )
  );

  updateUserCredentials$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.updateUserCredentials),
      switchMap(({ userId, credentials }) =>
        this.userService.updateUserCredentials(userId, credentials).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.users.passwordUpdated',
              'Password updated successfully'
            );
            return UsersActions.updateUserCredentialsSuccess();
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.users.passwordUpdateError',
              message: 'Failed to update password'
            });
            return of(UsersActions.updateUserCredentialsFailure({ error }));
          })
        )
      )
    )
  );

  deleteUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.deleteUser),
      switchMap(({ userId }) =>
        this.userService.deleteUser(userId).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.users.userDeleted',
              'User deleted successfully'
            );
            this.router.navigate(['/admin/users']);
            return UsersActions.deleteUserSuccess({ userId });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.users.deleteError',
              message: 'Failed to delete user'
            });
            return of(UsersActions.deleteUserFailure({ error }));
          })
        )
      )
    )
  );
}
