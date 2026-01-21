import { createAction, props } from '@ngrx/store';
import {
  Authorization,
  CreateAuthorizationRequest,
  UpdateAuthorizationRequest,
  AuthorizationQueryParams,
  ResourceType
} from '../../../models/admin/authorization.model';

// Load Authorizations
export const loadAuthorizations = createAction(
  '[Authorizations] Load Authorizations',
  props<{ params?: AuthorizationQueryParams }>()
);

export const loadAuthorizationsSuccess = createAction(
  '[Authorizations] Load Authorizations Success',
  props<{ authorizations: Authorization[]; total: number }>()
);

export const loadAuthorizationsFailure = createAction(
  '[Authorizations] Load Authorizations Failure',
  props<{ error: any }>()
);

// Create Authorization
export const createAuthorization = createAction(
  '[Authorizations] Create Authorization',
  props<{ authorization: CreateAuthorizationRequest }>()
);

export const createAuthorizationSuccess = createAction(
  '[Authorizations] Create Authorization Success',
  props<{ authorization: Authorization }>()
);

export const createAuthorizationFailure = createAction(
  '[Authorizations] Create Authorization Failure',
  props<{ error: any }>()
);

// Update Authorization
export const updateAuthorization = createAction(
  '[Authorizations] Update Authorization',
  props<{ authorizationId: string; updates: UpdateAuthorizationRequest }>()
);

export const updateAuthorizationSuccess = createAction(
  '[Authorizations] Update Authorization Success',
  props<{ authorization: Authorization }>()
);

export const updateAuthorizationFailure = createAction(
  '[Authorizations] Update Authorization Failure',
  props<{ error: any }>()
);

// Delete Authorization
export const deleteAuthorization = createAction(
  '[Authorizations] Delete Authorization',
  props<{ authorizationId: string }>()
);

export const deleteAuthorizationSuccess = createAction(
  '[Authorizations] Delete Authorization Success',
  props<{ authorizationId: string }>()
);

export const deleteAuthorizationFailure = createAction(
  '[Authorizations] Delete Authorization Failure',
  props<{ error: any }>()
);

// Set Selected Resource Type
export const setSelectedResourceType = createAction(
  '[Authorizations] Set Selected Resource Type',
  props<{ resourceType: ResourceType }>()
);

// Set Query Params
export const setAuthorizationsQueryParams = createAction(
  '[Authorizations] Set Query Params',
  props<{ params: AuthorizationQueryParams }>()
);

// Clear Authorizations
export const clearAuthorizations = createAction(
  '[Authorizations] Clear Authorizations'
);
