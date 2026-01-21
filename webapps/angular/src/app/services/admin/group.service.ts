import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { Group, CreateGroupRequest } from '../../models/admin/group.model';
import { GroupQueryParams, PaginatedResponse } from '../../models/admin/query-params.model';

@Injectable({
  providedIn: 'root'
})
export class GroupService extends AdminService {
  private readonly groupUrl = `${this.engineUrl}/group`;

  /**
   * Get list of groups
   */
  getGroups(queryParams?: GroupQueryParams): Observable<Group[]> {
    const params = this.buildParams({ maxResults: 1000, ...queryParams });
    return this.get<Group[]>(this.groupUrl, params);
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
    return this.get<Group>(`${this.groupUrl}/${groupId}`);
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
    return this.put<void>(`${this.groupUrl}/${groupId}`, group);
  }

  /**
   * Delete group
   */
  deleteGroup(groupId: string): Observable<void> {
    return this.delete<void>(`${this.groupUrl}/${groupId}`);
  }

  /**
   * Add user to group
   */
  addUserToGroup(groupId: string, userId: string): Observable<void> {
    return this.put<void>(`${this.groupUrl}/${groupId}/members/${userId}`, {});
  }

  /**
   * Remove user from group
   */
  removeUserFromGroup(groupId: string, userId: string): Observable<void> {
    return this.delete<void>(`${this.groupUrl}/${groupId}/members/${userId}`);
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
