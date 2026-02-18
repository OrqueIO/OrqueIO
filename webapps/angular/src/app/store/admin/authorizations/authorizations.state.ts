import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Authorization, AuthorizationQueryParams, RESOURCE_TYPE } from '../../../models/admin/authorization.model';

export interface AuthorizationsState extends EntityState<Authorization> {
  selectedResourceType: number;
  queryParams: AuthorizationQueryParams;
  total: number;
  loading: boolean;
  error: any;
}

export const authorizationsAdapter: EntityAdapter<Authorization> = createEntityAdapter<Authorization>({
  selectId: (authorization: Authorization) => authorization.id!
});

export const initialAuthorizationsState: AuthorizationsState = authorizationsAdapter.getInitialState({
  selectedResourceType: RESOURCE_TYPE.APPLICATION,
  queryParams: {
    firstResult: 0,
    maxResults: 25,
    sortBy: 'resourceId',
    sortOrder: 'asc' as const,
    resourceType: RESOURCE_TYPE.APPLICATION
  },
  total: 0,
  loading: false,
  error: null
});
