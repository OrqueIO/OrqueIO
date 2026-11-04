import type { MultiValueFilter } from '../../../../services/cockpit.service';

export interface ConversionResult {
  query: Record<string, unknown>;
  unsupportedCriteria: string[];
  hasUnsupportedCriteria: boolean;
}


const CRITERIA_MAPPING: Record<string, string | null> = {
  'instanceId': 'processInstanceIds',
  'businessKey': 'businessKey',
  'state': 'state',
  'withIncidents': 'withIncident',
  'incidentId': 'incidentId',
  'incidentType': 'incidentType',
  'incidentMessage': 'incidentMessage',
  'activityId': 'activityIdIn',
  'variable': 'variables',
  'variables': 'variables',
  'processDefinition': 'processDefinitionId',
  'subProcessInstance': 'subProcessInstance',
  'superProcessInstance': 'superProcessInstance',

  'startedAfter': null,
  'startedBefore': null,
  'finishedAfter': null,
  'finishedBefore': null,
  'withJobsRetrying': null
};

/**
 * Converts history filter criteria to runtime process instance query.
 *
 * @param criteria
 * @param sourceProcessDefinitionId
 * @returns
 */
export function convertCriteriaToRuntimeQuery(
  criteria: MultiValueFilter[],
  sourceProcessDefinitionId: string
): ConversionResult {
  const query: Record<string, unknown> = {
    processDefinitionId: sourceProcessDefinitionId
  };

  const unsupportedCriteria: string[] = [];

  for (const criterion of criteria) {
    const runtimeField = CRITERIA_MAPPING[criterion.field];

    if (runtimeField === null) {
      unsupportedCriteria.push(criterion.field);
      continue;
    }

    if (runtimeField === undefined) {
      console.warn(`Unknown criterion field: ${criterion.field}`);
      unsupportedCriteria.push(criterion.field);
      continue;
    }

    if (criterion.field === 'state') {
      handleStateCriterion(query, criterion);
    } else if (criterion.field === 'instanceId') {
      query['processInstanceIds'] = criterion.values;
    } else if (criterion.field === 'activityId') {
      query['activityIdIn'] = criterion.values;
    } else if (criterion.field === 'withIncidents') {
      query['withIncident'] = true;
    } else if (criterion.field === 'variable' || criterion.field === 'variables') {
      handleVariableCriteria(query, criterion);
    } else {
      if (criterion.values && criterion.values.length > 0) {
        query[runtimeField] = criterion.values[0];
      }
    }
  }

  return {
    query,
    unsupportedCriteria,
    hasUnsupportedCriteria: unsupportedCriteria.length > 0
  };
}


function handleStateCriterion(query: Record<string, unknown>, criterion: MultiValueFilter): void {
  if (criterion.values.includes('ACTIVE')) {
    query['active'] = true;
  } else if (criterion.values.includes('SUSPENDED')) {
    query['suspended'] = true;
  }
}


function handleVariableCriteria(query: Record<string, unknown>, criterion: MultiValueFilter): void {
  if (!criterion.variableLines || criterion.variableLines.length === 0) {
    return;
  }

  const existingVariables = (query['variables'] as any[]) || [];

  for (const line of criterion.variableLines) {
    const variableParam: Record<string, unknown> = {
      name: line.variableName,
      operator: line.variableOperator,
      value: line.values && line.values.length > 0 ? line.values[0] : ''
    };

    existingVariables.push(variableParam);
  }

  query['variables'] = existingVariables;
}


export function hasUnsupportedCriteria(criteria: MultiValueFilter[]): boolean {
  return criteria.some(c => CRITERIA_MAPPING[c.field] === null);
}

export function getUnsupportedCriteriaNames(criteria: MultiValueFilter[]): string[] {
  return criteria
    .filter(c => CRITERIA_MAPPING[c.field] === null)
    .map(c => c.field);
}
