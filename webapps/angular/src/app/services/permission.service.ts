import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, Subject, firstValueFrom, forkJoin } from 'rxjs';
import { map, catchError, tap, shareReplay, takeUntil } from 'rxjs/operators';
import { AuthService } from './auth';
import { RESOURCE_TYPE, ResourceType } from '../models/admin/authorization.model';

/**
 * Resource name mapping for API calls
 */
const RESOURCE_NAMES: Record<ResourceType, string> = {
  [RESOURCE_TYPE.APPLICATION]: 'application',
  [RESOURCE_TYPE.USER]: 'user',
  [RESOURCE_TYPE.GROUP]: 'group',
  [RESOURCE_TYPE.GROUP_MEMBERSHIP]: 'groupMembership',
  [RESOURCE_TYPE.AUTHORIZATION]: 'authorization',
  [RESOURCE_TYPE.FILTER]: 'filter',
  [RESOURCE_TYPE.PROCESS_DEFINITION]: 'processDefinition',
  [RESOURCE_TYPE.TASK]: 'task',
  [RESOURCE_TYPE.PROCESS_INSTANCE]: 'processInstance',
  [RESOURCE_TYPE.DEPLOYMENT]: 'deployment',
  [RESOURCE_TYPE.DECISION_DEFINITION]: 'decisionDefinition',
  [RESOURCE_TYPE.TENANT]: 'tenant',
  [RESOURCE_TYPE.TENANT_MEMBERSHIP]: 'tenantMembership',
  [RESOURCE_TYPE.BATCH]: 'batch',
  [RESOURCE_TYPE.DECISION_REQUIREMENTS_DEFINITION]: 'decisionRequirementsDefinition',
  [RESOURCE_TYPE.OPERATION_LOG]: 'operationLogCategory',
  [RESOURCE_TYPE.HISTORIC_TASK]: 'historicTask',
  [RESOURCE_TYPE.HISTORIC_PROCESS_INSTANCE]: 'historicProcessInstance',
  [RESOURCE_TYPE.SYSTEM]: 'system'
};

/**
 * Cache entry with TTL
 */
interface CacheEntry {
  result: boolean;
  timestamp: number;
}

/**
 * Permission check parameters
 */
export interface PermissionCheckParams {
  permission: string;
  resource: ResourceType | string;
  resourceId?: string;
}

/**
 * Bulk permission check result
 */
export interface BulkPermissionResult {
  [key: string]: boolean;
}

