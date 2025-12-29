import { createAction, props } from '@ngrx/store';
import { Group, CreateGroupRequest } from '../../../models/admin/group.model';
import { GroupQueryParams } from '../../../models/admin/query-params.model';

// Load Groups
export const loadGroups = createAction(
  '[Groups] Load Groups',
  props<{ params?: GroupQueryParams }>()
);

export const loadGroupsSuccess = createAction(
  '[Groups] Load Groups Success',
  props<{ groups: Group[]; total: number }>()
);

export const loadGroupsFailure = createAction(
  '[Groups] Load Groups Failure',
  props<{ error: any }>()
);

// Load Group Detail
export const loadGroup = createAction(
  '[Groups] Load Group',
  props<{ groupId: string }>()
);

export const loadGroupSuccess = createAction(
  '[Groups] Load Group Success',
  props<{ group: Group }>()
);

export const loadGroupFailure = createAction(
  '[Groups] Load Group Failure',
  props<{ error: any }>()
);

// Create Group
export const createGroup = createAction(
  '[Groups] Create Group',
  props<{ group: CreateGroupRequest }>()
);

export const createGroupSuccess = createAction(
  '[Groups] Create Group Success',
  props<{ group: Group }>()
);

export const createGroupFailure = createAction(
  '[Groups] Create Group Failure',
  props<{ error: any }>()
);

// Update Group
export const updateGroup = createAction(
  '[Groups] Update Group',
  props<{ groupId: string; updates: Partial<Group> }>()
);

export const updateGroupSuccess = createAction(
  '[Groups] Update Group Success',
  props<{ group: Group }>()
);

export const updateGroupFailure = createAction(
  '[Groups] Update Group Failure',
  props<{ error: any }>()
);

// Delete Group
export const deleteGroup = createAction(
  '[Groups] Delete Group',
  props<{ groupId: string }>()
);

export const deleteGroupSuccess = createAction(
  '[Groups] Delete Group Success',
  props<{ groupId: string }>()
);

export const deleteGroupFailure = createAction(
  '[Groups] Delete Group Failure',
  props<{ error: any }>()
);

// Set Query Params
export const setGroupsQueryParams = createAction(
  '[Groups] Set Query Params',
  props<{ params: GroupQueryParams }>()
);

// Clear Selected Group
export const clearSelectedGroup = createAction(
  '[Groups] Clear Selected Group'
);
