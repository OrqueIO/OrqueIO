import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdminService } from './admin.service';
import {
  Authorization,
  CreateAuthorizationRequest,
  UpdateAuthorizationRequest,
  CheckAuthorizationParams,
  CheckAuthorizationResponse,
  AuthorizationQueryParams
} from '../../models/admin/authorization.model';
import { PaginatedResponse } from '../../models/admin/query-params.model';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService extends AdminService {
  private readonly authorizationUrl = `${this.engineUrl}/authorization`;

  /**
   * Get list of authorizations with pagination and filtering
   */
  getAuthorizations(queryParams?: AuthorizationQueryParams): Observable<Authorization[]> {
    const params = this.buildParams(queryParams);
    return this.get<Authorization[]>(this.authorizationUrl, params);
  }

  /**
   * Get authorizations count
   */
  getAuthorizationsCount(
    queryParams?: Omit<AuthorizationQueryParams, 'firstResult' | 'maxResults' | 'sortBy' | 'sortOrder'>
  ): Observable<number> {
    const params = this.buildParams(queryParams);
    return this.get<{ count: number }>(`${this.authorizationUrl}/count`, params).pipe(
      map(res => res.count)
    );
  }

  /**
   * Get a single authorization by ID
   */
  getAuthorization(authorizationId: string): Observable<Authorization> {
    return this.get<Authorization>(`${this.authorizationUrl}/${authorizationId}`);
  }

  /**
   * Create a new authorization
   */
  createAuthorization(authorization: CreateAuthorizationRequest): Observable<Authorization> {
    return this.post<Authorization>(`${this.authorizationUrl}/create`, authorization);
  }

  /**
   * Update an existing authorization
   */
  updateAuthorization(authorizationId: string, authorization: UpdateAuthorizationRequest): Observable<void> {
    return this.put<void>(`${this.authorizationUrl}/${authorizationId}`, authorization);
  }

  /**
   * Delete an authorization
   */
  deleteAuthorization(authorizationId: string): Observable<void> {
    return this.delete<void>(`${this.authorizationUrl}/${authorizationId}`);
  }

  /**
   * Check if the current user has a specific permission
   */
  checkAuthorization(params: CheckAuthorizationParams): Observable<CheckAuthorizationResponse> {
    const httpParams = this.buildParams(params);
    return this.get<CheckAuthorizationResponse>(`${this.authorizationUrl}/check`, httpParams);
  }

  /**
   * Get paginated authorizations with count
   */
  getAuthorizationsWithCount(queryParams?: AuthorizationQueryParams): Observable<PaginatedResponse<Authorization>> {
    const countParams = { ...queryParams };
    delete countParams.firstResult;
    delete countParams.maxResults;
    delete countParams.sortBy;
    delete countParams.sortOrder;

    return new Observable(observer => {
      this.getAuthorizationsCount(countParams).subscribe({
        next: total => {
          this.getAuthorizations(queryParams).subscribe({
            next: data => {
              observer.next({ data, total });
              observer.complete();
            },
            error: err => observer.error(err)
          });
        },
        error: err => observer.error(err)
      });
    });
  }
}
