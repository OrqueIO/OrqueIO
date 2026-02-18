/**
 * Filter Model - Task filter interface matching AngularJS implementation
 */

import { TaskQueryParams, VariableFilter } from './task.model';

export interface TaskFilter {
  id: string;
  name: string;
  owner?: string;
  resourceType: 'Task';
  query: TaskFilterQuery;
  properties: FilterProperties;
  itemCount?: number;
}

export interface TaskFilterQuery extends TaskQueryParams {
  // All properties from TaskQueryParams plus filter-specific ones
  includeAssignedTasks?: boolean;
}

export interface FilterProperties {
  description?: string;
  color?: string;
  priority?: number;
  variables?: FilterVariable[];
  showUndefinedVariable?: boolean;
  refresh?: boolean;
}

export interface FilterVariable {
  name: string;
  label?: string;
}

export interface FilterAccess {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface FilterAuthorization {
  links: AuthorizationLink[];
}

export interface AuthorizationLink {
  rel: string;
  href: string;
  method: string;
}

export interface FilterCriteria {
  groupKey: string;
  options: FilterCriterionOption[];
}

export interface FilterCriterionOption {
  key: string;
  labelKey: string;
  expressionSupport?: boolean;
  type: 'string' | 'number' | 'date' | 'boolean';
  help?: string;
  // Variable search types
  variableType?: 'processVariables' | 'taskVariables' | 'caseInstanceVariables';
}

export interface BooleanCriterion {
  key: string;
  labelKey: string;
}

// ==================== SEARCH TYPES (matching AngularJS) ====================

/**
 * Search operator types matching AngularJS cam-tasklist-search-plugin
 */
export type SearchOperator = 'eq' | 'neq' | 'gt' | 'gteq' | 'lt' | 'lteq' | 'like' | 'notLike' | 'in' | 'before' | 'after';

/**
 * Search pill interface for advanced task search
 * Matches AngularJS search plugin structure
 */
export interface SearchPill {
  id: string;
  key: string;
  label: string;
  operator: SearchOperator;
  value: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  // For variable searches
  variableType?: 'processVariables' | 'taskVariables' | 'caseInstanceVariables';
  variableName?: string;
}

/**
 * Search query structure matching AngularJS baseQuery
 * Supports OR queries via orQueries array
 */
export interface SearchQuery {
  processVariables?: VariableFilter[];
  taskVariables?: VariableFilter[];
  caseInstanceVariables?: VariableFilter[];
  orQueries?: SearchQuery[];
  // Direct criteria (non-variable)
  [key: string]: any;
}

/**
 * Operators configuration matching AngularJS searchConfig.operators
 */
export const SEARCH_OPERATORS: Record<string, { value: SearchOperator; label: string }[]> = {
  string: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '!=' },
    { value: 'like', label: 'like' },
    { value: 'notLike', label: 'not like' },
    { value: 'in', label: 'in' }
  ],
  date: [
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
    { value: 'eq', label: '=' }
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '!=' },
    { value: 'gt', label: '>' },
    { value: 'gteq', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lteq', label: '<=' }
  ],
  boolean: [
    { value: 'eq', label: '=' }
  ]
};

/**
 * Fields that support expression syntax ${...} or #{...}
 * Matching AngularJS expressionsRegex check
 */
export const EXPRESSION_SUPPORTED_FIELDS = [
  'assignee',
  'owner',
  'candidateGroup',
  'candidateGroups',
  'candidateUser',
  'involvedUser',
  'processInstanceBusinessKey',
  'processInstanceBusinessKeyLike',
  'dueDate',
  'followUpDate',
  'createdDate',
  'followUpBeforeOrNotExistent'
];

/**
 * Regex for detecting expressions (${...} or #{...})
 */
