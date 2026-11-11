import { MigrationPlanDto, MigrationPlanReportDto } from './migration.model';
import { ActivityStatistics } from './cockpit.service';
import { parseInstructionReports } from './migration-validation.utils';

export type MigrationBadgeType = 'valid' | 'invalid' | 'unmapped';

export interface MigrationBadge {
  activityId: string;
  type: MigrationBadgeType;
  tooltip?: string;
}

export interface MigrationBadgeResult {
  sourceBadges: MigrationBadge[];
  targetBadges: MigrationBadge[];
}

/**
 * Pure function to calculate migration badges for source and target diagrams.
 *
 * Rules:
 * - Green checkmark (valid): activity is part of a valid migration instruction
 * - Red X (invalid): activity is part of an invalid migration instruction
 * - Yellow ! (unmapped): source activity has active instances but no instruction
 *
 * @param plan The generated migration plan
 * @param report The validation report for the plan
 * @param sourceStats Activity statistics for the source process (for unmapped detection)
 * @returns Badges for source and target diagrams
 */
export function calculateMigrationBadges(
  plan: MigrationPlanDto | null,
  report: MigrationPlanReportDto | null,
  sourceStats: ActivityStatistics[]
): MigrationBadgeResult {
  const sourceBadges: MigrationBadge[] = [];
  const targetBadges: MigrationBadge[] = [];

  if (!plan || !plan.instructions || plan.instructions.length === 0) {
    return { sourceBadges, targetBadges };
  }

  const validationStates = parseInstructionReports(report, plan.instructions);

  const mappedSourceActivities = new Set<string>();

  plan.instructions.forEach((instruction, index) => {
    const state = validationStates[index];
    const hasFailures = !state.valid;
    const badgeType: MigrationBadgeType = hasFailures ? 'invalid' : 'valid';

    let tooltip: string | undefined;
    if (hasFailures && state.failures.length > 0) {
      const failureMessages = state.failures.join('; ');
      tooltip = `Migration validation failed: ${failureMessages}`;
    }

    instruction.sourceActivityIds.forEach(sourceId => {
      mappedSourceActivities.add(sourceId);
      sourceBadges.push({
        activityId: sourceId,
        type: badgeType,
        tooltip
      });
    });

    instruction.targetActivityIds.forEach(targetId => {
      targetBadges.push({
        activityId: targetId,
        type: badgeType,
        tooltip
      });
    });
  });

  const unmappedActivities = sourceStats.filter(
    stat => stat.instances > 0 && !mappedSourceActivities.has(stat.id)
  );
  unmappedActivities.forEach(stat => {
    sourceBadges.push({
      activityId: stat.id,
      type: 'unmapped',
      tooltip: `${stat.instances} active instance(s), no migration mapping`
    });
  });

  return { sourceBadges, targetBadges };
}
