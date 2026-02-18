export interface Tenant {
  id: string;
  name?: string;
}

export interface CreateTenantRequest {
  id: string;
  name?: string;
}

export interface TenantMembership {
  userId?: string;
  groupId?: string;
  tenantId: string;
}
