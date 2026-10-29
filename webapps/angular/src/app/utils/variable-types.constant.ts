/**
 * Camunda 7 variable types for process instance migration.
 * Aligned with batch "Set process variables" operation.
 * Order: String (default), Integer, Long, Short, Double, Boolean, Date, Json.
 */
export const MIGRATION_VARIABLE_TYPES = [
  'String',
  'Integer',
  'Long',
  'Short',
  'Double',
  'Boolean',
  'Date',
  'Json'
] as const;

export type MigrationVariableType = typeof MIGRATION_VARIABLE_TYPES[number];

/**
 * Variable types that use textual representation (multi-line content).
 * When switching between these types, the value field is preserved.
 */
export const TEXTUAL_VARIABLE_TYPES: readonly string[] = [
  'String',
  'Json'
];

/**
 * Integer numeric types requiring whole number validation.
 */
export const INTEGER_VARIABLE_TYPES: readonly string[] = [
  'Short',
  'Integer',
  'Long'
];

/**
 * Validation range constants for integer types.
 */
export const VARIABLE_TYPE_RANGES = {
  Short: { min: -32768, max: 32767 },
  Integer: { min: -2147483648, max: 2147483647 },
  Long: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }
} as const;
