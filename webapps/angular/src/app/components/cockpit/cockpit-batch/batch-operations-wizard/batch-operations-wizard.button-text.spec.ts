/**
 * Test: Button text consistency between step 1 and step 2
 *
 * Verifies that:
 * - removal-time-process operation uses the same button text at step 1 and step 2
 * - Other operations maintain their baseline button text (non-regression)
 */

import { describe, it, expect } from 'vitest';
import { BATCH_OPERATIONS } from './batch-operations-wizard';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('BatchOperationsWizardComponent — Button text consistency', () => {

  it('removal-time-process: step 1 button uses same key as step 2 button', () => {
    const operation = BATCH_OPERATIONS.find(op => op.id === 'removal-time-process');

    expect(operation).toBeDefined();
    expect(operation?.actionBtnKey).toBe('cockpit.batchOps.confirm.removalTimeProcessBtn');
    expect(operation?.actionBtnQueryKey).toBe('cockpit.batchOps.confirm.removalTimeProcessBtnQuery');
  });

  it('removal-time-process: step 1 and step 2 display identical text (Instances mode)', () => {
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const fr = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/fr.json'), 'utf8'));

    const operation = BATCH_OPERATIONS.find(op => op.id === 'removal-time-process');
    const step1Key = operation?.actionBtnKey;

    // Step 1 and step 2 use the same key, so same text
    expect(step1Key).toBe('cockpit.batchOps.confirm.removalTimeProcessBtn');

    const enText: string = en[step1Key!];
    const frText: string = fr[step1Key!];

    expect(enText).toBe('Set removal time for {{count}} instance(s)');
    expect(frText).toBe('Définir le délai de suppression pour {{count}} instance(s)');
  });

  it('removal-time-process: step 1 and step 2 display identical text (Query mode)', () => {
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const fr = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/fr.json'), 'utf8'));

    const operation = BATCH_OPERATIONS.find(op => op.id === 'removal-time-process');
    const step1QueryKey = operation?.actionBtnQueryKey;

    // Step 1 and step 2 use the same key, so same text
    expect(step1QueryKey).toBe('cockpit.batchOps.confirm.removalTimeProcessBtnQuery');

    const enText: string = en[step1QueryKey!];
    const frText: string = fr[step1QueryKey!];

    expect(enText).toBe('Set removal time for matching instances');
    expect(frText).toBe('Définir le délai de suppression pour les instances correspondantes');
  });

  describe('Non-regression: Other operations maintain baseline button text', () => {

    it('suspend: actionBtnKey unchanged from HEAD', () => {
      const operation = BATCH_OPERATIONS.find(op => op.id === 'suspend');
      expect(operation?.actionBtnKey).toBe('cockpit.batchOps.suspend.actionBtn');
      expect(operation?.actionBtnQueryKey).toBe('cockpit.batchOps.suspend.actionBtnQuery');

      const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
      expect(en[operation!.actionBtnKey!]).toBe('Suspend {{count}} instances');
    });

    it('activate: actionBtnKey unchanged from HEAD', () => {
      const operation = BATCH_OPERATIONS.find(op => op.id === 'activate');
      expect(operation?.actionBtnKey).toBe('cockpit.batchOps.activate.actionBtn');

      const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
      expect(en[operation!.actionBtnKey!]).toBe('Activate {{count}} instances');
    });

    it('delete-running: actionBtnKey unchanged from HEAD', () => {
      const operation = BATCH_OPERATIONS.find(op => op.id === 'delete-running');
      expect(operation?.actionBtnKey).toBe('cockpit.batchOps.deleteRunning.actionBtn');

      const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
      expect(en[operation!.actionBtnKey!]).toBe('Delete {{count}} instances');
    });

    it('delete-finished: actionBtnKey unchanged from HEAD', () => {
      const operation = BATCH_OPERATIONS.find(op => op.id === 'delete-finished');
      expect(operation?.actionBtnKey).toBe('cockpit.batchOps.deleteFinished.actionBtn');

      const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
      expect(en[operation!.actionBtnKey!]).toBe('Delete {{count}} finished instances');
    });

    it('set-retries-jobs: actionBtnKey unchanged from HEAD', () => {
      const operation = BATCH_OPERATIONS.find(op => op.id === 'set-retries-jobs');
      expect(operation?.actionBtnKey).toBe('cockpit.batchOps.setRetriesJobs.actionBtn');

      const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
      expect(en[operation!.actionBtnKey!]).toBe('Set retries for {{count}} instance(s)');
    });

    it('set-retries-external: actionBtnKey unchanged from HEAD', () => {
      const operation = BATCH_OPERATIONS.find(op => op.id === 'set-retries-external');
      expect(operation?.actionBtnKey).toBe('cockpit.batchOps.setRetriesExternal.actionBtn');

      const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
      expect(en[operation!.actionBtnKey!]).toBe('Set retries for {{count}} instance(s)');
    });

    it('set-variables: actionBtnKey unchanged from HEAD', () => {
      const operation = BATCH_OPERATIONS.find(op => op.id === 'set-variables');
      expect(operation?.actionBtnKey).toBe('cockpit.batchOps.setVariables.actionBtn');

      const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
      expect(en[operation!.actionBtnKey!]).toBe('Set variables for {{count}} instance(s)');
    });

    it('correlate: actionBtnKey unchanged from HEAD', () => {
      const operation = BATCH_OPERATIONS.find(op => op.id === 'correlate');
      expect(operation?.actionBtnKey).toBe('cockpit.batchOps.confirm.correlateBtn');

      const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
      expect(en[operation!.actionBtnKey!]).toBe('Correlate message for {{count}} instance(s)');
    });
  });
});