/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// ============================================
// Process Instance Interfaces
// ============================================

export interface ProcessInstance {
  id: string;
  processDefinitionId: string;
  processDefinitionName?: string;
  processDefinitionKey: string;
  businessKey?: string;
  startTime: string;
  endTime?: string;
  state: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'EXTERNALLY_TERMINATED' | 'INTERNALLY_TERMINATED';
  incidents?: Incident[];
  tenantId?: string;
  superProcessInstanceId?: string;
  superCaseInstanceId?: string;
  caseInstanceId?: string;
  startUserId?: string;
  deleteReason?: string;
  rootProcessInstanceId?: string;
  removalTime?: string;
  activityId?: string;
}

export interface ProcessInstanceDetail extends ProcessInstance {
  variables: Variable[];
  activities: Activity[];
}

export interface Variable {
  id?: string;
  name: string;
  type: string;
  value: any;
  processInstanceId: string;
  processDefinitionKey?: string;
  processDefinitionId?: string;
  executionId?: string;
  activityInstanceId?: string;
  tenantId?: string;
  createTime?: string;
  state?: string;
}

export interface Activity {
  id: string;
  activityId: string;
  activityName: string;
  activityType: string;
  startTime: string;
  endTime?: string;
  durationInMillis?: number;
  canceled?: boolean;
  completeScope?: boolean;
  tenantId?: string;
  executionId?: string;
  parentActivityInstanceId?: string;
  calledProcessInstanceId?: string;
  calledCaseInstanceId?: string;
  taskId?: string;
}

export interface ActivityInstanceTree {
  id: string;
  activityId: string;
  activityName?: string;
  activityType: string;
  processInstanceId: string;
  processDefinitionId: string;
  childActivityInstances: ActivityInstanceTree[];
  childTransitionInstances: TransitionInstance[];
  executionIds: string[];
  incidentIds?: string[];
}

export interface TransitionInstance {
  id: string;
  activityId: string;
  activityName?: string;
  activityType: string;
  processInstanceId: string;
  processDefinitionId: string;
  executionId: string;
  incidentIds?: string[];
}

export interface Incident {
  id: string;
  processInstanceId: string;
  processDefinitionId?: string;
  activityId: string;
  incidentType: string;
  incidentMessage: string;
  createTime: string;
  endTime?: string;
  incidentTimestamp?: string;
  causeIncidentId?: string;
  rootCauseIncidentId?: string;
  configuration?: string;
  tenantId?: string;
  jobDefinitionId?: string;
  failedActivityId?: string;
  annotation?: string;
  open?: boolean;
  deleted?: boolean;
  resolved?: boolean;
}

export interface Job {
  id: string;
  jobDefinitionId?: string;
  processInstanceId: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  executionId: string;
  retries: number;
  exceptionMessage?: string;
  failedActivityId?: string;
  activityId?: string;
  dueDate?: string;
  createTime: string;
  suspended: boolean;
  priority: number;
  tenantId?: string;
  jobType?: string;
}

export interface ExternalTask {
  id: string;
  processInstanceId: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  activityId: string;
  activityInstanceId: string;
  executionId: string;
  workerId?: string;
  topicName: string;
  retries: number;
  errorMessage?: string;
  errorDetails?: string;
  lockExpirationTime?: string;
  suspended: boolean;
  priority: number;
  tenantId?: string;
  businessKey?: string;
}

export interface UserTask {
  id: string;
  taskDefinitionKey: string;
  name: string;
  assignee?: string;
  created: string;
  due?: string;
  followUp?: string;
  priority: number;
  parentTaskId?: string;
  processDefinitionId: string;
  processInstanceId: string;
  executionId: string;
  activityInstanceId?: string;
  formKey?: string;
  tenantId?: string;
}