/**
 * PermissionService - Central service for checking and caching user permissions.
 *
 * This service provides:
 * - Permission checking against Camunda authorization API
 * - Result caching to minimize API calls
 * - Cache invalidation on session changes
 * - Bulk permission loading for better performance
 * - Observable-based reactive API
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionService implements OnDestroy {
  private readonly engineUrl = '/orqueio/api/engine/engine/default';
  private readonly authorizationUrl = `${this.engineUrl}/authorization`;

  // Permission cache with TTL
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Pending requests to avoid duplicate API calls
  private pendingRequests = new Map<string, Observable<boolean>>();

  // Observable for permission changes
  private permissionsChangedSubject = new Subject<void>();
  public permissionsChanged$ = this.permissionsChangedSubject.asObservable();

  // Loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Clear cache when authentication changes
    this.authService.authEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event.type === 'authentication.logout.success' ||
            event.type === 'authentication.login.success' ||
            event.type === 'authentication.changed') {
          this.invalidateCache();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check if the current user has a specific permission on a resource.
   * Uses cache to minimize API calls.
   *
   * @param permission - Permission name (e.g., 'READ', 'CREATE', 'DELETE')
   * @param resource - Resource type or name
   * @param resourceId - Optional specific resource ID (defaults to '*' for all)
   * @returns Observable<boolean> - true if authorized, false otherwise
   */
  isAuthorized(permission: string, resource: ResourceType | string, resourceId?: string): Observable<boolean> {
    // Check if user is authenticated
    if (!this.authService.currentAuthentication) {
      return of(false);
    }

    const resourceType = this.resolveResourceType(resource);
    const resourceName = this.getResourceName(resourceType);
    const resolvedResourceId = resourceId || '*';
    const cacheKey = this.buildCacheKey(permission, resourceType, resolvedResourceId);

    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached !== null) {
      return of(cached);
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Make API request
    const request$ = this.checkAuthorizationApi(permission, resourceName, resourceType, resolvedResourceId).pipe(
      tap(result => {
        this.setCachedResult(cacheKey, result);
        this.pendingRequests.delete(cacheKey);
      }),
      catchError(() => {
        this.pendingRequests.delete(cacheKey);
        return of(false);
      }),
      shareReplay(1)
    );

    this.pendingRequests.set(cacheKey, request$);
    return request$;
  }

  /**
   * Synchronous check from cache only.
   * Returns null if not in cache.
   *
   * Use this for immediate UI checks where you've already preloaded permissions.
   */
  isAuthorizedSync(permission: string, resource: ResourceType | string, resourceId?: string): boolean | null {
    const resourceType = this.resolveResourceType(resource);
    const cacheKey = this.buildCacheKey(permission, resourceType, resourceId || '*');
    return this.getCachedResult(cacheKey);
  }

  /**
   * Check if user can access a specific application.
   * This is a synchronous check based on authorizedApps from authentication.
   */
  canAccessApp(app: string): boolean {
    return this.authService.canAccess(app);
  }

  /**
   * Check if user can access admin application.
   */
  canAccessAdmin(): boolean {
    return this.canAccessApp('admin');
  }

  /**
   * Check if user can access cockpit application.
   */
  canAccessCockpit(): boolean {
    return this.canAccessApp('cockpit');
  }

  /**
   * Check if user can access tasklist application.
   */
  canAccessTasklist(): boolean {
    return this.canAccessApp('tasklist');
  }

  /**
   * Check if user can access welcome application.
   * Note: 'welcome' is always accessible if user is authenticated.
   */
  canAccessWelcome(): boolean {
    return this.authService.isAuthenticated;
  }

  /**
   * Check if user is in "Limited Access" mode.
   * This means the user is authenticated but has no access to main apps
   * (cockpit, tasklist, admin). This typically happens with SSO users
   * who haven't been assigned permissions yet.
   *
   * @returns true if user is authenticated but has no app permissions
   */
  isLimitedAccess(): boolean {
    const auth = this.authService.currentAuthentication;
    if (!auth) {
      return false;
    }

    // Check if user has no access to any of the main apps
    const mainApps = ['cockpit', 'tasklist', 'admin'];
    const hasMainAppAccess = mainApps.some(app => auth.authorizedApps.includes(app));

    return !hasMainAppAccess;
  }

  /**
   * Check if user has access to at least one main application.
   * Returns true if user can access cockpit, tasklist, or admin.
   */
  hasAnyAppAccess(): boolean {
    return this.canAccessCockpit() || this.canAccessTasklist() || this.canAccessAdmin();
  }

  /**
   * Get the list of apps the user can access.
   */
  getAccessibleApps(): string[] {
    const auth = this.authService.currentAuthentication;
    return auth?.authorizedApps || [];
  }

  /**
   * Preload multiple permissions at once for better performance.
   * Useful for loading all permissions needed by a page/component at once.
   */
  preloadPermissions(checks: PermissionCheckParams[]): Observable<BulkPermissionResult> {
    if (!this.authService.currentAuthentication || checks.length === 0) {
      return of({});
    }

    this.loadingSubject.next(true);

    const observables: Observable<{ key: string; result: boolean }>[] = checks.map(check => {
      const resourceType = this.resolveResourceType(check.resource);
      const cacheKey = this.buildCacheKey(check.permission, resourceType, check.resourceId || '*');

      return this.isAuthorized(check.permission, check.resource, check.resourceId).pipe(
        map(result => ({ key: cacheKey, result }))
      );
    });

    return forkJoin(observables).pipe(
      map(results => {
        const bulkResult: BulkPermissionResult = {};
        results.forEach(r => {
          bulkResult[r.key] = r.result;
        });
        return bulkResult;
      }),
      tap(() => this.loadingSubject.next(false)),
      catchError(() => {
        this.loadingSubject.next(false);
        return of({});
      })
    );
  }

  /**
   * Invalidate the entire permission cache.
   * Called automatically on authentication changes.
   */
  invalidateCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.permissionsChangedSubject.next();
  }

  /**
   * Invalidate a specific cache entry.
   */
  invalidateCacheEntry(permission: string, resource: ResourceType | string, resourceId?: string): void {
    const resourceType = this.resolveResourceType(resource);
    const cacheKey = this.buildCacheKey(permission, resourceType, resourceId || '*');
    this.cache.delete(cacheKey);
  }

  /**
   * Get all cached permissions (for debugging).
   */
  getCacheSnapshot(): Map<string, boolean> {
    const snapshot = new Map<string, boolean>();
    const now = Date.now();
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp < this.CACHE_TTL) {
        snapshot.set(key, entry.result);
      }
    });
    return snapshot;
  }

  // ==================== Private Methods ====================

  /**
   * Make API call to check authorization
   */
  private checkAuthorizationApi(
    permission: string,
    resourceName: string,
    resourceType: ResourceType,
    resourceId: string
  ): Observable<boolean> {
    const params = new HttpParams()
      .set('permissionName', permission)
      .set('resourceName', resourceName)
      .set('resourceType', resourceType.toString())
      .set('resourceId', resourceId);

    return this.http.get<{ isAuthorized: boolean }>(
      `${this.authorizationUrl}/check`,
      { params, withCredentials: true }
    ).pipe(
      map(response => response.isAuthorized),
      catchError(error => {
        // 403 means not authorized, which is a valid response
        if (error.status === 403) {
          return of(false);
        }
        console.error('PermissionService: Error checking authorization', error);
        return of(false);
      })
    );
  }

  /**
   * Resolve resource type from string or number
   */
  private resolveResourceType(resource: ResourceType | string): ResourceType {
    if (typeof resource === 'number') {
      return resource as ResourceType;
    }

    // Convert string resource name to type
    const upperResource = resource.toUpperCase().replace(/-/g, '_');
    const resourceType = RESOURCE_TYPE[upperResource as keyof typeof RESOURCE_TYPE];

    if (resourceType !== undefined) {
      return resourceType;
    }

    // Try to find by lowercase comparison
    for (const [key, value] of Object.entries(RESOURCE_TYPE)) {
      if (key.toLowerCase() === resource.toLowerCase() ||
          RESOURCE_NAMES[value as ResourceType]?.toLowerCase() === resource.toLowerCase()) {
        return value as ResourceType;
      }
    }

    console.warn(`PermissionService: Unknown resource type "${resource}", defaulting to APPLICATION`);
    return RESOURCE_TYPE.APPLICATION;
  }

  /**
   * Get resource name for API call
   */
  private getResourceName(resourceType: ResourceType): string {
    return RESOURCE_NAMES[resourceType] || 'application';
  }

  /**
   * Build cache key
   */
  private buildCacheKey(permission: string, resourceType: ResourceType, resourceId: string): string {
    return `${permission}:${resourceType}:${resourceId}`;
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(key: string): boolean | null {
    const entry = this.cache.get(key);
    if (entry && (Date.now() - entry.timestamp) < this.CACHE_TTL) {
      return entry.result;
    }
    return null;
  }

  /**
   * Set cached result
   */
  private setCachedResult(key: string, result: boolean): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
}
