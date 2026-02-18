import { createFeatureSelector, createSelector } from '@ngrx/store';
import { GroupsState, groupsAdapter } from './groups.state';

export const selectGroupsState = createFeatureSelector<GroupsState>('groups');

export const {
  selectIds: selectGroupIds,
  selectEntities: selectGroupEntities,
  selectAll: selectAllGroups,
  selectTotal: selectGroupsCount
} = groupsAdapter.getSelectors(selectGroupsState);

export const selectGroupsLoading = createSelector(
  selectGroupsState,
  (state) => state.loading
);

export const selectGroupsError = createSelector(
  selectGroupsState,
  (state) => state.error
);

export const selectGroupsTotal = createSelector(
  selectGroupsState,
  (state) => state.total
);

export const selectGroupsQueryParams = createSelector(
  selectGroupsState,
  (state) => state.queryParams
);

export const selectSelectedGroup = createSelector(
  selectGroupsState,
  (state) => state.selectedGroup
);

export const selectGroupById = (id: string) => createSelector(
  selectGroupEntities,
  (entities) => entities[id]
);
