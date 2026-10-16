import { describe, it, expect } from 'vitest';
import { BATCH_OPERATIONS } from './batch-operations-wizard';
import * as fs from 'fs';
import * as path from 'path';

describe('BatchOperationsWizard - Decision removal time button labels', () => {
  let enTranslations: any;
  let frTranslations: any;

  // Load translations from JSON files
  try {
    const enPath = path.resolve(__dirname, '../../../../../assets/i18n/en.json');
    const frPath = path.resolve(__dirname, '../../../../../assets/i18n/fr.json');
    enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    frTranslations = JSON.parse(fs.readFileSync(frPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load translation files:', error);
  }

  it('should use correct i18n keys for removal-time-decision operation', () => {
    const operation = BATCH_OPERATIONS.find(op => op.id === 'removal-time-decision');

    expect(operation).toBeDefined();
    expect(operation?.actionBtnKey).toBe('cockpit.batchOps.confirm.removalTimeDecisionBtn');
    expect(operation?.actionBtnQueryKey).toBe('cockpit.batchOps.confirm.removalTimeDecisionBtnQuery');
  });

  it('should have correct EN translation for Instances mode button', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtn';
    const translation = enTranslations[key];

    expect(translation).toBeDefined();
    expect(translation).toBe('Set removal time for {{count}} decision instance(s)');
  });

  it('should have correct EN translation for Query mode button', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtnQuery';
    const translation = enTranslations[key];

    expect(translation).toBeDefined();
    expect(translation).toBe('Set removal time for matching decision instances');
  });

  it('should have correct FR translation for Instances mode button', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtn';
    const translation = frTranslations[key];

    expect(translation).toBeDefined();
    expect(translation).toBe('Définir le délai de suppression pour {{count}} instance(s) de décision');
  });

  it('should have correct FR translation for Query mode button', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtnQuery';
    const translation = frTranslations[key];

    expect(translation).toBeDefined();
    expect(translation).toBe('Définir le délai de suppression pour les instances de décision correspondantes');
  });

  it('[MUTATION PROOF] EN translation should NOT be old label "Set Removal Time"', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtn';
    const translation = enTranslations[key];

    // This should FAIL if we revert to old label
    expect(translation).not.toBe('Set Removal Time');
    expect(translation).toContain('decision instance(s)');
    expect(translation).toContain('{{count}}');
  });

  it('[MUTATION PROOF] EN translation should NOT contain "Continue with"', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtn';
    const translation = enTranslations[key];

    // This should FAIL if we use old "Continue with" pattern
    expect(translation).not.toContain('Continue with');
    expect(translation).toContain('Set removal time for');
  });

  it('[MUTATION PROOF] EN Query translation should NOT be "Continue with Query"', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtnQuery';
    const translation = enTranslations[key];

    // This should FAIL if we revert to old label
    expect(translation).not.toBe('Continue with Query');
    expect(translation).toContain('matching decision instances');
  });

  it('[MUTATION PROOF] FR translation should NOT be old label "Définir le délai de suppression" (without count)', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtn';
    const translation = frTranslations[key];

    // This should FAIL if we revert to old label
    expect(translation).not.toBe('Définir le délai de suppression');
    expect(translation).toContain('instance(s) de décision');
    expect(translation).toContain('{{count}}');
  });

  it('[MUTATION PROOF] FR translation should NOT contain "Continuer avec"', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtn';
    const translation = frTranslations[key];

    // This should FAIL if we use old "Continuer avec" pattern
    expect(translation).not.toContain('Continuer avec');
    expect(translation).toContain('Définir le délai de suppression pour');
  });

  it('[MUTATION PROOF] FR Query translation should NOT be "Continuer avec la requête"', () => {
    const key = 'cockpit.batchOps.confirm.removalTimeDecisionBtnQuery';
    const translation = frTranslations[key];

    // This should FAIL if we revert to old label
    expect(translation).not.toBe('Continuer avec la requête');
    expect(translation).toContain('instances de décision correspondantes');
  });

  it('[MUTATION PROOF] Old actionBtn keys should NOT exist in EN translations', () => {
    const oldKey1 = 'cockpit.batchOps.removalTimeDecision.actionBtn';
    const oldKey2 = 'cockpit.batchOps.removalTimeDecision.actionBtnQuery';

    expect(enTranslations[oldKey1]).toBeUndefined();
    expect(enTranslations[oldKey2]).toBeUndefined();
  });

  it('[MUTATION PROOF] Old actionBtn keys should NOT exist in FR translations', () => {
    const oldKey1 = 'cockpit.batchOps.removalTimeDecision.actionBtn';
    const oldKey2 = 'cockpit.batchOps.removalTimeDecision.actionBtnQuery';

    expect(frTranslations[oldKey1]).toBeUndefined();
    expect(frTranslations[oldKey2]).toBeUndefined();
  });

  it('should align with process instances button label pattern', () => {
    const processKey = 'cockpit.batchOps.confirm.removalTimeProcessBtn';
    const decisionKey = 'cockpit.batchOps.confirm.removalTimeDecisionBtn';

    const processTranslation = enTranslations[processKey];
    const decisionTranslation = enTranslations[decisionKey];

    // Both should follow same pattern: "Set removal time for {{count}} [type] instance(s)"
    expect(processTranslation).toContain('Set removal time for {{count}}');
    expect(decisionTranslation).toContain('Set removal time for {{count}}');

    expect(processTranslation).toContain('instance(s)');
    expect(decisionTranslation).toContain('decision instance(s)');
  });
});