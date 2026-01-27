import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Interfaces pour les types de données
export interface DashboardStats {
  runningProcessInstances: number;
  openIncidents: number;
  openTasks: number;
  deployedDefinitions: number;
}

export interface ProcessDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
  suspended: boolean;
  tenantId?: string;
  instancesCount?: number;
  versionTag?: string;
  historyTimeToLive?: number;
  startableInTasklist?: boolean;
  resource?: string;
}

// Process definition with aggregated statistics (instances, incidents)
export interface ProcessDefinitionStatistics {
  id: string;
  key: string;
  name: string;
  version: number;
  suspended: boolean;
  instances: number;
  failedJobs: number;
  incidents: ActivityIncident[];
  definition: ProcessDefinition;
  tenantId?: string;
}

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

// Activity statistics for process definition diagram
export interface ActivityStatistics {
  id: string;
  instances: number;
  failedJobs: number;
  incidents: ActivityIncident[];
}

export interface ActivityIncident {
  incidentType: string;
  incidentCount: number;
}

// Runtime activity instance tree
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

// Job interface for Jobs tab
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

// Job Definition interface
export interface JobDefinition {
  id: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  activityId: string;
  jobType: string;
  jobConfiguration?: string;
  suspended: boolean;
  overridingJobPriority?: number;
  tenantId?: string;
  deploymentId?: string;
}

// Called Process Definition (for Call Activities)
export interface CalledProcessDefinition {
  id: string;
  key: string;
  name?: string;
  version: number;
  calledFromActivityIds: string[];
  callingProcessDefinitionId: string;
  state?: 'running' | 'referenced' | 'running-and-referenced';
}

// User Task for User Tasks tab
export interface UserTask {
  id: string;
  name: string;
  assignee?: string;
  owner?: string;
  created: string;
  due?: string;
  followUp?: string;
  priority: number;
  processDefinitionId?: string;
  processDefinitionKey?: string;
  processDefinitionName?: string;
  processInstanceId?: string;
  executionId?: string;
  caseDefinitionId?: string;
  caseInstanceId?: string;
  caseExecutionId?: string;
  taskDefinitionKey: string;
  description?: string;
  tenantId?: string;
  formKey?: string;
  parentTaskId?: string;
  delegationState?: string;
}

// Called Process Instance (sub-process)
export interface CalledProcessInstance {
  id: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  processDefinitionName?: string;
  businessKey?: string;
  startTime: string;
  endTime?: string;
  state: string;
  callActivityId: string;
  callActivityInstanceId: string;
}

// External Task interface
export interface ExternalTask {
  id: string;
  activityId: string;
  activityInstanceId: string;
  errorMessage?: string;
  errorDetails?: string;
  executionId: string;
  lockExpirationTime?: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  processInstanceId: string;
  retries: number;
  suspended: boolean;
  topicName: string;
  workerId?: string;
  priority: number;
  tenantId?: string;
  businessKey?: string;
}

export interface DecisionDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
  decisionRequirementsDefinitionId?: string;
  decisionRequirementsDefinitionKey?: string;
  tenantId?: string;
  versionTag?: string;
  historyTimeToLive?: number;
  resource?: string;
  // Linked DRD info
  drd?: {
    id: string;
    key: string;
    name?: string;
  };
}

export interface DecisionInstance {
  id: string;
  decisionDefinitionId: string;
  decisionDefinitionKey: string;
  decisionDefinitionName?: string;
  evaluationTime: string;
  processDefinitionId?: string;
  processDefinitionKey?: string;
  processInstanceId?: string;
  caseDefinitionId?: string;
  caseDefinitionKey?: string;
  caseInstanceId?: string;
  activityId?: string;
  activityInstanceId?: string;
  tenantId?: string;
  userId?: string;
  rootDecisionInstanceId?: string;
  decisionRequirementsDefinitionId?: string;
  decisionRequirementsDefinitionKey?: string;
  removalTime?: string;
  rootProcessInstanceId?: string;
  inputs?: DecisionInput[];
  outputs?: DecisionOutput[];
  collectResultValue?: number;
}

export interface DecisionInput {
  clauseId: string;
  clauseName: string;
  type: string;
  value: any;
}

export interface DecisionOutput {
  clauseId: string;
  clauseName: string;
  ruleId: string;
  ruleOrder: number;
  type: string;
  value: any;
  variableName: string;
}

export interface Task {
  id: string;
  name: string;
  assignee?: string;
  owner?: string;
  created: string;
  due?: string;
  followUp?: string;
  priority: number;
  processDefinitionId?: string;
  processInstanceId?: string;
  taskDefinitionKey: string;
  description?: string;
}

export interface ProcessQueryParams {
  processDefinitionKey?: string;
  processDefinitionId?: string;
  state?: string;
  startedAfter?: string;
  startedBefore?: string;
  finishedAfter?: string;
  finishedBefore?: string;
  businessKey?: string;
  businessKeyLike?: string;
  activityIdIn?: string[];
  withIncidents?: boolean;
  incidentType?: string;
  unfinished?: boolean;
  finished?: boolean;
  active?: boolean;
  suspended?: boolean;
  variableNamesIgnoreCase?: boolean;
  variableValuesIgnoreCase?: boolean;
  variables?: VariableQueryParam[];
  superProcessInstanceId?: string;
  subProcessInstanceId?: string;
  rootProcessInstances?: boolean;
  tenantIdIn?: string[];
  withoutTenantId?: boolean;
  firstResult?: number;
  maxResults?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VariableQueryParam {
  name: string;
  operator: 'eq' | 'neq' | 'gt' | 'gteq' | 'lt' | 'lteq' | 'like';
  value: any;
}

export interface TaskQueryParams {
  assignee?: string;
  assigneeLike?: string;
  candidateGroup?: string;
  candidateUser?: string;
  processDefinitionKey?: string;
  processDefinitionId?: string;
  processInstanceId?: string;
  activityInstanceIdIn?: string[];
  unfinished?: boolean;
  assigned?: boolean;
  unassigned?: boolean;
  withCandidateGroups?: boolean;
  withoutCandidateGroups?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  dueAfter?: string;
  dueBefore?: string;
  firstResult?: number;
  maxResults?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskStatistics {
  label: string;
  count: number;
  searchType: string;
}

export interface TaskGroupCount {
  groupName: string | null;
  taskCount: number;
  id?: string;
}

export interface Group {
  id: string;
  name: string;
  type?: string;
}

export interface IdentityLink {
  userId?: string;
  groupId?: string;
  type: string;
}

export interface Deployment {
  id: string;
  name: string | null;
  source: string | null;
  deploymentTime: string;
  tenantId: string | null;
}

export interface DeploymentResource {
  id: string;
  name: string;
  deploymentId: string;
}

export interface DeploymentWithResources extends Deployment {
  resources?: DeploymentResource[];
}

export interface DeploymentQueryParams {
  id?: string;
  name?: string;
  nameLike?: string;
  source?: string;
  withoutSource?: boolean;
  tenantIdIn?: string[];
  withoutTenantId?: boolean;
  deploymentBefore?: string;
  deploymentAfter?: string;
  sortBy?: 'id' | 'name' | 'deploymentTime';
  sortOrder?: 'asc' | 'desc';
  firstResult?: number;
  maxResults?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CockpitService {
  private readonly baseUrl = '/orqueio/api/engine/engine/default';
  private readonly historyUrl = `${this.baseUrl}/history`;

  constructor(private http: HttpClient) {}

  // Dashboard Statistics
  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      runningProcessInstances: this.getRunningProcessCount(),
      openIncidents: this.getOpenIncidentsCount(),
      openTasks: this.getOpenTasksCount(),
      deployedDefinitions: this.getDeployedDefinitionsCount()
    });
  }

