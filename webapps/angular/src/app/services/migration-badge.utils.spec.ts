import { describe, it, expect } from 'vitest';
import { calculateMigrationBadges, MigrationBadgeResult } from './migration-badge.utils';
import { MigrationPlanDto, MigrationPlanReportDto } from './migration.model';
import { ActivityStatistics } from './cockpit.service';

describe('migration-badge.utils', () => {
  describe('calculateMigrationBadges', () => {
    it('should return empty badges when plan is null', () => {
      const result = calculateMigrationBadges(null, null, []);

      expect(result.sourceBadges).toEqual([]);
      expect(result.targetBadges).toEqual([]);
    });

    it('should return unmapped badges for activities with instances when no plan exists', () => {
      const stats: ActivityStatistics[] = [
        { id: 'task1', instances: 5, incidents: 0 },
        { id: 'task2', instances: 0, incidents: 0 },
        { id: 'task3', instances: 3, incidents: 0 }
      ];

      const result = calculateMigrationBadges(null, null, stats);

      expect(result.sourceBadges).toHaveLength(2);
      expect(result.sourceBadges[0]).toEqual({
        activityId: 'task1',
        type: 'unmapped',
        tooltip: '5 active instance(s), no migration mapping'
      });
      expect(result.sourceBadges[1]).toEqual({
        activityId: 'task3',
        type: 'unmapped',
        tooltip: '3 active instance(s), no migration mapping'
      });
      expect(result.targetBadges).toEqual([]);
    });

    it('should return empty badges when plan has no instructions', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: []
      };

      const result = calculateMigrationBadges(plan, null, []);

      expect(result.sourceBadges).toEqual([]);
      expect(result.targetBadges).toEqual([]);
    });

    it('should return valid badges for valid instruction without report', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: [
          {
            sourceActivityIds: ['task1', 'task2'],
            targetActivityIds: ['taskA', 'taskB']
          }
        ]
      };

      const result = calculateMigrationBadges(plan, null, []);

      expect(result.sourceBadges).toHaveLength(2);
      expect(result.sourceBadges[0]).toEqual({
        activityId: 'task1',
        type: 'valid',
        tooltip: undefined
      });
      expect(result.sourceBadges[1]).toEqual({
        activityId: 'task2',
        type: 'valid',
        tooltip: undefined
      });

      expect(result.targetBadges).toHaveLength(2);
      expect(result.targetBadges[0]).toEqual({
        activityId: 'taskA',
        type: 'valid',
        tooltip: undefined
      });
      expect(result.targetBadges[1]).toEqual({
        activityId: 'taskB',
        type: 'valid',
        tooltip: undefined
      });
    });

    it('should return valid badges when report shows no failures', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: [
          {
            sourceActivityIds: ['task1'],
            targetActivityIds: ['taskA']
          }
        ]
      };

      const report: MigrationPlanReportDto = {
        instructionReports: [
          {
            instruction: plan.instructions[0],
            failures: []
          }
        ]
      };

      const result = calculateMigrationBadges(plan, report, []);

      expect(result.sourceBadges[0].type).toBe('valid');
      expect(result.targetBadges[0].type).toBe('valid');
    });

    it('should return invalid badges when report shows failures', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: [
          {
            sourceActivityIds: ['task1'],
            targetActivityIds: ['taskA']
          }
        ]
      };

      const report: MigrationPlanReportDto = {
        instructionReports: [
          {
            instruction: plan.instructions[0],
            failures: ['Cannot migrate: incompatible activity types']
          }
        ]
      };

      const result = calculateMigrationBadges(plan, report, []);

      expect(result.sourceBadges[0]).toEqual({
        activityId: 'task1',
        type: 'invalid',
        tooltip: 'Migration validation failed: Cannot migrate: incompatible activity types'
      });
      expect(result.targetBadges[0]).toEqual({
        activityId: 'taskA',
        type: 'invalid',
        tooltip: 'Migration validation failed: Cannot migrate: incompatible activity types'
      });
    });

    it('should combine multiple failure messages in tooltip', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: [
          {
            sourceActivityIds: ['task1'],
            targetActivityIds: ['taskA']
          }
        ]
      };

      const report: MigrationPlanReportDto = {
        instructionReports: [
          {
            instruction: plan.instructions[0],
            failures: ['Error 1', 'Error 2', 'Error 3']
          }
        ]
      };

      const result = calculateMigrationBadges(plan, report, []);

      expect(result.sourceBadges[0].tooltip).toBe('Migration validation failed: Error 1; Error 2; Error 3');
    });

    it('should mark unmapped activities with instances when plan exists', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: [
          {
            sourceActivityIds: ['task1'],
            targetActivityIds: ['taskA']
          }
        ]
      };

      const stats: ActivityStatistics[] = [
        { id: 'task1', instances: 5, incidents: 0 },  // Mapped
        { id: 'task2', instances: 3, incidents: 0 },  // Unmapped with instances
        { id: 'task3', instances: 0, incidents: 0 }   // Unmapped without instances
      ];

      const result = calculateMigrationBadges(plan, null, stats);

      // Should have valid badge for task1 + unmapped badge for task2
      const task1Badge = result.sourceBadges.find(b => b.activityId === 'task1');
      const task2Badge = result.sourceBadges.find(b => b.activityId === 'task2');
      const task3Badge = result.sourceBadges.find(b => b.activityId === 'task3');

      expect(task1Badge).toEqual({
        activityId: 'task1',
        type: 'valid',
        tooltip: undefined
      });
      expect(task2Badge).toEqual({
        activityId: 'task2',
        type: 'unmapped',
        tooltip: '3 active instance(s), no migration mapping'
      });
      expect(task3Badge).toBeUndefined();
    });

    it('should handle multiple instructions with mixed validation results', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: [
          {
            sourceActivityIds: ['task1'],
            targetActivityIds: ['taskA']
          },
          {
            sourceActivityIds: ['task2'],
            targetActivityIds: ['taskB']
          }
        ]
      };

      const report: MigrationPlanReportDto = {
        instructionReports: [
          {
            instruction: plan.instructions[0],
            failures: []  // Valid
          },
          {
            instruction: plan.instructions[1],
            failures: ['Migration failed']  // Invalid
          }
        ]
      };

      const result = calculateMigrationBadges(plan, report, []);

      expect(result.sourceBadges[0]).toEqual({
        activityId: 'task1',
        type: 'valid',
        tooltip: undefined
      });
      expect(result.sourceBadges[1].type).toBe('invalid');
      expect(result.sourceBadges[1].tooltip).toContain('Migration failed');

      expect(result.targetBadges[0].type).toBe('valid');
      expect(result.targetBadges[1].type).toBe('invalid');
    });

    it('should handle one-to-many mappings', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: [
          {
            sourceActivityIds: ['task1'],
            targetActivityIds: ['taskA', 'taskB', 'taskC']
          }
        ]
      };

      const result = calculateMigrationBadges(plan, null, []);

      expect(result.sourceBadges).toHaveLength(1);
      expect(result.targetBadges).toHaveLength(3);
      expect(result.targetBadges.map(b => b.activityId)).toEqual(['taskA', 'taskB', 'taskC']);
    });

    it('should handle many-to-one mappings', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: [
          {
            sourceActivityIds: ['task1', 'task2', 'task3'],
            targetActivityIds: ['taskA']
          }
        ]
      };

      const result = calculateMigrationBadges(plan, null, []);

      expect(result.sourceBadges).toHaveLength(3);
      expect(result.sourceBadges.map(b => b.activityId)).toEqual(['task1', 'task2', 'task3']);
      expect(result.targetBadges).toHaveLength(1);
    });

    it('should not create unmapped badges for activities without instances', () => {
      const stats: ActivityStatistics[] = [
        { id: 'task1', instances: 0, incidents: 0 },
        { id: 'task2', instances: 0, incidents: 2 }  // Has incidents but no instances
      ];

      const result = calculateMigrationBadges(null, null, stats);

      expect(result.sourceBadges).toEqual([]);
    });

    it('should handle empty statistics array', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'source:1',
        targetProcessDefinitionId: 'target:1',
        instructions: [
          {
            sourceActivityIds: ['task1'],
            targetActivityIds: ['taskA']
          }
        ]
      };

      const result = calculateMigrationBadges(plan, null, []);

      // Should still create valid badges even with no stats
      expect(result.sourceBadges[0].type).toBe('valid');
      expect(result.targetBadges[0].type).toBe('valid');
    });
  });
});
