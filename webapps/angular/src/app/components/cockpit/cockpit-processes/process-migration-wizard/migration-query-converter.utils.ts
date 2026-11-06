import type { MultiValueFilter } from '../../../../services/cockpit.service';

export interface ProcessInstanceQueryDto {
  [key: string]: unknown;
  processDefinitionId: string;
  processInstanceIds?: string[];
  businessKeyLike?: string;
  incidentMessageLike?: string;
  incidentId?: string;
  incidentType?: string;
  withIncident?: boolean;
  active?: boolean;
  suspended?: boolean;
  activityIdIn?: string[];
  variables?: Array<{
    name: string;
    operator: string;
    value: any;
  }>;
  superProcessInstanceId?: string;
  subProcessInstanceId?: string;
  sortBy?: string;
  sortOrder?: string;
  firstResult?: number;
  maxResults?: number;
}

/**
 * Whitelist of supported criteria fields for Runtime API.
 * Unknown fields are ignored (not sent to engine).
 */
const SUPPORTED_CRITERIA: ReadonlySet<string> = new Set([
  'instanceId',
  'businessKey',
  'state',
  'withIncidents',
  'incidentId',
  'incidentType',
  'incidentMessage',
  'activityId',
  'variable',
  'variables',
  'subProcessInstance',
  'superProcessInstance'
]);

/**
 * @param criteria
 * @param
 * @return
 */
export function buildRuntimeProcessInstanceQuery(
  criteria: MultiValueFilter[],
  sourceDefinitionId: string
): ProcessInstanceQueryDto {
  const query: ProcessInstanceQueryDto = {
    processDefinitionId: sourceDefinitionId
  };

  let hasActiveState = false;
  let hasSuspendedState = false;

  for (const criterion of criteria) {
    if (!SUPPORTED_CRITERIA.has(criterion.field)) {
      continue;
    }

    switch (criterion.field as string) {
      case 'instanceId':
        if (criterion.values && criterion.values.length > 0) {
          query.processInstanceIds = criterion.values;
        }
        break;

      case 'businessKey':
        // Use LIKE with %value%
        if (criterion.values && criterion.values.length > 0) {
          query.businessKeyLike = `%${criterion.values[0]}%`;
        }
        break;

      case 'state':
        if (criterion.values) {
          hasActiveState = criterion.values.includes('ACTIVE');
          hasSuspendedState = criterion.values.includes('SUSPENDED');
        }
        break;

      case 'withIncidents':
        query.withIncident = true;
        break;

      case 'incidentId':
        if (criterion.values && criterion.values.length > 0) {
          query.incidentId = criterion.values[0];
        }
        break;

      case 'incidentType':
        if (criterion.values && criterion.values.length > 0) {
          query.incidentType = criterion.values[0];
        }
        break;

      case 'incidentMessage':
        if (criterion.values && criterion.values.length > 0) {
          query.incidentMessageLike = `%${criterion.values[0]}%`;
        }
        break;

      case 'activityId':
        if (criterion.values && criterion.values.length > 0) {
          query.activityIdIn = criterion.values;
        }
        break;

      case 'variable':
      case 'variables':
        handleVariableCriteria(query, criterion);
        break;

      case 'subProcessInstance':
        if (criterion.values && criterion.values.length > 0) {
          query.subProcessInstanceId = criterion.values[0];
        }
        break;

      case 'superProcessInstance':
        if (criterion.values && criterion.values.length > 0) {
          query.superProcessInstanceId = criterion.values[0];
        }
        break;
    }
  }

  if (hasActiveState && !hasSuspendedState) {
    query.active = true;
  } else if (hasSuspendedState && !hasActiveState) {
    query.suspended = true;
  }

  return query;
}


function handleVariableCriteria(query: ProcessInstanceQueryDto, criterion: MultiValueFilter): void {
  if (!criterion.variableLines || criterion.variableLines.length === 0) {
    return;
  }

  const existingVariables = query.variables || [];

  for (const line of criterion.variableLines) {
    const variableParam: { name: string; operator: string; value: any } = {
      name: line.variableName,
      operator: line.variableOperator,
      value: line.values && line.values.length > 0 ? line.values[0] : ''
    };

    existingVariables.push(variableParam);
  }

  query.variables = existingVariables;
}
