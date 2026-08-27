export function getVariableInputType(type: string): string {
  switch (type.toLowerCase()) {
    case 'integer':
    case 'long':
    case 'short':
    case 'double':
    case 'number':
      return 'number';
    case 'boolean':
      return 'checkbox';
    case 'date':
      return 'date';
    case 'datetime':
      return 'datetime-local';
    default:
      return 'text';
  }
}
