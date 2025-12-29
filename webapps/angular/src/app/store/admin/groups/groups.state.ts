import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Group } from '../../../models/admin/group.model';
import { GroupQueryParams } from '../../../models/admin/query-params.model';

export interface GroupsState extends EntityState<Group> {
  selectedGroup: Group | null;
  queryParams: GroupQueryParams;
  total: number;
  loading: boolean;
  error: any;
}

export const groupsAdapter: EntityAdapter<Group> = createEntityAdapter<Group>({
  selectId: (group: Group) => group.id
});

export const initialGroupsState: GroupsState = groupsAdapter.getInitialState({
  selectedGroup: null,
  queryParams: {
    firstResult: 0,
    maxResults: 50,
    sortBy: 'id',
    sortOrder: 'asc' as const
  },
  total: 0,
  loading: false,
  error: null
});
