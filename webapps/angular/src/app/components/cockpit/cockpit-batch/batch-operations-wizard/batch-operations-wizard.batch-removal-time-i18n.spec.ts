import { describe, it, expect } from 'vitest';
import { BATCH_OPERATIONS } from './batch-operations-wizard';
import * as fs from 'fs';
import * as path from 'path';

/**
 * I18N TESTS for removal-time-batch operation
 *
 * Setup copied from batch-operations-wizard.decision-button-labels.spec.ts (WORKING test)
 * - Lines 1-18: Import + load EN/FR JSON files
 * - No TestBed, no rendering - direct test of i18n keys in JSON files
 * - Pattern: Load translations → Test key existence → Test value
 *
 * This tests ALL i18n keys used by removal-time-batch operation:
 * - Column headers (columns.*)
 * - Selection count
 * - Button labels
 * - Mode labels
 * - Empty state
 */
describe('BatchOperationsWizard - Batch removal time i18n', () => {
  let enTranslations: any;
  let frTranslations: any;

  // Load translations from JSON files (SAME as decision-button-labels.spec.ts)
  try {
    const enPath = path.resolve(__dirname, '../../../../../assets/i18n/en.json');
    const frPath = path.resolve(__dirname, '../../../../../assets/i18n/fr.json');
    enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    frTranslations = JSON.parse(fs.readFileSync(frPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load translation files:', error);
  }

  describe('BATCH_OPERATIONS configuration', () => {
    it('should use correct i18n keys for removal-time-batch operation', () => {
      const operation = BATCH_OPERATIONS.find(op => op.id === 'removal-time-batch');

      expect(operation).toBeDefined();
      expect(operation?.available).toBe(true);
      expect(operation?.actionBtnKey).toBe('cockpit.batchOps.confirm.removalTimeBatchBtn');
      expect(operation?.actionBtnQueryKey).toBe('cockpit.batchOps.confirm.removalTimeBatchBtnQuery');
    });
  });

  describe('Button labels - EN/FR parity', () => {
    it('should have correct EN translation for Instances mode button', () => {
      const key = 'cockpit.batchOps.confirm.removalTimeBatchBtn';
      const translation = enTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toBe('Set removal time for {{count}} batch(es)');
    });

    it('should have correct EN translation for Query mode button', () => {
      const key = 'cockpit.batchOps.confirm.removalTimeBatchBtnQuery';
      const translation = enTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toBe('Set removal time for matching batches');
    });

    it('should have correct FR translation for Instances mode button', () => {
      const key = 'cockpit.batchOps.confirm.removalTimeBatchBtn';
      const translation = frTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toBe('Définir le délai de suppression pour {{count}} lot(s)');
    });

    it('should have correct FR translation for Query mode button', () => {
      const key = 'cockpit.batchOps.confirm.removalTimeBatchBtnQuery';
      const translation = frTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toBe('Définir le délai de suppression pour les lots correspondants');
    });
  });

  describe('Column headers - EN/FR parity', () => {
    it('should have EN translations for all column headers', () => {
      expect(enTranslations['cockpit.batchOps.removalTimeBatch.columns.batchId']).toBe('Batch ID');
      expect(enTranslations['cockpit.batchOps.removalTimeBatch.columns.type']).toBe('Type');
      expect(enTranslations['cockpit.batchOps.removalTimeBatch.columns.startTime']).toBe('Start time');
      expect(enTranslations['cockpit.batchOps.removalTimeBatch.columns.endTime']).toBe('End time');
      expect(enTranslations['cockpit.batchOps.removalTimeBatch.columns.removalTime']).toBe('Removal time');
      expect(enTranslations['cockpit.batchOps.removalTimeBatch.columns.actions']).toBe('Actions');
    });

    it('should have FR translations for all column headers', () => {
      expect(frTranslations['cockpit.batchOps.removalTimeBatch.columns.batchId']).toBe('ID du lot');
      expect(frTranslations['cockpit.batchOps.removalTimeBatch.columns.type']).toBe('Type');
      expect(frTranslations['cockpit.batchOps.removalTimeBatch.columns.startTime']).toBe('Heure de début');
      expect(frTranslations['cockpit.batchOps.removalTimeBatch.columns.endTime']).toBe('Heure de fin');
      expect(frTranslations['cockpit.batchOps.removalTimeBatch.columns.removalTime']).toBe('Délai de suppression');
      expect(frTranslations['cockpit.batchOps.removalTimeBatch.columns.actions']).toBe('Actions');
    });
  });

  describe('Selection count - batch-specific (not instance)', () => {
    it('should have EN translation for selectedCount', () => {
      const key = 'cockpit.batchOps.removalTimeBatch.selectedCount';
      const translation = enTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toBe('{{count}} batch(es) selected');
      expect(translation).toContain('batch');
      expect(translation).not.toContain('instance');
    });

    it('should have FR translation for selectedCount', () => {
      const key = 'cockpit.batchOps.removalTimeBatch.selectedCount';
      const translation = frTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toBe('{{count}} lot(s) sélectionné(s)');
      expect(translation).toContain('lot');
      expect(translation).not.toContain('instance');
    });

    it('should have EN translation for selectAllOnPage', () => {
      const key = 'cockpit.batchOps.removalTimeBatch.selectAllOnPage';
      const translation = enTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toBe('Select all {{count}} rows');
    });

    it('should have FR translation for selectAllOnPage', () => {
      const key = 'cockpit.batchOps.removalTimeBatch.selectAllOnPage';
      const translation = frTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toBe('Sélectionner les {{count}} lignes');
    });
  });

  describe('Empty state', () => {
    it('should have EN translation for noBatches', () => {
      const key = 'cockpit.batchOps.removalTimeBatch.noBatches';
      const translation = enTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toContain('No batches');
    });

    it('should have FR translation for noBatches', () => {
      const key = 'cockpit.batchOps.removalTimeBatch.noBatches';
      const translation = frTranslations[key];

      expect(translation).toBeDefined();
      expect(translation).toContain('Aucun lot');
    });
  });

  describe('[MUTATION PROOF] - Batch-specific text, not generic', () => {
    it('EN button should NOT use generic "instance" text', () => {
      const key = 'cockpit.batchOps.confirm.removalTimeBatchBtn';
      const translation = enTranslations[key];

      // Should be "batch", NOT "instance"
      expect(translation).toContain('batch');
      expect(translation).not.toContain('instance');
    });

    it('FR button should NOT use generic "instance" text', () => {
      const key = 'cockpit.batchOps.confirm.removalTimeBatchBtn';
      const translation = frTranslations[key];

      // Should be "lot", NOT "instance"
      expect(translation).toContain('lot');
      expect(translation).not.toContain('instance');
    });

    it('EN selectedCount should NOT use "cockpit.batchOps.selectedCount" (generic key)', () => {
      const genericKey = 'cockpit.batchOps.selectedCount';
      const batchKey = 'cockpit.batchOps.removalTimeBatch.selectedCount';

      const genericTranslation = enTranslations[genericKey];
      const batchTranslation = enTranslations[batchKey];

      // Generic uses "instance", batch uses "batch"
      expect(genericTranslation).toContain('instance');
      expect(batchTranslation).toContain('batch');
      expect(batchTranslation).not.toContain('instance');
    });

    it('[CRITICAL] Batch-specific column keys must exist (cockpit.processes.columns.type does NOT exist)', () => {
      const processKey = 'cockpit.processes.columns.type';
      const batchKey = 'cockpit.batchOps.removalTimeBatch.columns.type';

      // Process key does NOT exist - that's why we need batch-specific keys
      expect(enTranslations[processKey]).toBeUndefined();

      // Batch key MUST exist
      expect(enTranslations[batchKey]).toBeDefined();
      expect(enTranslations[batchKey]).toBe('Type');

      // HTML must use: {{ 'cockpit.batchOps.removalTimeBatch.columns.type' | translate }}
      // NOT: {{ 'cockpit.processes.columns.type' | translate }}
    });
  });

  describe('EN/FR parity check', () => {
    it('should have same number of removalTimeBatch keys in EN and FR', () => {
      const enKeys = Object.keys(enTranslations).filter(k => k.includes('removalTimeBatch'));
      const frKeys = Object.keys(frTranslations).filter(k => k.includes('removalTimeBatch'));

      expect(enKeys.length).toBe(frKeys.length);
      expect(enKeys.length).toBeGreaterThan(15); // At least 15 keys
    });

    it('should have exact same key names in EN and FR', () => {
      const enKeys = Object.keys(enTranslations).filter(k => k.includes('removalTimeBatch')).sort();
      const frKeys = Object.keys(frTranslations).filter(k => k.includes('removalTimeBatch')).sort();

      expect(enKeys).toEqual(frKeys);
    });
  });
});