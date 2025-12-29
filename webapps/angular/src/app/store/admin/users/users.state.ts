import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { User, UserProfile } from '../../../models/admin/user.model';
import { UserQueryParams } from '../../../models/admin/query-params.model';

export interface UsersState extends EntityState<User> {
  selectedUser: UserProfile | null;
  queryParams: UserQueryParams;
  total: number;
  loading: boolean;
  error: any;
}

export const usersAdapter: EntityAdapter<User> = createEntityAdapter<User>({
  selectId: (user: User) => user.id
});

export const initialUsersState: UsersState = usersAdapter.getInitialState({
  selectedUser: null,
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
