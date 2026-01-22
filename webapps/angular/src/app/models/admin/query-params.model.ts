export interface QueryParams {
  firstResult?: number;
  maxResults?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserQueryParams extends QueryParams {
  id?: string;
  idLike?: string;
  firstName?: string;
  firstNameLike?: string;
  lastName?: string;
  lastNameLike?: string;
  email?: string;
  emailLike?: string;
  memberOfGroup?: string;
  memberOfTenant?: string;
}

export interface GroupQueryParams extends QueryParams {
  id?: string;
  idLike?: string;
  name?: string;
  nameLike?: string;
  type?: string;
  typeLike?: string;
  member?: string;
  memberOfTenant?: string;
}

export interface TenantQueryParams extends QueryParams {
  id?: string;
  idLike?: string;
  name?: string;
  nameLike?: string;
  userMember?: string;
  groupMember?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
