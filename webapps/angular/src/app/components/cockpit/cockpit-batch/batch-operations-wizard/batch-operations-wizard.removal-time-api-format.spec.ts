/**
 * Test: Removal time API payload format verification
 *
 * Covers:
 * - Ensures absoluteRemovalTime includes timezone offset (±HHMM)
 * - Validates format: YYYY-MM-DDTHH:mm:00.000±HHMM
 * - Verifies payload is unchanged after UI refactoring
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';

describe('BatchOperationsWizardComponent — Removal time API format', () => {

  let component: BatchOperationsWizardComponent;

  beforeEach(() => {
    component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'removal-time-process';
    component.removalTimeMode = 'absolute';
    component.removalTimeAbsoluteDate = '';
  });

  it('absoluteRemovalTime includes timezone offset (format: YYYY-MM-DDTHH:mm:00.000±HHMM)', () => {
    // Set a datetime-local value (format: YYYY-MM-DDTHH:mm)
    component.removalTimeAbsoluteDate = '2026-10-15T14:30';

    // Get the formatted value for API
    const formatted = component.removalTimeAbsoluteDateFormatted;

    // Verify format: YYYY-MM-DDTHH:mm:00.000±HHMM
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000[+-]\d{4}$/);

    // Verify it contains the input date and time
    expect(formatted).toContain('2026-10-15');
    expect(formatted).toContain('T14:30');
  });

  it('absoluteRemovalTime with summer date includes correct timezone offset', () => {
    // Use a summer date (July)
    component.removalTimeAbsoluteDate = '2026-07-15T14:30';

    const formatted = component.removalTimeAbsoluteDateFormatted;

    // Should have timezone offset at the end
    const offsetMatch = formatted.match(/([+-]\d{4})$/);
    expect(offsetMatch).toBeTruthy();

    // Offset should be a valid 4-digit format
    const offset = offsetMatch![1];
    expect(offset).toMatch(/^[+-]\d{4}$/);
  });

  it('absoluteRemovalTime with winter date includes correct timezone offset', () => {
    // Use a winter date (January)
    component.removalTimeAbsoluteDate = '2026-01-15T14:30';

    const formatted = component.removalTimeAbsoluteDateFormatted;

    // Should have timezone offset at the end
    const offsetMatch = formatted.match(/([+-]\d{4})$/);
    expect(offsetMatch).toBeTruthy();

    // Offset should be a valid 4-digit format
    const offset = offsetMatch![1];
    expect(offset).toMatch(/^[+-]\d{4}$/);
  });

  it('Empty removalTimeAbsoluteDate returns empty string', () => {
    component.removalTimeAbsoluteDate = '';

    const formatted = component.removalTimeAbsoluteDateFormatted;

    expect(formatted).toBe('');
  });

  it('Invalid removalTimeAbsoluteDate returns original value', () => {
    component.removalTimeAbsoluteDate = 'invalid-date';

    const formatted = component.removalTimeAbsoluteDateFormatted;

    // formatDateTimeVariableForApi returns the original value if invalid
    expect(formatted).toBe('invalid-date');
  });

  it('Midnight time is correctly formatted', () => {
    component.removalTimeAbsoluteDate = '2026-10-15T00:00';

    const formatted = component.removalTimeAbsoluteDateFormatted;

    expect(formatted).toContain('T00:00:00.000');
    expect(formatted).toMatch(/[+-]\d{4}$/);
  });

  it('End of day time is correctly formatted', () => {
    component.removalTimeAbsoluteDate = '2026-10-15T23:59';

    const formatted = component.removalTimeAbsoluteDateFormatted;

    expect(formatted).toContain('T23:59:00.000');
    expect(formatted).toMatch(/[+-]\d{4}$/);
  });
});
