import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { User, UserProfile, UserCredentials, CreateUserRequest } from '../../models/admin/user.model';
import { UserQueryParams, PaginatedResponse } from '../../models/admin/query-params.model';

@Injectable({
  providedIn: 'root'
})
export class UserService extends AdminService {
  private readonly userUrl = `${this.engineUrl}/user`;

  /**
   * Get list of users with pagination
   * Includes LDAP fallback: if sorting fails, retry without sort params
   */
  getUsers(queryParams?: UserQueryParams): Observable<User[]> {
    const params = this.buildParams({ maxResults: 1000, ...queryParams });
    return this.get<User[]>(this.userUrl, params).pipe(
      catchError(error => {
        // LDAP fallback: if sorting fails (often with LDAP), retry without sort params
        if (queryParams?.sortBy || queryParams?.sortOrder) {
          const fallbackParams = { ...queryParams };
          delete fallbackParams.sortBy;
          delete fallbackParams.sortOrder;
          const paramsWithoutSort = this.buildParams({ maxResults: 1000, ...fallbackParams });
          return this.get<User[]>(this.userUrl, paramsWithoutSort);
        }
        throw error;
      })
    );
  }

  /**
   * Get users count
   */
  getUsersCount(queryParams?: Omit<UserQueryParams, 'firstResult' | 'maxResults' | 'sortBy' | 'sortOrder'>): Observable<number> {
    const params = this.buildParams(queryParams);
    return this.get<{ count: number }>(`${this.userUrl}/count`, params).pipe(
      map(res => res.count)
    );
  }

  /**
   * Encode user ID for URL (handles special characters)
   */
  private encodeUserId(userId: string): string {
    return encodeURIComponent(userId);
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): Observable<UserProfile> {
    return this.get<UserProfile>(`${this.userUrl}/${this.encodeUserId(userId)}/profile`);
  }

  /**
   * Create new user
   */
  createUser(user: CreateUserRequest): Observable<void> {
    return this.post<void>(`${this.userUrl}/create`, {
      profile: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      credentials: {
        password: user.password
      }
    });
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Observable<void> {
    return this.put<void>(`${this.userUrl}/${this.encodeUserId(userId)}/profile`, profile);
  }

  /**
   * Update user credentials
   */
  updateUserCredentials(userId: string, credentials: UserCredentials): Observable<void> {
    return this.put<void>(`${this.userUrl}/${this.encodeUserId(userId)}/credentials`, credentials);
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): Observable<void> {
    return this.delete<void>(`${this.userUrl}/${this.encodeUserId(userId)}`);
  }

  /**
   * Unlock user
   */
  unlockUser(userId: string): Observable<void> {
    return this.post<void>(`${this.userUrl}/${this.encodeUserId(userId)}/unlock`, {});
  }

  /**
   * Get paginated users with count
   */
  getUsersWithCount(queryParams?: UserQueryParams): Observable<PaginatedResponse<User>> {
    const countParams = { ...queryParams };
    delete countParams.firstResult;
    delete countParams.maxResults;
    delete countParams.sortBy;
    delete countParams.sortOrder;

    return new Observable(observer => {
      this.getUsersCount(countParams).subscribe(total => {
        this.getUsers(queryParams).subscribe(data => {
          observer.next({ data, total });
          observer.complete();
        });
      });
    });
  }
}
