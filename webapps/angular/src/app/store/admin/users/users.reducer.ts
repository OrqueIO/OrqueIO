import { createReducer, on } from '@ngrx/store';
import { usersAdapter, initialUsersState } from './users.state';
import * as UsersActions from './users.actions';

export const usersReducer = createReducer(
  initialUsersState,

  // Load Users
  on(UsersActions.loadUsers, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UsersActions.loadUsersSuccess, (state, { users, total }) =>
    usersAdapter.setAll(users, {
      ...state,
      total,
      loading: false,
      error: null
    })
  ),

  on(UsersActions.loadUsersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load User Detail
  on(UsersActions.loadUser, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UsersActions.loadUserSuccess, (state, { user }) => ({
    ...state,
    selectedUser: user,
    loading: false,
    error: null
  })),

  on(UsersActions.loadUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create User
  on(UsersActions.createUser, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UsersActions.createUserSuccess, (state, { user }) =>
    usersAdapter.addOne(user, {
      ...state,
      total: state.total + 1,
      loading: false,
      error: null
    })
  ),

  on(UsersActions.createUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update User
  on(UsersActions.updateUser, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UsersActions.updateUserSuccess, (state, { user }) =>
    usersAdapter.updateOne(
      { id: user.id, changes: user },
      {
        ...state,
        selectedUser: user,
        loading: false,
        error: null
      }
    )
  ),

  on(UsersActions.updateUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update User Credentials
  on(UsersActions.updateUserCredentials, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UsersActions.updateUserCredentialsSuccess, (state) => ({
    ...state,
    loading: false,
    error: null
  })),

  on(UsersActions.updateUserCredentialsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete User
  on(UsersActions.deleteUser, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UsersActions.deleteUserSuccess, (state, { userId }) =>
    usersAdapter.removeOne(userId, {
      ...state,
      total: state.total - 1,
      loading: false,
      error: null
    })
  ),

  on(UsersActions.deleteUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Set Query Params
  on(UsersActions.setUsersQueryParams, (state, { params }) => ({
    ...state,
    queryParams: params
  })),

  // Clear Selected User
  on(UsersActions.clearSelectedUser, (state) => ({
    ...state,
    selectedUser: null
  }))
);
