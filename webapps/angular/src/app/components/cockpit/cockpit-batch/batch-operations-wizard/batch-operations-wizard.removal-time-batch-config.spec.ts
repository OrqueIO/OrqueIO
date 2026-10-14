/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect } from 'vitest';
import { BATCH_OPERATIONS } from './batch-operations-wizard';
import enTranslations from '../../../../../assets/i18n/en.json';
import frTranslations from '../../../../../assets/i18n/fr.json';

/**
 * Tests for removal-time-batch configuration and i18n
 *
 * These tests protect the configuration changes made for #114:
 * - BATCH_OPERATIONS entry must have available: true
 * - actionBtnKey and actionBtnQueryKey must be defined
 * - All i18n keys must exist in both EN and FR
 * - Texts must not contain "historic" except in payload keys
 * - FR operationNote must start with "S'applique"
 */

describe('BatchOperationsWizard - removal-time-batch configuration (#114)', () => {

  // ============================================
  // BATCH_OPERATIONS CONFIGURATION
  // ============================================

  describe('BATCH_OPERATIONS entry', () => {
    const removalTimeBatch = BATCH_OPERATIONS.find(op => op.id === 'removal-time-batch');

    it('should have removal-time-batch entry in BATCH_OPERATIONS', () => {
      expect(removalTimeBatch).toBeDefined();
    });

    it('should have available set to true (not "Coming soon")', () => {
      expect(removalTimeBatch?.available).toBe(true);
    });

    it('should have actionBtnKey defined', () => {
      expect(removalTimeBatch?.actionBtnKey).toBe('cockpit.batchOps.confirm.removalTimeBatchBtn');
    });

    it('should have actionBtnQueryKey defined', () => {
      expect(removalTimeBatch?.actionBtnQueryKey).toBe('cockpit.batchOps.confirm.removalTimeBatchBtnQuery');
    });

    it('should have correct icon (faClock)', () => {
      expect(removalTimeBatch?.icon).toBeDefined();
      expect(removalTimeBatch?.icon.iconName).toBe('clock');
    });

    it('should have labelKey and descKey', () => {
      expect(removalTimeBatch?.labelKey).toBe('cockpit.batchOps.removalTimeBatch.label');
      expect(removalTimeBatch?.descKey).toBe('cockpit.batchOps.removalTimeBatch.desc');
    });
  });

  // ============================================
  // I18N KEYS EXISTENCE (EN)
  // ============================================

  describe('i18n EN keys existence', () => {
    const requiredKeys = [
      'cockpit.batchOps.removalTimeBatch.label',
      'cockpit.batchOps.removalTimeBatch.desc',
      'cockpit.batchOps.removalTimeBatch.modeInstances',
      'cockpit.batchOps.removalTimeBatch.modeQuery',
      'cockpit.batchOps.removalTimeBatch.operationNote',
      'cockpit.batchOps.removalTimeBatch.modeTitle',
      'cockpit.batchOps.removalTimeBatch.clearedLabel',
      'cockpit.batchOps.removalTimeBatch.clearedHelp',
      'cockpit.batchOps.removalTimeBatch.calculatedLabel',
      'cockpit.batchOps.removalTimeBatch.calculatedHelp',
      'cockpit.batchOps.removalTimeBatch.absoluteLabel',
      'cockpit.batchOps.removalTimeBatch.absoluteHelp',
      'cockpit.batchOps.removalTimeBatch.absoluteDateLabel',
      'cockpit.batchOps.removalTimeBatch.noBatches',
      'cockpit.batchOps.confirm.removalTimeBatchSummary',
      'cockpit.batchOps.confirm.removalTimeBatchQuerySummary',
      'cockpit.batchOps.confirm.removalTimeBatchBtn',
      'cockpit.batchOps.confirm.removalTimeBatchBtnQuery'
    ];

    it('should have all 18 required keys in EN', () => {
      expect(requiredKeys.length).toBe(18);

      requiredKeys.forEach(key => {
        expect(enTranslations).toHaveProperty(key);
        expect(typeof enTranslations[key as keyof typeof enTranslations]).toBe('string');
        expect((enTranslations[key as keyof typeof enTranslations] as string).length).toBeGreaterThan(0);
      });
    });

    it('should have EN desc without "historic"', () => {
      const desc = enTranslations['cockpit.batchOps.removalTimeBatch.desc'];
      expect(desc).toBe('Configure when batch data is removed');
      expect(desc.toLowerCase()).not.toContain('historic');
    });

    it('should have EN operationNote with correct text', () => {
      const note = enTranslations['cockpit.batchOps.removalTimeBatch.operationNote'];
      expect(note).toBe('Applies to the selected batches only.');
    });

    it('should have EN calculatedHelp with correct text', () => {
      const help = enTranslations['cockpit.batchOps.removalTimeBatch.calculatedHelp'];
      expect(help).toBe('Calculated from the start or end time of the batch and the retention period configured for its type.');
      expect(help.toLowerCase()).not.toContain('batchoperationhistorytimetolive');
      expect(help.toLowerCase()).not.toContain('batchoperationsforhistorycleanup');
    });
  });

  // ============================================
  // I18N KEYS EXISTENCE (FR)
  // ============================================

  describe('i18n FR keys existence', () => {
    const requiredKeys = [
      'cockpit.batchOps.removalTimeBatch.label',
      'cockpit.batchOps.removalTimeBatch.desc',
      'cockpit.batchOps.removalTimeBatch.modeInstances',
      'cockpit.batchOps.removalTimeBatch.modeQuery',
      'cockpit.batchOps.removalTimeBatch.operationNote',
      'cockpit.batchOps.removalTimeBatch.modeTitle',
      'cockpit.batchOps.removalTimeBatch.clearedLabel',
      'cockpit.batchOps.removalTimeBatch.clearedHelp',
      'cockpit.batchOps.removalTimeBatch.calculatedLabel',
      'cockpit.batchOps.removalTimeBatch.calculatedHelp',
      'cockpit.batchOps.removalTimeBatch.absoluteLabel',
      'cockpit.batchOps.removalTimeBatch.absoluteHelp',
      'cockpit.batchOps.removalTimeBatch.absoluteDateLabel',
      'cockpit.batchOps.removalTimeBatch.noBatches',
      'cockpit.batchOps.confirm.removalTimeBatchSummary',
      'cockpit.batchOps.confirm.removalTimeBatchQuerySummary',
      'cockpit.batchOps.confirm.removalTimeBatchBtn',
      'cockpit.batchOps.confirm.removalTimeBatchBtnQuery'
    ];

    it('should have all 18 required keys in FR', () => {
      expect(requiredKeys.length).toBe(18);

      requiredKeys.forEach(key => {
        expect(frTranslations).toHaveProperty(key);
        expect(typeof frTranslations[key as keyof typeof frTranslations]).toBe('string');
        expect((frTranslations[key as keyof typeof frTranslations] as string).length).toBeGreaterThan(0);
      });
    });

    it('should have FR desc without "historiques"', () => {
      const desc = frTranslations['cockpit.batchOps.removalTimeBatch.desc'];
      expect(desc).toBe('Configurer quand les données des lots sont supprimées');
      expect(desc.toLowerCase()).not.toContain('historique');
    });

    it('should have FR operationNote starting with "S\'applique"', () => {
      const note = frTranslations['cockpit.batchOps.removalTimeBatch.operationNote'];
      expect(note).toBe('S\'applique uniquement aux lots sélectionnés.');
      expect(note).toMatch(/^S'applique/);
    });

    it('should have FR calculatedHelp with correct text', () => {
      const help = frTranslations['cockpit.batchOps.removalTimeBatch.calculatedHelp'];
      expect(help).toContain('Calculé');
      expect(help).toContain('date de début ou de fin du lot');
    });
  });

  // ============================================
  // I18N PARITY EN/FR
  // ============================================

  describe('i18n EN/FR parity', () => {
    const allKeys = [
      'cockpit.batchOps.removalTimeBatch.label',
      'cockpit.batchOps.removalTimeBatch.desc',
      'cockpit.batchOps.removalTimeBatch.modeInstances',
      'cockpit.batchOps.removalTimeBatch.modeQuery',
      'cockpit.batchOps.removalTimeBatch.operationNote',
      'cockpit.batchOps.removalTimeBatch.modeTitle',
      'cockpit.batchOps.removalTimeBatch.clearedLabel',
      'cockpit.batchOps.removalTimeBatch.clearedHelp',
      'cockpit.batchOps.removalTimeBatch.calculatedLabel',
      'cockpit.batchOps.removalTimeBatch.calculatedHelp',
      'cockpit.batchOps.removalTimeBatch.absoluteLabel',
      'cockpit.batchOps.removalTimeBatch.absoluteHelp',
      'cockpit.batchOps.removalTimeBatch.absoluteDateLabel',
      'cockpit.batchOps.removalTimeBatch.noBatches',
      'cockpit.batchOps.confirm.removalTimeBatchSummary',
      'cockpit.batchOps.confirm.removalTimeBatchQuerySummary',
      'cockpit.batchOps.confirm.removalTimeBatchBtn',
      'cockpit.batchOps.confirm.removalTimeBatchBtnQuery'
    ];

    it('should have exact same keys in EN and FR', () => {
      allKeys.forEach(key => {
        const hasEN = key in enTranslations;
        const hasFR = key in frTranslations;
        expect(hasEN).toBe(true);
        expect(hasFR).toBe(true);
        expect(hasEN).toBe(hasFR);
      });
    });

    it('should have no empty values in EN or FR', () => {
      allKeys.forEach(key => {
        const enValue = enTranslations[key as keyof typeof enTranslations] as string;
        const frValue = frTranslations[key as keyof typeof frTranslations] as string;
        expect(enValue.trim().length).toBeGreaterThan(0);
        expect(frValue.trim().length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================
  // ALIGNMENT WITH DECISION LABELS
  // ============================================

  describe('Alignment with removalTimeDecision labels', () => {
    it('should have same modeInstances label as decision (EN)', () => {
      const batch = enTranslations['cockpit.batchOps.removalTimeBatch.modeInstances'];
      const decision = enTranslations['cockpit.batchOps.removalTimeDecision.modeInstances'];
      expect(batch).toBe(decision);
      expect(batch).toBe('Instances');
    });

    it('should have same modeQuery label as decision (EN)', () => {
      const batch = enTranslations['cockpit.batchOps.removalTimeBatch.modeQuery'];
      const decision = enTranslations['cockpit.batchOps.removalTimeDecision.modeQuery'];
      expect(batch).toBe(decision);
      expect(batch).toBe('Query');
    });

    it('should have same clearedLabel as decision (EN)', () => {
      const batch = enTranslations['cockpit.batchOps.removalTimeBatch.clearedLabel'];
      const decision = enTranslations['cockpit.batchOps.removalTimeDecision.clearedLabel'];
      expect(batch).toBe(decision);
      expect(batch).toBe('Cleared');
    });

    it('should have same calculatedLabel as decision (EN)', () => {
      const batch = enTranslations['cockpit.batchOps.removalTimeBatch.calculatedLabel'];
      const decision = enTranslations['cockpit.batchOps.removalTimeDecision.calculatedLabel'];
      expect(batch).toBe(decision);
      expect(batch).toBe('Calculated');
    });

    it('should have same absoluteLabel as decision (EN)', () => {
      const batch = enTranslations['cockpit.batchOps.removalTimeBatch.absoluteLabel'];
      const decision = enTranslations['cockpit.batchOps.removalTimeDecision.absoluteLabel'];
      expect(batch).toBe(decision);
      expect(batch).toBe('Absolute');
    });

    it('should have same clearedHelp as decision (EN)', () => {
      const batch = enTranslations['cockpit.batchOps.removalTimeBatch.clearedHelp'];
      const decision = enTranslations['cockpit.batchOps.removalTimeDecision.clearedHelp'];
      expect(batch).toBe(decision);
    });

    it('should have same absoluteHelp as decision (EN)', () => {
      const batch = enTranslations['cockpit.batchOps.removalTimeBatch.absoluteHelp'];
      const decision = enTranslations['cockpit.batchOps.removalTimeDecision.absoluteHelp'];
      expect(batch).toBe(decision);
    });

    it('should have same modeInstances label as decision (FR)', () => {
      const batch = frTranslations['cockpit.batchOps.removalTimeBatch.modeInstances'];
      const decision = frTranslations['cockpit.batchOps.removalTimeDecision.modeInstances'];
      expect(batch).toBe(decision);
      expect(batch).toBe('Instances');
    });

    it('should have same clearedLabel as decision (FR)', () => {
      const batch = frTranslations['cockpit.batchOps.removalTimeBatch.clearedLabel'];
      const decision = frTranslations['cockpit.batchOps.removalTimeDecision.clearedLabel'];
      expect(batch).toBe(decision);
      expect(batch).toBe('Effacé');
    });

    it('should have same calculatedLabel as decision (FR)', () => {
      const batch = frTranslations['cockpit.batchOps.removalTimeBatch.calculatedLabel'];
      const decision = frTranslations['cockpit.batchOps.removalTimeDecision.calculatedLabel'];
      expect(batch).toBe(decision);
      expect(batch).toBe('Calculé');
    });

    it('should have same absoluteLabel as decision (FR)', () => {
      const batch = frTranslations['cockpit.batchOps.removalTimeBatch.absoluteLabel'];
      const decision = frTranslations['cockpit.batchOps.removalTimeDecision.absoluteLabel'];
      expect(batch).toBe(decision);
      expect(batch).toBe('Absolu');
    });
  });

  // ============================================
  // MUTATION PROTECTION
  // ============================================

  describe('Mutation protection - config changes must not be reverted', () => {
    it('should fail if available is changed back to false', () => {
      const removalTimeBatch = BATCH_OPERATIONS.find(op => op.id === 'removal-time-batch');
      expect(removalTimeBatch?.available).not.toBe(false);
      expect(removalTimeBatch?.available).toBe(true);
    });

    it('should fail if actionBtnKey is removed', () => {
      const removalTimeBatch = BATCH_OPERATIONS.find(op => op.id === 'removal-time-batch');
      expect(removalTimeBatch?.actionBtnKey).toBeDefined();
      expect(removalTimeBatch?.actionBtnKey).not.toBe('');
      expect(removalTimeBatch?.actionBtnKey).not.toBeUndefined();
    });

    it('should fail if actionBtnQueryKey is removed', () => {
      const removalTimeBatch = BATCH_OPERATIONS.find(op => op.id === 'removal-time-batch');
      expect(removalTimeBatch?.actionBtnQueryKey).toBeDefined();
      expect(removalTimeBatch?.actionBtnQueryKey).not.toBe('');
      expect(removalTimeBatch?.actionBtnQueryKey).not.toBeUndefined();
    });

    it('should fail if EN desc contains "historic"', () => {
      const desc = enTranslations['cockpit.batchOps.removalTimeBatch.desc'];
      expect(desc.toLowerCase()).not.toContain('historic');
    });

    it('should fail if FR desc contains "historique"', () => {
      const desc = frTranslations['cockpit.batchOps.removalTimeBatch.desc'];
      expect(desc.toLowerCase()).not.toContain('historique');
    });

    it('should fail if FR operationNote does not start with "S\'applique"', () => {
      const note = frTranslations['cockpit.batchOps.removalTimeBatch.operationNote'];
      expect(note.startsWith('S\'applique')).toBe(true);
      expect(note.startsWith('Applique')).toBe(false);
    });
  });
});