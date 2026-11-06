import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect } from 'vitest';
import {
  validateVariableDraft,
  toPlanVariable,
  displayValue,
  VariableDraft
} from './migration-variables.utils';

describe('migration-variables.utils', () => {
  describe('validateVariableDraft', () => {
    it('should return null for valid draft with all fields filled', () => {
      const draft: VariableDraft = { name: 'myVar', type: 'String', value: 'hello' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error when name is empty', () => {
      const draft: VariableDraft = { name: '', type: 'String', value: 'hello' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ name: 'migration.variables.errorNameRequired' });
    });

    it('should return error when name is only whitespace', () => {
      const draft: VariableDraft = { name: '   ', type: 'String', value: 'hello' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ name: 'migration.variables.errorNameRequired' });
    });

    it('should trim name before validation', () => {
      const draft: VariableDraft = { name: '  validName  ', type: 'String', value: 'hello' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error when type is empty', () => {
      const draft: VariableDraft = { name: 'myVar', type: '', value: 'hello' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ type: 'migration.variables.errorTypeRequired' });
    });

    it('should return error when value is empty string for String type', () => {
      const draft: VariableDraft = { name: 'myVar', type: 'String', value: '' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorValueRequired' });
    });

    it('should return error when value is whitespace-only for String type', () => {
      const draft: VariableDraft = { name: 'myVar', type: 'String', value: '   ' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorValueRequired' });
    });

    it('should allow numeric string value for String type', () => {
      const draft: VariableDraft = { name: 'myVar', type: 'String', value: '123' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error for duplicate name in existingNames', () => {
      const draft: VariableDraft = { name: 'myVar', type: 'String', value: 'hello' };
      const errors = validateVariableDraft(draft, ['myVar', 'otherVar']);
      expect(errors).toEqual({ name: 'migration.variables.errorNameDuplicate' });
    });

    it('should allow editing existing variable with same name', () => {
      const draft: VariableDraft = { name: 'myVar', type: 'String', value: 'newValue' };
      const errors = validateVariableDraft(draft, ['myVar', 'otherVar'], 'myVar');
      expect(errors).toBeNull();
    });

    it('should detect duplicate when editing but name conflicts with another existing name', () => {
      const draft: VariableDraft = { name: 'otherVar', type: 'String', value: 'value' };
      const errors = validateVariableDraft(draft, ['myVar', 'otherVar'], 'myVar');
      expect(errors).toEqual({ name: 'migration.variables.errorNameDuplicate' });
    });

    it('should handle Integer type with valid integer value', () => {
      const draft: VariableDraft = { name: 'count', type: 'Integer', value: '42' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should handle Integer type with negative value', () => {
      const draft: VariableDraft = { name: 'count', type: 'Integer', value: '-42' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error for Integer type with non-numeric value', () => {
      const draft: VariableDraft = { name: 'count', type: 'Integer', value: 'abc' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorIntegerInvalid' });
    });

    it('should return error for Integer type with decimal value', () => {
      const draft: VariableDraft = { name: 'count', type: 'Integer', value: '3.14' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorIntegerInvalid' });
    });

    it('should return error for Integer type with empty value', () => {
      const draft: VariableDraft = { name: 'count', type: 'Integer', value: '' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorValueRequired' });
    });

    it('should handle Long type with valid integer value', () => {
      const draft: VariableDraft = { name: 'bigNum', type: 'Long', value: '123456789012345' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error for Long type with decimal value', () => {
      const draft: VariableDraft = { name: 'bigNum', type: 'Long', value: '123.45' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorIntegerInvalid' });
    });

    it('should handle Short type with valid integer value', () => {
      const draft: VariableDraft = { name: 'smallNum', type: 'Short', value: '32767' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error for Short type with non-numeric value', () => {
      const draft: VariableDraft = { name: 'smallNum', type: 'Short', value: 'xyz' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorIntegerInvalid' });
    });

    it('should handle Double type with decimal value', () => {
      const draft: VariableDraft = { name: 'pi', type: 'Double', value: '3.14159' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should handle Double type with integer value', () => {
      const draft: VariableDraft = { name: 'pi', type: 'Double', value: '3' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error for Double type with non-numeric value', () => {
      const draft: VariableDraft = { name: 'pi', type: 'Double', value: 'not-a-number' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorDoubleInvalid' });
    });

    it('should return error for Double type with empty value', () => {
      const draft: VariableDraft = { name: 'pi', type: 'Double', value: '' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorValueRequired' });
    });

    it('should handle Boolean type with "true" value', () => {
      const draft: VariableDraft = { name: 'isActive', type: 'Boolean', value: 'true' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should handle Boolean type with "false" value', () => {
      const draft: VariableDraft = { name: 'isActive', type: 'Boolean', value: 'false' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error for Boolean type with invalid value', () => {
      const draft: VariableDraft = { name: 'isActive', type: 'Boolean', value: 'maybe' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorBooleanInvalid' });
    });

    it('should handle Date type with ISO datetime value', () => {
      const draft: VariableDraft = { name: 'created', type: 'Date', value: '2024-01-15T10:30' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error for Date type with invalid format', () => {
      const draft: VariableDraft = { name: 'created', type: 'Date', value: 'not-a-date' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorDateInvalid' });
    });

    it('should return error for Date type with empty value', () => {
      const draft: VariableDraft = { name: 'created', type: 'Date', value: '' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorValueRequired' });
    });

    it('should handle Json type with valid JSON array', () => {
      const draft: VariableDraft = { name: 'items', type: 'Json', value: '[1,2,3]' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should return error for Json type with invalid JSON', () => {
      const draft: VariableDraft = { name: 'items', type: 'Json', value: '[1,2,3' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorJsonInvalid' });
    });

    it('should return multiple errors when multiple fields are invalid', () => {
      const draft: VariableDraft = { name: '', type: '', value: '' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({
        name: 'migration.variables.errorNameRequired',
        type: 'migration.variables.errorTypeRequired',
        value: 'migration.variables.errorValueRequired'
      });
    });

    it('should escape HTML characters in name without error', () => {
      const draft: VariableDraft = { name: '<script>alert(1)</script>', type: 'String', value: 'test' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should handle very long name', () => {
      const draft: VariableDraft = { name: 'a'.repeat(500), type: 'String', value: 'test' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toBeNull();
    });

    it('should reject NaN-like values for Integer', () => {
      const draft: VariableDraft = { name: 'num', type: 'Integer', value: 'NaN' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorIntegerInvalid' });
    });

    it('should reject Infinity for Double', () => {
      const draft: VariableDraft = { name: 'num', type: 'Double', value: 'Infinity' };
      const errors = validateVariableDraft(draft, []);
      expect(errors).toEqual({ value: 'migration.variables.errorDoubleInvalid' });
    });
  });

  describe('toPlanVariable', () => {
    it('should convert String variable to plan format', () => {
      const draft: VariableDraft = { name: 'myVar', type: 'String', value: 'hello' };
      const result = toPlanVariable(draft);
      expect(result).toEqual({
        name: 'myVar',
        type: 'String',
        value: 'hello'
      });
    });

    it('should trim name when converting to plan format', () => {
      const draft: VariableDraft = { name: '  myVar  ', type: 'String', value: 'hello' };
      const result = toPlanVariable(draft);
      expect(result.name).toBe('myVar');
    });

    it('should convert Integer variable to plan format with numeric value', () => {
      const draft: VariableDraft = { name: 'count', type: 'Integer', value: '42' };
      const result = toPlanVariable(draft);
      expect(result).toEqual({
        name: 'count',
        type: 'Integer',
        value: 42
      });
    });

    it('should convert negative Integer to plan format', () => {
      const draft: VariableDraft = { name: 'count', type: 'Integer', value: '-42' };
      const result = toPlanVariable(draft);
      expect(result.value).toBe(-42);
    });

    it('should convert Long variable to plan format with numeric value', () => {
      const draft: VariableDraft = { name: 'bigNum', type: 'Long', value: '123456789012345' };
      const result = toPlanVariable(draft);
      expect(result).toEqual({
        name: 'bigNum',
        type: 'Long',
        value: 123456789012345
      });
    });

    it('should convert Short variable to plan format with numeric value', () => {
      const draft: VariableDraft = { name: 'smallNum', type: 'Short', value: '32767' };
      const result = toPlanVariable(draft);
      expect(result).toEqual({
        name: 'smallNum',
        type: 'Short',
        value: 32767
      });
    });

    it('should convert Double variable to plan format with numeric value', () => {
      const draft: VariableDraft = { name: 'pi', type: 'Double', value: '3.14159' };
      const result = toPlanVariable(draft);
      expect(result).toEqual({
        name: 'pi',
        type: 'Double',
        value: 3.14159
      });
    });

    it('should convert Boolean variable with "true" to plan format', () => {
      const draft: VariableDraft = { name: 'isActive', type: 'Boolean', value: 'true' };
      const result = toPlanVariable(draft);
      expect(result).toEqual({
        name: 'isActive',
        type: 'Boolean',
        value: true
      });
    });

    it('should convert Boolean variable with "false" to plan format', () => {
      const draft: VariableDraft = { name: 'isActive', type: 'Boolean', value: 'false' };
      const result = toPlanVariable(draft);
      expect(result).toEqual({
        name: 'isActive',
        type: 'Boolean',
        value: false
      });
    });

    it('should convert Date variable to Camunda format (yyyy-MM-ddTHH:mm:ss.SSS±hhmm)', () => {
      const draft: VariableDraft = { name: 'created', type: 'Date', value: '2024-01-15T10:30' };
      const result = toPlanVariable(draft);

      expect(result.name).toBe('created');
      expect(result.type).toBe('Date');

      // Verify Camunda format: 2024-01-15T10:30:00.000+0100 or 2024-01-15T10:30:00.000-0500
      // Format: yyyy-MM-ddTHH:mm:ss.SSS±hhmm (NO colon in timezone)
      expect(result.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{4}$/);

      // Verify date part matches input
      expect(result.value).toContain('2024-01-15T10:30:');
    });

    it('should convert Json variable to plan format keeping JSON string', () => {
      const draft: VariableDraft = { name: 'items', type: 'Json', value: '[1,2,3]' };
      const result = toPlanVariable(draft);
      expect(result).toEqual({
        name: 'items',
        type: 'Json',
        value: '[1,2,3]'
      });
    });

  });

  describe('displayValue', () => {
    it('should return value as-is for short String', () => {
      const variable = { name: 'myVar', type: 'String', value: 'hello' };
      expect(displayValue(variable)).toBe('hello');
    });

    it('should truncate long String value at 50 characters', () => {
      const variable = { name: 'myVar', type: 'String', value: 'a'.repeat(100) };
      const result = displayValue(variable);
      expect(result).toBe('a'.repeat(50) + '...');
    });

    it('should return Integer value as string', () => {
      const variable = { name: 'count', type: 'Integer', value: 42 };
      expect(displayValue(variable)).toBe('42');
    });

    it('should return Long value as string', () => {
      const variable = { name: 'bigNum', type: 'Long', value: 123456789012345 };
      expect(displayValue(variable)).toBe('123456789012345');
    });

    it('should return Short value as string', () => {
      const variable = { name: 'smallNum', type: 'Short', value: 32767 };
      expect(displayValue(variable)).toBe('32767');
    });

    it('should return Double value as string', () => {
      const variable = { name: 'pi', type: 'Double', value: 3.14159 };
      expect(displayValue(variable)).toBe('3.14159');
    });

    it('should return Boolean true as "true"', () => {
      const variable = { name: 'isActive', type: 'Boolean', value: true };
      expect(displayValue(variable)).toBe('true');
    });

    it('should return Boolean false as "false"', () => {
      const variable = { name: 'isActive', type: 'Boolean', value: false };
      expect(displayValue(variable)).toBe('false');
    });

    it('should return Date value as-is', () => {
      const variable = { name: 'created', type: 'Date', value: '2024-01-15T10:30' };
      expect(displayValue(variable)).toBe('2024-01-15T10:30');
    });

    it('should show truncated JSON for Json type', () => {
      const variable = { name: 'items', type: 'Json', value: '[1,2,3]' };
      expect(displayValue(variable)).toBe('[1,2,3]');
    });

    it('should truncate long JSON array for Json type', () => {
      const longJson = '[' + Array(100).fill(1).join(',') + ']';
      const variable = { name: 'items', type: 'Json', value: longJson };
      const result = displayValue(variable);
      expect(result.length).toBeLessThanOrEqual(53);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should escape HTML characters in display value', () => {
      const variable = { name: 'script', type: 'String', value: '<script>alert(1)</script>' };
      const result = displayValue(variable);
      expect(result).toBe('<script>alert(1)</script>');
    });

    it('should handle null value', () => {
      const variable = { name: 'empty', type: 'String', value: null };
      expect(displayValue(variable)).toBe('null');
    });

    it('should handle undefined value', () => {
      const variable = { name: 'empty', type: 'String', value: undefined };
      expect(displayValue(variable)).toBe('undefined');
    });
  });
});
