import { createAction, props } from '@ngrx/store';
import { User, UserProfile, CreateUserRequest, UserCredentials } from '../../../models/admin/user.model';
import { UserQueryParams } from '../../../models/admin/query-params.model';

// Load Users
export const loadUsers = createAction(
  '[Users] Load Users',
  props<{ params?: UserQueryParams }>()
);

export const loadUsersSuccess = createAction(
  '[Users] Load Users Success',
  props<{ users: User[]; total: number }>()
);

export const loadUsersFailure = createAction(
  '[Users] Load Users Failure',
  props<{ error: any }>()
);

// Load User Detail
export const loadUser = createAction(
  '[Users] Load User',
  props<{ userId: string }>()
);

export const loadUserSuccess = createAction(
  '[Users] Load User Success',
  props<{ user: UserProfile }>()
);

export const loadUserFailure = createAction(
  '[Users] Load User Failure',
  props<{ error: any }>()
);

// Create User
export const createUser = createAction(
  '[Users] Create User',
  props<{ user: CreateUserRequest }>()
);

export const createUserSuccess = createAction(
  '[Users] Create User Success',
  props<{ user: User }>()
);

export const createUserFailure = createAction(
  '[Users] Create User Failure',
  props<{ error: any }>()
);

// Update User
export const updateUser = createAction(
  '[Users] Update User',
  props<{ userId: string; updates: Partial<UserProfile> }>()
);

export const updateUserSuccess = createAction(
  '[Users] Update User Success',
  props<{ user: UserProfile }>()
);

export const updateUserFailure = createAction(
  '[Users] Update User Failure',
  props<{ error: any }>()
);

// Update User Credentials
export const updateUserCredentials = createAction(
  '[Users] Update User Credentials',
  props<{ userId: string; credentials: UserCredentials }>()
);

export const updateUserCredentialsSuccess = createAction(
  '[Users] Update User Credentials Success'
);

export const updateUserCredentialsFailure = createAction(
  '[Users] Update User Credentials Failure',
  props<{ error: any }>()
);

// Delete User
export const deleteUser = createAction(
  '[Users] Delete User',
  props<{ userId: string }>()
);

export const deleteUserSuccess = createAction(
  '[Users] Delete User Success',
  props<{ userId: string }>()
);

export const deleteUserFailure = createAction(
  '[Users] Delete User Failure',
  props<{ error: any }>()
);

// Set Query Params
export const setUsersQueryParams = createAction(
  '[Users] Set Query Params',
  props<{ params: UserQueryParams }>()
);

// Clear Selected User
export const clearSelectedUser = createAction(
  '[Users] Clear Selected User'
);