export interface ProcessQueryParams {
  processDefinitionKey?: string;
  processDefinitionId?: string;
  startedAfter?: string;
  startedBefore?: string;
  firstResult?: number;
  maxResults?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Service for process instance operations.
 *
 * This service handles:
 * - Process instance CRUD operations
 * - Variables management
 * - Activity and incident retrieval
 * - Suspension and cancellation
 * - Jobs and external tasks
 * - User tasks for a process instance
 *
 * Extracted from CockpitService to follow Single Responsibility Principle.
 */
@Injectable({
  providedIn: 'root'
})
export class ProcessInstanceService {
  private readonly baseUrl = '/orqueio/api/engine/engine/default';
  private readonly historyUrl = `${this.baseUrl}/history`;

  constructor(private http: HttpClient) {}

  // ============================================
  // Process Instance CRUD
  // ============================================

  /**
   * Get process instances with optional filters
   */
  getProcessInstances(params?: ProcessQueryParams): Observable<ProcessInstance[]> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.processDefinitionKey) {
        httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
      }
      if (params.processDefinitionId) {
        httpParams = httpParams.set('processDefinitionId', params.processDefinitionId);
      }
      if (params.startedAfter) {
        httpParams = httpParams.set('startedAfter', params.startedAfter);
      }
      if (params.startedBefore) {
        httpParams = httpParams.set('startedBefore', params.startedBefore);
      }
      if (params.firstResult !== undefined) {
        httpParams = httpParams.set('firstResult', params.firstResult.toString());
      }
      if (params.sortBy) {
        httpParams = httpParams.set('sortBy', params.sortBy);
        if (params.sortOrder) {
          httpParams = httpParams.set('sortOrder', params.sortOrder);
        }
      }
    }

    const maxResults = Math.min(params?.maxResults ?? 100, ProcessInstanceService.MAX_RESULTS_CAP);
    httpParams = httpParams.set('maxResults', maxResults.toString());

    return this.http.get<ProcessInstance[]>(`${this.historyUrl}/process-instance`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  /**
   * Get process instances count
   */
  getProcessInstancesCount(params?: ProcessQueryParams): Observable<number> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.processDefinitionKey) {
        httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
      }
      if (params.processDefinitionId) {
        httpParams = httpParams.set('processDefinitionId', params.processDefinitionId);
      }
      if (params.startedAfter) {
        httpParams = httpParams.set('startedAfter', params.startedAfter);
      }
      if (params.startedBefore) {
        httpParams = httpParams.set('startedBefore', params.startedBefore);
      }
    }

    return this.http.get<{ count: number }>(`${this.historyUrl}/process-instance/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  /**
   * Get a single process instance by ID
   */
  getProcessInstance(id: string): Observable<ProcessInstanceDetail | null> {
    return this.http.get<ProcessInstanceDetail>(`${this.historyUrl}/process-instance/${id}`)
      .pipe(catchError(() => of(null)));
  }

  /**
   * Query process instances with POST (supports complex filters)
   */
  private static readonly MAX_RESULTS_CAP = 10000;

  queryProcessInstances(body: any, firstResult = 0, maxResults = 100): Observable<ProcessInstance[]> {
    const cappedMax = Math.min(maxResults, ProcessInstanceService.MAX_RESULTS_CAP);
    return this.http.post<ProcessInstance[]>(
      `${this.historyUrl}/process-instance`,
      body,
      { params: { firstResult: firstResult.toString(), maxResults: cappedMax.toString() } }
    ).pipe(catchError(() => of([])));
  }

  /**
   * Count process instances with POST (supports complex filters)
   */
  queryProcessInstancesCount(body: any): Observable<number> {
    const { sorting, ...countBody } = body || {};
    return this.http.post<{ count: number }>(
      `${this.historyUrl}/process-instance/count`,
      countBody
    ).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  // ============================================
  // Variables
  // ============================================

  /**
   * Get variables for a process instance
   */
  getProcessInstanceVariables(id: string, maxResults: number = 1000): Observable<Variable[]> {
    return this.http.get<Variable[]>(`${this.historyUrl}/variable-instance`, {
      params: { processInstanceId: id, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Set a variable on a process instance
   */
  setProcessInstanceVariable(processInstanceId: string, variableName: string, value: any, type: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/variables/${variableName}`,
      { value, type }
    ).pipe(catchError(() => of(void 0)));
  }

  /**
   * Delete a variable from a process instance
   */
  deleteProcessInstanceVariable(processInstanceId: string, variableName: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/variables/${variableName}`
    ).pipe(catchError(() => of(void 0)));
  }

  /**
   * Set multiple variables at once
   */
  setProcessInstanceVariables(processInstanceId: string, modifications: Record<string, { value: any; type: string }>): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/variables`,
      { modifications }
    ).pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // Activities
  // ============================================

  /**
   * Get activities for a process instance
   */
  getProcessInstanceActivities(id: string, maxResults: number = 1000): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.historyUrl}/activity-instance`, {
      params: {
        processInstanceId: id,
        sortBy: 'startTime',
        sortOrder: 'desc',
        maxResults: maxResults.toString()
      }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get runtime activity instance tree
   */
  getActivityInstanceTree(processInstanceId: string): Observable<ActivityInstanceTree | null> {
    return this.http.get<ActivityInstanceTree>(
      `${this.baseUrl}/process-instance/${processInstanceId}/activity-instances`
    ).pipe(catchError(() => of(null)));
  }

  // ============================================
  // Incidents
  // ============================================

  /**
   * Get incidents for a process instance
   */
  getProcessInstanceIncidents(id: string, maxResults: number = 1000): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/incident`, {
      params: { processInstanceId: id, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get history incidents for a process instance
   */
  getHistoryIncidents(processInstanceId: string, maxResults = 100): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.historyUrl}/incident`, {
      params: {
        processInstanceId,
        maxResults: maxResults.toString(),
        sortBy: 'createTime',
        sortOrder: 'desc'
      }
    }).pipe(catchError(() => of([])));
  }

  // ============================================
  // Suspension & Cancellation
  // ============================================

  /**
   * Cancel a process instance
   */
  cancelProcessInstance(processInstanceId: string, deleteReason?: string): Observable<void> {
    const params: any = {};
    if (deleteReason) {
      params.deleteReason = deleteReason;
    }
    return this.http.delete<void>(`${this.baseUrl}/process-instance/${processInstanceId}`, { params })
      .pipe(catchError(() => of(void 0)));
  }

  /**
   * Suspend a process instance
   */
  suspendProcessInstance(processInstanceId: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/suspended`,
      { suspended: true }
    ).pipe(catchError(() => of(void 0)));
  }

  /**
   * Resume (activate) a process instance
   */
  resumeProcessInstance(processInstanceId: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/suspended`,
      { suspended: false }
    ).pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // Jobs
  // ============================================

  /**
   * Get jobs for a process instance
   */
  getJobsByProcessInstance(processInstanceId: string, maxResults = 100): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.baseUrl}/job`, {
      params: { processInstanceId, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get a single job by ID
   */
  getJob(id: string): Observable<Job | null> {
    return this.http.get<Job>(`${this.baseUrl}/job/${id}`)
      .pipe(catchError(() => of(null)));
  }

  /**
   * Retry a job
   */
  retryJob(jobId: string, retries: number = 1): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/job/${jobId}/retries`, { retries })
      .pipe(catchError(() => of(void 0)));
  }

  /**
   * Set job retries in bulk for a process instance
   */
  setJobRetriesByProcessInstance(processInstanceId: string, retries: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/job/retries`, {
      processInstanceQuery: { processInstanceId },
      retries
    }).pipe(catchError(() => of(void 0)));
  }

  /**
   * Suspend a job
   */
  suspendJob(jobId: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/job/${jobId}/suspended`, { suspended: true })
      .pipe(catchError(() => of(void 0)));
  }

  /**
   * Activate a job (alias for resumeJob)
   */
  activateJob(jobId: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/job/${jobId}/suspended`, { suspended: false })
      .pipe(catchError(() => of(void 0)));
  }

  /**
   * Resume a job (alias for activateJob)
   */
  resumeJob(jobId: string): Observable<void> {
    return this.activateJob(jobId);
  }

  /**
   * Recalculate job due date
   */
  recalculateJobDueDate(jobId: string, creationDateBased = false): Observable<void> {
    let httpParams = new HttpParams();
    if (creationDateBased) {
      httpParams = httpParams.set('creationDateBased', 'true');
    }
    return this.http.post<void>(`${this.baseUrl}/job/${jobId}/duedate/recalculate`, null, { params: httpParams })
      .pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // External Tasks
  // ============================================

  /**
   * Get external tasks for a process instance
   */
  getExternalTasksByProcessInstance(processInstanceId: string, maxResults = 100): Observable<ExternalTask[]> {
    return this.http.get<ExternalTask[]>(`${this.baseUrl}/external-task`, {
      params: { processInstanceId, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Retry an external task
   */
  retryExternalTask(externalTaskId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/external-task/${externalTaskId}/retries`, { retries: 1 })
      .pipe(catchError(() => of(void 0)));
  }

  /**
   * Set external task retries in bulk for a process instance
   */
  setExternalTaskRetriesByProcessInstance(processInstanceId: string, retries: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/external-task/retries`, {
      processInstanceId,
      retries
    }).pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // User Tasks
  // ============================================

  /**
   * Get user tasks for a process instance (runtime)
   */
  getUserTasksByProcessInstance(processInstanceId: string, maxResults = 100): Observable<UserTask[]> {
    return this.http.get<UserTask[]>(`${this.baseUrl}/task`, {
      params: { processInstanceId, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get user tasks for a process instance (history)
   */
  getHistoryUserTasksByProcessInstance(processInstanceId: string, maxResults = 100): Observable<UserTask[]> {
    return this.http.get<any[]>(`${this.historyUrl}/task`, {
      params: { processInstanceId, maxResults: maxResults.toString() }
    }).pipe(
      map(tasks => tasks.map(t => ({
        ...t,
        created: t.startTime
      }))),
      catchError(() => of([]))
    );
  }

  /**
   * Set task assignee
   */
  setTaskAssignee(taskId: string, userId: string | null): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/assignee`, { userId })
      .pipe(catchError(() => of(void 0)));
  }

  /**
   * Set task owner
   */
  setTaskOwner(taskId: string, userId: string | null): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/owner`, { userId })
      .pipe(catchError(() => of(void 0)));
  }

  /**
   * Get task identity links (candidate users/groups)
   */
  getTaskIdentityLinks(taskId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/task/${taskId}/identity-links`)
      .pipe(catchError(() => of([])));
  }

  /**
   * Add task identity link
   */
  addTaskIdentityLink(taskId: string, userId: string | null, groupId: string | null, type: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/identity-links`, { userId, groupId, type })
      .pipe(catchError(() => of(void 0)));
  }

  /**
   * Delete task identity link
   */
  deleteTaskIdentityLink(taskId: string, userId: string | null, groupId: string | null, type: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/identity-links/delete`, { userId, groupId, type })
      .pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // Called/Super Process Instances
  // ============================================

  /**
   * Get called process instances (sub-processes)
   */
  getCalledProcessInstances(superProcessInstanceId: string, maxResults = 100): Observable<ProcessInstance[]> {
    return this.http.get<ProcessInstance[]>(`${this.historyUrl}/process-instance`, {
      params: { superProcessInstanceId, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get the super process instance (parent)
   */
  getSuperProcessInstance(processInstanceId: string): Observable<ProcessInstance | null> {
    return this.getProcessInstance(processInstanceId).pipe(
      map(instance => {
        if (instance?.superProcessInstanceId) {
          return instance;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }
}