export const EXPRESSION_REGEX = /^[\s]*([#$])\{/;

/**
 * Regex for ISO 8601 date format
 */
export const ISO_DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(|\.[0-9]{0,4})$/;

/**
 * Date criteria base-name mapping.
 * The Camunda REST API uses dueBefore / dueAfter (not dueDateBefore / dueDateAfter).
 * This map strips the "Date" suffix before appending the operator suffix.
 */
export const DATE_BASE_MAP: Record<string, string> = {
  dueDate: 'due',
  followUpDate: 'followUp',
  createdDate: 'created'
};

// ==================== SEARCH CRITERIA ====================

export const FILTER_CRITERIA: FilterCriteria[] = [
  {
    groupKey: 'filter.criteria.process',
    options: [
      { key: 'processInstanceId', labelKey: 'filter.criterion.processInstanceId', type: 'string' },
      { key: 'processInstanceBusinessKey', labelKey: 'filter.criterion.processInstanceBusinessKey', type: 'string', expressionSupport: true },
      { key: 'processDefinitionId', labelKey: 'filter.criterion.processDefinitionId', type: 'string' },
      { key: 'processDefinitionKey', labelKey: 'filter.criterion.processDefinitionKey', type: 'string' },
      { key: 'processDefinitionName', labelKey: 'filter.criterion.processDefinitionName', type: 'string' }
    ]
  },
  {
    groupKey: 'filter.criteria.case',
    options: [
      { key: 'caseInstanceId', labelKey: 'filter.criterion.caseInstanceId', type: 'string' },
      { key: 'caseInstanceBusinessKey', labelKey: 'filter.criterion.caseInstanceBusinessKey', type: 'string', expressionSupport: true },
      { key: 'caseDefinitionId', labelKey: 'filter.criterion.caseDefinitionId', type: 'string' },
      { key: 'caseDefinitionKey', labelKey: 'filter.criterion.caseDefinitionKey', type: 'string' },
      { key: 'caseDefinitionName', labelKey: 'filter.criterion.caseDefinitionName', type: 'string' }
    ]
  },
  {
    groupKey: 'filter.criteria.task',
    options: [
      { key: 'name', labelKey: 'filter.criterion.name', type: 'string' },
      { key: 'description', labelKey: 'filter.criterion.description', type: 'string' },
      { key: 'taskDefinitionKey', labelKey: 'filter.criterion.taskDefinitionKey', type: 'string' },
      { key: 'priority', labelKey: 'filter.criterion.priority', type: 'number' },
      { key: 'delegationState', labelKey: 'filter.criterion.delegationState', type: 'string' }
    ]
  },
  {
    groupKey: 'filter.criteria.dates',
    options: [
      { key: 'createdDate', labelKey: 'filter.criterion.createdDate', type: 'date', expressionSupport: true },
      { key: 'dueDate', labelKey: 'filter.criterion.dueDate', type: 'date', expressionSupport: true },
      { key: 'followUpDate', labelKey: 'filter.criterion.followUpDate', type: 'date', expressionSupport: true },
      { key: 'followUpBeforeOrNotExistent', labelKey: 'filter.criterion.followUpBeforeOrNotExistent', type: 'date', expressionSupport: true }
    ]
  },
  {
    groupKey: 'filter.criteria.user',
    options: [
      { key: 'assignee', labelKey: 'filter.criterion.assignee', type: 'string', expressionSupport: true },
      { key: 'candidateGroup', labelKey: 'filter.criterion.candidateGroup', type: 'string', expressionSupport: true },
      { key: 'candidateGroups', labelKey: 'filter.criterion.candidateGroups', type: 'string', expressionSupport: true },
      { key: 'candidateUser', labelKey: 'filter.criterion.candidateUser', type: 'string', expressionSupport: true },
      { key: 'involvedUser', labelKey: 'filter.criterion.involvedUser', type: 'string', expressionSupport: true },
      { key: 'owner', labelKey: 'filter.criterion.owner', type: 'string', expressionSupport: true }
    ]
  },
  {
    groupKey: 'filter.criteria.variables',
    options: [
      { key: 'processVariables', labelKey: 'filter.criterion.processVariables', type: 'string', variableType: 'processVariables' },
      { key: 'taskVariables', labelKey: 'filter.criterion.taskVariables', type: 'string', variableType: 'taskVariables' },
      { key: 'caseInstanceVariables', labelKey: 'filter.criterion.caseInstanceVariables', type: 'string', variableType: 'caseInstanceVariables' }
    ]
  },
  {
    groupKey: 'filter.criteria.other',
    options: [
      { key: 'tenantIdIn', labelKey: 'filter.criterion.tenantIdIn', type: 'string' },
      { key: 'activityInstanceIdIn', labelKey: 'filter.criterion.activityInstanceIdIn', type: 'string' },
      { key: 'executionId', labelKey: 'filter.criterion.executionId', type: 'string' }
    ]
  }
];

export const BOOLEAN_CRITERIA: BooleanCriterion[] = [
  { key: 'assigned', labelKey: 'filter.criterion.assigned' },
  { key: 'unassigned', labelKey: 'filter.criterion.unassigned' },
  { key: 'withCandidateGroups', labelKey: 'filter.criterion.withCandidateGroups' },
  { key: 'withoutCandidateGroups', labelKey: 'filter.criterion.withoutCandidateGroups' },
  { key: 'withCandidateUsers', labelKey: 'filter.criterion.withCandidateUsers' },
  { key: 'withoutCandidateUsers', labelKey: 'filter.criterion.withoutCandidateUsers' },
  { key: 'withoutDueDate', labelKey: 'filter.criterion.withoutDueDate' },
  { key: 'withoutTenantId', labelKey: 'filter.criterion.withoutTenantId' },
  { key: 'active', labelKey: 'filter.criterion.active' },
  { key: 'suspended', labelKey: 'filter.criterion.suspended' }
];
