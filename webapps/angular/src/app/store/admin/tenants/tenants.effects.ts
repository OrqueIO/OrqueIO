import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TenantService } from '../../../services/admin/tenant.service';
import { NotificationsService } from '../../../services/notifications.service';
import * as TenantsActions from './tenants.actions';

@Injectable()
export class TenantsEffects {
  private actions$ = inject(Actions);
  private tenantService = inject(TenantService);
  private notifications = inject(NotificationsService);
  private router = inject(Router);

  loadTenants$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.loadTenants),
      switchMap(({ params }) =>
        this.tenantService.getTenantsWithCount(params).pipe(
          map(response => TenantsActions.loadTenantsSuccess({
            tenants: response.data,
            total: response.total
          })),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.tenants.loadError',
              message: 'Failed to load tenants'
            });
            return of(TenantsActions.loadTenantsFailure({ error }));
          })
        )
      )
    )
  );

  loadTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.loadTenant),
      switchMap(({ tenantId }) =>
        this.tenantService.getTenant(tenantId).pipe(
          map(tenant => TenantsActions.loadTenantSuccess({ tenant })),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.tenants.loadError',
              message: 'Failed to load tenant'
            });
            return of(TenantsActions.loadTenantFailure({ error }));
          })
        )
      )
    )
  );

  createTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.createTenant),
      switchMap(({ tenant }) =>
        this.tenantService.createTenant(tenant).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.tenants.tenantCreated',
              'Tenant created successfully'
            );
            return TenantsActions.createTenantSuccess({ tenant: { id: tenant.id, name: tenant.name } });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.tenants.createError',
              message: error?.error?.message || 'Failed to create tenant'
            });
            return of(TenantsActions.createTenantFailure({ error }));
          })
        )
      )
    )
  );

  updateTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.updateTenant),
      switchMap(({ tenantId, updates }) =>
        this.tenantService.updateTenant(tenantId, updates).pipe(
          switchMap(() => this.tenantService.getTenant(tenantId)),
          map(tenant => {
            this.notifications.addSuccess(
              'admin.tenants.tenantUpdated',
              'Tenant updated successfully'
            );
            return TenantsActions.updateTenantSuccess({ tenant });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.tenants.updateError',
              message: 'Failed to update tenant'
            });
            return of(TenantsActions.updateTenantFailure({ error }));
          })
        )
      )
    )
  );

  deleteTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.deleteTenant),
      switchMap(({ tenantId }) =>
        this.tenantService.deleteTenant(tenantId).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.tenants.tenantDeleted',
              'Tenant deleted successfully'
            );
            this.router.navigate(['/admin/tenants']);
            return TenantsActions.deleteTenantSuccess({ tenantId });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.tenants.deleteError',
              message: 'Failed to delete tenant'
            });
            return of(TenantsActions.deleteTenantFailure({ error }));
          })
        )
      )
    )
  );

  addUserToTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.addUserToTenant),
      switchMap(({ tenantId, userId }) =>
        this.tenantService.addUserToTenant(tenantId, userId).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.tenants.userAdded',
              'User added to tenant'
            );
            return TenantsActions.addUserToTenantSuccess({ tenantId, userId });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.tenants.userAddError',
              message: 'Failed to add user to tenant'
            });
            return of(TenantsActions.addUserToTenantFailure({ error }));
          })
        )
      )
    )
  );

  removeUserFromTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.removeUserFromTenant),
      switchMap(({ tenantId, userId }) =>
        this.tenantService.removeUserFromTenant(tenantId, userId).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.tenants.userRemoved',
              'User removed from tenant'
            );
            return TenantsActions.removeUserFromTenantSuccess({ tenantId, userId });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.tenants.userRemoveError',
              message: 'Failed to remove user from tenant'
            });
            return of(TenantsActions.removeUserFromTenantFailure({ error }));
          })
        )
      )
    )
  );

  addGroupToTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.addGroupToTenant),
      switchMap(({ tenantId, groupId }) =>
        this.tenantService.addGroupToTenant(tenantId, groupId).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.tenants.groupAdded',
              'Group added to tenant'
            );
            return TenantsActions.addGroupToTenantSuccess({ tenantId, groupId });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.tenants.groupAddError',
              message: 'Failed to add group to tenant'
            });
            return of(TenantsActions.addGroupToTenantFailure({ error }));
          })
        )
      )
    )
  );

  removeGroupFromTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.removeGroupFromTenant),
      switchMap(({ tenantId, groupId }) =>
        this.tenantService.removeGroupFromTenant(tenantId, groupId).pipe(
          map(() => {
            this.notifications.addSuccess(
              'admin.tenants.groupRemoved',
              'Group removed from tenant'
            );
            return TenantsActions.removeGroupFromTenantSuccess({ tenantId, groupId });
          }),
          catchError(error => {
            this.notifications.addError({
              status: 'admin.tenants.groupRemoveError',
              message: 'Failed to remove group from tenant'
            });
            return of(TenantsActions.removeGroupFromTenantFailure({ error }));
          })
        )
      )
    )
  );
}
