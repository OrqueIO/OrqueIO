import { describe, it, expect } from 'vitest';
import {
  buildRuntimeProcessInstanceQuery,
  type ProcessInstanceQueryDto
} from './migration-query-converter.utils';
import type { MultiValueFilter } from '../../../../services/cockpit.service';

describe('migration-query-converter.utils', () => {
  const SOURCE_DEF_ID = 'process:1:abc123';

  describe('buildRuntimeProcessInstanceQuery', () => {
    it('should always include processDefinitionId', () => {
      const result = buildRuntimeProcessInstanceQuery([], SOURCE_DEF_ID);

      expect(result.processDefinitionId).toBe(SOURCE_DEF_ID);
      expect(Object.keys(result)).toHaveLength(1); // Only processDefinitionId
    });

    it('should convert instanceId criterion to processInstanceIds array', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'instanceId',
        values: ['inst-1', 'inst-2']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.processInstanceIds).toEqual(['inst-1', 'inst-2']);
    });

    it('should convert single instanceId to processInstanceIds array', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'instanceId',
        values: ['inst-1']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.processInstanceIds).toEqual(['inst-1']);
    });

    it('should convert businessKey criterion to businessKeyLike with LIKE pattern', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'businessKey',
        values: ['CMD']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.businessKeyLike).toBe('%CMD%');
    });

    it('should convert state criterion - ACTIVE only', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'state',
        values: ['ACTIVE']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.active).toBe(true);
      expect(result.suspended).toBeUndefined();
    });

    it('should convert state criterion - SUSPENDED only', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'state',
        values: ['SUSPENDED']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.suspended).toBe(true);
      expect(result.active).toBeUndefined();
    });

    it('should convert state criterion - ACTIVE and SUSPENDED (both) = no state keys', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'state',
        values: ['ACTIVE', 'SUSPENDED']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.active).toBeUndefined();
      expect(result.suspended).toBeUndefined();
    });

    it('should convert withIncidents criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'withIncidents',
        values: ['true']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.withIncident).toBe(true);
    });

    it('should convert incidentId criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'incidentId',
        values: ['incident-123']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.incidentId).toBe('incident-123');
    });

    it('should convert incidentType criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'incidentType',
        values: ['failedJob']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.incidentType).toBe('failedJob');
    });

    it('should convert incidentMessage to incidentMessageLike with LIKE pattern', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'incidentMessage',
        values: ['timeout']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.incidentMessageLike).toBe('%timeout%');
    });

    it('should convert activityId criterion to activityIdIn array', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'activityId',
        values: ['Task_1', 'Task_2']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.activityIdIn).toEqual(['Task_1', 'Task_2']);
    });

    it('should convert subProcessInstance criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'subProcessInstance',
        values: ['sub-inst-123']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.subProcessInstanceId).toBe('sub-inst-123');
    });

    it('should convert superProcessInstance criterion', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'superProcessInstance',
        values: ['super-inst-456']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.superProcessInstanceId).toBe('super-inst-456');
    });

    it('should ignore unknown criteria (whitelist)', () => {
      const criteria: MultiValueFilter[] = [
        { field: 'unknownField' as any, values: ['value1'] },
        { field: 'anotherUnknown' as any, values: ['value2'] },
        { field: 'businessKey', values: ['BK-001'] }
      ];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.businessKeyLike).toBe('%BK-001%');
      expect((result as any).unknownField).toBeUndefined();
      expect((result as any).anotherUnknown).toBeUndefined();
    });

    it('should ignore startedAfter (not in whitelist)', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'startedAfter' as any,
        values: ['2024-01-01T00:00:00']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect((result as any).startedAfter).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('should ignore startedBefore (not in whitelist)', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'startedBefore' as any,
        values: ['2024-01-01T00:00:00']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect((result as any).startedBefore).toBeUndefined();
    });

    it('should ignore finishedAfter (not in whitelist)', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'finishedAfter' as any,
        values: ['2024-01-01T00:00:00']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect((result as any).finishedAfter).toBeUndefined();
    });

    it('should ignore finishedBefore (not in whitelist)', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'finishedBefore' as any,
        values: ['2024-01-01T00:00:00']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect((result as any).finishedBefore).toBeUndefined();
    });

    it('should ignore withJobsRetrying (not in whitelist)', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'withJobsRetrying' as any,
        values: ['true']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect((result as any).withJobsRetrying).toBeUndefined();
    });

    it('should ignore processDefinition (not in whitelist, source is always used)', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'processDefinition' as any,
        values: ['process:2:xyz']
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.processDefinitionId).toBe(SOURCE_DEF_ID);
      expect((result as any).processDefinitionKeyIn).toBeUndefined();
      expect((result as any).processDefinitionIdIn).toBeUndefined();
    });

    it('should handle mixed supported and unsupported criteria', () => {
      const criteria: MultiValueFilter[] = [
        { field: 'instanceId', values: ['inst-1'] },
        { field: 'startedAfter' as any, values: ['2024-01-01T00:00:00'] },
        { field: 'businessKey', values: ['BK-001'] },
        { field: 'finishedBefore' as any, values: ['2024-12-31T23:59:59'] }
      ];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.processInstanceIds).toEqual(['inst-1']);
      expect(result.businessKeyLike).toBe('%BK-001%');

      expect((result as any).startedAfter).toBeUndefined();
      expect((result as any).finishedBefore).toBeUndefined();
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

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.variables).toHaveLength(2);
      expect(result.variables).toContainEqual({
        name: 'status',
        operator: 'eq',
        value: 'active'
      });
      expect(result.variables).toContainEqual({
        name: 'priority',
        operator: 'gt',
        value: '5'
      });
    });

    it('should handle variable criteria using field "variable"', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'variable',
        values: [],
        variableLines: [
          { variableName: 'count', variableOperator: 'lteq', values: ['10'] }
        ]
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.variables).toHaveLength(1);
      expect(result.variables).toContainEqual({
        name: 'count',
        operator: 'lteq',
        value: '10'
      });
    });

    it('should handle empty variableLines gracefully', () => {
      const criteria: MultiValueFilter[] = [{
        field: 'variables',
        values: [],
        variableLines: []
      }];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.variables).toBeUndefined();
    });

    it('should handle all supported criteria together', () => {
      const criteria: MultiValueFilter[] = [
        { field: 'instanceId', values: ['inst-1', 'inst-2'] },
        { field: 'businessKey', values: ['BK-001'] },
        { field: 'state', values: ['ACTIVE'] },
        { field: 'withIncidents', values: ['true'] },
        { field: 'incidentType', values: ['failedJob'] },
        { field: 'activityId', values: ['Task_1'] },
        { field: 'superProcessInstance', values: ['super-123'] }
      ];

      const result = buildRuntimeProcessInstanceQuery(criteria, SOURCE_DEF_ID);

      expect(result.processDefinitionId).toBe(SOURCE_DEF_ID);
      expect(result.processInstanceIds).toEqual(['inst-1', 'inst-2']);
      expect(result.businessKeyLike).toBe('%BK-001%');
      expect(result.active).toBe(true);
      expect(result.withIncident).toBe(true);
      expect(result.incidentType).toBe('failedJob');
      expect(result.activityIdIn).toEqual(['Task_1']);
      expect(result.superProcessInstanceId).toBe('super-123');
    });
  });
});
