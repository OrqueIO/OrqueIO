/**
 * Shared utilities for migration validation report parsing.
 *
 * Pure functions with no dependencies - can be used anywhere (services, components, shared).
 */

import type { MigrationPlanReportDto, MigrationInstructionDto } from './migration.model';

export interface InstructionValidationState {
  sourceActivityId: string;
  targetActivityId: string;
  valid: boolean;
  failures: string[];
}

/**
 * Parses instruction reports from a validation response and matches them to instructions by identifiers.
 * Pure function - no side effects.
 *
 * IMPORTANT: Camunda returns instructionReports ONLY for instructions that failed validation.
 * We must match by (sourceActivityId, targetActivityId), NOT by index position.
 *
 * @param response - Validation response from Camunda
 * @param instructions - List of instructions from the migration plan
 * @returns Validation states for all instructions (matched by source+target IDs)
 */
export function parseInstructionReports(
  response: MigrationPlanReportDto | null,
  instructions: MigrationInstructionDto[]
): InstructionValidationState[] {
  const reportsMap = new Map<string, string[]>();

  if (response && response.instructionReports) {
    for (const report of response.instructionReports) {
      const sourceId = report.instruction.sourceActivityIds[0];
      const targetId = report.instruction.targetActivityIds[0];
      const key = sourceId + '→' + targetId;
      reportsMap.set(key, report.failures || []);
    }
  }

  return instructions.map(instruction => {
    const sourceId = instruction.sourceActivityIds[0];
    const targetId = instruction.targetActivityIds[0];
    const key = sourceId + '→' + targetId;

    const failures = reportsMap.get(key) || [];
    const valid = failures.length === 0;

    return {
      sourceActivityId: sourceId,
      targetActivityId: targetId,
      valid,
      failures
    };
  });
}

/**
 * Finds the validation state for a specific instruction by source and target activity IDs.
 * Pure function - no side effects.
 *
 * @param states - Array of instruction validation states
 * @param sourceId - Source activity ID
 * @param targetId - Target activity ID
 * @returns Validation state for the instruction, or null if not found
 */
export function findInstructionState(
  states: InstructionValidationState[],
  sourceId: string,
  targetId: string
): InstructionValidationState | null {
  return states.find(
    s => s.sourceActivityId === sourceId && s.targetActivityId === targetId
  ) || null;
}
