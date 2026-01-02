import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Task,
  TaskList,
  TaskQueryParams,
  TaskSorting,
  TaskForm,
  TaskComment,
  UserOperationLogEntry,
  IdentityLink,
  UserRef,
  GroupRef,
  ProcessDefinition,
  ProcessInstance
} from '../../models/tasklist/task.model';
import {
  TaskFilter,
  FilterAuthorization
} from '../../models/tasklist/filter.model';

@Injectable({
  providedIn: 'root'
})
export class TasklistService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/orqueio/api/engine/engine/default';

  // ==================== TASK API ====================

  /**
   * Get tasks with HAL embedded resources
   */
  getTasks(params?: TaskQueryParams): Observable<TaskList> {
    let httpParams = new HttpParams();
    const headers = new HttpHeaders().set('Accept', 'application/hal+json');

    if (params) {
      httpParams = this.buildTaskQueryParams(params, httpParams);
    }

    return this.http.get<TaskList>(`${this.baseUrl}/task`, {
      params: httpParams,
      headers
    }).pipe(
      catchError(() => of({ count: 0, _embedded: { task: [] } }))
    );
  }

  /**
   * Get tasks count
   */
  getTasksCount(params?: TaskQueryParams): Observable<number> {
    let httpParams = new HttpParams();

    if (params) {
      httpParams = this.buildTaskQueryParams(params, httpParams);
    }

    return this.http.get<{ count: number }>(`${this.baseUrl}/task/count`, {
      params: httpParams
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get tasks via POST (for complex queries)
   */
  queryTasks(params: TaskQueryParams): Observable<Task[]> {
    const body = this.buildTaskQueryBody(params);
    let httpParams = new HttpParams();

    if (params.firstResult !== undefined) {
      httpParams = httpParams.set('firstResult', params.firstResult.toString());
    }
    if (params.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }

    return this.http.post<Task[]>(`${this.baseUrl}/task`, body, {
      params: httpParams
    }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Get tasks count via POST
   */
  queryTasksCount(params: TaskQueryParams): Observable<number> {
    const body = this.buildTaskQueryBody(params);

    return this.http.post<{ count: number }>(`${this.baseUrl}/task/count`, body).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get single task by ID
   */
  getTask(taskId: string): Observable<Task | null> {
    return this.http.get<Task>(`${this.baseUrl}/task/${taskId}`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Update task properties
   */
  updateTask(taskId: string, updates: Partial<Task>): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/task/${taskId}`, updates);
  }

  /**
   * Create a standalone task
   */
  createTask(task: {
    name: string;
    assignee?: string | null;
    tenantId?: string | null;
    description?: string | null;
    priority?: number;
  }): Promise<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.baseUrl}/task/create`, task).toPromise() as Promise<{ id: string }>;
  }

  /**
   * Get task form
   */
  getTaskForm(taskId: string): Observable<TaskForm | null> {
    return this.http.get<TaskForm>(`${this.baseUrl}/task/${taskId}/form`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Get task form variables
   */
  getTaskFormVariables(taskId: string): Observable<Record<string, any>> {
    const params = new HttpParams().set('deserializeValues', 'false');
    return this.http.get<Record<string, any>>(`${this.baseUrl}/task/${taskId}/form-variables`, { params }).pipe(
      catchError(() => of({}))
    );
  }

  /**
   * Get specific task variables by names
   */
  getTaskVariables(taskId: string, variableNames?: string[]): Observable<Record<string, any>> {
    let params = new HttpParams().set('deserializeValues', 'false');
    if (variableNames && variableNames.length > 0) {
      params = params.set('variableNames', variableNames.join(','));
    }
    return this.http.get<Record<string, any>>(`${this.baseUrl}/task/${taskId}/variables`, { params }).pipe(
      catchError(() => of({}))
    );
  }

  /**
   * Get a single task variable with deserialization enabled
   * Used for viewing the deserialized value of Object type variables
   */
  getTaskVariableDeserialized(taskId: string, variableName: string): Observable<any> {
    // Note: deserializeValues defaults to true when not specified
    return this.http.get<any>(`${this.baseUrl}/task/${taskId}/variables/${variableName}`).pipe(
      catchError((error) => {
        // Return the error so the component can show the deserialization error
        throw error.error || error;
      })
    );
  }

  /**
   * Submit task form
   */
  submitTaskForm(taskId: string, variables: Record<string, any>): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/submit-form`, { variables });
  }

  // ==================== TASK ACTIONS ====================

  /**
   * Claim a task
   */
  claimTask(taskId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/claim`, { userId });
  }

  /**
   * Unclaim a task
   */
  unclaimTask(taskId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/unclaim`, {});
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, variables?: Record<string, any>): Observable<void> {
    const body = variables ? { variables } : {};
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/complete`, body);
  }

  /**
   * Set task assignee
   */
  setAssignee(taskId: string, userId: string | null): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/assignee`, { userId });
  }

  /**
   * Delegate task
   */
  delegateTask(taskId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/delegate`, { userId });
  }

  /**
   * Resolve delegated task
   */
  resolveTask(taskId: string, variables?: Record<string, any>): Observable<void> {
    const body = variables ? { variables } : {};
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/resolve`, body);
  }

  // ==================== IDENTITY LINKS ====================

  /**
   * Get task identity links
   */
  getIdentityLinks(taskId: string): Observable<IdentityLink[]> {
    return this.http.get<IdentityLink[]>(`${this.baseUrl}/task/${taskId}/identity-links`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Add identity link
   */
  addIdentityLink(taskId: string, link: IdentityLink): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/identity-links`, link);
  }

  /**
   * Delete identity link
   */
  deleteIdentityLink(taskId: string, link: IdentityLink): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/identity-links/delete`, link);
  }

  // ==================== COMMENTS ====================

  /**
   * Get task comments
   */
  getComments(taskId: string): Observable<TaskComment[]> {
    return this.http.get<TaskComment[]>(`${this.baseUrl}/task/${taskId}/comment`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Add comment to task
   */
  addComment(taskId: string, message: string): Observable<TaskComment> {
    return this.http.post<TaskComment>(`${this.baseUrl}/task/${taskId}/comment/create`, { message });
  }

  // ==================== HISTORY ====================

  /**
   * Get user operation log for task
   */
  getUserOperations(taskId: string, params?: { firstResult?: number; maxResults?: number }): Observable<UserOperationLogEntry[]> {
    let httpParams = new HttpParams().set('taskId', taskId);

    if (params?.firstResult !== undefined) {
      httpParams = httpParams.set('firstResult', params.firstResult.toString());
    }
    if (params?.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }

    return this.http.get<UserOperationLogEntry[]>(`${this.baseUrl}/history/user-operation`, {
      params: httpParams
    }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Get user operation log count
   */
  getUserOperationsCount(taskId: string): Observable<number> {
    const httpParams = new HttpParams().set('taskId', taskId);

    return this.http.get<{ count: number }>(`${this.baseUrl}/history/user-operation/count`, {
      params: httpParams
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  // ==================== FILTERS ====================

  /**
   * Get all filters
   */
  getFilters(params?: { firstResult?: number; maxResults?: number; itemCount?: boolean }): Observable<TaskFilter[]> {
    let httpParams = new HttpParams().set('resourceType', 'Task');

    if (params?.firstResult !== undefined) {
      httpParams = httpParams.set('firstResult', params.firstResult.toString());
    }
    if (params?.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }
    if (params?.itemCount) {
      httpParams = httpParams.set('itemCount', 'true');
    }

    return this.http.get<TaskFilter[]>(`${this.baseUrl}/filter`, {
      params: httpParams
    }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Get filters count
   */
  getFiltersCount(): Observable<number> {
    const httpParams = new HttpParams().set('resourceType', 'Task');

    return this.http.get<{ count: number }>(`${this.baseUrl}/filter/count`, {
      params: httpParams
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get single filter
   */
  getFilter(filterId: string): Observable<TaskFilter | null> {
    return this.http.get<TaskFilter>(`${this.baseUrl}/filter/${filterId}`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Create filter
   */
  createFilter(filter: Omit<TaskFilter, 'id'>): Observable<TaskFilter> {
    return this.http.post<TaskFilter>(`${this.baseUrl}/filter/create`, filter);
  }

  /**
   * Update filter
   */
  updateFilter(filterId: string, filter: Partial<TaskFilter>): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/filter/${filterId}`, filter);
  }

  /**
   * Delete filter
   */
  deleteFilter(filterId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/filter/${filterId}`);
  }

  /**
   * Execute filter (get tasks)
   */
  executeFilter(filterId: string, params?: { firstResult?: number; maxResults?: number }): Observable<Task[]> {
    const headers = new HttpHeaders().set('Accept', 'application/hal+json');
    let httpParams = new HttpParams();

    if (params?.firstResult !== undefined) {
      httpParams = httpParams.set('firstResult', params.firstResult.toString());
    }
    if (params?.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }

    return this.http.get<any>(`${this.baseUrl}/filter/${filterId}/list`, {
      params: httpParams,
      headers
    }).pipe(
      map(res => {
        // HAL format returns { _embedded: { task: [...] } }
        if (res._embedded?.task) {
          return res._embedded.task;
        }
        // Plain array response
        if (Array.isArray(res)) {
          return res;
        }
        // Fallback to empty array
        return [];
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Execute filter count
   * @param filterId The filter ID
   * @param searchQuery Optional search query to apply with the filter
   */
  executeFilterCount(filterId: string, searchQuery?: Record<string, any>): Observable<number> {
    // If search query provided, use POST with body, otherwise GET
    if (searchQuery && Object.keys(searchQuery).length > 0) {
      return this.http.post<{ count: number }>(
        `${this.baseUrl}/filter/${filterId}/count`,
        searchQuery
      ).pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
    }
    return this.http.get<{ count: number }>(`${this.baseUrl}/filter/${filterId}/count`).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get filter authorizations
   */
  getFilterAuthorizations(): Observable<FilterAuthorization> {
    return this.http.options<FilterAuthorization>(`${this.baseUrl}/filter`).pipe(
      catchError(() => of({ links: [] }))
    );
  }

  // ==================== USERS & GROUPS ====================

  /**
   * Get user by ID
   */
  getUser(userId: string): Observable<UserRef | null> {
    return this.http.get<UserRef>(`${this.baseUrl}/user/${userId}/profile`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Search users
   */
  searchUsers(params: { id?: string; firstName?: string; lastName?: string; maxResults?: number }): Observable<UserRef[]> {
    let httpParams = new HttpParams();

    if (params.id) httpParams = httpParams.set('id', params.id);
    if (params.firstName) httpParams = httpParams.set('firstNameLike', `%${params.firstName}%`);
    if (params.lastName) httpParams = httpParams.set('lastNameLike', `%${params.lastName}%`);
    if (params.maxResults) httpParams = httpParams.set('maxResults', params.maxResults.toString());

    return this.http.get<UserRef[]>(`${this.baseUrl}/user`, { params: httpParams }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Validate user exists
   */
  validateUser(userId: string): Observable<boolean> {
    return this.searchUsers({ id: userId, maxResults: 1 }).pipe(
      map(users => users.length > 0)
    );
  }

  /**
   * Get group by ID
   */
  getGroup(groupId: string): Observable<GroupRef | null> {
    return this.http.get<GroupRef>(`${this.baseUrl}/group/${groupId}`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Get groups by IDs
   */
  getGroups(groupIds: string[]): Observable<GroupRef[]> {
    if (groupIds.length === 0) return of([]);

    const requests = groupIds.map(id => this.getGroup(id));
    return forkJoin(requests).pipe(
      map(groups => groups.filter((g): g is GroupRef => g !== null))
    );
  }

  /**
   * Search groups
   */
  searchGroups(params: { name?: string; maxResults?: number }): Observable<GroupRef[]> {
    let httpParams = new HttpParams();

    if (params.name) httpParams = httpParams.set('nameLike', `%${params.name}%`);
    if (params.maxResults) httpParams = httpParams.set('maxResults', params.maxResults.toString());

    return this.http.get<GroupRef[]>(`${this.baseUrl}/group`, { params: httpParams }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Validate group exists
   */
  validateGroup(groupId: string): Observable<boolean> {
    return this.getGroup(groupId).pipe(
      map(group => group !== null)
    );
  }

  // ==================== PROCESS DEFINITION ====================

  /**
   * Get process definition XML
   */
  getProcessDefinitionXml(processDefinitionId: string): Observable<{ id: string; bpmn20Xml: string } | null> {
    return this.http.get<{ id: string; bpmn20Xml: string }>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/xml`
    ).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Get case definition XML
   */
  getCaseDefinitionXml(caseDefinitionId: string): Observable<{ id: string; cmmnXml: string } | null> {
    return this.http.get<{ id: string; cmmnXml: string }>(
      `${this.baseUrl}/case-definition/${caseDefinitionId}/xml`
    ).pipe(
      catchError(() => of(null))
    );
  }

  // ==================== PROCESS DEFINITIONS ====================

  /**
   * Get startable process definitions (latest versions only)
   * Matches AngularJS behavior with startablePermissionCheck
   */
  getStartableProcessDefinitions(params?: {
    firstResult?: number;
    maxResults?: number;
    nameLike?: string;
  }): Observable<ProcessDefinition[]> {
    let httpParams = new HttpParams()
      .set('latestVersion', 'true')
      .set('active', 'true')
      .set('startableInTasklist', 'true')
      .set('startablePermissionCheck', 'true') // Match AngularJS
      .set('sortBy', 'name')
      .set('sortOrder', 'asc');

    if (params?.firstResult !== undefined) {
      httpParams = httpParams.set('firstResult', params.firstResult.toString());
    }
    if (params?.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }
    if (params?.nameLike) {
      httpParams = httpParams.set('nameLike', params.nameLike);
    }

    return this.http.get<ProcessDefinition[]>(`${this.baseUrl}/process-definition`, { params: httpParams }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Get startable process definitions count
   */
  getStartableProcessDefinitionsCount(nameLike?: string): Observable<number> {
    let httpParams = new HttpParams()
      .set('latestVersion', 'true')
      .set('active', 'true')
      .set('startableInTasklist', 'true')
      .set('startablePermissionCheck', 'true'); // Match AngularJS

    if (nameLike) {
      httpParams = httpParams.set('nameLike', nameLike);
    }

    return this.http.get<{ count: number }>(`${this.baseUrl}/process-definition/count`, { params: httpParams }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get process definition start form
   */
  getProcessDefinitionStartForm(processDefinitionId: string): Observable<TaskForm | null> {
    return this.http.get<TaskForm>(`${this.baseUrl}/process-definition/${processDefinitionId}/startForm`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Get process definition start form variables
   */
  getProcessDefinitionFormVariables(processDefinitionId: string): Observable<Record<string, any>> {
    const params = new HttpParams().set('deserializeValues', 'false');
    return this.http.get<Record<string, any>>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/form-variables`,
      { params }
    ).pipe(
      catchError(() => of({}))
    );
  }

  /**
   * Start a process instance
   */
  startProcessInstance(processDefinitionId: string, data: {
    businessKey?: string;
    variables?: Record<string, any>;
  }): Observable<ProcessInstance> {
    return this.http.post<ProcessInstance>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/start`,
      data
    );
  }

  /**
   * Submit start form and start process instance
   */
  submitStartForm(processDefinitionId: string, variables: Record<string, any>): Observable<ProcessInstance> {
    return this.http.post<ProcessInstance>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/submit-form`,
      { variables }
    );
  }

  // ==================== HELPER METHODS ====================

  private buildTaskQueryParams(params: TaskQueryParams, httpParams: HttpParams): HttpParams {
    const simpleParams: (keyof TaskQueryParams)[] = [
      'firstResult', 'maxResults', 'sortBy', 'sortOrder',
      'processInstanceId', 'processInstanceBusinessKey', 'processDefinitionId',
      'processDefinitionKey', 'processDefinitionName', 'executionId',
      'caseInstanceId', 'caseInstanceBusinessKey', 'caseDefinitionId',
      'caseDefinitionKey', 'caseDefinitionName', 'caseExecutionId',
      'taskDefinitionKey', 'name', 'nameLike', 'description', 'descriptionLike',
      'priority', 'minPriority', 'maxPriority',
      'assignee', 'assigneeLike', 'owner', 'candidateGroup', 'candidateUser', 'involvedUser',
      'dueBefore', 'dueAfter', 'followUpBefore', 'followUpAfter', 'createdBefore', 'createdAfter',
      'delegationState'
    ];

    for (const key of simpleParams) {
      const value = params[key];
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    }

    const booleanParams: (keyof TaskQueryParams)[] = [
      'unassigned', 'assigned', 'withoutDueDate',
      'withCandidateGroups', 'withoutCandidateGroups',
      'withCandidateUsers', 'withoutCandidateUsers',
      'withoutTenantId', 'includeAssignedTasks'
    ];

    for (const key of booleanParams) {
      if (params[key] === true) {
        httpParams = httpParams.set(key, 'true');
      }
    }

    if (params.sorting && params.sorting.length > 0) {
      httpParams = httpParams.set('sorting', JSON.stringify(params.sorting));
    }

    if (params.tenantIdIn && params.tenantIdIn.length > 0) {
      httpParams = httpParams.set('tenantIdIn', params.tenantIdIn.join(','));
    }

    if (params.candidateGroups && params.candidateGroups.length > 0) {
      httpParams = httpParams.set('candidateGroups', params.candidateGroups.join(','));
    }

    return httpParams;
  }

  private buildTaskQueryBody(params: TaskQueryParams): Record<string, any> {
    const body: Record<string, any> = {};

    // Copy all simple properties
    const keys = Object.keys(params) as (keyof TaskQueryParams)[];
    for (const key of keys) {
      if (key !== 'firstResult' && key !== 'maxResults' && params[key] !== undefined) {
        body[key] = params[key];
      }
    }

    return body;
  }
}
