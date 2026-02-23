import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { Group, CreateGroupRequest } from '../../models/admin/group.model';
import { GroupQueryParams, PaginatedResponse } from '../../models/admin/query-params.model';

@Injectable({
  providedIn: 'root'
})
export class GroupService extends AdminService {
  private readonly groupUrl = `${this.engineUrl}/group`;

  /**
   * Encode group ID for URL (handles special characters)
   */
  private encodeGroupId(groupId: string): string {
    return encodeURIComponent(groupId);
  }

  /**
   * Get list of groups
   * Includes LDAP fallback: if sorting fails, retry without sort params
   */
  getGroups(queryParams?: GroupQueryParams): Observable<Group[]> {
    const params = this.buildParams({ maxResults: 1000, ...queryParams });
    return this.get<Group[]>(this.groupUrl, params).pipe(
      catchError(error => {
        // LDAP fallback: if sorting fails (often with LDAP), retry without sort params
        if (queryParams?.sortBy || queryParams?.sortOrder) {
          const fallbackParams = { ...queryParams };
          delete fallbackParams.sortBy;
          delete fallbackParams.sortOrder;
          const paramsWithoutSort = this.buildParams({ maxResults: 1000, ...fallbackParams });
          return this.get<Group[]>(this.groupUrl, paramsWithoutSort);
        }
        throw error;
      })
    );
  }

  /**
   * Get groups count
   */
  getGroupsCount(queryParams?: Omit<GroupQueryParams, 'firstResult' | 'maxResults' | 'sortBy' | 'sortOrder'>): Observable<number> {
    const params = this.buildParams(queryParams);
    return this.get<{ count: number }>(`${this.groupUrl}/count`, params).pipe(
      map(res => res.count)
    );
  }

  /**
   * Get group by ID
   */
  getGroup(groupId: string): Observable<Group> {
    return this.get<Group>(`${this.groupUrl}/${this.encodeGroupId(groupId)}`);
  }

  /**
   * Create new group
   */
  createGroup(group: CreateGroupRequest): Observable<void> {
    return this.post<void>(`${this.groupUrl}/create`, group);
  }

  /**
   * Update group
   */
  updateGroup(groupId: string, group: Partial<Group>): Observable<void> {
    return this.put<void>(`${this.groupUrl}/${this.encodeGroupId(groupId)}`, group);
  }

  /**
   * Delete group
   */
  deleteGroup(groupId: string): Observable<void> {
    return this.delete<void>(`${this.groupUrl}/${this.encodeGroupId(groupId)}`);
  }

  /**
   * Add user to group
   */
  addUserToGroup(groupId: string, userId: string): Observable<void> {
    return this.put<void>(`${this.groupUrl}/${this.encodeGroupId(groupId)}/members/${encodeURIComponent(userId)}`, {});
  }

  /**
   * Remove user from group
   */
  removeUserFromGroup(groupId: string, userId: string): Observable<void> {
    return this.delete<void>(`${this.groupUrl}/${this.encodeGroupId(groupId)}/members/${encodeURIComponent(userId)}`);
  }

  /**
   * Get paginated groups with count
   */
  getGroupsWithCount(queryParams?: GroupQueryParams): Observable<PaginatedResponse<Group>> {
    const countParams = { ...queryParams };
    delete countParams.firstResult;
    delete countParams.maxResults;
    delete countParams.sortBy;
    delete countParams.sortOrder;

    return new Observable(observer => {
      this.getGroupsCount(countParams).subscribe(total => {
        this.getGroups(queryParams).subscribe(data => {
          observer.next({ data, total });
          observer.complete();
        });
      });
    });
  }
}
