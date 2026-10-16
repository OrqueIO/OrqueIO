import { describe, it, expect } from 'vitest';

/**
 * Tests for correlate message help text visibility logic.
 *
 * The help text should only be shown when:
 * - selectedOperationId is 'correlate' AND
 * - correlateMessageName is empty AND
 * - hasActiveCriteria is false
 *
 * This replaces the previous warning (with icon and colored background)
 * with a discrete help text under the Message Name field.
 */

describe('BatchOperationsWizardComponent — correlate help text visibility', () => {

  it('correlate operation, empty name, no criteria → help text should be visible', () => {
    const selectedOperationId = 'correlate';
    const correlateMessageName = '';
    const hasActiveCriteria = false;
    const shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(true);
  });

  it('correlate operation, name entered → help text should be hidden', () => {
    const selectedOperationId = 'correlate';
    const correlateMessageName = 'OrderCreated';
    const hasActiveCriteria = false;
    const shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(false);
  });

  it('correlate operation, prefilled filter (processDefinitionId) → help text should be hidden', () => {
    const selectedOperationId = 'correlate';
    const correlateMessageName = '';
    const hasActiveCriteria = true; // filterCriteria has processDefinitionId from Definition view
    const shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(false);
  });

  it('correlate operation, prefilled filter (processInstanceId) → help text should be hidden', () => {
    const selectedOperationId = 'correlate';
    const correlateMessageName = '';
    const hasActiveCriteria = true; // filterCriteria has processInstanceId from Instance view
    const shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(false);
  });

  it('correlate operation, name entered then cleared → help text should reappear (if no criteria)', () => {
    const selectedOperationId = 'correlate';
    let correlateMessageName = 'OrderCreated';
    const hasActiveCriteria = false;

    // Name entered
    let shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(false);

    // Name cleared
    correlateMessageName = '';
    shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(true);
  });

  it('correlate operation, name prefilled from overlay, then cleared → help text should appear (if no criteria)', () => {
    const selectedOperationId = 'correlate';
    let correlateMessageName = 'PrefilledFromOverlay';
    const hasActiveCriteria = false;

    // Prefilled name from overlay
    let shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(false);

    // User clears the name
    correlateMessageName = '';
    shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(true);
  });

  it('other operation (not correlate) → help text should never be visible', () => {
    const selectedOperationId = 'suspend';
    const correlateMessageName = '';
    const hasActiveCriteria = false;
    const shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(false);
  });

  it('correlate operation, whitespace-only name → help text should be visible (treated as empty)', () => {
    const selectedOperationId = 'correlate';
    const correlateMessageName = '   ';
    const hasActiveCriteria = false;
    const shouldShowHelp = selectedOperationId === 'correlate'
      && !correlateMessageName.trim()
      && !hasActiveCriteria;
    expect(shouldShowHelp).toBe(true);
  });

});
