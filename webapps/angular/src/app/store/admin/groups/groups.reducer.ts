import { createReducer, on } from '@ngrx/store';
import { groupsAdapter, initialGroupsState } from './groups.state';
import * as GroupsActions from './groups.actions';

export const groupsReducer = createReducer(
  initialGroupsState,

  // Load Groups
  on(GroupsActions.loadGroups, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(GroupsActions.loadGroupsSuccess, (state, { groups, total }) =>
    groupsAdapter.setAll(groups, {
      ...state,
      total,
      loading: false,
      error: null
    })
  ),

  on(GroupsActions.loadGroupsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Group Detail
  on(GroupsActions.loadGroup, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(GroupsActions.loadGroupSuccess, (state, { group }) => ({
    ...state,
    selectedGroup: group,
    loading: false,
    error: null
  })),

  on(GroupsActions.loadGroupFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Group
  on(GroupsActions.createGroup, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(GroupsActions.createGroupSuccess, (state, { group }) =>
    groupsAdapter.addOne(group, {
      ...state,
      total: state.total + 1,
      loading: false,
      error: null
    })
  ),

  on(GroupsActions.createGroupFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Group
  on(GroupsActions.updateGroup, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(GroupsActions.updateGroupSuccess, (state, { group }) =>
    groupsAdapter.updateOne(
      { id: group.id, changes: group },
      {
        ...state,
        selectedGroup: group,
        loading: false,
        error: null
      }
    )
  ),

  on(GroupsActions.updateGroupFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete Group
  on(GroupsActions.deleteGroup, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(GroupsActions.deleteGroupSuccess, (state, { groupId }) =>
    groupsAdapter.removeOne(groupId, {
      ...state,
      total: state.total - 1,
      loading: false,
      error: null
    })
  ),

  on(GroupsActions.deleteGroupFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Set Query Params
  on(GroupsActions.setGroupsQueryParams, (state, { params }) => ({
    ...state,
    queryParams: params
  })),

  // Clear Selected Group
  on(GroupsActions.clearSelectedGroup, (state) => ({
    ...state,
    selectedGroup: null
  }))
);
