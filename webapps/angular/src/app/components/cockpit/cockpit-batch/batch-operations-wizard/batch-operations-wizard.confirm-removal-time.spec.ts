/**
 * Test: Confirmation screen for removal-time-process operation
 *
 * Covers:
 * - confirmInstancesSummaryKey: must NOT contain "suspend"
 * - confirmQuerySummaryKey: must NOT contain "suspend"
 * - confirmInstancesBtnKey: must NOT contain "Suspend"
 * - confirmQueryBtnKey: must NOT contain "Suspend"
 * - confirmEndpoint: must match the actual endpoint sent by execute()
 * - confirmPayloadJson: must match the actual payload sent by execute()
 * - All 3 modes: absolute, cleared, calculated
 * - Both modes: instances and query
 * - hierarchical and updateInChunks flags
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';

describe('BatchOperationsWizardComponent — Confirmation screen for removal-time-process', () => {

  let component: BatchOperationsWizardComponent;

  beforeEach(() => {
    component = Object.create(BatchOperationsWizardComponent.prototype);
    component.selectedOperationId = 'removal-time-process';
    component.mode = 'instances';
    component.selectedIds = new Set(['id1', 'id2', 'id3']);
    component.removalTimeMode = 'absolute';
    component.removalTimeAbsoluteDate = '2026-10-14T18:07';
    component.removalTimeHierarchical = false;
    component.removalTimeUpdateInChunks = false;
  });

  describe('Summary keys', () => {
    it('confirmInstancesSummaryKey must NOT contain "suspend"', () => {
      const key = component.confirmInstancesSummaryKey;
      expect(key.toLowerCase()).not.toContain('suspend');
    });

    it('confirmQuerySummaryKey must NOT contain "suspend"', () => {
      component.mode = 'query';
      const key = component.confirmQuerySummaryKey;
      expect(key.toLowerCase()).not.toContain('suspend');
    });
  });

  describe('Button keys', () => {
    it('confirmInstancesBtnKey must NOT contain "Suspend"', () => {
      const key = component.confirmInstancesBtnKey;
      expect(key.toLowerCase()).not.toContain('suspend');
    });

    it('confirmQueryBtnKey must NOT contain "Suspend"', () => {
      component.mode = 'query';
      const key = component.confirmQueryBtnKey;
      expect(key.toLowerCase()).not.toContain('suspend');
    });
  });

  describe('Endpoint', () => {
    it('confirmEndpoint must match the actual removal-time endpoint', () => {
      const endpoint = component.confirmEndpoint;
      expect(endpoint).toContain('/history/process-instance/set-removal-time');
      expect(endpoint.toLowerCase()).not.toContain('suspend');
    });
  });

  describe('Payload — Instances mode', () => {
    it('Absolute mode: payload must contain historicProcessInstanceIds and absoluteRemovalTime', () => {
      component.mode = 'instances';
      component.removalTimeMode = 'absolute';

      const payload = component.confirmPayloadJson;
      const parsed = JSON.parse(payload);

      expect(parsed).toHaveProperty('historicProcessInstanceIds');
      expect(parsed.historicProcessInstanceIds).toEqual(['id1', 'id2', 'id3']);
      expect(parsed).toHaveProperty('absoluteRemovalTime');
      expect(parsed.absoluteRemovalTime).toMatch(/2026-10-14T18:07:00\.000[+-]\d{4}/);
      expect(parsed).not.toHaveProperty('suspended');
      expect(parsed).not.toHaveProperty('processInstanceIds');
    });

    it('Cleared mode: payload must contain clearedRemovalTime', () => {
      component.removalTimeMode = 'cleared';

      const payload = component.confirmPayloadJson;
      const parsed = JSON.parse(payload);

      expect(parsed).toHaveProperty('historicProcessInstanceIds');
      expect(parsed).toHaveProperty('clearedRemovalTime', true);
      expect(parsed).not.toHaveProperty('suspended');
    });

    it('Calculated mode: payload must contain calculatedRemovalTime', () => {
      component.removalTimeMode = 'calculated';

      const payload = component.confirmPayloadJson;
      const parsed = JSON.parse(payload);

      expect(parsed).toHaveProperty('historicProcessInstanceIds');
      expect(parsed).toHaveProperty('calculatedRemovalTime', true);
      expect(parsed).not.toHaveProperty('suspended');
    });

    it('Hierarchical flag: payload must contain hierarchical: true', () => {
      component.removalTimeHierarchical = true;

      const payload = component.confirmPayloadJson;
      const parsed = JSON.parse(payload);

      expect(parsed).toHaveProperty('hierarchical', true);
    });

    it('UpdateInChunks flag: payload must contain updateInChunks: true', () => {
      component.removalTimeUpdateInChunks = true;

      const payload = component.confirmPayloadJson;
      const parsed = JSON.parse(payload);

      expect(parsed).toHaveProperty('updateInChunks', true);
    });
  });

  describe('Payload — Query mode', () => {
    beforeEach(() => {
      component.mode = 'query';
      component.filterCriteria = [];
      component.vnIgnoreCase = false;
      component.vvIgnoreCase = false;
    });

    it('Absolute mode: payload must contain historicProcessInstanceQuery and absoluteRemovalTime', () => {
      component.removalTimeMode = 'absolute';

      const payload = component.confirmPayloadJson;
      const parsed = JSON.parse(payload);

      expect(parsed).toHaveProperty('historicProcessInstanceQuery');
      expect(parsed).toHaveProperty('absoluteRemovalTime');
      expect(parsed).not.toHaveProperty('suspended');
      expect(parsed).not.toHaveProperty('historicProcessInstanceIds');
    });

    it('Cleared mode: payload must contain clearedRemovalTime', () => {
      component.removalTimeMode = 'cleared';

      const payload = component.confirmPayloadJson;
      const parsed = JSON.parse(payload);

      expect(parsed).toHaveProperty('historicProcessInstanceQuery');
      expect(parsed).toHaveProperty('clearedRemovalTime', true);
      expect(parsed).not.toHaveProperty('suspended');
    });

    it('Calculated mode: payload must contain calculatedRemovalTime', () => {
      component.removalTimeMode = 'calculated';

      const payload = component.confirmPayloadJson;
      const parsed = JSON.parse(payload);

      expect(parsed).toHaveProperty('historicProcessInstanceQuery');
      expect(parsed).toHaveProperty('calculatedRemovalTime', true);
      expect(parsed).not.toHaveProperty('suspended');
    });
  });
});
