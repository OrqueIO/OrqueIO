/**
 * Pure utility functions for capturing and restoring migration mapping state.
 * Used to implement undo functionality after deleting a mapping.
 */

import { MigrationInstructionDto } from '../../../../services/migration.model';
import { RouteParams } from './migration-arrows.component';

export interface MigrationState {
  editableInstructions: MigrationInstructionDto[];
  customAnchors: Map<string, RouteParams>;
}

export interface MappingSnapshot {
  type: 'mapping-delete';
  anchorKey: string;
  instruction: MigrationInstructionDto;
  routeParams?: RouteParams;
}

/**
 * Creates an immutable snapshot of a mapping's state before deletion.
 * Captures the instruction (source, target, updateEventTrigger) and
 * the route parameters (waypoints, sides, t values).
 *
 * @param state - Current migration wizard state
 * @param anchorKey - Key identifying the mapping (getAnchorKey(sourceId, targetId))
 * @returns Snapshot object, or null if mapping not found
 */
export function snapshotMapping(
  state: MigrationState,
  anchorKey: string
): MappingSnapshot | null {

  const instruction = state.editableInstructions.find(instr => {
    const instructionKey = `${instr.sourceActivityIds[0]}-${instr.targetActivityIds[0]}`;
    return instructionKey === anchorKey;
  });

  if (!instruction) {
    return null;
  }

  const instructionCopy: MigrationInstructionDto = {
    sourceActivityIds: [...instruction.sourceActivityIds],
    targetActivityIds: [...instruction.targetActivityIds],
    updateEventTrigger: instruction.updateEventTrigger ?? false
  };

  let routeParamsCopy: RouteParams | undefined = undefined;
  const routeParams = state.customAnchors.get(anchorKey);
  if (routeParams) {
    routeParamsCopy = { ...routeParams };
    if (routeParams.waypoints) {
      routeParamsCopy.waypoints = routeParams.waypoints.map(wp => ({ ...wp }));
    }
  }

  return {
    type: 'mapping-delete',
    anchorKey,
    instruction: instructionCopy,
    routeParams: routeParamsCopy
  };
}

/**
 * Restores a mapping from a snapshot, inserting it back into the state.
 * Mutates the state object by adding the instruction and route params.
 * If the mapping already exists, does not duplicate it (idempotent).
 *
 * @param state - Current migration wizard state (will be mutated)
 * @param snapshot - Snapshot to restore
 */
export function restoreMapping(
  state: MigrationState,
  snapshot: MappingSnapshot
): void {
  const existingIndex = state.editableInstructions.findIndex(instr => {
    const instructionKey = `${instr.sourceActivityIds[0]}-${instr.targetActivityIds[0]}`;
    return instructionKey === snapshot.anchorKey;
  });

  if (existingIndex === -1) {
    const instructionCopy: MigrationInstructionDto = {
      sourceActivityIds: [...snapshot.instruction.sourceActivityIds],
      targetActivityIds: [...snapshot.instruction.targetActivityIds],
      updateEventTrigger: snapshot.instruction.updateEventTrigger ?? false
    };

    state.editableInstructions.push(instructionCopy);
  }

  if (snapshot.routeParams) {
    const routeParamsCopy: RouteParams = { ...snapshot.routeParams };
    if (snapshot.routeParams.waypoints) {
      routeParamsCopy.waypoints = snapshot.routeParams.waypoints.map(wp => ({ ...wp }));
    }

    state.customAnchors.set(snapshot.anchorKey, routeParamsCopy);
  }
}
