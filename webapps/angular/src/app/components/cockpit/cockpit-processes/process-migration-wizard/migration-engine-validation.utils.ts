import type { MigrationPlanDto, MigrationPlanReportDto, VariableValueDto } from '../../../../services/migration.model';
import type { PlanVariable } from './migration-variables.utils';

export type VariableValidationStatus = 'valid' | 'invalid' | 'pending' | 'error';

export interface VariableValidationState {
  name: string;
  status: VariableValidationStatus;
  messages: string[];
}

/**
 * Builds a validation payload from a migration plan and variables.
 * Pure function - no side effects.
 *
 * @param plan
 * @param variables
 * @returns
 */
export function buildValidationPayload(
  plan: MigrationPlanDto,
  variables: PlanVariable[]
): MigrationPlanDto {
  const variablesMap: Record<string, VariableValueDto> = {};

  for (const variable of variables) {
    variablesMap[variable.name] = {
      type: variable.type,
      value: variable.value
    };
  }

  return {
    sourceProcessDefinitionId: plan.sourceProcessDefinitionId,
    targetProcessDefinitionId: plan.targetProcessDefinitionId,
    instructions: plan.instructions,
    variables: variablesMap
  };
}

/**
 *
 * @param response
 * @param variables
 * @returns
 */
export function parseVariableReports(
  response: MigrationPlanReportDto | null,
  variables: PlanVariable[]
): VariableValidationState[] {
  if (!response || typeof response !== 'object' || !response.variableReports) {
    return variables.map(v => ({
      name: v.name,
      status: 'error' as VariableValidationStatus,
      messages: ['Could not parse validation response']
    }));
  }

  const { variableReports } = response;
  return variables.map(variable => {
    const report = variableReports[variable.name];

    if (!report) {
      return {
        name: variable.name,
        status: 'valid' as VariableValidationStatus,
        messages: []
      };
    }

    const failures = report.failures || [];

    if (failures.length === 0) {
      return {
        name: variable.name,
        status: 'valid' as VariableValidationStatus,
        messages: []
      };
    }
    return {
      name: variable.name,
      status: 'invalid' as VariableValidationStatus,
      messages: failures
    };
  });
}
