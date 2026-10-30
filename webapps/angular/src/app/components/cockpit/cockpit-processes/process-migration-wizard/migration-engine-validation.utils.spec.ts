import { describe, it, expect } from 'vitest';
import {
  buildValidationPayload,
  parseVariableReports,
  VariableValidationStatus
} from './migration-engine-validation.utils';
import type { MigrationPlanDto, MigrationPlanReportDto } from '../../../../services/migration.model';
import type { PlanVariable } from './migration-variables.utils';

describe('migration-engine-validation.utils', () => {
  describe('buildValidationPayload', () => {
    it('should build payload with empty variables when no variables provided', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'proc1:1:abc',
        targetProcessDefinitionId: 'proc2:2:def',
        instructions: []
      };
      const variables: PlanVariable[] = [];

      const payload = buildValidationPayload(plan, variables);

      expect(payload.sourceProcessDefinitionId).toBe('proc1:1:abc');
      expect(payload.targetProcessDefinitionId).toBe('proc2:2:def');
      expect(payload.instructions).toEqual([]);
      expect(payload.variables).toEqual({});
    });

    it('should build payload with String variable', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'proc1:1:abc',
        targetProcessDefinitionId: 'proc2:2:def',
        instructions: []
      };
      const variables: PlanVariable[] = [
        { name: 'stringVar', type: 'String', value: 'test value' }
      ];

      const payload = buildValidationPayload(plan, variables);

      expect(payload.variables).toEqual({
        stringVar: {
          type: 'String',
          value: 'test value'
        }
      });
    });

    it('should build payload with Integer variable', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'proc1:1:abc',
        targetProcessDefinitionId: 'proc2:2:def',
        instructions: []
      };
      const variables: PlanVariable[] = [
        { name: 'intVar', type: 'Integer', value: 123 }
      ];

      const payload = buildValidationPayload(plan, variables);

      expect(payload.variables).toEqual({
        intVar: {
          type: 'Integer',
          value: 123
        }
      });
    });

    it('should build payload with Boolean variable', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'proc1:1:abc',
        targetProcessDefinitionId: 'proc2:2:def',
        instructions: []
      };
      const variables: PlanVariable[] = [
        { name: 'boolVar', type: 'Boolean', value: true }
      ];

      const payload = buildValidationPayload(plan, variables);

      expect(payload.variables).toEqual({
        boolVar: {
          type: 'Boolean',
          value: true
        }
      });
    });

    it('should build payload with multiple variables', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'proc1:1:abc',
        targetProcessDefinitionId: 'proc2:2:def',
        instructions: []
      };
      const variables: PlanVariable[] = [
        { name: 'var1', type: 'String', value: 'test' },
        { name: 'var2', type: 'Integer', value: 42 },
        { name: 'var3', type: 'Boolean', value: false }
      ];

      const payload = buildValidationPayload(plan, variables);

      expect(payload.variables).toEqual({
        var1: { type: 'String', value: 'test' },
        var2: { type: 'Integer', value: 42 },
        var3: { type: 'Boolean', value: false }
      });
    });

    it('should preserve plan instructions', () => {
      const plan: MigrationPlanDto = {
        sourceProcessDefinitionId: 'proc1:1:abc',
        targetProcessDefinitionId: 'proc2:2:def',
        instructions: [
          { sourceActivityIds: ['task1'], targetActivityIds: ['task2'] }
        ]
      };
      const variables: PlanVariable[] = [];

      const payload = buildValidationPayload(plan, variables);

      expect(payload.instructions).toEqual([
        { sourceActivityIds: ['task1'], targetActivityIds: ['task2'] }
      ]);
    });
  });

  describe('parseVariableReports', () => {
    it('should return all valid when response has empty variableReports', () => {
      const response: MigrationPlanReportDto = {
        instructionReports: [],
        variableReports: {}
      };
      const variables: PlanVariable[] = [
        { name: 'var1', type: 'String', value: 'test' },
        { name: 'var2', type: 'Integer', value: 42 }
      ];

      const result = parseVariableReports(response, variables);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'var1',
        status: 'valid',
        messages: []
      });
      expect(result[1]).toEqual({
        name: 'var2',
        status: 'valid',
        messages: []
      });
    });

    it('should return invalid status when variable has failures', () => {
      const response: MigrationPlanReportDto = {
        instructionReports: [],
        variableReports: {
          invalidVar: {
            type: 'Integer',
            value: 'abc',
            failures: ['Cannot convert abc to Integer', 'Value must be numeric']
          }
        }
      };
      const variables: PlanVariable[] = [
        { name: 'invalidVar', type: 'Integer', value: 'abc' }
      ];

      const result = parseVariableReports(response, variables);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'invalidVar',
        status: 'invalid',
        messages: ['Cannot convert abc to Integer', 'Value must be numeric']
      });
    });

    it('should return valid status when variable has empty failures array', () => {
      const response: MigrationPlanReportDto = {
        instructionReports: [],
        variableReports: {
          validVar: {
            type: 'String',
            value: 'test',
            failures: []
          }
        }
      };
      const variables: PlanVariable[] = [
        { name: 'validVar', type: 'String', value: 'test' }
      ];

      const result = parseVariableReports(response, variables);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'validVar',
        status: 'valid',
        messages: []
      });
    });

    it('should handle mixed valid and invalid variables', () => {
      const response: MigrationPlanReportDto = {
        instructionReports: [],
        variableReports: {
          invalidVar: {
            type: 'Integer',
            value: 'abc',
            failures: ['Cannot convert']
          },
          validVar: {
            type: 'String',
            value: 'test',
            failures: []
          }
        }
      };
      const variables: PlanVariable[] = [
        { name: 'validVar', type: 'String', value: 'test' },
        { name: 'invalidVar', type: 'Integer', value: 'abc' }
      ];

      const result = parseVariableReports(response, variables);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.name === 'validVar')).toEqual({
        name: 'validVar',
        status: 'valid',
        messages: []
      });
      expect(result.find(r => r.name === 'invalidVar')).toEqual({
        name: 'invalidVar',
        status: 'invalid',
        messages: ['Cannot convert']
      });
    });

    it('should return valid when variable not in response (no report = valid)', () => {
      const response: MigrationPlanReportDto = {
        instructionReports: [],
        variableReports: {
          otherVar: {
            type: 'String',
            value: 'test',
            failures: ['error']
          }
        }
      };
      const variables: PlanVariable[] = [
        { name: 'myVar', type: 'String', value: 'test' }
      ];

      const result = parseVariableReports(response, variables);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'myVar',
        status: 'valid',
        messages: []
      });
    });

    it('should handle variable with single failure message', () => {
      const response: MigrationPlanReportDto = {
        instructionReports: [],
        variableReports: {
          badVar: {
            type: 'Object',
            value: null,
            failures: ['Java serialization is disabled']
          }
        }
      };
      const variables: PlanVariable[] = [
        { name: 'badVar', type: 'Object', value: null }
      ];

      const result = parseVariableReports(response, variables);

      expect(result[0]).toEqual({
        name: 'badVar',
        status: 'invalid',
        messages: ['Java serialization is disabled']
      });
    });

    it('should handle empty variables array', () => {
      const response: MigrationPlanReportDto = {
        instructionReports: [],
        variableReports: {}
      };
      const variables: PlanVariable[] = [];

      const result = parseVariableReports(response, variables);

      expect(result).toEqual([]);
    });

    it('should return error status when response is unexpected format', () => {
      const response = null as any;
      const variables: PlanVariable[] = [
        { name: 'var1', type: 'String', value: 'test' }
      ];

      const result = parseVariableReports(response, variables);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('error');
      expect(result[0].messages).toContain('Could not parse validation response');
    });

    it('should return error status when response has no variableReports field', () => {
      const response = {
        instructionReports: []
      } as any;
      const variables: PlanVariable[] = [
        { name: 'var1', type: 'String', value: 'test' }
      ];

      const result = parseVariableReports(response, variables);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('error');
      expect(result[0].messages).toContain('Could not parse validation response');
    });

    it('should handle multiple messages for same variable', () => {
      const response: MigrationPlanReportDto = {
        instructionReports: [],
        variableReports: {
          badVar: {
            type: 'Long',
            value: 9999999999999999,
            failures: [
              'Value exceeds Long.MAX_VALUE',
              'Out of range for type Long',
              'Cannot store value'
            ]
          }
        }
      };
      const variables: PlanVariable[] = [
        { name: 'badVar', type: 'Long', value: 9999999999999999 }
      ];

      const result = parseVariableReports(response, variables);

      expect(result[0].messages).toHaveLength(3);
      expect(result[0].messages).toEqual([
        'Value exceeds Long.MAX_VALUE',
        'Out of range for type Long',
        'Cannot store value'
      ]);
    });
  });

  describe('VariableValidationStatus type', () => {
    it('should allow all defined status values', () => {
      const statuses: VariableValidationStatus[] = ['valid', 'invalid', 'pending', 'error'];
      expect(statuses).toHaveLength(4);
    });
  });
});
