import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthorizationsState, authorizationsAdapter } from './authorizations.state';

export const selectAuthorizationsState = createFeatureSelector<AuthorizationsState>('authorizations');

export const {
  selectIds: selectAuthorizationIds,
  selectEntities: selectAuthorizationEntities,
  selectAll: selectAllAuthorizations,
  selectTotal: selectAuthorizationsCount
} = authorizationsAdapter.getSelectors(selectAuthorizationsState);

export const selectAuthorizationsLoading = createSelector(
  selectAuthorizationsState,
  (state) => state.loading
);

export const selectAuthorizationsError = createSelector(
  selectAuthorizationsState,
  (state) => state.error
);

export const selectAuthorizationsTotal = createSelector(
  selectAuthorizationsState,
  (state) => state.total
);

export const selectAuthorizationsQueryParams = createSelector(
  selectAuthorizationsState,
  (state) => state.queryParams
);

export const selectSelectedResourceType = createSelector(
  selectAuthorizationsState,
  (state) => state.selectedResourceType
);

export const selectAuthorizationById = (id: string) => createSelector(
  selectAuthorizationEntities,
  (entities) => entities[id]
);
