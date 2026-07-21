/**
 * Returns true when `after >= before` makes the date range impossible.
 * Mirrors the same check used in process-list.ts for filterErrors.
 */
export function dateRangeConflicts(
  after: string | undefined,
  before: string | undefined
): boolean {
  return !!(after && before && after >= before);
}
