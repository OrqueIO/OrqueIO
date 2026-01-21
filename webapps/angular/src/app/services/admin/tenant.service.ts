import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { Tenant, CreateTenantRequest } from '../../models/admin/tenant.model';
import { TenantQueryParams, PaginatedResponse } from '../../models/admin/query-params.model';

@Injectable({
  providedIn: 'root'
})
export class TenantService extends AdminService {
  private readonly tenantUrl = `${this.engineUrl}/tenant`;

  /**
   * Get list of tenants
   */
  getTenants(queryParams?: TenantQueryParams): Observable<Tenant[]> {
    const params = this.buildParams({ maxResults: 1000, ...queryParams });
    return this.get<Tenant[]>(this.tenantUrl, params);
  }

  /**
   * Get tenants count
   */
  getTenantsCount(queryParams?: Omit<TenantQueryParams, 'firstResult' | 'maxResults' | 'sortBy' | 'sortOrder'>): Observable<number> {
    const params = this.buildParams(queryParams);
    return this.get<{ count: number }>(`${this.tenantUrl}/count`, params).pipe(
      map(res => res.count)
    );
  }

  /**
   * Get tenant by ID
   */
  getTenant(tenantId: string): Observable<Tenant> {
    return this.get<Tenant>(`${this.tenantUrl}/${tenantId}`);
  }

  /**
   * Create new tenant
   */
  createTenant(tenant: CreateTenantRequest): Observable<void> {
    return this.post<void>(`${this.tenantUrl}/create`, tenant);
  }

  /**
   * Update tenant
   */
  updateTenant(tenantId: string, tenant: Partial<Tenant>): Observable<void> {
    return this.put<void>(`${this.tenantUrl}/${tenantId}`, tenant);
  }

  /**
   * Delete tenant
   */
  deleteTenant(tenantId: string): Observable<void> {
    return this.delete<void>(`${this.tenantUrl}/${tenantId}`);
  }

  /**
   * Add user to tenant
   */
  addUserToTenant(tenantId: string, userId: string): Observable<void> {
    return this.put<void>(`${this.tenantUrl}/${tenantId}/user-members/${userId}`, {});
  }

  /**
   * Remove user from tenant
   */
  removeUserFromTenant(tenantId: string, userId: string): Observable<void> {
    return this.delete<void>(`${this.tenantUrl}/${tenantId}/user-members/${userId}`);
  }

  /**
   * Add group to tenant
   */
  addGroupToTenant(tenantId: string, groupId: string): Observable<void> {
    return this.put<void>(`${this.tenantUrl}/${tenantId}/group-members/${groupId}`, {});
  }

  /**
   * Remove group from tenant
   */
  removeGroupFromTenant(tenantId: string, groupId: string): Observable<void> {
    return this.delete<void>(`${this.tenantUrl}/${tenantId}/group-members/${groupId}`);
  }

  /**
   * Get paginated tenants with count
   */
  getTenantsWithCount(queryParams?: TenantQueryParams): Observable<PaginatedResponse<Tenant>> {
    const countParams = { ...queryParams };
    delete countParams.firstResult;
    delete countParams.maxResults;
    delete countParams.sortBy;
    delete countParams.sortOrder;

    return new Observable(observer => {
      this.getTenantsCount(countParams).subscribe(total => {
        this.getTenants(queryParams).subscribe(data => {
          observer.next({ data, total });
          observer.complete();
        });
      });
    });
  }
}
