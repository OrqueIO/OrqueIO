import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TenantsState, tenantsAdapter } from './tenants.state';

export const selectTenantsState = createFeatureSelector<TenantsState>('tenants');

export const {
  selectIds: selectTenantIds,
  selectEntities: selectTenantEntities,
  selectAll: selectAllTenants,
  selectTotal: selectTenantsCount
} = tenantsAdapter.getSelectors(selectTenantsState);

export const selectTenantsLoading = createSelector(
  selectTenantsState,
  (state) => state.loading
);

export const selectTenantsError = createSelector(
  selectTenantsState,
  (state) => state.error
);

export const selectTenantsTotal = createSelector(
  selectTenantsState,
  (state) => state.total
);

export const selectTenantsQueryParams = createSelector(
  selectTenantsState,
  (state) => state.queryParams
);

export const selectSelectedTenant = createSelector(
  selectTenantsState,
  (state) => state.selectedTenant
);

export const selectTenantById = (id: string) => createSelector(
  selectTenantEntities,
  (entities) => entities[id]
);
