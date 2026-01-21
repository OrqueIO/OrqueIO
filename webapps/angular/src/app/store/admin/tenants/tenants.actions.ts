import { createAction, props } from '@ngrx/store';
import { Tenant, CreateTenantRequest } from '../../../models/admin/tenant.model';
import { TenantQueryParams } from '../../../models/admin/query-params.model';

// Load Tenants
export const loadTenants = createAction(
  '[Tenants] Load Tenants',
  props<{ params?: TenantQueryParams }>()
);

export const loadTenantsSuccess = createAction(
  '[Tenants] Load Tenants Success',
  props<{ tenants: Tenant[]; total: number }>()
);

export const loadTenantsFailure = createAction(
  '[Tenants] Load Tenants Failure',
  props<{ error: any }>()
);

// Load Tenant Detail
export const loadTenant = createAction(
  '[Tenants] Load Tenant',
  props<{ tenantId: string }>()
);

export const loadTenantSuccess = createAction(
  '[Tenants] Load Tenant Success',
  props<{ tenant: Tenant }>()
);

export const loadTenantFailure = createAction(
  '[Tenants] Load Tenant Failure',
  props<{ error: any }>()
);

// Create Tenant
export const createTenant = createAction(
  '[Tenants] Create Tenant',
  props<{ tenant: CreateTenantRequest }>()
);

export const createTenantSuccess = createAction(
  '[Tenants] Create Tenant Success',
  props<{ tenant: Tenant }>()
);

export const createTenantFailure = createAction(
  '[Tenants] Create Tenant Failure',
  props<{ error: any }>()
);

// Update Tenant
export const updateTenant = createAction(
  '[Tenants] Update Tenant',
  props<{ tenantId: string; updates: Partial<Tenant> }>()
);

export const updateTenantSuccess = createAction(
  '[Tenants] Update Tenant Success',
  props<{ tenant: Tenant }>()
);

export const updateTenantFailure = createAction(
  '[Tenants] Update Tenant Failure',
  props<{ error: any }>()
);

// Delete Tenant
export const deleteTenant = createAction(
  '[Tenants] Delete Tenant',
  props<{ tenantId: string }>()
);

export const deleteTenantSuccess = createAction(
  '[Tenants] Delete Tenant Success',
  props<{ tenantId: string }>()
);

export const deleteTenantFailure = createAction(
  '[Tenants] Delete Tenant Failure',
  props<{ error: any }>()
);

// Set Query Params
export const setTenantsQueryParams = createAction(
  '[Tenants] Set Query Params',
  props<{ params: TenantQueryParams }>()
);

// Clear Selected Tenant
export const clearSelectedTenant = createAction(
  '[Tenants] Clear Selected Tenant'
);

// User Membership
export const addUserToTenant = createAction(
  '[Tenants] Add User To Tenant',
  props<{ tenantId: string; userId: string }>()
);

export const addUserToTenantSuccess = createAction(
  '[Tenants] Add User To Tenant Success',
  props<{ tenantId: string; userId: string }>()
);

export const addUserToTenantFailure = createAction(
  '[Tenants] Add User To Tenant Failure',
  props<{ error: any }>()
);

export const removeUserFromTenant = createAction(
  '[Tenants] Remove User From Tenant',
  props<{ tenantId: string; userId: string }>()
);

export const removeUserFromTenantSuccess = createAction(
  '[Tenants] Remove User From Tenant Success',
  props<{ tenantId: string; userId: string }>()
);

export const removeUserFromTenantFailure = createAction(
  '[Tenants] Remove User From Tenant Failure',
  props<{ error: any }>()
);

// Group Membership
export const addGroupToTenant = createAction(
  '[Tenants] Add Group To Tenant',
  props<{ tenantId: string; groupId: string }>()
);

export const addGroupToTenantSuccess = createAction(
  '[Tenants] Add Group To Tenant Success',
  props<{ tenantId: string; groupId: string }>()
);

export const addGroupToTenantFailure = createAction(
  '[Tenants] Add Group To Tenant Failure',
  props<{ error: any }>()
);

export const removeGroupFromTenant = createAction(
  '[Tenants] Remove Group From Tenant',
  props<{ tenantId: string; groupId: string }>()
);

export const removeGroupFromTenantSuccess = createAction(
  '[Tenants] Remove Group From Tenant Success',
  props<{ tenantId: string; groupId: string }>()
);

export const removeGroupFromTenantFailure = createAction(
  '[Tenants] Remove Group From Tenant Failure',
  props<{ error: any }>()
);
