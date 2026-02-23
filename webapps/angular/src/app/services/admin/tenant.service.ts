import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { Tenant, CreateTenantRequest } from '../../models/admin/tenant.model';
import { TenantQueryParams, PaginatedResponse } from '../../models/admin/query-params.model';

@Injectable({
  providedIn: 'root'
})
export class TenantService extends AdminService {
  private readonly tenantUrl = `${this.engineUrl}/tenant`;

  /**
   * Encode tenant ID for URL (handles special characters)
   */
  private encodeTenantId(tenantId: string): string {
    return encodeURIComponent(tenantId);
  }

  /**
   * Get list of tenants
   * Includes LDAP fallback: if sorting fails, retry without sort params
   */
  getTenants(queryParams?: TenantQueryParams): Observable<Tenant[]> {
    const params = this.buildParams({ maxResults: 1000, ...queryParams });
    return this.get<Tenant[]>(this.tenantUrl, params).pipe(
      catchError(error => {
        // LDAP fallback: if sorting fails (often with LDAP), retry without sort params
        if (queryParams?.sortBy || queryParams?.sortOrder) {
          const fallbackParams = { ...queryParams };
          delete fallbackParams.sortBy;
          delete fallbackParams.sortOrder;
          const paramsWithoutSort = this.buildParams({ maxResults: 1000, ...fallbackParams });
          return this.get<Tenant[]>(this.tenantUrl, paramsWithoutSort);
        }
        throw error;
      })
    );
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
    return this.get<Tenant>(`${this.tenantUrl}/${this.encodeTenantId(tenantId)}`);
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
    return this.put<void>(`${this.tenantUrl}/${this.encodeTenantId(tenantId)}`, tenant);
  }

  /**
   * Delete tenant
   */
  deleteTenant(tenantId: string): Observable<void> {
    return this.delete<void>(`${this.tenantUrl}/${this.encodeTenantId(tenantId)}`);
  }

  /**
   * Add user to tenant
   */
  addUserToTenant(tenantId: string, userId: string): Observable<void> {
    return this.put<void>(`${this.tenantUrl}/${this.encodeTenantId(tenantId)}/user-members/${encodeURIComponent(userId)}`, {});
  }

  /**
   * Remove user from tenant
   */
  removeUserFromTenant(tenantId: string, userId: string): Observable<void> {
    return this.delete<void>(`${this.tenantUrl}/${this.encodeTenantId(tenantId)}/user-members/${encodeURIComponent(userId)}`);
  }

  /**
   * Add group to tenant
   */
  addGroupToTenant(tenantId: string, groupId: string): Observable<void> {
    return this.put<void>(`${this.tenantUrl}/${this.encodeTenantId(tenantId)}/group-members/${encodeURIComponent(groupId)}`, {});
  }

  /**
   * Remove group from tenant
   */
  removeGroupFromTenant(tenantId: string, groupId: string): Observable<void> {
    return this.delete<void>(`${this.tenantUrl}/${this.encodeTenantId(tenantId)}/group-members/${encodeURIComponent(groupId)}`);
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
