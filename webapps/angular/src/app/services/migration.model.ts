/**
 * Migration Model - Process Instance Migration interfaces for Camunda 7
 * Based on engine-rest DTO classes in io.orqueio.bpm.engine.rest.dto.migration
 */

export interface MigrationInstructionDto {
  sourceActivityIds: string[];
  targetActivityIds: string[];
  updateEventTrigger?: boolean | null;
}

export interface MigrationPlanDto {
  sourceProcessDefinitionId: string;
  targetProcessDefinitionId: string;
  instructions: MigrationInstructionDto[];
}

export interface MigrationPlanGenerationDto {
  sourceProcessDefinitionId: string;
  targetProcessDefinitionId: string;
  updateEventTriggers?: boolean;
}

export interface MigrationInstructionValidationReportDto {
  instruction: MigrationInstructionDto;
  failures: string[];
}

export interface MigrationPlanReportDto {
  instructionReports: MigrationInstructionValidationReportDto[];
}
