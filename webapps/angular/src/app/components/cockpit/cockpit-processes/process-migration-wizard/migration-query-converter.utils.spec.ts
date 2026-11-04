import { describe, it, expect } from 'vitest';
import {
  convertCriteriaToRuntimeQuery,
  hasUnsupportedCriteria,
  getUnsupportedCriteriaNames
} from './migration-query-converter.utils';
import type { MultiValueFilter } from '../../../../services/cockpit.service';

describe('migration-query-converter.utils', () => {
  const SOURCE_DEF_ID = 'process:1:abc123';

  describe('convertCriteriaToRuntimeQuery', () => {
    it('should always include processDefinitionId', () => {
      const result = convertCriteriaToRuntimeQuery([], SOURCE_DEF_ID);

      expect(result.query.processDefinitionId).toBe(SOURCE_DEF_ID);
      expect(result.unsupportedCriteria).toEqual([]);
      expect(result.hasUnsupportedCriteria).toBe(false);
    });

    it('should convert instanceId criterion to processInstanceIds', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'instanceId',
        values: ['inst-1', 'inst-2']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.query.processInstanceIds).toEqual(['inst-1', 'inst-2']);
      expect(result.unsupportedCriteria).toEqual([]);
    });

    it('should convert businessKey criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'businessKey',
        values: ['BK-001']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.query.businessKey).toBe('BK-001');
      expect(result.unsupportedCriteria).toEqual([]);
    });

    it('should convert state criterion - ACTIVE', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'state',
        values: ['ACTIVE']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.query.active).toBe(true);
      expect(result.query.suspended).toBeUndefined();
      expect(result.unsupportedCriteria).toEqual([]);
    });

    it('should convert state criterion - SUSPENDED', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'state',
        values: ['SUSPENDED']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.query.suspended).toBe(true);
      expect(result.query.active).toBeUndefined();
      expect(result.unsupportedCriteria).toEqual([]);
    });

    it('should convert withIncidents criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'withIncidents',
        values: ['true']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.query.withIncident).toBe(true);
      expect(result.unsupportedCriteria).toEqual([]);
    });

    it('should convert activityId criterion to activityIdIn', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'activityId',
        values: ['Task_1', 'Task_2']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.query.activityIdIn).toEqual(['Task_1', 'Task_2']);
      expect(result.unsupportedCriteria).toEqual([]);
    });

    it('should track unsupported startedAfter criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'startedAfter',
        values: ['2024-01-01T00:00:00']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.unsupportedCriteria).toContain('startedAfter');
      expect(result.hasUnsupportedCriteria).toBe(true);
      // Should not be in query
      expect(result.query.startedAfter).toBeUndefined();
    });

    it('should track unsupported startedBefore criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'startedBefore',
        values: ['2024-01-01T00:00:00']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.unsupportedCriteria).toContain('startedBefore');
      expect(result.hasUnsupportedCriteria).toBe(true);
      expect(result.query.startedBefore).toBeUndefined();
    });

    it('should track unsupported finishedAfter criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'finishedAfter',
        values: ['2024-01-01T00:00:00']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.unsupportedCriteria).toContain('finishedAfter');
      expect(result.hasUnsupportedCriteria).toBe(true);
    });

    it('should track unsupported finishedBefore criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'finishedBefore',
        values: ['2024-01-01T00:00:00']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.unsupportedCriteria).toContain('finishedBefore');
      expect(result.hasUnsupportedCriteria).toBe(true);
    });

    it('should track unsupported withJobsRetrying criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'withJobsRetrying',
        values: ['true']
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.unsupportedCriteria).toContain('withJobsRetrying');
      expect(result.hasUnsupportedCriteria).toBe(true);
    });

    it('should handle mixed supported and unsupported criteria', () => {
      const criteria: MultiValueFilter[] = [
        { field: 'instanceId', values: ['inst-1'] },
        { field: 'startedAfter', values: ['2024-01-01T00:00:00'] },
        { field: 'businessKey', values: ['BK-001'] },
        { field: 'finishedBefore', values: ['2024-12-31T23:59:59'] }
      ];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      // Supported criteria should be converted
      expect(result.query.processInstanceIds).toEqual(['inst-1']);
      expect(result.query.businessKey).toBe('BK-001');

      // Unsupported criteria should be tracked
      expect(result.unsupportedCriteria).toContain('startedAfter');
      expect(result.unsupportedCriteria).toContain('finishedBefore');
      expect(result.hasUnsupportedCriteria).toBe(true);

      // Unsupported criteria should NOT be in query
      expect(result.query.startedAfter).toBeUndefined();
      expect(result.query.finishedBefore).toBeUndefined();
    });

    it('should never send unsupported criteria silently', () => {
      const unsupportedFields = ['startedAfter', 'startedBefore', 'finishedAfter', 'finishedBefore', 'withJobsRetrying'];

      for (const field of unsupportedFields) {
        const criteria: MultiValueFilter[] = [{ field: field as any, values: ['value'] }];
        const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

        expect(result.unsupportedCriteria).toContain(field);
        expect(result.hasUnsupportedCriteria).toBe(true);

        expect(result.query[field]).toBeUndefined();
      }
    });

    it('should handle variable criteria with variableLines', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'variables',
        values: [],
        variableLines: [
          { variableName: 'status', variableOperator: 'eq', values: ['active'] },
          { variableName: 'priority', variableOperator: 'gt', values: ['5'] }
        ]
      }];

      const result = convertCriteriaToRuntimeQuery(criteria, SOURCE_DEF_ID);

      expect(result.query.variables).toHaveLength(2);
      expect(result.query.variables).toContainEqual({
        name: 'status',
        operator: 'eq',
        value: 'active'
      });
      expect(result.query.variables).toContainEqual({
        name: 'priority',
        operator: 'gt',
        value: '5'
      });
      expect(result.unsupportedCriteria).toEqual([]);
    });
  });

  describe('hasUnsupportedCriteria', () => {
    it('should return false for empty criteria', () => {
      expect(hasUnsupportedCriteria([])).toBe(false);
    });

    it('should return false for all supported criteria', () => {
      const criteria: MultiValueFilter[] = [
        { field: 'instanceId', values: ['inst-1'] },
        { field: 'businessKey', values: ['BK-001'] }
      ];
      expect(hasUnsupportedCriteria(criteria)).toBe(false);
    });

    it('should return true if any criterion is unsupported', () => {
      const criteria: MultiValueFilter[] = [
        { field: 'instanceId', values: ['inst-1'] },
        { field: 'startedAfter', values: ['2024-01-01'] }
      ];
      expect(hasUnsupportedCriteria(criteria)).toBe(true);
    });
  });

  describe('getUnsupportedCriteriaNames', () => {
    it('should return empty array for no unsupported criteria', () => {
      const criteria: MultiValueFilter[] = [
        { field: 'instanceId', values: ['inst-1'] }
      ];
      expect(getUnsupportedCriteriaNames(criteria)).toEqual([]);
    });

    it('should return list of unsupported criterion names', () => {
      const criteria: MultiValueFilter[] = [
        { field: 'instanceId', values: ['inst-1'] },
        { field: 'startedAfter', values: ['2024-01-01'] },
        { field: 'finishedBefore', values: ['2024-12-31'] }
      ];

      const names = getUnsupportedCriteriaNames(criteria);
      expect(names).toContain('startedAfter');
      expect(names).toContain('finishedBefore');
      expect(names).not.toContain('instanceId');
    });
  });
});