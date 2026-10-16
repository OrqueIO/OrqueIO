/**
 * Test: Set removal time operations activation status
 *
 * Ensures:
 * - removal-time-process is available (no "Coming soon" badge)
 * - removal-time-decision and removal-time-batch remain disabled with badge
 * - No duplicate entries
 * - Other operations unchanged
 */

import { BATCH_OPERATIONS } from './batch-operations-wizard';

describe('Batch Operations - Availability', () => {
  it('should have removal-time-process available without "Coming soon" badge', () => {
    const removalTimeProcess = BATCH_OPERATIONS.find(op => op.id === 'removal-time-process');

    expect(removalTimeProcess).toBeDefined();
    expect(removalTimeProcess?.available).toBe(true);
    expect(removalTimeProcess?.actionBtnKey).toBeDefined();
    expect(removalTimeProcess?.actionBtnQueryKey).toBeDefined();
  });

  it('should have removal-time-decision disabled with "Coming soon" status', () => {
    const removalTimeDecision = BATCH_OPERATIONS.find(op => op.id === 'removal-time-decision');

    expect(removalTimeDecision).toBeDefined();
    expect(removalTimeDecision?.available).toBe(false);
    expect(removalTimeDecision?.actionBtnKey).toBeUndefined();
  });

  it('should have removal-time-batch disabled with "Coming soon" status', () => {
    const removalTimeBatch = BATCH_OPERATIONS.find(op => op.id === 'removal-time-batch');

    expect(removalTimeBatch).toBeDefined();
    expect(removalTimeBatch?.available).toBe(false);
    expect(removalTimeBatch?.actionBtnKey).toBeUndefined();
  });

  it('should not have duplicate removal-time-process entries', () => {
    const removalTimeProcessOps = BATCH_OPERATIONS.filter(op => op.id === 'removal-time-process');

    expect(removalTimeProcessOps.length).toBe(1);
  });

  it('should have correlate operation unchanged', () => {
    const correlate = BATCH_OPERATIONS.find(op => op.id === 'correlate');

    expect(correlate).toBeDefined();
    expect(correlate?.available).toBe(true);
  });

  it('should have all standard operations unchanged', () => {
    const standardOps = ['suspend', 'activate', 'delete-running', 'delete-finished',
                         'set-retries-jobs', 'set-retries-external', 'set-variables'];

    standardOps.forEach(opId => {
      const op = BATCH_OPERATIONS.find(o => o.id === opId);
      expect(op).toBeDefined();
      expect(op?.available).toBe(true);
    });
  });
});
