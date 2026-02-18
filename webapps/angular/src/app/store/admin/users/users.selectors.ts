import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UsersState, usersAdapter } from './users.state';

export const selectUsersState = createFeatureSelector<UsersState>('users');

export const {
  selectIds: selectUserIds,
  selectEntities: selectUserEntities,
  selectAll: selectAllUsers,
  selectTotal: selectUsersCount
} = usersAdapter.getSelectors(selectUsersState);

export const selectUsersLoading = createSelector(
  selectUsersState,
  (state) => state.loading
);

export const selectUsersError = createSelector(
  selectUsersState,
  (state) => state.error
);

export const selectUsersTotal = createSelector(
  selectUsersState,
  (state) => state.total
);

export const selectUsersQueryParams = createSelector(
  selectUsersState,
  (state) => state.queryParams
);

export const selectSelectedUser = createSelector(
  selectUsersState,
  (state) => state.selectedUser
);

export const selectUserById = (id: string) => createSelector(
  selectUserEntities,
  (entities) => entities[id]
);
