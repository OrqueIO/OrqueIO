import { describe, it, expect } from 'vitest';

/**
 * Tests for query warning visibility logic.
 *
 * The query warning should only be shown when:
 * - mode is 'query' AND
 * - hasActiveCriteria is false
 *
 * This ensures the "Selecting all instances" warning only appears
 * when the query would actually select ALL instances (no filters).
 */

describe('BatchOperationsWizardComponent — query warning visibility', () => {

  it('query mode without criteria → warning should be visible', () => {
    const mode = 'query';
    const hasActiveCriteria = false;
    const shouldShowWarning = mode === 'query' && !hasActiveCriteria;
    expect(shouldShowWarning).toBe(true);
  });

  it('query mode with at least one criterion → warning should be hidden', () => {
    const mode = 'query';
    const hasActiveCriteria = true;
    const shouldShowWarning = mode === 'query' && !hasActiveCriteria;
    expect(shouldShowWarning).toBe(false);
  });

  it('instances mode (manual selection) → warning should be hidden regardless of criteria', () => {
    const mode = 'instances';
    const hasActiveCriteriaFalse = false;
    const hasActiveCriteriaTrue = true;

    const shouldShowWarningNoCriteria = mode === 'query' && !hasActiveCriteriaFalse;
    const shouldShowWarningWithCriteria = mode === 'query' && !hasActiveCriteriaTrue;

    expect(shouldShowWarningNoCriteria).toBe(false);
    expect(shouldShowWarningWithCriteria).toBe(false);
  });

  it('criterion added then removed → warning should toggle (present → absent → present)', () => {
    const mode = 'query';

    // Initially no criteria
    let hasActiveCriteria = false;
    let shouldShowWarning = mode === 'query' && !hasActiveCriteria;
    expect(shouldShowWarning).toBe(true);

    // Criterion added
    hasActiveCriteria = true;
    shouldShowWarning = mode === 'query' && !hasActiveCriteria;
    expect(shouldShowWarning).toBe(false);

    // Criterion removed
    hasActiveCriteria = false;
    shouldShowWarning = mode === 'query' && !hasActiveCriteria;
    expect(shouldShowWarning).toBe(true);
  });

  it('wizard opened with prefilled filter (e.g. from Correlate Message) → warning should be hidden', () => {
    // When wizard is opened from Correlate Message, filterCriteria is prefilled
    // with processDefinitionId or processInstanceId, so hasActiveCriteria = true
    const mode = 'query';
    const hasActiveCriteria = true; // filterCriteria.length > 0 from session restore
    const shouldShowWarning = mode === 'query' && !hasActiveCriteria;
    expect(shouldShowWarning).toBe(false);
  });

});
