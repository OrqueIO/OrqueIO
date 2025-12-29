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
}

export interface BooleanCriterion {
  key: string;
  labelKey: string;
}

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
      { key: 'taskDefinitionKey', labelKey: 'filter.criterion.taskDefinitionKey', type: 'string' },
      { key: 'priority', labelKey: 'filter.criterion.priority', type: 'number' },
      { key: 'delegationState', labelKey: 'filter.criterion.delegationState', type: 'string' }
    ]
  },
  {
    groupKey: 'filter.criteria.user',
    options: [
      { key: 'assignee', labelKey: 'filter.criterion.assignee', type: 'string', expressionSupport: true },
      { key: 'candidateGroup', labelKey: 'filter.criterion.candidateGroup', type: 'string', expressionSupport: true },
      { key: 'candidateUser', labelKey: 'filter.criterion.candidateUser', type: 'string', expressionSupport: true },
      { key: 'involvedUser', labelKey: 'filter.criterion.involvedUser', type: 'string', expressionSupport: true },
      { key: 'owner', labelKey: 'filter.criterion.owner', type: 'string', expressionSupport: true }
    ]
  }
];

export const BOOLEAN_CRITERIA: BooleanCriterion[] = [
  { key: 'unassigned', labelKey: 'filter.criterion.unassigned' },
  { key: 'withCandidateGroups', labelKey: 'filter.criterion.withCandidateGroups' },
  { key: 'withoutCandidateGroups', labelKey: 'filter.criterion.withoutCandidateGroups' },
  { key: 'active', labelKey: 'filter.criterion.active' },
  { key: 'suspended', labelKey: 'filter.criterion.suspended' }
];
