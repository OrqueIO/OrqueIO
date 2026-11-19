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

  const sourceErrorMap = new Map<string, string[]>();
  const targetErrorMap = new Map<string, string[]>();

  plan.instructions.forEach((instruction, index) => {
    const state = validationStates[index];
    const failures = state.failures;

    instruction.sourceActivityIds.forEach(sourceId => {
      const innerActivityId = sourceId.replace(/#multiInstanceBody$/, '');
      mappedSourceActivities.add(innerActivityId);

      if (failures.length > 0) {
        const existing = sourceErrorMap.get(innerActivityId) || [];
        sourceErrorMap.set(innerActivityId, [...existing, ...failures]);
      } else {
        if (!sourceErrorMap.has(innerActivityId)) {
          sourceErrorMap.set(innerActivityId, []);
        }
      }
    });

    instruction.targetActivityIds.forEach(targetId => {
      const innerActivityId = targetId.replace(/#multiInstanceBody$/, '');

      if (failures.length > 0) {
        const existing = targetErrorMap.get(innerActivityId) || [];
        targetErrorMap.set(innerActivityId, [...existing, ...failures]);
      } else {
        if (!targetErrorMap.has(innerActivityId)) {
          targetErrorMap.set(innerActivityId, []);
        }
      }
    });
  });

  sourceErrorMap.forEach((failures, activityId) => {
    const hasFailures = failures.length > 0;
    const badgeType: MigrationBadgeType = hasFailures ? 'invalid' : 'valid';

    let tooltip: string | undefined;
    if (hasFailures) {
      const failureMessages = failures.join('; ');
      tooltip = `Migration validation failed: ${failureMessages}`;
    }

    sourceBadges.push({
      activityId,
      type: badgeType,
      tooltip
    });
  });

  targetErrorMap.forEach((failures, activityId) => {
    const hasFailures = failures.length > 0;
    const badgeType: MigrationBadgeType = hasFailures ? 'invalid' : 'valid';

    let tooltip: string | undefined;
    if (hasFailures) {
      const failureMessages = failures.join('; ');
      tooltip = `Migration validation failed: ${failureMessages}`;
    }

    targetBadges.push({
      activityId,
      type: badgeType,
      tooltip
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
