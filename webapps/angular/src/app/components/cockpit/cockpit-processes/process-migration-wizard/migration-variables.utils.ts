/**
 * Pure utility functions for migration variables
 */

import {
  MIGRATION_VARIABLE_TYPES,
  INTEGER_VARIABLE_TYPES,
  TEXTUAL_VARIABLE_TYPES,
  VARIABLE_TYPE_RANGES
} from '../../../../utils/variable-types.constant';

export interface VariableDraft {
  name: string;
  type: string;
  value: string;
}

export interface PlanVariable {
  name: string;
  type: string;
  value: any;
}

export interface ValidationErrors {
  name?: string;
  type?: string;
  value?: string;
}

const INTEGER_RE = /^-?\d+$/;
const DOUBLE_RE = /^-?\d+(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 *
 * @param type - Variable type (Integer, Long, Short, Double)
 * @param currentValue - Current value in the field
 * @param selectionStart - Start of selection range
 * @param selectionEnd - End of selection range
 * @param insertedText - Text being inserted
 * @returns Sanitized text to insert, or null if rejected
 */
export function sanitizeNumericInput(
  type: string,
  currentValue: string,
  selectionStart: number,
  selectionEnd: number,
  insertedText: string
): string | null {
  if (!insertedText) return null;

  const isInteger = INTEGER_VARIABLE_TYPES.includes(type as any);
  const isDouble = type === 'Double';

  if (!isInteger && !isDouble) {
    return insertedText;
  }

  const before = currentValue.slice(0, selectionStart);
  const after = currentValue.slice(selectionEnd);

  let cleaned = '';
  for (let i = 0; i < insertedText.length; i++) {
    const char = insertedText[i];

    if (/\d/.test(char)) {
      cleaned += char;
    } else if (char === '-') {
      if (selectionStart === 0 && !before.includes('-') && !after.includes('-')) {
        cleaned += char;
      }
    } else if (char === '.' && isDouble) {
      if (!before.includes('.') && !after.includes('.')) {
        cleaned += char;
      }
    }
  }

  if (cleaned.length === 0) {
    return null;
  }

  return cleaned;
}

/**
 * Validates a variable draft and returns field errors.
 *
 * @param draft - The variable draft to validate
 * @param existingNames - Array of existing variable names (for duplicate detection)
 * @param editingName - Optional name of the variable being edited (to allow keeping same name)
 * @returns Object with field errors, or null if valid
 */
export function validateVariableDraft(
  draft: VariableDraft,
  existingNames: string[],
  editingName?: string
): ValidationErrors | null {
  const errors: ValidationErrors = {};

  const trimmedName = draft.name.trim();
  if (!trimmedName) {
    errors.name = 'migration.variables.errorNameRequired';
  } else {
    const isDuplicate = existingNames.some(existing => {
      const trimmedExisting = existing.trim();
      return trimmedExisting === trimmedName && trimmedExisting !== (editingName?.trim() || '');
    });
    if (isDuplicate) {
      errors.name = 'migration.variables.errorNameDuplicate';
    }
  }

  if (!draft.type || draft.type.trim() === '') {
    errors.type = 'migration.variables.errorTypeRequired';
  }

  const trimmedValue = typeof draft.value === 'string' ? draft.value.trim() : String(draft.value);

  if (!trimmedValue && draft.type !== 'Boolean') {
    errors.value = 'migration.variables.errorValueRequired';
  } else {
    if (INTEGER_VARIABLE_TYPES.includes(draft.type as any)) {
      if (!INTEGER_RE.test(trimmedValue) || trimmedValue === 'NaN') {
        errors.value = 'migration.variables.errorIntegerInvalid';
      } else {
        const numValue = parseInt(trimmedValue, 10);
        const range = VARIABLE_TYPE_RANGES[draft.type as keyof typeof VARIABLE_TYPE_RANGES];
        if (range && (numValue < range.min || numValue > range.max)) {
          if (draft.type === 'Short') {
            errors.value = 'migration.variables.errorShortRange';
          } else if (draft.type === 'Integer') {
            errors.value = 'migration.variables.errorIntegerRange';
          } else if (draft.type === 'Long') {
            errors.value = 'migration.variables.errorLongRange';
          }
        }
      }
    } else if (draft.type === 'Double') {
      if (!DOUBLE_RE.test(trimmedValue) || trimmedValue === 'Infinity' || trimmedValue === '-Infinity' || trimmedValue === 'NaN') {
        errors.value = 'migration.variables.errorDoubleInvalid';
      } else {
        const numValue = parseFloat(trimmedValue);
        if (!Number.isFinite(numValue)) {
          errors.value = 'migration.variables.errorDoubleInvalid';
        }
      }
    } else if (draft.type === 'Boolean') {
      if (trimmedValue !== 'true' && trimmedValue !== 'false' && trimmedValue !== '') {
        errors.value = 'migration.variables.errorBooleanInvalid';
      }
    } else if (draft.type === 'Date') {
      if (!DATE_RE.test(trimmedValue)) {
        errors.value = 'migration.variables.errorDateInvalid';
      }
    } else if (draft.type === 'Json') {
      try {
        JSON.parse(trimmedValue);
      } catch (e) {
        errors.value = 'migration.variables.errorJsonInvalid';
      }
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Converts a variable draft to migration plan variable format.
 * Converts string values to appropriate types for Integer, Long, Short, Double, and Boolean.
 * Converts Date to Camunda format: yyyy-MM-dd'T'HH:mm:ss.SSSZ
 * Json is kept as string.
 *
 * @param draft - The variable draft
 * @returns Migration plan variable
 */
export function toPlanVariable(draft: VariableDraft): PlanVariable {
  const trimmedName = draft.name.trim();
  let value: any = draft.value;

  if (INTEGER_VARIABLE_TYPES.includes(draft.type as any)) {
    value = parseInt(draft.value, 10);
  } else if (draft.type === 'Double') {
    value = parseFloat(draft.value);
  } else if (draft.type === 'Boolean') {
    value = draft.value === 'true';
  } else if (draft.type === 'Date') {
    value = convertDateToCamundaFormat(draft.value);
  }

  return {
    name: trimmedName,
    type: draft.type,
    value
  };
}

/**
 * Converts a datetime-local value (YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss)
 * to Camunda 7 date format: yyyy-MM-dd'T'HH:mm:ss.SSSZ
 *
 * @param dateValue - datetime-local string from input
 * @returns Camunda formatted date string
 */
function convertDateToCamundaFormat(dateValue: string): string {
  const trimmed = dateValue.trim();
  if (!trimmed) return '';

  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return trimmed;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

  const offsetMinutes = date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes <= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}${String(offsetMins).padStart(2, '0')}`;

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetString}`;
}

/**
 * Returns a truncated display value for a variable.
 * Truncates at 50 characters and adds '...' if longer.
 *
 * @param variable - The migration plan variable
 * @returns Truncated display string
 */
export function displayValue(variable: PlanVariable): string {
  if (variable.value === null) return 'null';
  if (variable.value === undefined) return 'undefined';

  const stringValue = String(variable.value);

  if (stringValue.length <= 50) {
    return stringValue;
  }

  return stringValue.substring(0, 50) + '...';
}