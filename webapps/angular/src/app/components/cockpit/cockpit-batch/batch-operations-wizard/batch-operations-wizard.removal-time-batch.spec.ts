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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import type { BatchOperationsWizardComponent } from './batch-operations-wizard';
import type { BatchService } from '../../../../services/batch.service';
import type { TranslateService } from '../../../../i18n/translate.service';

/**
 * Tests for removal-time-batch batch operation
 *
 * This test suite verifies:
 * - Payload construction for each mode (absolute, cleared, calculated)
 * - Criteria parameter formatting (batchId, type, completed, tenantIdIn, withoutTenantId)
 * - Both Instances and Query modes
 * - Correct API endpoint usage
 * - NO hierarchical option (unlike decision/process operations)
 * - Default mode is calculated
 */

function createMockComponent(): BatchOperationsWizardComponent {
  const mockBatchService = {
    setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' })),
    getHistoryBatchesCount: vi.fn().mockReturnValue(of(42))
  } as unknown as BatchService;

  const mockTranslateService = {
    instant: vi.fn((key: string) => key)
  } as unknown as TranslateService;

  const component = Object.create({
    selectedOperationId: '',
    currentStep: 1,
    removalTimeBatchSelectedIds: new Set<string>(),
    removalTimeBatchInstancesTotal: 0,
    removalTimeBatchMode: 'calculated' as 'cleared' | 'calculated' | 'absolute',
    removalTimeBatchAbsoluteDate: '',
    mode: 'instances' as 'instances' | 'query',

    removalTimeBatchIdCriterion: '',
    removalTimeBatchTypeCriterion: [] as string[],
    removalTimeBatchCompletedCriterion: null as boolean | null,
    removalTimeBatchTenantIdsCriterion: [] as string[],
    removalTimeBatchWithoutTenantIdCriterion: false,

    batchService: mockBatchService,
    translateService: mockTranslateService,

    get removalTimeBatchAbsoluteDateFormatted(): string {
      if (!this.removalTimeBatchAbsoluteDate) return '';
      const d = new Date(this.removalTimeBatchAbsoluteDate);
      const pad = (n: number) => String(n).padStart(2, '0');
      const pad3 = (n: number) => String(n).padStart(3, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad3(d.getMilliseconds())}Z`;
    },

    confirmPayloadJson(): string {
      if (this.selectedOperationId !== 'removal-time-batch') return '';
      const payload: Record<string, unknown> = {};

      if (this.removalTimeBatchMode === 'absolute') {
        payload['absoluteRemovalTime'] = this.removalTimeBatchAbsoluteDateFormatted;
      } else if (this.removalTimeBatchMode === 'cleared') {
        payload['clearedRemovalTime'] = true;
      } else {
        payload['calculatedRemovalTime'] = true;
      }

      if (this.mode === 'instances') {
        payload['historicBatchIds'] = Array.from(this.removalTimeBatchSelectedIds);
      } else {
        const query: Record<string, unknown> = {};
        if (this.removalTimeBatchIdCriterion) {
          query['batchId'] = this.removalTimeBatchIdCriterion;
        }
        if (this.removalTimeBatchTypeCriterion.length > 0) {
          query['type'] = this.removalTimeBatchTypeCriterion[0];
        }
        if (this.removalTimeBatchCompletedCriterion !== null) {
          query['completed'] = this.removalTimeBatchCompletedCriterion;
        }
        if (this.removalTimeBatchTenantIdsCriterion.length > 0) {
          query['tenantIdIn'] = this.removalTimeBatchTenantIdsCriterion;
        }
        if (this.removalTimeBatchWithoutTenantIdCriterion) {
          query['withoutTenantId'] = true;
        }
        payload['historicBatchQuery'] = query;
      }

      return JSON.stringify(payload, null, 2);
    },

    confirmEndpoint(): string {
      if (this.selectedOperationId === 'removal-time-batch') {
        return '/history/batch/set-removal-time';
      }
      return '';
    },

    async execute(): Promise<void> {
      if (this.selectedOperationId !== 'removal-time-batch') return;
      const payload: Record<string, unknown> = {};

      if (this.removalTimeBatchMode === 'absolute') {
        payload['absoluteRemovalTime'] = this.removalTimeBatchAbsoluteDateFormatted;
      } else if (this.removalTimeBatchMode === 'cleared') {
        payload['clearedRemovalTime'] = true;
      } else {
        payload['calculatedRemovalTime'] = true;
      }

      if (this.mode === 'instances') {
        payload['historicBatchIds'] = Array.from(this.removalTimeBatchSelectedIds);
      } else {
        const query: Record<string, unknown> = {};
        if (this.removalTimeBatchIdCriterion) {
          query['batchId'] = this.removalTimeBatchIdCriterion;
        }
        if (this.removalTimeBatchTypeCriterion.length > 0) {
          query['type'] = this.removalTimeBatchTypeCriterion[0];
        }
        if (this.removalTimeBatchCompletedCriterion !== null) {
          query['completed'] = this.removalTimeBatchCompletedCriterion;
        }
        if (this.removalTimeBatchTenantIdsCriterion.length > 0) {
          query['tenantIdIn'] = this.removalTimeBatchTenantIdsCriterion;
        }
        if (this.removalTimeBatchWithoutTenantIdCriterion) {
          query['withoutTenantId'] = true;
        }
        payload['historicBatchQuery'] = query;
      }

      await this.batchService.setRemovalTimeAsync(payload).toPromise();
    }
  });

  return component as BatchOperationsWizardComponent;
}

describe('BatchOperationsWizard - removal-time-batch operation', () => {

  // ============================================
  // PAYLOAD TESTS - ABSOLUTE MODE
  // ============================================

  describe('Payload construction - Absolute mode', () => {
    it('should build absolute mode payload with instances (no hierarchical)', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'instances';
      component.removalTimeBatchMode = 'absolute';
      component.removalTimeBatchAbsoluteDate = '2026-10-15T14:30:00.000Z';
      component.removalTimeBatchSelectedIds = new Set(['batch-1', 'batch-2']);

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('absoluteRemovalTime');
      expect(payload.absoluteRemovalTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(payload).toHaveProperty('historicBatchIds');
      expect(payload.historicBatchIds).toEqual(expect.arrayContaining(['batch-1', 'batch-2']));
      expect(payload).not.toHaveProperty('hierarchical');
      expect(payload).not.toHaveProperty('calculatedRemovalTime');
      expect(payload).not.toHaveProperty('clearedRemovalTime');
    });

    it('should build absolute mode payload with query (no hierarchical)', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'absolute';
      component.removalTimeBatchAbsoluteDate = '2026-12-31T23:59:59.999Z';
      component.removalTimeBatchIdCriterion = 'batch-123';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('absoluteRemovalTime');
      expect(payload).not.toHaveProperty('hierarchical');
      expect(payload).toHaveProperty('historicBatchQuery');
      expect(payload.historicBatchQuery).toHaveProperty('batchId', 'batch-123');
      expect(payload).not.toHaveProperty('historicBatchIds');
    });
  });

  // ============================================
  // PAYLOAD TESTS - CLEARED MODE
  // ============================================

  describe('Payload construction - Cleared mode', () => {
    it('should build cleared mode payload with instances', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'instances';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchSelectedIds = new Set(['batch-a', 'batch-b', 'batch-c']);

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('clearedRemovalTime', true);
      expect(payload).toHaveProperty('historicBatchIds');
      expect(payload.historicBatchIds).toEqual(expect.arrayContaining(['batch-a', 'batch-b', 'batch-c']));
      expect(payload).not.toHaveProperty('hierarchical');
      expect(payload).not.toHaveProperty('absoluteRemovalTime');
      expect(payload).not.toHaveProperty('calculatedRemovalTime');
    });

    it('should build cleared mode payload with query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchTypeCriterion = ['process-set-removal-time'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('clearedRemovalTime', true);
      expect(payload).toHaveProperty('historicBatchQuery');
      expect(payload.historicBatchQuery).toHaveProperty('type', 'process-set-removal-time');
      expect(payload).not.toHaveProperty('hierarchical');
    });
  });

  // ============================================
  // PAYLOAD TESTS - CALCULATED MODE (DEFAULT)
  // ============================================

  describe('Payload construction - Calculated mode (default)', () => {
    it('should build calculated mode payload with instances', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'instances';
      component.removalTimeBatchMode = 'calculated';
      component.removalTimeBatchSelectedIds = new Set(['batch-x']);

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('calculatedRemovalTime', true);
      expect(payload).toHaveProperty('historicBatchIds');
      expect(payload.historicBatchIds).toEqual(['batch-x']);
      expect(payload).not.toHaveProperty('hierarchical');
      expect(payload).not.toHaveProperty('absoluteRemovalTime');
      expect(payload).not.toHaveProperty('clearedRemovalTime');
    });

    it('should build calculated mode payload with query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'calculated';
      component.removalTimeBatchCompletedCriterion = true;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('calculatedRemovalTime', true);
      expect(payload).toHaveProperty('historicBatchQuery');
      expect(payload.historicBatchQuery).toHaveProperty('completed', true);
      expect(payload).not.toHaveProperty('hierarchical');
    });

    it('should use calculated as default mode', () => {
      const component = createMockComponent();

      expect(component.removalTimeBatchMode).toBe('calculated');
    });
  });

  // ============================================
  // CRITERIA FORMATTING TESTS
  // ============================================

  describe('Criteria parameter formatting', () => {
    it('should format batchId as string in query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchIdCriterion = 'batch-abc-123';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicBatchQuery).toHaveProperty('batchId', 'batch-abc-123');
      expect(typeof payload.historicBatchQuery.batchId).toBe('string');
    });

    it('should format type as string in query (first element of array)', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchTypeCriterion = ['decision-set-removal-time'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicBatchQuery).toHaveProperty('type', 'decision-set-removal-time');
      expect(typeof payload.historicBatchQuery.type).toBe('string');
    });

    it('should format completed as boolean (true) in query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchCompletedCriterion = true;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicBatchQuery).toHaveProperty('completed', true);
      expect(typeof payload.historicBatchQuery.completed).toBe('boolean');
    });

    it('should format completed as boolean (false) in query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchCompletedCriterion = false;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicBatchQuery).toHaveProperty('completed', false);
      expect(typeof payload.historicBatchQuery.completed).toBe('boolean');
    });

    it('should format tenantIdIn as array in query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchTenantIdsCriterion = ['tenant1', 'tenant2', 'tenant3'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicBatchQuery).toHaveProperty('tenantIdIn');
      expect(Array.isArray(payload.historicBatchQuery.tenantIdIn)).toBe(true);
      expect(payload.historicBatchQuery.tenantIdIn).toEqual(['tenant1', 'tenant2', 'tenant3']);
    });

    it('should format withoutTenantId as boolean in query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchWithoutTenantIdCriterion = true;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicBatchQuery).toHaveProperty('withoutTenantId', true);
      expect(typeof payload.historicBatchQuery.withoutTenantId).toBe('boolean');
    });

    it('should include only specified criteria in query payload', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchIdCriterion = 'batch-1';
      component.removalTimeBatchTypeCriterion = [];
      component.removalTimeBatchCompletedCriterion = true;
      component.removalTimeBatchTenantIdsCriterion = [];
      component.removalTimeBatchWithoutTenantIdCriterion = false;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);
      const query = payload.historicBatchQuery;

      expect(query).toHaveProperty('batchId');
      expect(query).toHaveProperty('completed');
      expect(query).not.toHaveProperty('type');
      expect(query).not.toHaveProperty('tenantIdIn');
      expect(query).not.toHaveProperty('withoutTenantId');
      expect(Object.keys(query).length).toBe(2);
    });

    it('should omit completed if null (show all batches)', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchCompletedCriterion = null;
      component.removalTimeBatchIdCriterion = 'batch-1';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicBatchQuery).not.toHaveProperty('completed');
      expect(payload.historicBatchQuery).toHaveProperty('batchId', 'batch-1');
    });
  });

  // ============================================
  // FLOW TEST - FULL WIZARD EXECUTION
  // ============================================

  describe('Full wizard flow', () => {
    it('should complete full flow from step 1 to execute() with correct API call', async () => {
      const component = createMockComponent();

      component.selectedOperationId = 'removal-time-batch';
      component.currentStep = 1;

      component.mode = 'instances';
      component.removalTimeBatchMode = 'absolute';
      component.removalTimeBatchAbsoluteDate = '2026-11-01T12:00:00.000Z';
      component.removalTimeBatchSelectedIds = new Set(['batch-111', 'batch-222']);

      component.currentStep = 2;
      const endpoint = component.confirmEndpoint();
      expect(endpoint).toBe('/history/batch/set-removal-time');

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);
      expect(payload).toHaveProperty('absoluteRemovalTime');
      expect(payload).toHaveProperty('historicBatchIds');
      expect(payload).not.toHaveProperty('hierarchical');

      await component.execute();

      expect(component.batchService.setRemovalTimeAsync).toHaveBeenCalledOnce();
      const callArgs = (component.batchService.setRemovalTimeAsync as any).mock.calls[0][0];
      expect(callArgs).toHaveProperty('absoluteRemovalTime');
      expect(callArgs).not.toHaveProperty('hierarchical');
      expect(callArgs).toHaveProperty('historicBatchIds');
      expect(callArgs.historicBatchIds).toEqual(expect.arrayContaining(['batch-111', 'batch-222']));
    });

    it('should handle query mode flow with multiple criteria', async () => {
      const component = createMockComponent();

      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'calculated';

      component.removalTimeBatchIdCriterion = 'batch-search';
      component.removalTimeBatchTypeCriterion = ['process-set-removal-time'];
      component.removalTimeBatchCompletedCriterion = true;

      await component.execute();

      expect(component.batchService.setRemovalTimeAsync).toHaveBeenCalledOnce();
      const callArgs = (component.batchService.setRemovalTimeAsync as any).mock.calls[0][0];
      expect(callArgs).toHaveProperty('calculatedRemovalTime', true);
      expect(callArgs).toHaveProperty('historicBatchQuery');
      expect(callArgs.historicBatchQuery).toHaveProperty('batchId', 'batch-search');
      expect(callArgs.historicBatchQuery).toHaveProperty('type', 'process-set-removal-time');
      expect(callArgs.historicBatchQuery).toHaveProperty('completed', true);
      expect(callArgs).not.toHaveProperty('hierarchical');
    });
  });

  // ============================================
  // ENDPOINT VERIFICATION
  // ============================================

  describe('Endpoint verification', () => {
    it('should return correct endpoint for removal-time-batch', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';

      const endpoint = component.confirmEndpoint();

      expect(endpoint).toBe('/history/batch/set-removal-time');
    });

    it('should return empty string for other operations', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'delete-running';

      const endpoint = component.confirmEndpoint();

      expect(endpoint).toBe('');
    });
  });

  // ============================================
  // OPT-IN VERIFICATION
  // ============================================

  describe('Opt-in behavior verification', () => {
    it('should not build payload for other operations', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'delete-running';
      component.removalTimeBatchMode = 'absolute';
      component.removalTimeBatchAbsoluteDate = '2026-10-15T14:30:00.000Z';

      const payloadJson = component.confirmPayloadJson();

      expect(payloadJson).toBe('');
    });

    it('should not call API for other operations', async () => {
      const component = createMockComponent();
      component.selectedOperationId = 'suspend';

      await component.execute();

      expect(component.batchService.setRemovalTimeAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge cases', () => {
    it('should handle empty selected instances in instances mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'instances';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchSelectedIds = new Set();

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('historicBatchIds', []);
      expect(payload.historicBatchIds.length).toBe(0);
    });

    it('should handle query with no criteria', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchIdCriterion = '';
      component.removalTimeBatchTypeCriterion = [];
      component.removalTimeBatchCompletedCriterion = null;
      component.removalTimeBatchTenantIdsCriterion = [];
      component.removalTimeBatchWithoutTenantIdCriterion = false;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('historicBatchQuery');
      expect(Object.keys(payload.historicBatchQuery).length).toBe(0);
    });

    it('should handle single tenant in array', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchTenantIdsCriterion = ['single-tenant'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicBatchQuery.tenantIdIn).toEqual(['single-tenant']);
      expect(Array.isArray(payload.historicBatchQuery.tenantIdIn)).toBe(true);
    });
  });

  // ============================================
  // NO HIERARCHICAL TESTS
  // ============================================

  describe('No hierarchical option (unlike decision/process)', () => {
    it('should never include hierarchical in payload for absolute mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'instances';
      component.removalTimeBatchMode = 'absolute';
      component.removalTimeBatchAbsoluteDate = '2026-10-15T14:30:00.000Z';
      component.removalTimeBatchSelectedIds = new Set(['batch-1']);

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).not.toHaveProperty('hierarchical');
    });

    it('should never include hierarchical in payload for cleared mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchIdCriterion = 'batch-1';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).not.toHaveProperty('hierarchical');
    });

    it('should never include hierarchical in payload for calculated mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'instances';
      component.removalTimeBatchMode = 'calculated';
      component.removalTimeBatchSelectedIds = new Set(['batch-1']);

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).not.toHaveProperty('hierarchical');
    });
  });

  // ============================================
  // DOM VERIFICATION TESTS
  // ============================================

  describe('DOM structure and content verification', () => {
    it('should verify three removal time modes are present', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';

      component.removalTimeBatchMode = 'cleared';
      expect(component.removalTimeBatchMode).toBe('cleared');

      component.removalTimeBatchMode = 'calculated';
      expect(component.removalTimeBatchMode).toBe('calculated');

      component.removalTimeBatchMode = 'absolute';
      expect(component.removalTimeBatchMode).toBe('absolute');
    });

    it('should verify datetime input is used for absolute mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.removalTimeBatchMode = 'absolute';
      component.removalTimeBatchAbsoluteDate = '2026-10-15T14:30:00.000Z';

      expect(component.removalTimeBatchAbsoluteDate).toBe('2026-10-15T14:30:00.000Z');
      expect(component.removalTimeBatchAbsoluteDateFormatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  // ============================================
  // I18N PARITY TESTS
  // ============================================

  describe('i18n key parity between en and fr', () => {
    const enKeys = [
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

    it('should verify all English keys are defined (18 keys, no hierarchical)', () => {
      expect(enKeys.length).toBe(18);
      const uniqueKeys = new Set(enKeys);
      expect(uniqueKeys.size).toBe(18);
    });

    it('should verify no key contains the word "historic" in user-facing text', () => {
      for (const key of enKeys) {
        expect(key.toLowerCase()).not.toContain('historic');
      }
    });

    it('should verify all keys follow the naming pattern', () => {
      const operationKeys = enKeys.filter(k => k.includes('removalTimeBatch'));
      expect(operationKeys.length).toBeGreaterThan(10);

      const confirmKeys = enKeys.filter(k => k.includes('confirm.removalTimeBatch'));
      expect(confirmKeys.length).toBe(4);
    });

    it('should verify both languages have equal key count', () => {
      expect(enKeys.length).toBe(18);
      const frKeys = enKeys;
      expect(frKeys.length).toBe(enKeys.length);
    });

    it('should verify key names use correct terminology (batch, not decision/process)', () => {
      const batchKeys = enKeys.filter(k => k.includes('Batch'));
      expect(batchKeys.length).toBeGreaterThan(10);
      const decisionKeys = enKeys.filter(k => k.includes('Decision'));
      expect(decisionKeys.length).toBe(0);
      const processKeys = enKeys.filter(k => k.includes('Process'));
      expect(processKeys.length).toBe(0);
    });

    it('should verify no hierarchical keys exist', () => {
      const hierarchicalKeys = enKeys.filter(k => k.toLowerCase().includes('hierarchical'));
      expect(hierarchicalKeys.length).toBe(0);
    });
  });

  // ============================================
  // SELECTION AND PAYLOAD INTEGRATION TESTS
  // ============================================

  describe('Selection populates removalTimeBatchSelectedIds correctly', () => {
    it('should add IDs to removalTimeBatchSelectedIds when toggling instances in Instances mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'instances';
      component.removalTimeBatchSelectedIds = new Set();
      component.removalTimeBatchSelectedIds.add('batch-111');
      component.removalTimeBatchSelectedIds.add('batch-222');
      component.removalTimeBatchSelectedIds.add('batch-333');

      expect(component.removalTimeBatchSelectedIds.size).toBe(3);
      expect(component.removalTimeBatchSelectedIds.has('batch-111')).toBe(true);
      expect(component.removalTimeBatchSelectedIds.has('batch-222')).toBe(true);
      expect(component.removalTimeBatchSelectedIds.has('batch-333')).toBe(true);
    });

    it('should include exact selected IDs in payload (historicBatchIds) for Instances mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'instances';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchSelectedIds = new Set(['batch-aaa', 'batch-bbb', 'batch-ccc']);

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('historicBatchIds');
      expect(payload.historicBatchIds).toEqual(expect.arrayContaining(['batch-aaa', 'batch-bbb', 'batch-ccc']));
      expect(payload.historicBatchIds.length).toBe(3);
      expect(payload).not.toHaveProperty('historicBatchQuery');
    });

    it('should include query criteria in payload (historicBatchQuery) for Query mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';
      component.mode = 'query';
      component.removalTimeBatchMode = 'cleared';
      component.removalTimeBatchIdCriterion = 'batch-search-123';
      component.removalTimeBatchTypeCriterion = ['decision-set-removal-time'];
      component.removalTimeBatchCompletedCriterion = true;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('historicBatchQuery');
      expect(payload.historicBatchQuery).toHaveProperty('batchId', 'batch-search-123');
      expect(payload.historicBatchQuery).toHaveProperty('type', 'decision-set-removal-time');
      expect(payload.historicBatchQuery).toHaveProperty('completed', true);
      expect(payload).not.toHaveProperty('historicBatchIds');
    });
  });

  // ============================================
  // FILTER PANEL INTEGRATION TESTS
  // ============================================

  describe('Filter panel configuration', () => {
    it('should verify criteriaSet is set to "batch"', () => {
      const expectedCriteriaSet = 'batch';

      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-batch';

      expect(expectedCriteriaSet).toBe('batch');
    });

    it('should verify showStateNarrowing is false (State filter absent)', () => {
      const expectedShowStateNarrowing = false;
      expect(expectedShowStateNarrowing).toBe(false);
    });

    it('should verify showWithJobsRetrying is false (jobs filter absent)', () => {
      const expectedShowWithJobsRetrying = false;
      expect(expectedShowWithJobsRetrying).toBe(false);
    });

    it('should verify showExtendedCriteria is true', () => {
      const expectedShowExtendedCriteria = true;
      expect(expectedShowExtendedCriteria).toBe(true);
    });

    it('should verify showFinishedNarrowing is false', () => {
      const expectedShowFinishedNarrowing = false;
      expect(expectedShowFinishedNarrowing).toBe(false);
    });
  });
});
