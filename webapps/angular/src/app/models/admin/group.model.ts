export interface Group {
  id: string;
  name?: string;
  type?: string;
}

export interface CreateGroupRequest {
  id: string;
  name?: string;
  type?: string;
}

export interface GroupMembership {
  userId: string;
  groupId: string;
}
