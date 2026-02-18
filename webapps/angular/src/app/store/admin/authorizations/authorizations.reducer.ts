import { createReducer, on } from '@ngrx/store';
import { authorizationsAdapter, initialAuthorizationsState } from './authorizations.state';
import * as AuthorizationsActions from './authorizations.actions';

export const authorizationsReducer = createReducer(
  initialAuthorizationsState,

  on(AuthorizationsActions.loadAuthorizations, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AuthorizationsActions.loadAuthorizationsSuccess, (state, { authorizations, total }) =>
    authorizationsAdapter.setAll(authorizations, {
      ...state,
      total,
      loading: false,
      error: null
    })
  ),

  on(AuthorizationsActions.loadAuthorizationsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(AuthorizationsActions.createAuthorization, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AuthorizationsActions.createAuthorizationSuccess, (state, { authorization }) =>
    authorizationsAdapter.addOne(authorization, {
      ...state,
      total: state.total + 1,
      loading: false,
      error: null
    })
  ),

  on(AuthorizationsActions.createAuthorizationFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(AuthorizationsActions.updateAuthorization, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AuthorizationsActions.updateAuthorizationSuccess, (state, { authorization }) =>
    authorizationsAdapter.updateOne(
      { id: authorization.id!, changes: authorization },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(AuthorizationsActions.updateAuthorizationFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(AuthorizationsActions.deleteAuthorization, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AuthorizationsActions.deleteAuthorizationSuccess, (state, { authorizationId }) =>
    authorizationsAdapter.removeOne(authorizationId, {
      ...state,
      total: state.total - 1,
      loading: false,
      error: null
    })
  ),

  on(AuthorizationsActions.deleteAuthorizationFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(AuthorizationsActions.setSelectedResourceType, (state, { resourceType }) => ({
    ...state,
    selectedResourceType: resourceType,
    queryParams: {
      ...state.queryParams,
      resourceType,
      firstResult: 0
    }
  })),

  on(AuthorizationsActions.setAuthorizationsQueryParams, (state, { params }) => ({
    ...state,
    queryParams: params
  })),

  on(AuthorizationsActions.clearAuthorizations, (state) =>
    authorizationsAdapter.removeAll({
      ...state,
      total: 0,
      error: null
    })
  )
);
