/**
 * Task Model - Complete task interface matching AngularJS implementation
 */

export interface Task {
  id: string;
  name: string;
  assignee?: string | null;
  owner?: string | null;
  created: string;
  due?: string | null;
  followUp?: string | null;
  priority: number;
  parentTaskId?: string;
  processDefinitionId?: string;
  processInstanceId?: string;
  caseDefinitionId?: string;
  caseInstanceId?: string;
  caseExecutionId?: string;
  executionId?: string;
  taskDefinitionKey?: string;
  formKey?: string;
  tenantId?: string;
  delegationState?: 'PENDING' | 'RESOLVED';
  description?: string;
  _embedded?: TaskEmbedded;
  _links?: TaskLinks;
}

export interface TaskEmbedded {
  processDefinition?: ProcessDefinitionRef[];
  caseDefinition?: CaseDefinitionRef[];
  assignee?: UserRef[];
}

export interface ProcessDefinitionRef {
  id: string;
  key: string;
  name?: string;
  version?: number;
  versionTag?: string;
}

export interface CaseDefinitionRef {
  id: string;
  key: string;
  name?: string;
  version?: number;
}

export interface UserRef {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface TaskLinks {
  self?: { href: string };
  assignee?: { href: string };
  identityLinks?: { href: string };
}

export interface TaskList {
  count: number;
  _embedded: {
    task: Task[];
    assignee?: UserRef[];
  };
  _links?: {
    self: { href: string };
  };
}

export interface TaskQueryParams {
  // Pagination
  firstResult?: number;
  maxResults?: number;

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sorting?: TaskSorting[];

  // Process filters
  processInstanceId?: string;
  processInstanceIdIn?: string[];
  processInstanceBusinessKey?: string;
  processInstanceBusinessKeyLike?: string;
  processDefinitionId?: string;
  processDefinitionKey?: string;
  processDefinitionKeyIn?: string[];
  processDefinitionName?: string;
  processDefinitionNameLike?: string;
  executionId?: string;

  // Case filters
  caseInstanceId?: string;
  caseInstanceBusinessKey?: string;
  caseInstanceBusinessKeyLike?: string;
  caseDefinitionId?: string;
  caseDefinitionKey?: string;
  caseDefinitionName?: string;
  caseDefinitionNameLike?: string;
  caseExecutionId?: string;

  // Task filters
  taskDefinitionKey?: string;
  taskDefinitionKeyIn?: string[];
  taskDefinitionKeyLike?: string;
  name?: string;
  nameLike?: string;
  description?: string;
  descriptionLike?: string;
  priority?: number;
  minPriority?: number;
  maxPriority?: number;

  // Identity filters
  assignee?: string;
  assigneeLike?: string;
  assigneeIn?: string[];
  assigneeNotIn?: string[];
  owner?: string;
  candidateGroup?: string;
  candidateGroups?: string[];
  candidateUser?: string;
  involvedUser?: string;
  unassigned?: boolean;
  assigned?: boolean;

  // Date filters
  dueBefore?: string;
  dueAfter?: string;
  dueDate?: string;
  withoutDueDate?: boolean;
  followUpBefore?: string;
  followUpAfter?: string;
  followUpDate?: string;
  createdBefore?: string;
  createdAfter?: string;
  createdOn?: string;

  // Variable filters
  processVariables?: VariableFilter[];
  taskVariables?: VariableFilter[];
  caseInstanceVariables?: VariableFilter[];

  // Other filters
  delegationState?: 'PENDING' | 'RESOLVED';
  tenantIdIn?: string[];
  withoutTenantId?: boolean;
  withCandidateGroups?: boolean;
  withoutCandidateGroups?: boolean;
  withCandidateUsers?: boolean;
  withoutCandidateUsers?: boolean;

  // Include options
  includeAssignedTasks?: boolean;

  // Match type for OR queries
  orQueries?: TaskQueryParams[];
}

export interface VariableFilter {
  name: string;
  operator: 'eq' | 'neq' | 'gt' | 'gteq' | 'lt' | 'lteq' | 'like' | 'notLike';
  value: any;
}

export interface TaskSorting {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  parameters?: {
    variable: string;
    type: string;
  };
}

export interface TaskForm {
  key?: string;
  contextPath?: string;
  camundaFormRef?: {
    key: string;
    binding: string;
    version?: number;
  };
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  time: string;
  message: string;
  removalTime?: string;
  rootProcessInstanceId?: string;
}

export interface UserOperationLogEntry {
  id: string;
  userId: string;
  timestamp: string;
  operationId: string;
  operationType: string;
  entityType: string;
  category: string;
  annotation?: string;
  property?: string;
  orgValue?: string;
  newValue?: string;
  deploymentId?: string;
  processDefinitionId?: string;
  processDefinitionKey?: string;
  processInstanceId?: string;
  executionId?: string;
  caseDefinitionId?: string;
  caseInstanceId?: string;
  caseExecutionId?: string;
  taskId?: string;
  externalTaskId?: string;
  batchId?: string;
  jobId?: string;
  jobDefinitionId?: string;
  removalTime?: string;
  rootProcessInstanceId?: string;
  // Added by frontend for date formatting
  propertyIsDate?: boolean;
}

export interface IdentityLink {
  userId?: string;
  groupId?: string;
  type: string;
}

export interface GroupRef {
  id: string;
  name?: string;
  type?: string;
}

/**
 * Process Definition - full definition for starting processes
 */
export interface ProcessDefinition {
  id: string;
  key: string;
  name?: string;
  description?: string;
  version: number;
  versionTag?: string;
  category?: string;
  deploymentId?: string;
  resource?: string;
  diagram?: string;
  suspended?: boolean;
  tenantId?: string;
  historyTimeToLive?: number;
  startableInTasklist?: boolean;
  hasStartFormKey?: boolean;
}

/**
 * Process Instance - result of starting a process
 */
export interface ProcessInstance {
  id: string;
  definitionId: string;
  businessKey?: string;
  caseInstanceId?: string;
  tenantId?: string;
  ended?: boolean;
  suspended?: boolean;
  links?: { href: string; rel: string; method?: string }[];
}
