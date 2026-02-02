import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  DashboardService,
  DashboardStats,
  DashboardChartsData,
  ProcessStats,
  TaskStats,
  IncidentByType,
  IncidentByProcess,
  TimelineDataPoint,
  ProcessDistributionItem,
  TasksByGroup
} from './dashboard.service';
import {
  ProcessDefinitionService,
  ProcessDefinition as PDProcessDefinition,
  ProcessDefinitionStatistics as PDStatistics,
  ActivityStatistics as PDActivityStatistics,
  CalledProcessDefinition as PDCalledProcessDefinition,
  JobDefinition as PDJobDefinition,
  Incident as PDIncident
} from './process-definition.service';
import {
  ProcessInstanceService,
  ProcessInstance as PIProcessInstance,
  ProcessInstanceDetail as PIProcessInstanceDetail,
  Variable as PIVariable,
  Activity as PIActivity,
  ActivityInstanceTree as PIActivityInstanceTree,
  Job as PIJob,
  ExternalTask as PIExternalTask,
  UserTask as PIUserTask
} from './process-instance.service';
import {
  DecisionService,
  DecisionDefinition as DDecisionDefinition,
  DecisionInstance as DDecisionInstance
} from './decision.service';
import {
  DeploymentService,
  Deployment as DDeployment,
  DeploymentResource as DDeploymentResource,
  DeploymentQueryParams as DDeploymentQueryParams,
  DeleteDeploymentOptions
} from './deployment.service';

// Re-export types for backward compatibility
// New code should import directly from the respective services

// Dashboard types - using export type for isolatedModules compatibility
export type {
  DashboardStats,
  DashboardChartsData,
  ProcessStats,
  TaskStats,
  IncidentByType,
  IncidentByProcess,
  TimelineDataPoint,
  ProcessDistributionItem,
  TasksByGroup
} from './dashboard.service';

// Interfaces pour les types de données

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
  clauseName?: string;
  type: string;
  value: any;
}

export interface DecisionOutput {
  clauseId: string;
  clauseName?: string;
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

/**
 * @deprecated This service is being refactored. Use the specialized services directly:
 * - DashboardService for dashboard statistics and charts
 * - ProcessDefinitionService for process definitions, BPMN XML, statistics
 * - ProcessInstanceService for process instances, variables, activities
 * - DecisionService for decision definitions and instances
 * - DeploymentService for deployments and resources
 *
 * This service remains for backward compatibility and delegates to the new services.
 */
@Injectable({
  providedIn: 'root'
})
export class CockpitService {
  private readonly baseUrl = '/orqueio/api/engine/engine/default';
  private readonly historyUrl = `${this.baseUrl}/history`;

  constructor(
    private http: HttpClient,
    private dashboardService: DashboardService,
    private processDefinitionService: ProcessDefinitionService,
    private processInstanceService: ProcessInstanceService,
    private decisionService: DecisionService,
    private deploymentService: DeploymentService
  ) {}

  // ============================================
  // Dashboard Statistics (delegated to DashboardService)
  // ============================================

  /**
   * Get main dashboard statistics
   * @deprecated Use DashboardService.getDashboardStats() directly for new code
   */
  getDashboardStats(): Observable<DashboardStats> {
    return this.dashboardService.getDashboardStats();
  }

  /**
   * Get count of running process instances
   * @deprecated Use DashboardService.getRunningProcessCount() directly for new code
   */
  getRunningProcessCount(): Observable<number> {
    return this.dashboardService.getRunningProcessCount();
  }

  /**
   * Get count of open incidents
   * @deprecated Use DashboardService.getOpenIncidentsCount() directly for new code
   */
  getOpenIncidentsCount(): Observable<number> {
    return this.dashboardService.getOpenIncidentsCount();
  }

  /**
   * Get count of open tasks
   * @deprecated Use DashboardService.getOpenTasksCount() directly for new code
   */
  getOpenTasksCount(): Observable<number> {
    return this.dashboardService.getOpenTasksCount();
  }

  /**
   * Get count of deployed definitions
   * @deprecated Use DashboardService.getDeployedDefinitionsCount() directly for new code
   */
  getDeployedDefinitionsCount(): Observable<number> {
    return this.dashboardService.getDeployedDefinitionsCount();
  }