  private getRunningProcessCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-instance/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  private getOpenIncidentsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/incident/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  private getOpenTasksCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/task/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  private getDeployedDefinitionsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-definition/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  // Public count methods for dashboard
  getProcessDefinitionsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-definition/count`, {
      params: { latestVersion: 'true' }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  getCaseDefinitionsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/case-definition/count`, {
      params: { latestVersion: 'true' }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  getDeploymentsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/deployment/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  // Process Definitions
  getProcessDefinitions(maxResults: number = 1000): Observable<ProcessDefinition[]> {
    return this.http.get<ProcessDefinition[]>(`${this.baseUrl}/process-definition`, {
      params: { latestVersion: 'true', sortBy: 'name', sortOrder: 'asc', maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  getProcessDefinition(id: string): Observable<ProcessDefinition | null> {
    return this.http.get<ProcessDefinition>(`${this.baseUrl}/process-definition/${id}`)
      .pipe(catchError(() => of(null)));
  }

  getProcessDefinitionByKey(key: string): Observable<ProcessDefinition | null> {
    return this.http.get<ProcessDefinition>(`${this.baseUrl}/process-definition/key/${key}`)
      .pipe(catchError(() => of(null)));
  }

  // Get process definitions with running instances count and incidents
  getProcessDefinitionsWithStatistics(includeIncidents = true): Observable<ProcessDefinitionStatistics[]> {
    let params = new HttpParams();
    if (includeIncidents) {
      params = params.set('incidents', 'true');
    }
    return this.http.get<ProcessDefinitionStatistics[]>(
      `${this.baseUrl}/process-definition/statistics`,
      { params }
    ).pipe(
      map(stats => {
        // Aggregate statistics by process definition key (combine all versions)
        const aggregatedMap = new Map<string, ProcessDefinitionStatistics>();

        stats.forEach(stat => {
          const key = stat.definition?.key || stat.id;
          const existing = aggregatedMap.get(key);

          if (existing) {
            // Aggregate instances and incidents
            existing.instances += stat.instances;
            existing.failedJobs += stat.failedJobs;
            // Merge incidents
            stat.incidents?.forEach(incident => {
              const existingIncident = existing.incidents.find(i => i.incidentType === incident.incidentType);
              if (existingIncident) {
                existingIncident.incidentCount += incident.incidentCount;
              } else {
                existing.incidents.push({ ...incident });
              }
            });
          } else {
            aggregatedMap.set(key, {
              ...stat,
              incidents: stat.incidents ? [...stat.incidents] : []
            });
          }
        });

        // Sort by name
        return Array.from(aggregatedMap.values()).sort((a, b) => {
          const nameA = a.definition?.name || a.definition?.key || '';
          const nameB = b.definition?.name || b.definition?.key || '';
          return nameA.localeCompare(nameB);
        });
      }),
      catchError(() => of([]))
    );
  }

  // Get running instances count for a specific process definition key
  getRunningInstancesCount(processDefinitionKey: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-instance/count`, {
      params: { processDefinitionKey }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  getBpmn20Xml(processDefinitionId: string): Observable<{ bpmn20Xml: string } | null> {
    return this.http.get<{ bpmn20Xml: string }>(`${this.baseUrl}/process-definition/${processDefinitionId}/xml`)
      .pipe(catchError(() => of(null)));
  }

  // Activity Statistics for process definition (shows instance counts per activity)
  getActivityStatistics(processDefinitionId: string, includeIncidents = true): Observable<ActivityStatistics[]> {
    let params = new HttpParams();
    if (includeIncidents) {
      params = params.set('incidents', 'true');
    }
    return this.http.get<ActivityStatistics[]>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/statistics`,
      { params }
    ).pipe(catchError(() => of([])));
  }

  // Get incidents for a process definition key (all versions)
  getIncidentsByProcessDefinitionKey(processDefinitionKey: string, maxResults = 1000): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/incident`, {
      params: { processDefinitionKey, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  // Get incidents for a specific process definition ID (specific version)
  getIncidentsByProcessDefinitionId(processDefinitionId: string, maxResults = 1000): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/incident`, {
      params: { processDefinitionId, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  // Get job definitions for a process definition key with count (all versions)
  getJobDefinitionsByProcessDefinitionKey(processDefinitionKey: string, firstResult = 0, maxResults = 50): Observable<{ jobDefinitions: JobDefinition[]; count: number }> {
    return forkJoin({
      jobDefinitions: this.http.get<JobDefinition[]>(`${this.baseUrl}/job-definition`, {
        params: { processDefinitionKey, firstResult: firstResult.toString(), maxResults: maxResults.toString() }
      }),
      count: this.http.get<{ count: number }>(`${this.baseUrl}/job-definition/count`, {
        params: { processDefinitionKey }
      }).pipe(map(res => res.count))
    }).pipe(catchError(() => of({ jobDefinitions: [], count: 0 })));
  }

  // Get job definitions for a specific process definition ID with count (specific version)
  getJobDefinitionsByProcessDefinitionId(processDefinitionId: string, firstResult = 0, maxResults = 50): Observable<{ jobDefinitions: JobDefinition[]; count: number }> {
    return forkJoin({
      jobDefinitions: this.http.get<JobDefinition[]>(`${this.baseUrl}/job-definition`, {
        params: { processDefinitionId, firstResult: firstResult.toString(), maxResults: maxResults.toString() }
      }),
      count: this.http.get<{ count: number }>(`${this.baseUrl}/job-definition/count`, {
        params: { processDefinitionId }
      }).pipe(map(res => res.count))
    }).pipe(catchError(() => of({ jobDefinitions: [], count: 0 })));
  }

  // Suspend/Activate a job definition
  updateJobDefinitionSuspensionState(jobDefinitionId: string, suspended: boolean): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/job-definition/${jobDefinitionId}/suspended`, {
      suspended,
      includeJobs: true
    });
  }

  // Get called process definitions (Call Activities) - merge running and static
  getCalledProcessDefinitions(processDefinitionId: string): Observable<CalledProcessDefinition[]> {
    return forkJoin({
      // Get running called process definitions
      running: this.http.post<any[]>(
        `${this.baseUrl}/process-definition/${processDefinitionId}/called-process-definitions`,
        {}
      ).pipe(catchError(() => of([]))),
      // Get static called process definitions
      static: this.http.get<any[]>(
        `${this.baseUrl}/process-definition/${processDefinitionId}/static-called-process-definitions`
      ).pipe(catchError(() => of([])))
    }).pipe(
      map(({ running, static: staticDefs }) => this.mergeCalledProcessDefinitions(running, staticDefs, processDefinitionId)),
      catchError(() => of([]))
    );
  }

  // Merge running instances and static references (like AngularJS)
  private mergeCalledProcessDefinitions(
    running: any[],
    staticDefs: any[],
    callingProcessDefinitionId: string
  ): CalledProcessDefinition[] {
    const map = new Map<string, CalledProcessDefinition>();

    // Process running instances
    running.forEach(dto => {
      map.set(dto.id, {
        id: dto.id,
        key: dto.key,
        name: dto.name,
        version: dto.version,
        calledFromActivityIds: dto.calledFromActivityIds || [],
        callingProcessDefinitionId,
        state: 'running'
      });
    });

    // Process static references and merge
    staticDefs.forEach(dto => {
      if (map.has(dto.id)) {
        // Merge - both running and referenced
        const existing = map.get(dto.id)!;
        const merged = new Set([...existing.calledFromActivityIds, ...(dto.calledFromActivityIds || [])]);
        existing.calledFromActivityIds = Array.from(merged).sort();
        existing.state = 'running-and-referenced';
      } else {
        // Only statically referenced
        map.set(dto.id, {
          id: dto.id,
          key: dto.key,
          name: dto.name,
          version: dto.version,
          calledFromActivityIds: (dto.calledFromActivityIds || []).sort(),
          callingProcessDefinitionId,
          state: 'referenced'
        });
      }
    });

    return Array.from(map.values());
  }

  // Runtime activity instance tree for a running process instance
  getActivityInstanceTree(processInstanceId: string): Observable<ActivityInstanceTree | null> {
    return this.http.get<ActivityInstanceTree>(
      `${this.baseUrl}/process-instance/${processInstanceId}/activity-instances`
    ).pipe(catchError(() => of(null)));
  }

  // Process Instances
  getProcessInstances(params?: ProcessQueryParams): Observable<ProcessInstance[]> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.processDefinitionKey) {
        httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
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

    // Always set maxResults to avoid "unbound results" error
    const maxResults = params?.maxResults ?? 100;
    httpParams = httpParams.set('maxResults', maxResults.toString());

    return this.http.get<ProcessInstance[]>(`${this.historyUrl}/process-instance`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  getProcessInstancesCount(params?: ProcessQueryParams): Observable<number> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.processDefinitionKey) {
        httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
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

  getProcessInstance(id: string): Observable<ProcessInstanceDetail | null> {
    return this.http.get<ProcessInstanceDetail>(`${this.historyUrl}/process-instance/${id}`)
      .pipe(catchError(() => of(null)));
  }

  getProcessInstanceVariables(id: string, maxResults: number = 1000): Observable<Variable[]> {
    return this.http.get<Variable[]>(`${this.historyUrl}/variable-instance`, {
      params: { processInstanceId: id, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  getProcessInstanceActivities(id: string, maxResults: number = 1000): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.historyUrl}/activity-instance`, {
      params: { processInstanceId: id, sortBy: 'startTime', sortOrder: 'desc', maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  getProcessInstanceIncidents(id: string, maxResults: number = 1000): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/incident`, {
      params: { processInstanceId: id, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  // ============================================
  // Decision Definitions
  // ============================================

  getDecisionDefinitions(maxResults: number = 1000): Observable<DecisionDefinition[]> {
    return this.http.get<DecisionDefinition[]>(`${this.baseUrl}/decision-definition`, {
      params: { latestVersion: 'true', sortBy: 'name', sortOrder: 'asc', maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  getDecisionDefinition(id: string): Observable<DecisionDefinition | null> {
    return this.http.get<DecisionDefinition>(`${this.baseUrl}/decision-definition/${id}`)
      .pipe(catchError(() => of(null)));
  }

  // Get all versions of a decision definition by key
  getDecisionDefinitionVersions(key: string, tenantId?: string): Observable<DecisionDefinition[]> {
    let params: any = { key, sortBy: 'version', sortOrder: 'desc', maxResults: '100' };
    if (tenantId) {
      params.tenantIdIn = tenantId;
    } else {
      params.withoutTenantId = 'true';
    }
    return this.http.get<DecisionDefinition[]>(`${this.baseUrl}/decision-definition`, { params })
      .pipe(catchError(() => of([])));
  }

  // Get decision definitions count
  getDecisionDefinitionsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/decision-definition/count`, {
      params: { latestVersion: 'true' }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  // Get decision definitions with pagination and sorting (for table view)
  getDecisionDefinitionsPaginated(params: {
    firstResult?: number;
    maxResults?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    latestVersion?: boolean;
  }): Observable<DecisionDefinition[]> {
    let httpParams = new HttpParams();
    if (params.firstResult !== undefined) {
      httpParams = httpParams.set('firstResult', params.firstResult.toString());
    }
    if (params.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) {
        httpParams = httpParams.set('sortOrder', params.sortOrder);
      }
    }
    if (params.latestVersion !== false) {
      httpParams = httpParams.set('latestVersion', 'true');
    }
    return this.http.get<DecisionDefinition[]>(`${this.baseUrl}/decision-definition`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  // Get DMN XML for a decision definition
  getDecisionXml(decisionDefinitionId: string): Observable<{ id: string; dmnXml: string } | null> {
    return this.http.get<{ id: string; dmnXml: string }>(`${this.baseUrl}/decision-definition/${decisionDefinitionId}/xml`)
      .pipe(catchError(() => of(null)));
  }

  // ============================================
  // Decision Requirements Definition (DRD)
  // ============================================

  getDecisionRequirementsDefinitions(maxResults: number = 1000): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/decision-requirements-definition`, {
      params: { latestVersion: 'true', sortBy: 'name', sortOrder: 'asc', maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  getDecisionRequirementsDefinition(id: string): Observable<any | null> {
    return this.http.get<any>(`${this.baseUrl}/decision-requirements-definition/${id}`)
      .pipe(catchError(() => of(null)));
  }

  // ============================================
  // Decision Instances
  // ============================================

  getDecisionInstances(definitionId?: string, maxResults: number = 100): Observable<DecisionInstance[]> {
    let httpParams = new HttpParams()
      .set('sortBy', 'evaluationTime')
      .set('sortOrder', 'desc')
      .set('maxResults', maxResults.toString());

    if (definitionId) {
      httpParams = httpParams.set('decisionDefinitionId', definitionId);
    }

    return this.http.get<DecisionInstance[]>(`${this.historyUrl}/decision-instance`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  // Get decision instances with advanced filtering (for table view)
  getDecisionInstancesPaginated(params: {
    decisionDefinitionId?: string;
    decisionDefinitionKey?: string;
    processDefinitionId?: string;
    processDefinitionKey?: string;
    processInstanceId?: string;
    caseDefinitionId?: string;
    caseDefinitionKey?: string;
    caseInstanceId?: string;
    activityIdIn?: string[];
    activityInstanceIdIn?: string[];
    evaluatedBefore?: string;
    evaluatedAfter?: string;
    firstResult?: number;
    maxResults?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeInputs?: boolean;
    includeOutputs?: boolean;
  }): Observable<DecisionInstance[]> {
    let httpParams = new HttpParams();

    if (params.decisionDefinitionId) {
      httpParams = httpParams.set('decisionDefinitionId', params.decisionDefinitionId);
    }
    if (params.decisionDefinitionKey) {
      httpParams = httpParams.set('decisionDefinitionKey', params.decisionDefinitionKey);
    }
    if (params.processDefinitionId) {
      httpParams = httpParams.set('processDefinitionId', params.processDefinitionId);
    }
    if (params.processDefinitionKey) {
      httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
    }
    if (params.processInstanceId) {
      httpParams = httpParams.set('processInstanceId', params.processInstanceId);
    }
    if (params.caseDefinitionId) {
      httpParams = httpParams.set('caseDefinitionId', params.caseDefinitionId);
    }
    if (params.caseDefinitionKey) {
      httpParams = httpParams.set('caseDefinitionKey', params.caseDefinitionKey);
    }
    if (params.caseInstanceId) {
      httpParams = httpParams.set('caseInstanceId', params.caseInstanceId);
    }
    if (params.activityIdIn?.length) {
      httpParams = httpParams.set('activityIdIn', params.activityIdIn.join(','));
    }
    if (params.activityInstanceIdIn?.length) {
      httpParams = httpParams.set('activityInstanceIdIn', params.activityInstanceIdIn.join(','));
    }
    if (params.evaluatedBefore) {
      httpParams = httpParams.set('evaluatedBefore', params.evaluatedBefore);
    }
    if (params.evaluatedAfter) {
      httpParams = httpParams.set('evaluatedAfter', params.evaluatedAfter);
    }
    if (params.firstResult !== undefined) {
      httpParams = httpParams.set('firstResult', params.firstResult.toString());
    }
    if (params.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) {
        httpParams = httpParams.set('sortOrder', params.sortOrder);
      }
    }
    if (params.includeInputs) {
      httpParams = httpParams.set('includeInputs', 'true');
    }
    if (params.includeOutputs) {
      httpParams = httpParams.set('includeOutputs', 'true');
    }

    return this.http.get<DecisionInstance[]>(`${this.historyUrl}/decision-instance`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  // Get decision instances count
  getDecisionInstancesCount(decisionDefinitionId?: string): Observable<number> {
    let httpParams = new HttpParams();
    if (decisionDefinitionId) {
      httpParams = httpParams.set('decisionDefinitionId', decisionDefinitionId);
    }
    return this.http.get<{ count: number }>(`${this.historyUrl}/decision-instance/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  getDecisionInstance(id: string): Observable<DecisionInstance | null> {
    return this.http.get<DecisionInstance[]>(`${this.historyUrl}/decision-instance`, {
      params: {
        decisionInstanceId: id,
        includeInputs: 'true',
        includeOutputs: 'true',
        disableBinaryFetching: 'true',
        disableCustomObjectDeserialization: 'true',
        maxResults: '1'
      }
    }).pipe(
      map(results => results.length > 0 ? results[0] : null),
      catchError(() => of(null))
    );
  }

  // Tasks
  getTasks(params?: TaskQueryParams): Observable<Task[]> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.assignee) {
        httpParams = httpParams.set('assignee', params.assignee);
      }
      if (params.candidateGroup) {
        httpParams = httpParams.set('candidateGroup', params.candidateGroup);
      }
      if (params.processDefinitionKey) {
        httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
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

    // Always set maxResults to avoid "unbound results" error
    const maxResults = params?.maxResults ?? 100;
    httpParams = httpParams.set('maxResults', maxResults.toString());

    return this.http.get<Task[]>(`${this.baseUrl}/task`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  getTasksCount(params?: TaskQueryParams): Observable<number> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.assignee) {
        httpParams = httpParams.set('assignee', params.assignee);
      }
      if (params.candidateGroup) {
        httpParams = httpParams.set('candidateGroup', params.candidateGroup);
      }
      if (params.processDefinitionKey) {
        httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
      }
    }

    return this.http.get<{ count: number }>(`${this.baseUrl}/task/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  getTask(id: string): Observable<Task | null> {
    return this.http.get<Task>(`${this.baseUrl}/task/${id}`)
      .pipe(catchError(() => of(null)));
  }

  // ============================================
  // Process Definition Versions
  // ============================================

  // Get all versions of a process definition by key
  getProcessDefinitionVersions(key: string): Observable<ProcessDefinition[]> {
    return this.http.get<ProcessDefinition[]>(`${this.baseUrl}/process-definition`, {
      params: { key, sortBy: 'version', sortOrder: 'desc', maxResults: '100' }
    }).pipe(catchError(() => of([])));
  }

  // Get process definitions with statistics (not aggregated - per version)
  getProcessDefinitionsStatisticsRaw(includeIncidents = true): Observable<ProcessDefinitionStatistics[]> {
    let params = new HttpParams();
    if (includeIncidents) {
      params = params.set('incidents', 'true');
    }
    return this.http.get<ProcessDefinitionStatistics[]>(
      `${this.baseUrl}/process-definition/statistics`,
      { params }
    ).pipe(catchError(() => of([])));
  }

  // ============================================
  // Jobs
  // ============================================

  // Get jobs for a process instance
  getJobsByProcessInstance(processInstanceId: string, maxResults = 100): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.baseUrl}/job`, {
      params: { processInstanceId, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  // Get job by ID
  getJob(id: string): Observable<Job | null> {
    return this.http.get<Job>(`${this.baseUrl}/job/${id}`)
      .pipe(catchError(() => of(null)));
  }

  // Retry a failed job
  retryJob(jobId: string, retries: number = 1): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/job/${jobId}/retries`, { retries })
      .pipe(catchError(() => of(void 0)));
  }

  // Set job retries in bulk
  setJobRetriesByProcessInstance(processInstanceId: string, retries: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/job/retries`, {
      processInstances: [processInstanceId],
      retries
    }).pipe(catchError(() => of(void 0)));
  }

  // Suspend a job
  suspendJob(jobId: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/job/${jobId}/suspended`, { suspended: true })
      .pipe(catchError(() => of(void 0)));
  }

  // Resume a job
  resumeJob(jobId: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/job/${jobId}/suspended`, { suspended: false })
      .pipe(catchError(() => of(void 0)));
  }

  // Recalculate job due date
  recalculateJobDueDate(jobId: string, creationDateBased = false): Observable<void> {
    let httpParams = new HttpParams();
    if (creationDateBased) {
      httpParams = httpParams.set('creationDateBased', 'true');
    }
    return this.http.post<void>(`${this.baseUrl}/job/${jobId}/duedate/recalculate`, null, { params: httpParams })
      .pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // User Tasks
  // ============================================

  // Get user tasks for a process instance
  getUserTasksByProcessInstance(processInstanceId: string, maxResults = 100): Observable<UserTask[]> {
    return this.http.get<UserTask[]>(`${this.baseUrl}/task`, {
      params: { processInstanceId, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  // Get history user tasks for a process instance
  getHistoryUserTasksByProcessInstance(processInstanceId: string, maxResults = 100): Observable<UserTask[]> {
    return this.http.get<any[]>(`${this.historyUrl}/task`, {
      params: { processInstanceId, maxResults: maxResults.toString(), sortBy: 'startTime', sortOrder: 'desc' }
    }).pipe(
      map(tasks => tasks.map(t => ({
        ...t,
        created: t.startTime
      }))),
      catchError(() => of([]))
    );
  }

  // Set task assignee
  setTaskAssignee(taskId: string, userId: string | null): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/assignee`, { userId })
      .pipe(catchError(() => of(void 0)));
  }

  // Set task owner
  setTaskOwner(taskId: string, userId: string | null): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/owner`, { userId })
      .pipe(catchError(() => of(void 0)));
  }

  // Get task identity links (candidate users/groups)
  getTaskIdentityLinks(taskId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/task/${taskId}/identity-links`)
      .pipe(catchError(() => of([])));
  }

  // Add task identity link
  addTaskIdentityLink(taskId: string, userId: string | null, groupId: string | null, type: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/identity-links`, { userId, groupId, type })
      .pipe(catchError(() => of(void 0)));
  }

  // Delete task identity link
  deleteTaskIdentityLink(taskId: string, userId: string | null, groupId: string | null, type: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/task/${taskId}/identity-links/delete`, { userId, groupId, type })
      .pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // Called Process Instances (Sub-processes)
  // ============================================

  // Get called process instances (sub-processes) for a process instance
  getCalledProcessInstances(superProcessInstanceId: string, maxResults = 100): Observable<ProcessInstance[]> {
    return this.http.get<ProcessInstance[]>(`${this.historyUrl}/process-instance`, {
      params: { superProcessInstanceId, maxResults: maxResults.toString(), sortBy: 'startTime', sortOrder: 'desc' }
    }).pipe(catchError(() => of([])));
  }

  // Get super (parent) process instance
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

  // ============================================
  // External Tasks
  // ============================================

  // Get external tasks for a process instance
  getExternalTasksByProcessInstance(processInstanceId: string, maxResults = 100): Observable<ExternalTask[]> {
    return this.http.get<ExternalTask[]>(`${this.baseUrl}/external-task`, {
      params: { processInstanceId, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  // Retry external task
  retryExternalTask(externalTaskId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/external-task/${externalTaskId}/retries`, { retries: 1 })
      .pipe(catchError(() => of(void 0)));
  }

  // Set external task retries in bulk for a process instance
  setExternalTaskRetriesByProcessInstance(processInstanceId: string, retries: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/external-task/retries`, {
      processInstanceId,
      retries
    }).pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // Process Instance Actions
  // ============================================

  // Cancel a process instance
  cancelProcessInstance(processInstanceId: string, deleteReason?: string): Observable<void> {
    const params: any = {};
    if (deleteReason) {
      params.deleteReason = deleteReason;
    }
    return this.http.delete<void>(`${this.baseUrl}/process-instance/${processInstanceId}`, { params })
      .pipe(catchError(() => of(void 0)));
  }

  // Suspend a process instance
  suspendProcessInstance(processInstanceId: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/suspended`,
      { suspended: true }
    ).pipe(catchError(() => of(void 0)));
  }

  // Resume (activate) a process instance
  resumeProcessInstance(processInstanceId: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/suspended`,
      { suspended: false }
    ).pipe(catchError(() => of(void 0)));
  }

  // Suspend all instances of a process definition
  suspendProcessDefinition(processDefinitionId: string, includeInstances = true): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/suspended`,
      { suspended: true, includeProcessInstances: includeInstances }
    ).pipe(catchError(() => of(void 0)));
  }

  // Resume all instances of a process definition
  resumeProcessDefinition(processDefinitionId: string, includeInstances = true): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/suspended`,
      { suspended: false, includeProcessInstances: includeInstances }
    ).pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // Variables Management
  // ============================================

  // Set a variable on a process instance
  setProcessInstanceVariable(processInstanceId: string, variableName: string, value: any, type: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/variables/${variableName}`,
      { value, type }
    ).pipe(catchError(() => of(void 0)));
  }

  // Delete a variable from a process instance
  deleteProcessInstanceVariable(processInstanceId: string, variableName: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/variables/${variableName}`
    ).pipe(catchError(() => of(void 0)));
  }

  // Set multiple variables at once
  setProcessInstanceVariables(processInstanceId: string, modifications: Record<string, { value: any; type: string }>): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/process-instance/${processInstanceId}/variables`,
      { modifications }
    ).pipe(catchError(() => of(void 0)));
  }

  // ============================================
  // Enhanced Process Instance Filtering (POST)
  // ============================================

  // Query process instances with POST (supports complex filters)
  queryProcessInstances(body: any, firstResult = 0, maxResults = 100): Observable<ProcessInstance[]> {
    return this.http.post<ProcessInstance[]>(
      `${this.historyUrl}/process-instance`,
      body,
      { params: { firstResult: firstResult.toString(), maxResults: maxResults.toString() } }
    ).pipe(catchError(() => of([])));
  }

  // Count process instances with POST (supports complex filters)
  queryProcessInstancesCount(body: any): Observable<number> {
    // Remove sorting from count query - count endpoint doesn't support it
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
  // History Incidents
  // ============================================

  // Get history incidents for a process instance
  getHistoryIncidents(processInstanceId: string, maxResults = 100): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.historyUrl}/incident`, {
      params: { processInstanceId, maxResults: maxResults.toString(), sortBy: 'createTime', sortOrder: 'desc' }
    }).pipe(catchError(() => of([])));
  }

  // ============================================
  // Task Dashboard Statistics (History API)
  // ============================================

  // Get history task count with filters (for dashboard statistics)
  getHistoryTaskCount(params: {
    unfinished?: boolean;
    assigned?: boolean;
    unassigned?: boolean;
    withCandidateGroups?: boolean;
    withoutCandidateGroups?: boolean;
  }): Observable<number> {
    let httpParams = new HttpParams();
    if (params.unfinished) httpParams = httpParams.set('unfinished', 'true');
    if (params.assigned) httpParams = httpParams.set('assigned', 'true');
    if (params.unassigned) httpParams = httpParams.set('unassigned', 'true');
    if (params.withCandidateGroups) httpParams = httpParams.set('withCandidateGroups', 'true');
    if (params.withoutCandidateGroups) httpParams = httpParams.set('withoutCandidateGroups', 'true');

    return this.http.get<{ count: number }>(`${this.historyUrl}/task/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  // Get task count by candidate group
  getTaskCountByCandidateGroup(): Observable<TaskGroupCount[]> {
    return this.http.get<TaskGroupCount[]>(`${this.baseUrl}/task/report/candidate-group-count`)
      .pipe(catchError(() => of([])));
  }

  // Get groups by IDs
  getGroupsByIds(ids: string[]): Observable<Group[]> {
    if (!ids.length) return of([]);
    return this.http.get<Group[]>(`${this.baseUrl}/group`, {
      params: { idIn: ids.join(','), maxResults: ids.length.toString() }
    }).pipe(catchError(() => of([])));
  }

  // ============================================
  // Enhanced Tasks API
  // ============================================

  // Get tasks with full parameters
  getTasksWithParams(params: TaskQueryParams): Observable<Task[]> {
    let httpParams = new HttpParams();

    if (params.assignee) httpParams = httpParams.set('assignee', params.assignee);
    if (params.assigneeLike) httpParams = httpParams.set('assigneeLike', params.assigneeLike);
    if (params.candidateGroup) httpParams = httpParams.set('candidateGroup', params.candidateGroup);
    if (params.candidateUser) httpParams = httpParams.set('candidateUser', params.candidateUser);
    if (params.processDefinitionKey) httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
    if (params.processDefinitionId) httpParams = httpParams.set('processDefinitionId', params.processDefinitionId);
    if (params.processInstanceId) httpParams = httpParams.set('processInstanceId', params.processInstanceId);
    if (params.activityInstanceIdIn?.length) httpParams = httpParams.set('activityInstanceIdIn', params.activityInstanceIdIn.join(','));
    if (params.assigned) httpParams = httpParams.set('assigned', 'true');
    if (params.unassigned) httpParams = httpParams.set('unassigned', 'true');
    if (params.withCandidateGroups) httpParams = httpParams.set('withCandidateGroups', 'true');
    if (params.withoutCandidateGroups) httpParams = httpParams.set('withoutCandidateGroups', 'true');
    if (params.firstResult !== undefined) httpParams = httpParams.set('firstResult', params.firstResult.toString());
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    const maxResults = params.maxResults ?? 100;
    httpParams = httpParams.set('maxResults', maxResults.toString());

    return this.http.get<Task[]>(`${this.baseUrl}/task`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  // Get tasks count with full parameters
  getTasksCountWithParams(params: TaskQueryParams): Observable<number> {
    let httpParams = new HttpParams();

    if (params.assignee) httpParams = httpParams.set('assignee', params.assignee);
    if (params.assigneeLike) httpParams = httpParams.set('assigneeLike', params.assigneeLike);
    if (params.candidateGroup) httpParams = httpParams.set('candidateGroup', params.candidateGroup);
    if (params.candidateUser) httpParams = httpParams.set('candidateUser', params.candidateUser);
    if (params.processDefinitionKey) httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
    if (params.processDefinitionId) httpParams = httpParams.set('processDefinitionId', params.processDefinitionId);
    if (params.processInstanceId) httpParams = httpParams.set('processInstanceId', params.processInstanceId);
    if (params.activityInstanceIdIn?.length) httpParams = httpParams.set('activityInstanceIdIn', params.activityInstanceIdIn.join(','));
    if (params.assigned) httpParams = httpParams.set('assigned', 'true');
    if (params.unassigned) httpParams = httpParams.set('unassigned', 'true');
    if (params.withCandidateGroups) httpParams = httpParams.set('withCandidateGroups', 'true');
    if (params.withoutCandidateGroups) httpParams = httpParams.set('withoutCandidateGroups', 'true');

    return this.http.get<{ count: number }>(`${this.baseUrl}/task/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  // Get all external tasks
  getExternalTasks(params?: {
    processInstanceId?: string;
    activityIdIn?: string[];
    topicName?: string;
    workerId?: string;
    locked?: boolean;
    notLocked?: boolean;
    withRetriesLeft?: boolean;
    noRetriesLeft?: boolean;
    suspended?: boolean;
    active?: boolean;
    firstResult?: number;
    maxResults?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<ExternalTask[]> {
    let httpParams = new HttpParams();

    if (params?.processInstanceId) httpParams = httpParams.set('processInstanceId', params.processInstanceId);
    if (params?.activityIdIn?.length) httpParams = httpParams.set('activityIdIn', params.activityIdIn.join(','));
    if (params?.topicName) httpParams = httpParams.set('topicName', params.topicName);
    if (params?.workerId) httpParams = httpParams.set('workerId', params.workerId);
    if (params?.locked) httpParams = httpParams.set('locked', 'true');
    if (params?.notLocked) httpParams = httpParams.set('notLocked', 'true');
    if (params?.withRetriesLeft) httpParams = httpParams.set('withRetriesLeft', 'true');
    if (params?.noRetriesLeft) httpParams = httpParams.set('noRetriesLeft', 'true');
    if (params?.suspended) httpParams = httpParams.set('suspended', 'true');
    if (params?.active) httpParams = httpParams.set('active', 'true');
    if (params?.firstResult !== undefined) httpParams = httpParams.set('firstResult', params.firstResult.toString());
    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
      if (params?.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    const maxResults = params?.maxResults ?? 100;
    httpParams = httpParams.set('maxResults', maxResults.toString());

    return this.http.get<ExternalTask[]>(`${this.baseUrl}/external-task`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  // Get external tasks count
  getExternalTasksCount(params?: {
    processInstanceId?: string;
    activityIdIn?: string[];
    topicName?: string;
    workerId?: string;
  }): Observable<number> {
    let httpParams = new HttpParams();

    if (params?.processInstanceId) httpParams = httpParams.set('processInstanceId', params.processInstanceId);
    if (params?.activityIdIn?.length) httpParams = httpParams.set('activityIdIn', params.activityIdIn.join(','));
    if (params?.topicName) httpParams = httpParams.set('topicName', params.topicName);
    if (params?.workerId) httpParams = httpParams.set('workerId', params.workerId);

    return this.http.get<{ count: number }>(`${this.baseUrl}/external-task/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  // ============================================
  // Dashboard Charts API Methods
  // ============================================

  /**
   * Get count of suspended process instances
   */
  getSuspendedProcessCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-instance/count`, {
      params: { suspended: 'true' }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get count of finished process instances (from history)
   */
  getFinishedProcessCount(params?: {
    finishedAfter?: string;
    finishedBefore?: string;
  }): Observable<number> {
    let httpParams = new HttpParams().set('finished', 'true');
    if (params?.finishedAfter) {
      httpParams = httpParams.set('finishedAfter', params.finishedAfter);
    }
    if (params?.finishedBefore) {
      httpParams = httpParams.set('finishedBefore', params.finishedBefore);
    }
    return this.http.get<{ count: number }>(`${this.historyUrl}/process-instance/count`, {
      params: httpParams
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get process stats for charts (active, suspended, completed)
   */
  getProcessStatsForChart(): Observable<{
    active: number;
    suspended: number;
    completed: number;
  }> {
    return forkJoin({
      active: this.getRunningProcessCount(),
      suspended: this.getSuspendedProcessCount(),
      completed: this.getFinishedProcessCount()
    });
  }

  /**
   * Get task stats for charts (assigned, with candidate groups, without)
   * Categories are mutually exclusive to match AngularJS behavior:
   * - assigned: tasks assigned to a specific user
   * - unassigned: unassigned tasks that have candidate groups (assigned to a group)
   * - withoutCandidateGroups: unassigned tasks without any candidate groups
   */
  getTaskStatsForChart(): Observable<{
    assigned: number;
    unassigned: number;
    withCandidateGroups: number;
    withoutCandidateGroups: number;
  }> {
    return forkJoin({
      // Tasks assigned to a specific user
      assigned: this.getTasksCountWithParams({ assigned: true }),
      // Unassigned tasks with candidate groups (assigned to a group)
      unassigned: this.getTasksCountWithParams({ unassigned: true, withCandidateGroups: true }),
      // Keep for compatibility
      withCandidateGroups: this.getTasksCountWithParams({ unassigned: true, withCandidateGroups: true }),
      // Unassigned tasks without any candidate groups (completely unassigned)
      withoutCandidateGroups: this.getTasksCountWithParams({ unassigned: true, withoutCandidateGroups: true })
    });
  }

  /**
   * Get incidents grouped by type
   */
  getIncidentsByType(): Observable<{ type: string; count: number }[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/incident`, {
      params: { maxResults: '10000' }
    }).pipe(
      map(incidents => {
        const grouped = incidents.reduce((acc, inc) => {
          const type = inc.incidentType || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get incidents aggregated by process definition
   * Uses /process-definition/statistics?rootIncidents=true to match AngularJS behavior
   * This only counts ROOT incidents (where incident.id = incident.rootCauseIncidentId)
   */
  getIncidentsByProcess(): Observable<{
    processKey: string;
    processName: string;
    incidentCount: number;
    instances: number;
  }[]> {
    // Use the same endpoint as AngularJS: /process-definition/statistics?rootIncidents=true
    return this.http.get<ProcessDefinitionStatistics[]>(
      `${this.baseUrl}/process-definition/statistics`,
      { params: { rootIncidents: 'true' } }
    ).pipe(
      map(stats => {
        // Aggregate by process key (combine all versions)
        const aggregatedMap = new Map<string, {
          key: string;
          name: string;
          incidentCount: number;
          instances: number;
        }>();

        stats.forEach(stat => {
          const key = stat.definition?.key || stat.id;
          const name = stat.definition?.name || stat.definition?.key || stat.id;
          const incidentCount = stat.incidents?.reduce((sum, inc) => sum + inc.incidentCount, 0) || 0;

          if (incidentCount > 0) {
            const existing = aggregatedMap.get(key);
            if (existing) {
              existing.incidentCount += incidentCount;
              existing.instances += stat.instances;
            } else {
              aggregatedMap.set(key, {
                key,
                name,
                incidentCount,
                instances: stat.instances
              });
            }
          }
        });

        const result = Array.from(aggregatedMap.values())
          .map(item => ({
            processKey: item.key,
            processName: item.name,
            incidentCount: item.incidentCount,
            instances: item.instances
          }))
          .sort((a, b) => b.incidentCount - a.incidentCount);

        return result;
      }),
      catchError((err) => {
        console.error('[CockpitService] Error fetching incidents:', err);
        return of([]);
      })
    );
  }

  /**
   * Get process instances timeline data for a given number of days
   */
  getProcessInstancesTimeline(days: number): Observable<{
    date: string;
    started: number;
    completed: number;
  }[]> {
    const results: Observable<{ date: string; started: number; completed: number }>[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toISOString().split('T')[0];
      const startOfDay = `${dateStr}T00:00:00.000+0000`;
      const endOfDay = `${dateStr}T23:59:59.999+0000`;

      results.push(
        forkJoin({
          started: this.getProcessInstancesCount({
            startedAfter: startOfDay,
            startedBefore: endOfDay
          }),
          completed: this.getFinishedProcessCount({
            finishedAfter: startOfDay,
            finishedBefore: endOfDay
          })
        }).pipe(
          map(r => ({ date: dateStr, ...r }))
        )
      );
    }

    return forkJoin(results);
  }

  /**
   * Get process distribution (instances per process definition)
   */
  getProcessDistribution(): Observable<{
    key: string;
    name: string;
    instanceCount: number;
    percentage: number;
  }[]> {
    return this.getProcessDefinitionsWithStatistics(false).pipe(
      map(stats => {
        const totalInstances = stats.reduce((sum, s) => sum + s.instances, 0);

        return stats
          .filter(s => s.instances > 0)
          .map(s => ({
            key: s.definition?.key || s.id,
            name: s.definition?.name || s.definition?.key || s.id,
            instanceCount: s.instances,
            percentage: totalInstances > 0 ? (s.instances / totalInstances) * 100 : 0
          }))
          .sort((a, b) => b.instanceCount - a.instanceCount);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get tasks grouped by candidate group with group names
   */
  getTasksByGroupWithNames(): Observable<{
    groupId: string;
    groupName: string;
    taskCount: number;
  }[]> {
    return this.getTaskCountByCandidateGroup().pipe(
      map(groups => {
        // Filter out null group names and map to required format
        return groups
          .filter(g => g.groupName !== null)
          .map(g => ({
            groupId: g.id || g.groupName || 'unknown',
            groupName: g.groupName || 'Unknown Group',
            taskCount: g.taskCount
          }))
          .sort((a, b) => b.taskCount - a.taskCount);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get all dashboard charts data in a single call
   */
  getDashboardChartsData(): Observable<{
    processStats: { active: number; suspended: number; completed: number };
    taskStats: { assigned: number; unassigned: number; withCandidateGroups: number; withoutCandidateGroups: number };
    incidentsByType: { type: string; count: number }[];
    incidentsByProcess: { processKey: string; processName: string; incidentCount: number; instances: number }[];
    tasksByGroup: { groupId: string; groupName: string; taskCount: number }[];
    processDistribution: { key: string; name: string; instanceCount: number; percentage: number }[];
  }> {
    return forkJoin({
      processStats: this.getProcessStatsForChart(),
      taskStats: this.getTaskStatsForChart(),
      incidentsByType: this.getIncidentsByType(),
      incidentsByProcess: this.getIncidentsByProcess(),
      tasksByGroup: this.getTasksByGroupWithNames(),
      processDistribution: this.getProcessDistribution()
    });
  }

  // ============================================
  // Deployments API
  // ============================================

  /**
   * Get deployments with optional filtering and pagination
   */
  getDeployments(params?: DeploymentQueryParams): Observable<Deployment[]> {
    let httpParams = new HttpParams();

    if (params?.id) httpParams = httpParams.set('id', params.id);
    if (params?.name) httpParams = httpParams.set('name', params.name);
    if (params?.nameLike) httpParams = httpParams.set('nameLike', params.nameLike);
    if (params?.source) httpParams = httpParams.set('source', params.source);
    if (params?.withoutSource) httpParams = httpParams.set('withoutSource', 'true');
    if (params?.tenantIdIn?.length) httpParams = httpParams.set('tenantIdIn', params.tenantIdIn.join(','));
    if (params?.withoutTenantId) httpParams = httpParams.set('withoutTenantId', 'true');
    if (params?.deploymentBefore) httpParams = httpParams.set('before', params.deploymentBefore);
    if (params?.deploymentAfter) httpParams = httpParams.set('after', params.deploymentAfter);
    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
      if (params?.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    }
    if (params?.firstResult !== undefined) httpParams = httpParams.set('firstResult', params.firstResult.toString());

    const maxResults = params?.maxResults ?? 50;
    httpParams = httpParams.set('maxResults', maxResults.toString());

    return this.http.get<Deployment[]>(`${this.baseUrl}/deployment`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  /**
   * Get deployments count with optional filtering
   */
  getDeploymentsCountWithParams(params?: DeploymentQueryParams): Observable<number> {
    let httpParams = new HttpParams();

    if (params?.id) httpParams = httpParams.set('id', params.id);
    if (params?.name) httpParams = httpParams.set('name', params.name);
    if (params?.nameLike) httpParams = httpParams.set('nameLike', params.nameLike);
    if (params?.source) httpParams = httpParams.set('source', params.source);
    if (params?.withoutSource) httpParams = httpParams.set('withoutSource', 'true');
    if (params?.tenantIdIn?.length) httpParams = httpParams.set('tenantIdIn', params.tenantIdIn.join(','));
    if (params?.withoutTenantId) httpParams = httpParams.set('withoutTenantId', 'true');
    if (params?.deploymentBefore) httpParams = httpParams.set('before', params.deploymentBefore);
    if (params?.deploymentAfter) httpParams = httpParams.set('after', params.deploymentAfter);

    return this.http.get<{ count: number }>(`${this.baseUrl}/deployment/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  /**
   * Delete a deployment with optional cascade and skip options
   */
  deleteDeployment(id: string, options?: {
    cascade?: boolean;
    skipCustomListeners?: boolean;
    skipIoMappings?: boolean;
  }): Observable<void> {
    let httpParams = new HttpParams();

    if (options?.cascade) httpParams = httpParams.set('cascade', 'true');
    if (options?.skipCustomListeners) httpParams = httpParams.set('skipCustomListeners', 'true');
    if (options?.skipIoMappings) httpParams = httpParams.set('skipIoMappings', 'true');

    return this.http.delete<void>(`${this.baseUrl}/deployment/${id}`, { params: httpParams })
      .pipe(catchError((err) => {
        throw err;
      }));
  }

  /**
   * Get process instance count by deployment ID
   */
  getProcessInstanceCountByDeployment(deploymentId: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-instance/count`, {
      params: { deploymentId }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get case instance count by deployment ID
   */
  getCaseInstanceCountByDeployment(deploymentId: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/case-instance/count`, {
      params: { deploymentId }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  // ============================================
  // Deployment Resources API
  // ============================================

  /**
   * Get all resources for a deployment
   */
  getDeploymentResources(deploymentId: string): Observable<DeploymentResource[]> {
    return this.http.get<DeploymentResource[]>(`${this.baseUrl}/deployment/${deploymentId}/resources`)
      .pipe(catchError(() => of([])));
  }

  /**
   * Get a specific resource data (binary)
   */
  getDeploymentResourceData(deploymentId: string, resourceId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/deployment/${deploymentId}/resources/${resourceId}/data`, {
      responseType: 'blob'
    }).pipe(catchError(() => of(new Blob())));
  }

  /**
   * Get resource data as text (for BPMN XML, etc.)
   */
  getDeploymentResourceText(deploymentId: string, resourceId: string): Observable<string> {
    return this.http.get(`${this.baseUrl}/deployment/${deploymentId}/resources/${resourceId}/data`, {
      responseType: 'text'
    }).pipe(catchError(() => of('')));
  }

  /**
   * Get process definitions for a deployment
   */
  getProcessDefinitionsByDeployment(deploymentId: string): Observable<ProcessDefinition[]> {
    return this.http.get<ProcessDefinition[]>(`${this.baseUrl}/process-definition`, {
      params: { deploymentId, maxResults: '1000' }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get decision definitions for a deployment
   */
  getDecisionDefinitionsByDeployment(deploymentId: string): Observable<DecisionDefinition[]> {
    return this.http.get<DecisionDefinition[]>(`${this.baseUrl}/decision-definition`, {
      params: { deploymentId, maxResults: '1000' }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get case definitions for a deployment
   */
  getCaseDefinitionsByDeployment(deploymentId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/case-definition`, {
      params: { deploymentId, maxResults: '1000' }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get URL for downloading a resource
   */
  getResourceDownloadUrl(deploymentId: string, resourceId: string): string {
    return `${this.baseUrl}/deployment/${deploymentId}/resources/${resourceId}/data`;
  }
}
