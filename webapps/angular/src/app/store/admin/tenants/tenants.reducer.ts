import { createReducer, on } from '@ngrx/store';
import { tenantsAdapter, initialTenantsState } from './tenants.state';
import * as TenantsActions from './tenants.actions';

export const tenantsReducer = createReducer(
  initialTenantsState,

  // Load Tenants
  on(TenantsActions.loadTenants, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TenantsActions.loadTenantsSuccess, (state, { tenants, total }) =>
    tenantsAdapter.setAll(tenants, {
      ...state,
      total,
      loading: false,
      error: null
    })
  ),

  on(TenantsActions.loadTenantsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Tenant Detail
  on(TenantsActions.loadTenant, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TenantsActions.loadTenantSuccess, (state, { tenant }) => ({
    ...state,
    selectedTenant: tenant,
    loading: false,
    error: null
  })),

  on(TenantsActions.loadTenantFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Tenant
  on(TenantsActions.createTenant, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TenantsActions.createTenantSuccess, (state, { tenant }) =>
    tenantsAdapter.addOne(tenant, {
      ...state,
      total: state.total + 1,
      loading: false,
      error: null
    })
  ),

  on(TenantsActions.createTenantFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Tenant
  on(TenantsActions.updateTenant, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TenantsActions.updateTenantSuccess, (state, { tenant }) =>
    tenantsAdapter.updateOne(
      { id: tenant.id, changes: tenant },
      {
        ...state,
        selectedTenant: tenant,
        loading: false,
        error: null
      }
    )
  ),

  on(TenantsActions.updateTenantFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete Tenant
  on(TenantsActions.deleteTenant, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TenantsActions.deleteTenantSuccess, (state, { tenantId }) =>
    tenantsAdapter.removeOne(tenantId, {
      ...state,
      total: state.total - 1,
      loading: false,
      error: null
    })
  ),

  on(TenantsActions.deleteTenantFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Set Query Params
  on(TenantsActions.setTenantsQueryParams, (state, { params }) => ({
    ...state,
    queryParams: params
  })),

  // Clear Selected Tenant
  on(TenantsActions.clearSelectedTenant, (state) => ({
    ...state,
    selectedTenant: null
  }))
);
