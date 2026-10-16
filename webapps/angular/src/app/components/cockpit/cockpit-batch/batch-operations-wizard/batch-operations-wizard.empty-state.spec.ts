/**
 * Test: Empty state message for removal-time-process operation
 *
 * Covers:
 * - operationNoInstancesKey returns the correct key for removal-time-process
 * - The key points to a message that does NOT contain "running"
 * - Other operations' keys remain unchanged (non-regression)
 */

import { describe, it, expect } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('BatchOperationsWizardComponent — Empty state messages', () => {

  it('removal-time-process: operationNoInstancesKey returns removalTimeProcess.noInstances', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'removal-time-process';

    const key = component.operationNoInstancesKey;

    expect(key).toBe('cockpit.batchOps.removalTimeProcess.noInstances');
  });

  it('removal-time-process: noInstances message is "No process instances found."', () => {
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const fr = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/fr.json'), 'utf8'));

    const enMessage: string = en['cockpit.batchOps.removalTimeProcess.noInstances'];
    const frMessage: string = fr['cockpit.batchOps.removalTimeProcess.noInstances'];

    expect(enMessage).toBe('No process instances found.');
    expect(frMessage).toBe('Aucune instance de processus trouvée.');

    // Verify it does NOT contain misleading terms
    expect(enMessage.toLowerCase()).not.toContain('running');
    expect(enMessage.toLowerCase()).not.toContain('historic');
    expect(frMessage.toLowerCase()).not.toContain('active');
    expect(frMessage.toLowerCase()).not.toContain('historique');
  });

  it('Non-regression: suspend still returns suspend.noInstances with correct text', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'suspend';

    const key = component.operationNoInstancesKey;
    expect(key).toBe('cockpit.batchOps.suspend.noInstances');

    // Verify actual message text matches HEAD
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const actualText: string = en[key];
    expect(actualText).toBe('No running instances found');
  });

  it('Non-regression: activate returns activate.noInstances with correct text', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'activate';

    const key = component.operationNoInstancesKey;
    expect(key).toBe('cockpit.batchOps.activate.noInstances');

    // Verify actual message text matches HEAD
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const actualText: string = en[key];
    expect(actualText).toBe('No suspended instances found');
  });

  it('Non-regression: delete-running returns deleteRunning.noInstances with correct text', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'delete-running';

    const key = component.operationNoInstancesKey;
    expect(key).toBe('cockpit.batchOps.deleteRunning.noInstances');

    // Verify actual message text matches HEAD
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const actualText: string = en[key];
    expect(actualText).toBe('No running instances found');
  });

  it('Non-regression: delete-finished returns deleteFinished.noInstances with correct text', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'delete-finished';

    const key = component.operationNoInstancesKey;
    expect(key).toBe('cockpit.batchOps.deleteFinished.noInstances');

    // Verify actual message text matches HEAD
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const actualText: string = en[key];
    expect(actualText).toBe('No finished instances found');
  });

  it('Non-regression: set-retries-jobs returns setRetriesJobs.noInstances with correct text', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'set-retries-jobs';

    const key = component.operationNoInstancesKey;
    expect(key).toBe('cockpit.batchOps.setRetriesJobs.noInstances');

    // Verify actual message text matches HEAD
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const actualText: string = en[key];
    expect(actualText).toBe('No active process instances match the current criteria.');
  });

  it('Non-regression: set-retries-external returns setRetriesExternal.noInstances with correct text', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'set-retries-external';

    const key = component.operationNoInstancesKey;
    expect(key).toBe('cockpit.batchOps.setRetriesExternal.noInstances');

    // Verify actual message text matches HEAD
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const actualText: string = en[key];
    expect(actualText).toBe('No active process instances match the current criteria.');
  });

  it('Non-regression: set-variables returns setVariables.noInstances with correct text', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'set-variables';

    const key = component.operationNoInstancesKey;
    expect(key).toBe('cockpit.batchOps.setVariables.noInstances');

    // Verify actual message text matches HEAD
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const actualText: string = en[key];
    expect(actualText).toBe('No process instances match the current criteria.');
  });

  it('Non-regression: correlate returns correlate.noInstances with correct text', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'correlate';

    const key = component.operationNoInstancesKey;
    expect(key).toBe('cockpit.batchOps.correlate.noInstances');

    // Verify actual message text matches HEAD
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const actualText: string = en[key];
    expect(actualText).toBe('No process instances match the current criteria.');
  });

  it('Fallback: unknown operation returns suspend.noInstances', () => {
    const component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'unknown-operation';

    const key = component.operationNoInstancesKey;

    expect(key).toBe('cockpit.batchOps.suspend.noInstances');
  });
});