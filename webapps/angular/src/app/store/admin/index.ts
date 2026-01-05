import { ActionReducerMap } from '@ngrx/store';
import { UsersState } from './users/users.state';
import { GroupsState } from './groups/groups.state';
import { TenantsState } from './tenants/tenants.state';
import { AuthorizationsState } from './authorizations/authorizations.state';
import { SystemState } from './system/system.state';
import { usersReducer } from './users/users.reducer';
import { groupsReducer } from './groups/groups.reducer';
import { tenantsReducer } from './tenants/tenants.reducer';
import { authorizationsReducer } from './authorizations/authorizations.reducer';
import { systemReducer } from './system/system.reducer';

export interface AdminState {
  users: UsersState;
  groups: GroupsState;
  tenants: TenantsState;
  authorizations: AuthorizationsState;
  system: SystemState;
}

export const adminReducers: ActionReducerMap<AdminState> = {
  users: usersReducer,
  groups: groupsReducer,
  tenants: tenantsReducer,
  authorizations: authorizationsReducer,
  system: systemReducer
};

// Export all actions
export * as UsersActions from './users/users.actions';
export * as GroupsActions from './groups/groups.actions';
export * as TenantsActions from './tenants/tenants.actions';
export * as AuthorizationsActions from './authorizations/authorizations.actions';
export * as SystemActions from './system/system.actions';

// Export all selectors
export * as UsersSelectors from './users/users.selectors';
export * as GroupsSelectors from './groups/groups.selectors';
export * as TenantsSelectors from './tenants/tenants.selectors';
export * as AuthorizationsSelectors from './authorizations/authorizations.selectors';
export * as SystemSelectors from './system/system.selectors';
