import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Tenant } from '../../../models/admin/tenant.model';
import { TenantQueryParams } from '../../../models/admin/query-params.model';

export interface TenantsState extends EntityState<Tenant> {
  selectedTenant: Tenant | null;
  queryParams: TenantQueryParams;
  total: number;
  loading: boolean;
  error: any;
}

export const tenantsAdapter: EntityAdapter<Tenant> = createEntityAdapter<Tenant>({
  selectId: (tenant: Tenant) => tenant.id
});

export const initialTenantsState: TenantsState = tenantsAdapter.getInitialState({
  selectedTenant: null,
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
