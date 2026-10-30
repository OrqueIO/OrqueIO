/**
 * Migration Model - Process Instance Migration interfaces for Camunda 7
 * Based on engine-rest DTO classes in io.orqueio.bpm.engine.rest.dto.migration
 */

export interface MigrationInstructionDto {
  sourceActivityIds: string[];
  targetActivityIds: string[];
  updateEventTrigger?: boolean | null;
}

export interface VariableValueDto {
  type: string;
  value: any;
  valueInfo?: Record<string, any>;
}

export interface MigrationPlanDto {
  sourceProcessDefinitionId: string;
  targetProcessDefinitionId: string;
  instructions: MigrationInstructionDto[];
  variables?: Record<string, VariableValueDto>;
}

export interface MigrationPlanGenerationDto {
  sourceProcessDefinitionId: string;
  targetProcessDefinitionId: string;
  updateEventTriggers?: boolean;
  variables?: Record<string, VariableValueDto>;
}

export interface MigrationInstructionValidationReportDto {
  instruction: MigrationInstructionDto;
  failures: string[];
}

export interface MigrationVariableValidationReportDto {
  type: string;
  value: any;
  valueInfo?: Record<string, any>;
  failures: string[];
}

export interface MigrationPlanReportDto {
  instructionReports: MigrationInstructionValidationReportDto[];
  variableReports: Record<string, MigrationVariableValidationReportDto>;
}