  /**
   * Get count of process definitions (latest versions only)
   * @deprecated Use DashboardService.getProcessDefinitionsCount() directly for new code
   */
  getProcessDefinitionsCount(): Observable<number> {
    return this.dashboardService.getProcessDefinitionsCount();
  }

  /**
   * Get count of case definitions (latest versions only)
   * @deprecated Use DashboardService.getCaseDefinitionsCount() directly for new code
   */
  getCaseDefinitionsCount(): Observable<number> {
    return this.dashboardService.getCaseDefinitionsCount();
  }

  /**
   * Get count of deployments
   * @deprecated Use DashboardService.getDeploymentsCount() directly for new code
   */
  getDeploymentsCount(): Observable<number> {
    return this.dashboardService.getDeploymentsCount();
  }

  // ============================================
  // Process Definitions (delegated to ProcessDefinitionService)
  // ============================================

  /**
   * @deprecated Use ProcessDefinitionService.getProcessDefinitions() directly
   */
  getProcessDefinitions(maxResults: number = 1000): Observable<ProcessDefinition[]> {
    return this.processDefinitionService.getProcessDefinitions(maxResults);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getProcessDefinition() directly
   */
  getProcessDefinition(id: string): Observable<ProcessDefinition | null> {
    return this.processDefinitionService.getProcessDefinition(id);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getProcessDefinitionByKey() directly
   */
  getProcessDefinitionByKey(key: string): Observable<ProcessDefinition | null> {
    return this.processDefinitionService.getProcessDefinitionByKey(key);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getProcessDefinitionsWithStatistics() directly
   */
  getProcessDefinitionsWithStatistics(includeIncidents = true): Observable<ProcessDefinitionStatistics[]> {
    return this.processDefinitionService.getProcessDefinitionsWithStatistics(includeIncidents);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getRunningInstancesCount() directly
   */
  getRunningInstancesCount(processDefinitionKey: string): Observable<number> {
    return this.processDefinitionService.getRunningInstancesCount(processDefinitionKey);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getBpmn20Xml() directly
   */
  getBpmn20Xml(processDefinitionId: string): Observable<{ bpmn20Xml: string } | null> {
    return this.processDefinitionService.getBpmn20Xml(processDefinitionId);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getActivityStatistics() directly
   */
  getActivityStatistics(processDefinitionId: string, includeIncidents = true): Observable<ActivityStatistics[]> {
    return this.processDefinitionService.getActivityStatistics(processDefinitionId, includeIncidents);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getIncidentsByProcessDefinitionKey() directly
   */
  getIncidentsByProcessDefinitionKey(processDefinitionKey: string, maxResults = 1000): Observable<Incident[]> {
    return this.processDefinitionService.getIncidentsByProcessDefinitionKey(processDefinitionKey, maxResults);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getIncidentsByProcessDefinitionId() directly
   */
  getIncidentsByProcessDefinitionId(processDefinitionId: string, maxResults = 1000): Observable<Incident[]> {
    return this.processDefinitionService.getIncidentsByProcessDefinitionId(processDefinitionId, maxResults);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getJobDefinitionsByProcessDefinitionKey() directly
   */
  getJobDefinitionsByProcessDefinitionKey(processDefinitionKey: string, firstResult = 0, maxResults = 50): Observable<{ jobDefinitions: JobDefinition[]; count: number }> {
    return this.processDefinitionService.getJobDefinitionsByProcessDefinitionKey(processDefinitionKey, firstResult, maxResults);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getJobDefinitionsByProcessDefinitionId() directly
   */
  getJobDefinitionsByProcessDefinitionId(processDefinitionId: string, firstResult = 0, maxResults = 50): Observable<{ jobDefinitions: JobDefinition[]; count: number }> {
    return this.processDefinitionService.getJobDefinitionsByProcessDefinitionId(processDefinitionId, firstResult, maxResults);
  }

  /**
   * @deprecated Use ProcessDefinitionService.updateJobDefinitionSuspensionState() directly
   */
  updateJobDefinitionSuspensionState(jobDefinitionId: string, suspended: boolean): Observable<void> {
    return this.processDefinitionService.updateJobDefinitionSuspensionState(jobDefinitionId, suspended);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getCalledProcessDefinitions() directly
   */
  getCalledProcessDefinitions(processDefinitionId: string): Observable<CalledProcessDefinition[]> {
    return this.processDefinitionService.getCalledProcessDefinitions(processDefinitionId);
  }

  // ============================================
  // Process Instances (delegated to ProcessInstanceService)
  // ============================================

  /**
   * @deprecated Use ProcessInstanceService.getActivityInstanceTree() directly
   */
  getActivityInstanceTree(processInstanceId: string): Observable<ActivityInstanceTree | null> {
    return this.processInstanceService.getActivityInstanceTree(processInstanceId);
  }

  /**
   * @deprecated Use ProcessInstanceService.getProcessInstances() directly
   */
  getProcessInstances(params?: ProcessQueryParams): Observable<ProcessInstance[]> {
    return this.processInstanceService.getProcessInstances(params);
  }

  /**
   * @deprecated Use ProcessInstanceService.getProcessInstancesCount() directly
   */
  getProcessInstancesCount(params?: ProcessQueryParams): Observable<number> {
    return this.processInstanceService.getProcessInstancesCount(params);
  }

  /**
   * @deprecated Use ProcessInstanceService.getProcessInstance() directly
   */
  getProcessInstance(id: string): Observable<ProcessInstanceDetail | null> {
    return this.processInstanceService.getProcessInstance(id);
  }

  /**
   * @deprecated Use ProcessInstanceService.getProcessInstanceVariables() directly
   */
  getProcessInstanceVariables(id: string, maxResults: number = 1000): Observable<Variable[]> {
    return this.processInstanceService.getProcessInstanceVariables(id, maxResults);
  }

  /**
   * @deprecated Use ProcessInstanceService.getProcessInstanceActivities() directly
   */
  getProcessInstanceActivities(id: string, maxResults: number = 1000): Observable<Activity[]> {
    return this.processInstanceService.getProcessInstanceActivities(id, maxResults);
  }

  /**
   * @deprecated Use ProcessInstanceService.getProcessInstanceIncidents() directly
   */
  getProcessInstanceIncidents(id: string, maxResults: number = 1000): Observable<Incident[]> {
    return this.processInstanceService.getProcessInstanceIncidents(id, maxResults);
  }

  // ============================================
  // Decision Definitions (delegated to DecisionService)
  // ============================================

  /**
   * @deprecated Use DecisionService.getDecisionDefinitions() directly
   */
  getDecisionDefinitions(maxResults: number = 1000): Observable<DecisionDefinition[]> {
    return this.decisionService.getDecisionDefinitions(maxResults);
  }

  /**
   * @deprecated Use DecisionService.getDecisionDefinition() directly
   */
  getDecisionDefinition(id: string): Observable<DecisionDefinition | null> {
    return this.decisionService.getDecisionDefinition(id);
  }

  /**
   * @deprecated Use DecisionService.getDecisionDefinitionVersions() directly
   */
  getDecisionDefinitionVersions(key: string, tenantId?: string): Observable<DecisionDefinition[]> {
    return this.decisionService.getDecisionDefinitionVersions(key, tenantId);
  }

  /**
   * @deprecated Use DecisionService.getDecisionDefinitionsCount() directly
   */
  getDecisionDefinitionsCount(): Observable<number> {
    return this.decisionService.getDecisionDefinitionsCount();
  }

  /**
   * @deprecated Use DecisionService.getDecisionDefinitionsPaginated() directly
   */
  getDecisionDefinitionsPaginated(params: {
    firstResult?: number;
    maxResults?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    latestVersion?: boolean;
  }): Observable<DecisionDefinition[]> {
    return this.decisionService.getDecisionDefinitionsPaginated(params);
  }

  /**
   * @deprecated Use DecisionService.getDecisionXml() directly
   */
  getDecisionXml(decisionDefinitionId: string): Observable<{ id: string; dmnXml: string } | null> {
    return this.decisionService.getDecisionXml(decisionDefinitionId);
  }

  // ============================================
  // Decision Requirements Definition (DRD) (delegated to DecisionService)
  // ============================================

  /**
   * @deprecated Use DecisionService.getDecisionRequirementsDefinitions() directly
   */
  getDecisionRequirementsDefinitions(maxResults: number = 1000): Observable<any[]> {
    return this.decisionService.getDecisionRequirementsDefinitions(maxResults);
  }

  /**
   * @deprecated Use DecisionService.getDecisionRequirementsDefinition() directly
   */
  getDecisionRequirementsDefinition(id: string): Observable<any | null> {
    return this.decisionService.getDecisionRequirementsDefinition(id);
  }

  // ============================================
  // Decision Instances (delegated to DecisionService)
  // ============================================

  /**
   * @deprecated Use DecisionService.getDecisionInstances() directly
   */
  getDecisionInstances(definitionId?: string, maxResults: number = 100): Observable<DecisionInstance[]> {
    return this.decisionService.getDecisionInstances(definitionId, maxResults);
  }

  /**
   * @deprecated Use DecisionService.getDecisionInstancesPaginated() directly
   */
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
    return this.decisionService.getDecisionInstancesPaginated(params);
  }

  /**
   * @deprecated Use DecisionService.getDecisionInstancesCount() directly
   */
  getDecisionInstancesCount(decisionDefinitionId?: string): Observable<number> {
    return this.decisionService.getDecisionInstancesCount(decisionDefinitionId);
  }

  /**
   * @deprecated Use DecisionService.getDecisionInstance() directly
   */
  getDecisionInstance(id: string): Observable<DecisionInstance | null> {
    return this.decisionService.getDecisionInstance(id);
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
  // Process Definition Versions (delegated to ProcessDefinitionService)
  // ============================================

  /**
   * @deprecated Use ProcessDefinitionService.getProcessDefinitionVersions() directly
   */
  getProcessDefinitionVersions(key: string): Observable<ProcessDefinition[]> {
    return this.processDefinitionService.getProcessDefinitionVersions(key);
  }

  /**
   * @deprecated Use ProcessDefinitionService.getProcessDefinitionsStatisticsRaw() directly
   */
  getProcessDefinitionsStatisticsRaw(includeIncidents = true): Observable<ProcessDefinitionStatistics[]> {
    return this.processDefinitionService.getProcessDefinitionsStatisticsRaw(includeIncidents);
  }

  // ============================================
  // Jobs (delegated to ProcessInstanceService)
  // ============================================

  /**
   * @deprecated Use ProcessInstanceService.getJobsByProcessInstance() directly
   */
  getJobsByProcessInstance(processInstanceId: string, maxResults = 100): Observable<Job[]> {
    return this.processInstanceService.getJobsByProcessInstance(processInstanceId, maxResults);
  }

  /**
   * @deprecated Use ProcessInstanceService.getJob() directly
   */
  getJob(id: string): Observable<Job | null> {
    return this.processInstanceService.getJob(id);
  }

  /**
   * @deprecated Use ProcessInstanceService.retryJob() directly
   */
  retryJob(jobId: string, retries: number = 1): Observable<void> {
    return this.processInstanceService.retryJob(jobId, retries);
  }

  /**
   * @deprecated Use ProcessInstanceService.setJobRetriesByProcessInstance() directly
   */
  setJobRetriesByProcessInstance(processInstanceId: string, retries: number): Observable<void> {
    return this.processInstanceService.setJobRetriesByProcessInstance(processInstanceId, retries);
  }

  /**
   * @deprecated Use ProcessInstanceService.suspendJob() directly
   */
  suspendJob(jobId: string): Observable<void> {
    return this.processInstanceService.suspendJob(jobId);
  }

  /**
   * @deprecated Use ProcessInstanceService.resumeJob() directly
   */
  resumeJob(jobId: string): Observable<void> {
    return this.processInstanceService.resumeJob(jobId);
  }

  /**
   * @deprecated Use ProcessInstanceService.recalculateJobDueDate() directly
   */
  recalculateJobDueDate(jobId: string, creationDateBased = false): Observable<void> {
    return this.processInstanceService.recalculateJobDueDate(jobId, creationDateBased);
  }

  // ============================================
  // User Tasks (delegated to ProcessInstanceService)
  // ============================================

  /**
   * @deprecated Use ProcessInstanceService.getUserTasksByProcessInstance() directly
   */
  getUserTasksByProcessInstance(processInstanceId: string, maxResults = 100): Observable<UserTask[]> {
    return this.processInstanceService.getUserTasksByProcessInstance(processInstanceId, maxResults);
  }

  /**
   * @deprecated Use ProcessInstanceService.getHistoryUserTasksByProcessInstance() directly
   */
  getHistoryUserTasksByProcessInstance(processInstanceId: string, maxResults = 100): Observable<UserTask[]> {
    return this.processInstanceService.getHistoryUserTasksByProcessInstance(processInstanceId, maxResults);
  }

  /**
   * @deprecated Use ProcessInstanceService.setTaskAssignee() directly
   */
  setTaskAssignee(taskId: string, userId: string | null): Observable<void> {
    return this.processInstanceService.setTaskAssignee(taskId, userId);
  }

  /**
   * @deprecated Use ProcessInstanceService.setTaskOwner() directly
   */
  setTaskOwner(taskId: string, userId: string | null): Observable<void> {
    return this.processInstanceService.setTaskOwner(taskId, userId);
  }

  /**
   * @deprecated Use ProcessInstanceService.getTaskIdentityLinks() directly
   */
  getTaskIdentityLinks(taskId: string): Observable<any[]> {
    return this.processInstanceService.getTaskIdentityLinks(taskId);
  }

  /**
   * @deprecated Use ProcessInstanceService.addTaskIdentityLink() directly
   */
  addTaskIdentityLink(taskId: string, userId: string | null, groupId: string | null, type: string): Observable<void> {
    return this.processInstanceService.addTaskIdentityLink(taskId, userId, groupId, type);
  }

  /**
   * @deprecated Use ProcessInstanceService.deleteTaskIdentityLink() directly
   */
  deleteTaskIdentityLink(taskId: string, userId: string | null, groupId: string | null, type: string): Observable<void> {
    return this.processInstanceService.deleteTaskIdentityLink(taskId, userId, groupId, type);
  }

  // ============================================
  // Called Process Instances (delegated to ProcessInstanceService)
  // ============================================

  /**
   * @deprecated Use ProcessInstanceService.getCalledProcessInstances() directly
   */
  getCalledProcessInstances(superProcessInstanceId: string, maxResults = 100): Observable<ProcessInstance[]> {
    return this.processInstanceService.getCalledProcessInstances(superProcessInstanceId, maxResults);
  }

  /**
   * @deprecated Use ProcessInstanceService.getSuperProcessInstance() directly
   */
  getSuperProcessInstance(processInstanceId: string): Observable<ProcessInstance | null> {
    return this.processInstanceService.getSuperProcessInstance(processInstanceId);
  }

  // ============================================
  // External Tasks (delegated to ProcessInstanceService)
  // ============================================

  /**
   * @deprecated Use ProcessInstanceService.getExternalTasksByProcessInstance() directly
   */
  getExternalTasksByProcessInstance(processInstanceId: string, maxResults = 100): Observable<ExternalTask[]> {
    return this.processInstanceService.getExternalTasksByProcessInstance(processInstanceId, maxResults);
  }

  /**
   * @deprecated Use ProcessInstanceService.retryExternalTask() directly
   */
  retryExternalTask(externalTaskId: string): Observable<void> {
    return this.processInstanceService.retryExternalTask(externalTaskId);
  }

  /**
   * @deprecated Use ProcessInstanceService.setExternalTaskRetriesByProcessInstance() directly
   */
  setExternalTaskRetriesByProcessInstance(processInstanceId: string, retries: number): Observable<void> {
    return this.processInstanceService.setExternalTaskRetriesByProcessInstance(processInstanceId, retries);
  }

  // ============================================
  // Process Instance Actions (delegated to ProcessInstanceService)
  // ============================================

  /**
   * @deprecated Use ProcessInstanceService.cancelProcessInstance() directly
   */
  cancelProcessInstance(processInstanceId: string, deleteReason?: string): Observable<void> {
    return this.processInstanceService.cancelProcessInstance(processInstanceId, deleteReason);
  }

  /**
   * @deprecated Use ProcessInstanceService.suspendProcessInstance() directly
   */
  suspendProcessInstance(processInstanceId: string): Observable<void> {
    return this.processInstanceService.suspendProcessInstance(processInstanceId);
  }

  /**
   * @deprecated Use ProcessInstanceService.resumeProcessInstance() directly
   */
  resumeProcessInstance(processInstanceId: string): Observable<void> {
    return this.processInstanceService.resumeProcessInstance(processInstanceId);
  }

  /**
   * @deprecated Use ProcessDefinitionService.suspendProcessDefinition() directly
   */
  suspendProcessDefinition(processDefinitionId: string, includeInstances = true): Observable<void> {
    return this.processDefinitionService.suspendProcessDefinition(processDefinitionId, includeInstances);
  }

  /**
   * @deprecated Use ProcessDefinitionService.activateProcessDefinition() directly
   */
  resumeProcessDefinition(processDefinitionId: string, includeInstances = true): Observable<void> {
    return this.processDefinitionService.activateProcessDefinition(processDefinitionId, includeInstances);
  }

  // ============================================
  // Variables Management (delegated to ProcessInstanceService)
  // ============================================

  /**
   * @deprecated Use ProcessInstanceService.setProcessInstanceVariable() directly
   */
  setProcessInstanceVariable(processInstanceId: string, variableName: string, value: any, type: string): Observable<void> {
    return this.processInstanceService.setProcessInstanceVariable(processInstanceId, variableName, value, type);
  }

  /**
   * @deprecated Use ProcessInstanceService.deleteProcessInstanceVariable() directly
   */
  deleteProcessInstanceVariable(processInstanceId: string, variableName: string): Observable<void> {
    return this.processInstanceService.deleteProcessInstanceVariable(processInstanceId, variableName);
  }

  /**
   * @deprecated Use ProcessInstanceService.setProcessInstanceVariables() directly
   */
  setProcessInstanceVariables(processInstanceId: string, modifications: Record<string, { value: any; type: string }>): Observable<void> {
    return this.processInstanceService.setProcessInstanceVariables(processInstanceId, modifications);
  }

  // ============================================
  // Enhanced Process Instance Filtering (delegated to ProcessInstanceService)
  // ============================================

  /**
   * @deprecated Use ProcessInstanceService.queryProcessInstances() directly
   */
  queryProcessInstances(body: any, firstResult = 0, maxResults = 100): Observable<ProcessInstance[]> {
    return this.processInstanceService.queryProcessInstances(body, firstResult, maxResults);
  }

  /**
   * @deprecated Use ProcessInstanceService.queryProcessInstancesCount() directly
   */
  queryProcessInstancesCount(body: any): Observable<number> {
    return this.processInstanceService.queryProcessInstancesCount(body);
  }

  // ============================================
  // History Incidents (delegated to ProcessInstanceService)
  // ============================================

  /**
   * @deprecated Use ProcessInstanceService.getHistoryIncidents() directly
   */
  getHistoryIncidents(processInstanceId: string, maxResults = 100): Observable<Incident[]> {
    return this.processInstanceService.getHistoryIncidents(processInstanceId, maxResults);
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
  // Dashboard Charts API Methods (delegated to DashboardService)
  // ============================================

  /**
   * Get count of suspended process instances
   * @deprecated Use DashboardService.getSuspendedProcessCount() directly for new code
   */
  getSuspendedProcessCount(): Observable<number> {
    return this.dashboardService.getSuspendedProcessCount();
  }

  /**
   * Get count of finished process instances (from history)
   * @deprecated Use DashboardService.getFinishedProcessCount() directly for new code
   */
  getFinishedProcessCount(params?: {
    finishedAfter?: string;
    finishedBefore?: string;
  }): Observable<number> {
    return this.dashboardService.getFinishedProcessCount(params);
  }

  /**
   * Get process stats for charts (active, suspended, completed)
   * @deprecated Use DashboardService.getProcessStatsForChart() directly for new code
   */
  getProcessStatsForChart(): Observable<ProcessStats> {
    return this.dashboardService.getProcessStatsForChart();
  }

  /**
   * Get task stats for charts
   * @deprecated Use DashboardService.getTaskStatsForChart() directly for new code
   */
  getTaskStatsForChart(): Observable<TaskStats> {
    return this.dashboardService.getTaskStatsForChart();
  }

  /**
   * Get incidents grouped by type
   * @deprecated Use DashboardService.getIncidentsByType() directly for new code
   */
  getIncidentsByType(): Observable<IncidentByType[]> {
    return this.dashboardService.getIncidentsByType();
  }

  /**
   * Get incidents aggregated by process definition
   * @deprecated Use DashboardService.getIncidentsByProcess() directly for new code
   */
  getIncidentsByProcess(): Observable<IncidentByProcess[]> {
    return this.dashboardService.getIncidentsByProcess();
  }

  /**
   * Get process instances timeline data for a given number of days
   * @deprecated Use DashboardService.getProcessInstancesTimeline() directly for new code
   */
  getProcessInstancesTimeline(days: number): Observable<TimelineDataPoint[]> {
    return this.dashboardService.getProcessInstancesTimeline(days);
  }

  /**
   * Get process distribution (instances per process definition)
   * @deprecated Use DashboardService.getProcessDistribution() directly for new code
   */
  getProcessDistribution(): Observable<ProcessDistributionItem[]> {
    return this.dashboardService.getProcessDistribution();
  }

  /**
   * Get tasks grouped by candidate group with group names
   * @deprecated Use DashboardService.getTasksByGroupWithNames() directly for new code
   */
  getTasksByGroupWithNames(): Observable<TasksByGroup[]> {
    return this.dashboardService.getTasksByGroupWithNames();
  }

  /**
   * Get all dashboard charts data in a single call
   * @deprecated Use DashboardService.getDashboardChartsData() directly for new code
   */
  getDashboardChartsData(): Observable<DashboardChartsData> {
    return this.dashboardService.getDashboardChartsData();
  }

  // ============================================
  // Deployments API (delegated to DeploymentService)
  // ============================================

  /**
   * @deprecated Use DeploymentService.getDeployments() directly
   */
  getDeployments(params?: DeploymentQueryParams): Observable<Deployment[]> {
    return this.deploymentService.getDeployments(params);
  }

  /**
   * @deprecated Use DeploymentService.getDeploymentsCount() directly
   */
  getDeploymentsCountWithParams(params?: DeploymentQueryParams): Observable<number> {
    return this.deploymentService.getDeploymentsCount(params);
  }

  /**
   * @deprecated Use DeploymentService.deleteDeployment() directly
   */
  deleteDeployment(id: string, options?: DeleteDeploymentOptions): Observable<void> {
    return this.deploymentService.deleteDeployment(id, options);
  }

  /**
   * @deprecated Use DeploymentService.getProcessInstanceCountByDeployment() directly
   */
  getProcessInstanceCountByDeployment(deploymentId: string): Observable<number> {
    return this.deploymentService.getProcessInstanceCountByDeployment(deploymentId);
  }

  /**
   * @deprecated Use DeploymentService.getCaseInstanceCountByDeployment() directly
   */
  getCaseInstanceCountByDeployment(deploymentId: string): Observable<number> {
    return this.deploymentService.getCaseInstanceCountByDeployment(deploymentId);
  }

  // ============================================
  // Deployment Resources API (delegated to DeploymentService)
  // ============================================

  /**
   * @deprecated Use DeploymentService.getDeploymentResources() directly
   */
  getDeploymentResources(deploymentId: string): Observable<DeploymentResource[]> {
    return this.deploymentService.getDeploymentResources(deploymentId);
  }

  /**
   * @deprecated Use DeploymentService.getDeploymentResourceData() directly
   */
  getDeploymentResourceData(deploymentId: string, resourceId: string): Observable<Blob> {
    return this.deploymentService.getDeploymentResourceData(deploymentId, resourceId);
  }

  /**
   * @deprecated Use DeploymentService.getDeploymentResourceText() directly
   */
  getDeploymentResourceText(deploymentId: string, resourceId: string): Observable<string> {
    return this.deploymentService.getDeploymentResourceText(deploymentId, resourceId);
  }

  /**
   * @deprecated Use DeploymentService.getProcessDefinitionsByDeployment() directly
   */
  getProcessDefinitionsByDeployment(deploymentId: string): Observable<ProcessDefinition[]> {
    return this.deploymentService.getProcessDefinitionsByDeployment(deploymentId);
  }

  /**
   * @deprecated Use DeploymentService.getDecisionDefinitionsByDeployment() directly
   */
  getDecisionDefinitionsByDeployment(deploymentId: string): Observable<DecisionDefinition[]> {
    return this.deploymentService.getDecisionDefinitionsByDeployment(deploymentId);
  }

  /**
   * @deprecated Use DeploymentService.getCaseDefinitionsByDeployment() directly
   */
  getCaseDefinitionsByDeployment(deploymentId: string): Observable<any[]> {
    return this.deploymentService.getCaseDefinitionsByDeployment(deploymentId);
  }

  /**
   * @deprecated Use DeploymentService.getResourceDownloadUrl() directly
   */
  getResourceDownloadUrl(deploymentId: string, resourceId: string): string {
    return this.deploymentService.getResourceDownloadUrl(deploymentId, resourceId);
  }
}
