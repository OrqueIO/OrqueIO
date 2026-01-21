export interface QueryParams {
  firstResult?: number;
  maxResults?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserQueryParams extends QueryParams {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  memberOfGroup?: string;
  memberOfTenant?: string;
}

export interface GroupQueryParams extends QueryParams {
  id?: string;
  name?: string;
  type?: string;
  member?: string;
  memberOfTenant?: string;
}

export interface TenantQueryParams extends QueryParams {
  id?: string;
  name?: string;
  userMember?: string;
  groupMember?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
