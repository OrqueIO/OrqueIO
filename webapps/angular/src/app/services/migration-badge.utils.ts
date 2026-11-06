import { MigrationPlanDto, MigrationPlanReportDto, MigrationInstructionValidationReportDto } from './migration.model';
import { ActivityStatistics } from './cockpit.service';

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
    // No plan: check for unmapped activities with instances
    const unmappedActivities = sourceStats.filter(stat => stat.instances > 0);
    unmappedActivities.forEach(stat => {
      sourceBadges.push({
        activityId: stat.id,
        type: 'unmapped',
        tooltip: `${stat.instances} active instance(s), no migration mapping`
      });
    });
    return { sourceBadges, targetBadges };
  }

  // Build a map of instruction index to validation report
  const reportMap = new Map<number, MigrationInstructionValidationReportDto>();
  if (report?.instructionReports) {
    report.instructionReports.forEach((instrReport, index) => {
      reportMap.set(index, instrReport);
    });
  }

  // Track which source activities are mapped
  const mappedSourceActivities = new Set<string>();

  // Process each instruction
  plan.instructions.forEach((instruction, index) => {
    const instrReport = reportMap.get(index);
    const hasFailures = instrReport?.failures && instrReport.failures.length > 0;
    const badgeType: MigrationBadgeType = hasFailures ? 'invalid' : 'valid';

    // Build tooltip for invalid mappings
    let tooltip: string | undefined;
    if (hasFailures && instrReport?.failures) {
      const failureMessages = instrReport.failures.join('; ');
      tooltip = `Migration validation failed: ${failureMessages}`;
    }

    // Add badges to all source activities in this instruction
    instruction.sourceActivityIds.forEach(sourceId => {
      mappedSourceActivities.add(sourceId);
      sourceBadges.push({
        activityId: sourceId,
        type: badgeType,
        tooltip
      });
    });

    // Add badges to all target activities in this instruction
    instruction.targetActivityIds.forEach(targetId => {
      targetBadges.push({
        activityId: targetId,
        type: badgeType,
        tooltip
      });
    });
  });

  // Find unmapped source activities with instances
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
