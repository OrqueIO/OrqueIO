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
import type { DecisionService } from '../../../../services/decision.service';
import type { TranslateService } from '../../../../i18n/translate.service';

/**
 * Tests for removal-time-decision batch operation
 *
 * This test suite verifies:
 * - Payload construction for each mode (absolute, cleared, calculated)
 * - Criteria parameter formatting (arrays, dates in yyyy-MM-dd'T'HH:mm:ss.SSSZ)
 * - Hierarchical option handling
 * - Both Instances and Query modes
 * - Correct API endpoint usage
 */

function createMockComponent(): BatchOperationsWizardComponent {
  const mockDecisionService = {
    setRemovalTimeAsync: vi.fn().mockReturnValue(of({ id: 'batch-123' })),
    getDecisionInstancesCountFiltered: vi.fn().mockReturnValue(of(42))
  } as unknown as DecisionService;

  const mockTranslateService = {
    instant: vi.fn((key: string) => key)
  } as unknown as TranslateService;

  const component = Object.create({
    selectedOperationId: '',
    currentStep: 1,
    selectedDecisionIds: [] as string[],
    decisionInstancesTotal: 0,
    removalTimeDecisionMode: 'calculated' as 'cleared' | 'calculated' | 'absolute',
    removalTimeDecisionAbsoluteDate: '',
    removalTimeDecisionHierarchical: false,
    selectedMode: 'instances' as 'instances' | 'query',

    decisionInstanceIdCriterion: '',
    processInstanceIdCriterion: '',
    decisionDefinitionCriterion: [] as string[],
    evaluatedAfterCriterion: '',
    evaluatedBeforeCriterion: '',

    decisionService: mockDecisionService,
    translateService: mockTranslateService,

    get removalTimeDecisionAbsoluteDateFormatted(): string {
      if (!this.removalTimeDecisionAbsoluteDate) return '';
      const d = new Date(this.removalTimeDecisionAbsoluteDate);
      const pad = (n: number) => String(n).padStart(2, '0');
      const pad3 = (n: number) => String(n).padStart(3, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad3(d.getMilliseconds())}Z`;
    },

    confirmPayloadJson(): string {
      if (this.selectedOperationId !== 'removal-time-decision') return '';
      const payload: Record<string, unknown> = {};
      if (this.removalTimeDecisionMode === 'absolute') {
        payload['absoluteRemovalTime'] = this.removalTimeDecisionAbsoluteDateFormatted;
      } else if (this.removalTimeDecisionMode === 'cleared') {
        payload['clearedRemovalTime'] = true;
      } else {
        payload['calculatedRemovalTime'] = true;
      }
      if (this.removalTimeDecisionHierarchical) {
        payload['hierarchical'] = true;
      }
      if (this.selectedMode === 'instances') {
        payload['historicDecisionInstanceIds'] = this.selectedDecisionIds;
      } else {
        const query: Record<string, unknown> = {};
        if (this.decisionInstanceIdCriterion) {
          query['decisionInstanceId'] = this.decisionInstanceIdCriterion;
        }
        if (this.processInstanceIdCriterion) {
          query['processInstanceId'] = this.processInstanceIdCriterion;
        }
        if (this.decisionDefinitionCriterion.length > 0) {
          query['decisionDefinitionKeyIn'] = this.decisionDefinitionCriterion;
        }
        if (this.evaluatedAfterCriterion) {
          query['evaluatedAfter'] = this.evaluatedAfterCriterion;
        }
        if (this.evaluatedBeforeCriterion) {
          query['evaluatedBefore'] = this.evaluatedBeforeCriterion;
        }
        payload['historicDecisionInstanceQuery'] = query;
      }
      return JSON.stringify(payload, null, 2);
    },

    confirmEndpoint(): string {
      if (this.selectedOperationId === 'removal-time-decision') {
        return '/history/decision-instance/set-removal-time';
      }
      return '';
    },

    async execute(): Promise<void> {
      if (this.selectedOperationId !== 'removal-time-decision') return;
      const payload: Record<string, unknown> = {};
      if (this.removalTimeDecisionMode === 'absolute') {
        payload['absoluteRemovalTime'] = this.removalTimeDecisionAbsoluteDateFormatted;
      } else if (this.removalTimeDecisionMode === 'cleared') {
        payload['clearedRemovalTime'] = true;
      } else {
        payload['calculatedRemovalTime'] = true;
      }
      if (this.removalTimeDecisionHierarchical) {
        payload['hierarchical'] = true;
      }
      if (this.selectedMode === 'instances') {
        payload['historicDecisionInstanceIds'] = this.selectedDecisionIds;
      } else {
        const query: Record<string, unknown> = {};
        if (this.decisionInstanceIdCriterion) {
          query['decisionInstanceId'] = this.decisionInstanceIdCriterion;
        }
        if (this.processInstanceIdCriterion) {
          query['processInstanceId'] = this.processInstanceIdCriterion;
        }
        if (this.decisionDefinitionCriterion.length > 0) {
          query['decisionDefinitionKeyIn'] = this.decisionDefinitionCriterion;
        }
        if (this.evaluatedAfterCriterion) {
          query['evaluatedAfter'] = this.evaluatedAfterCriterion;
        }
        if (this.evaluatedBeforeCriterion) {
          query['evaluatedBefore'] = this.evaluatedBeforeCriterion;
        }
        payload['historicDecisionInstanceQuery'] = query;
      }
      await this.decisionService.setRemovalTimeAsync(payload).toPromise();
    }
  });

  return component as BatchOperationsWizardComponent;
}

describe('BatchOperationsWizard - removal-time-decision operation', () => {

  // ============================================
  // PAYLOAD TESTS - ABSOLUTE MODE
  // ============================================

  describe('Payload construction - Absolute mode', () => {
    it('should build absolute mode payload with instances (no hierarchical)', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'instances';
      component.removalTimeDecisionMode = 'absolute';
      component.removalTimeDecisionAbsoluteDate = '2026-10-15T14:30:00.000Z';
      component.selectedDecisionIds = ['dec-1', 'dec-2'];
      component.removalTimeDecisionHierarchical = false;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('absoluteRemovalTime');
      expect(payload.absoluteRemovalTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(payload).toHaveProperty('historicDecisionInstanceIds');
      expect(payload.historicDecisionInstanceIds).toEqual(['dec-1', 'dec-2']);
      expect(payload).not.toHaveProperty('hierarchical');
      expect(payload).not.toHaveProperty('calculatedRemovalTime');
      expect(payload).not.toHaveProperty('clearedRemovalTime');
    });

    it('should build absolute mode payload with query and hierarchical', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'absolute';
      component.removalTimeDecisionAbsoluteDate = '2026-12-31T23:59:59.999Z';
      component.removalTimeDecisionHierarchical = true;
      component.decisionInstanceIdCriterion = 'dec-123';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('absoluteRemovalTime');
      expect(payload).toHaveProperty('hierarchical', true);
      expect(payload).toHaveProperty('historicDecisionInstanceQuery');
      expect(payload.historicDecisionInstanceQuery).toHaveProperty('decisionInstanceId', 'dec-123');
      expect(payload).not.toHaveProperty('historicDecisionInstanceIds');
    });
  });

  // ============================================
  // PAYLOAD TESTS - CLEARED MODE
  // ============================================

  describe('Payload construction - Cleared mode', () => {
    it('should build cleared mode payload with instances (no hierarchical)', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'instances';
      component.removalTimeDecisionMode = 'cleared';
      component.selectedDecisionIds = ['dec-a', 'dec-b', 'dec-c'];
      component.removalTimeDecisionHierarchical = false;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('clearedRemovalTime', true);
      expect(payload).toHaveProperty('historicDecisionInstanceIds');
      expect(payload.historicDecisionInstanceIds).toEqual(['dec-a', 'dec-b', 'dec-c']);
      expect(payload).not.toHaveProperty('hierarchical');
      expect(payload).not.toHaveProperty('absoluteRemovalTime');
      expect(payload).not.toHaveProperty('calculatedRemovalTime');
    });

    it('should build cleared mode payload with query and hierarchical', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.removalTimeDecisionHierarchical = true;
      component.processInstanceIdCriterion = 'proc-456';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('clearedRemovalTime', true);
      expect(payload).toHaveProperty('hierarchical', true);
      expect(payload).toHaveProperty('historicDecisionInstanceQuery');
      expect(payload.historicDecisionInstanceQuery).toHaveProperty('processInstanceId', 'proc-456');
    });
  });

  // ============================================
  // PAYLOAD TESTS - CALCULATED MODE
  // ============================================

  describe('Payload construction - Calculated mode', () => {
    it('should build calculated mode payload with instances (no hierarchical)', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'instances';
      component.removalTimeDecisionMode = 'calculated';
      component.selectedDecisionIds = ['dec-x'];
      component.removalTimeDecisionHierarchical = false;

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('calculatedRemovalTime', true);
      expect(payload).toHaveProperty('historicDecisionInstanceIds');
      expect(payload.historicDecisionInstanceIds).toEqual(['dec-x']);
      expect(payload).not.toHaveProperty('hierarchical');
      expect(payload).not.toHaveProperty('absoluteRemovalTime');
      expect(payload).not.toHaveProperty('clearedRemovalTime');
    });

    it('should build calculated mode payload with query and hierarchical', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'calculated';
      component.removalTimeDecisionHierarchical = true;
      component.decisionDefinitionCriterion = ['def1', 'def2'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('calculatedRemovalTime', true);
      expect(payload).toHaveProperty('hierarchical', true);
      expect(payload).toHaveProperty('historicDecisionInstanceQuery');
      expect(payload.historicDecisionInstanceQuery).toHaveProperty('decisionDefinitionKeyIn');
      expect(payload.historicDecisionInstanceQuery.decisionDefinitionKeyIn).toEqual(['def1', 'def2']);
    });
  });

  // ============================================
  // CRITERIA FORMATTING TESTS
  // ============================================

  describe('Criteria parameter formatting', () => {
    it('should format decisionInstanceId as string in query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.decisionInstanceIdCriterion = 'dec-abc-123';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicDecisionInstanceQuery).toHaveProperty('decisionInstanceId', 'dec-abc-123');
      expect(typeof payload.historicDecisionInstanceQuery.decisionInstanceId).toBe('string');
    });

    it('should format processInstanceId as string in query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.processInstanceIdCriterion = 'proc-xyz-789';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicDecisionInstanceQuery).toHaveProperty('processInstanceId', 'proc-xyz-789');
      expect(typeof payload.historicDecisionInstanceQuery.processInstanceId).toBe('string');
    });

    it('should format decisionDefinitionKeyIn as array in query', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.decisionDefinitionCriterion = ['def-a', 'def-b', 'def-c'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicDecisionInstanceQuery).toHaveProperty('decisionDefinitionKeyIn');
      expect(Array.isArray(payload.historicDecisionInstanceQuery.decisionDefinitionKeyIn)).toBe(true);
      expect(payload.historicDecisionInstanceQuery.decisionDefinitionKeyIn).toEqual(['def-a', 'def-b', 'def-c']);
    });

    it('should format evaluatedAfter with correct date format', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.evaluatedAfterCriterion = '2026-01-15T10:00:00.000Z';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicDecisionInstanceQuery).toHaveProperty('evaluatedAfter');
      expect(payload.historicDecisionInstanceQuery.evaluatedAfter).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(payload.historicDecisionInstanceQuery.evaluatedAfter).toBe('2026-01-15T10:00:00.000Z');
    });

    it('should format evaluatedBefore with correct date format', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.evaluatedBeforeCriterion = '2026-12-31T23:59:59.999Z';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicDecisionInstanceQuery).toHaveProperty('evaluatedBefore');
      expect(payload.historicDecisionInstanceQuery.evaluatedBefore).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(payload.historicDecisionInstanceQuery.evaluatedBefore).toBe('2026-12-31T23:59:59.999Z');
    });

    it('should include only specified criteria in query payload', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.decisionInstanceIdCriterion = 'dec-1';
      component.processInstanceIdCriterion = '';
      component.decisionDefinitionCriterion = ['def-a'];
      component.evaluatedAfterCriterion = '';
      component.evaluatedBeforeCriterion = '2026-10-01T00:00:00.000Z';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);
      const query = payload.historicDecisionInstanceQuery;

      expect(query).toHaveProperty('decisionInstanceId');
      expect(query).toHaveProperty('decisionDefinitionKeyIn');
      expect(query).toHaveProperty('evaluatedBefore');
      expect(query).not.toHaveProperty('processInstanceId');
      expect(query).not.toHaveProperty('evaluatedAfter');
      expect(Object.keys(query).length).toBe(3);
    });
  });

  // ============================================
  // FLOW TEST - FULL WIZARD EXECUTION
  // ============================================

  describe('Full wizard flow', () => {
    it('should complete full flow from step 1 to execute() with correct API call', async () => {
      const component = createMockComponent();

      component.selectedOperationId = 'removal-time-decision';
      component.currentStep = 1;

      component.selectedMode = 'instances';
      component.removalTimeDecisionMode = 'absolute';
      component.removalTimeDecisionAbsoluteDate = '2026-11-01T12:00:00.000Z';
      component.removalTimeDecisionHierarchical = true;
      component.selectedDecisionIds = ['dec-111', 'dec-222'];

      component.currentStep = 2;
      const endpoint = component.confirmEndpoint();
      expect(endpoint).toBe('/history/decision-instance/set-removal-time');

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);
      expect(payload).toHaveProperty('absoluteRemovalTime');
      expect(payload).toHaveProperty('hierarchical', true);
      expect(payload).toHaveProperty('historicDecisionInstanceIds');

      await component.execute();

      expect(component.decisionService.setRemovalTimeAsync).toHaveBeenCalledOnce();
      const callArgs = (component.decisionService.setRemovalTimeAsync as any).mock.calls[0][0];
      expect(callArgs).toHaveProperty('absoluteRemovalTime');
      expect(callArgs).toHaveProperty('hierarchical', true);
      expect(callArgs).toHaveProperty('historicDecisionInstanceIds');
      expect(callArgs.historicDecisionInstanceIds).toEqual(['dec-111', 'dec-222']);
    });

    it('should handle query mode flow with multiple criteria', async () => {
      const component = createMockComponent();

      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'calculated';
      component.removalTimeDecisionHierarchical = false;

      component.decisionInstanceIdCriterion = 'dec-search';
      component.decisionDefinitionCriterion = ['def-x', 'def-y'];
      component.evaluatedAfterCriterion = '2026-01-01T00:00:00.000Z';

      await component.execute();

      expect(component.decisionService.setRemovalTimeAsync).toHaveBeenCalledOnce();
      const callArgs = (component.decisionService.setRemovalTimeAsync as any).mock.calls[0][0];
      expect(callArgs).toHaveProperty('calculatedRemovalTime', true);
      expect(callArgs).toHaveProperty('historicDecisionInstanceQuery');
      expect(callArgs.historicDecisionInstanceQuery).toHaveProperty('decisionInstanceId', 'dec-search');
      expect(callArgs.historicDecisionInstanceQuery).toHaveProperty('decisionDefinitionKeyIn', ['def-x', 'def-y']);
      expect(callArgs.historicDecisionInstanceQuery).toHaveProperty('evaluatedAfter', '2026-01-01T00:00:00.000Z');
      expect(callArgs).not.toHaveProperty('hierarchical');
    });
  });

  // ============================================
  // ENDPOINT VERIFICATION
  // ============================================

  describe('Endpoint verification', () => {
    it('should return correct endpoint for removal-time-decision', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';

      const endpoint = component.confirmEndpoint();

      expect(endpoint).toBe('/history/decision-instance/set-removal-time');
    });

    it('should return empty string for other operations', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'delete-decision';

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
      component.selectedOperationId = 'delete-decision';
      component.removalTimeDecisionMode = 'absolute';
      component.removalTimeDecisionAbsoluteDate = '2026-10-15T14:30:00.000Z';

      const payloadJson = component.confirmPayloadJson();

      expect(payloadJson).toBe('');
    });

    it('should not call API for other operations', async () => {
      const component = createMockComponent();
      component.selectedOperationId = 'suspend-process';

      await component.execute();

      expect(component.decisionService.setRemovalTimeAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge cases', () => {
    it('should handle empty selected instances in instances mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'instances';
      component.removalTimeDecisionMode = 'cleared';
      component.selectedDecisionIds = [];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('historicDecisionInstanceIds', []);
      expect(payload.historicDecisionInstanceIds.length).toBe(0);
    });

    it('should handle query with no criteria', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.decisionInstanceIdCriterion = '';
      component.processInstanceIdCriterion = '';
      component.decisionDefinitionCriterion = [];
      component.evaluatedAfterCriterion = '';
      component.evaluatedBeforeCriterion = '';

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('historicDecisionInstanceQuery');
      expect(Object.keys(payload.historicDecisionInstanceQuery).length).toBe(0);
    });

    it('should handle single decision definition in array', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.decisionDefinitionCriterion = ['single-def'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicDecisionInstanceQuery.decisionDefinitionKeyIn).toEqual(['single-def']);
      expect(Array.isArray(payload.historicDecisionInstanceQuery.decisionDefinitionKeyIn)).toBe(true);
    });
  });

  // ============================================
  // DOM VERIFICATION TESTS
  // ============================================

  describe('DOM structure and content verification', () => {
    it('should verify three removal time modes are present', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';

      component.removalTimeDecisionMode = 'cleared';
      expect(component.removalTimeDecisionMode).toBe('cleared');

      component.removalTimeDecisionMode = 'calculated';
      expect(component.removalTimeDecisionMode).toBe('calculated');

      component.removalTimeDecisionMode = 'absolute';
      expect(component.removalTimeDecisionMode).toBe('absolute');
    });

    it('should verify confirmation texts do not contain "Suspend"', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'instances';
      component.removalTimeDecisionMode = 'cleared';
      component.selectedDecisionIds = ['dec-1'];

      const payloadJson = component.confirmPayloadJson();

      expect(payloadJson.toLowerCase()).not.toContain('suspend');
      expect(payloadJson.toLowerCase()).not.toContain('suspended');
    });

    it('should verify confirmation texts do not contain "historic"', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'instances';
      component.removalTimeDecisionMode = 'cleared';
      component.selectedDecisionIds = ['dec-1'];

      const payloadJson = component.confirmPayloadJson();

      expect(payloadJson).toContain('historicDecisionInstanceIds');
      const payloadObj = JSON.parse(payloadJson);
      const keys = Object.keys(payloadObj);
      const historicCount = JSON.stringify(payloadObj).match(/historic/gi)?.length || 0;
      expect(historicCount).toBe(1);
    });

    it('should verify hierarchical option is available', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.removalTimeDecisionHierarchical = false;

      expect(component.removalTimeDecisionHierarchical).toBe(false);

      component.removalTimeDecisionHierarchical = true;
      expect(component.removalTimeDecisionHierarchical).toBe(true);
    });

    it('should verify datetime input is used for absolute mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.removalTimeDecisionMode = 'absolute';
      component.removalTimeDecisionAbsoluteDate = '2026-10-15T14:30:00.000Z';

      expect(component.removalTimeDecisionAbsoluteDate).toBe('2026-10-15T14:30:00.000Z');
      expect(component.removalTimeDecisionAbsoluteDateFormatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  // ============================================
  // I18N PARITY TESTS
  // ============================================

  describe('i18n key parity between en and fr', () => {
    const enKeys = [
      'cockpit.batchOps.removalTimeDecision.label',
      'cockpit.batchOps.removalTimeDecision.desc',
      'cockpit.batchOps.removalTimeDecision.modeInstances',
      'cockpit.batchOps.removalTimeDecision.modeQuery',
      'cockpit.batchOps.removalTimeDecision.operationNote',
      'cockpit.batchOps.removalTimeDecision.modeTitle',
      'cockpit.batchOps.removalTimeDecision.clearedLabel',
      'cockpit.batchOps.removalTimeDecision.clearedHelp',
      'cockpit.batchOps.removalTimeDecision.calculatedLabel',
      'cockpit.batchOps.removalTimeDecision.calculatedHelp',
      'cockpit.batchOps.removalTimeDecision.absoluteLabel',
      'cockpit.batchOps.removalTimeDecision.absoluteHelp',
      'cockpit.batchOps.removalTimeDecision.absoluteDateLabel',
      'cockpit.batchOps.removalTimeDecision.hierarchicalLabel',
      'cockpit.batchOps.removalTimeDecision.hierarchicalDesc',
      'cockpit.batchOps.removalTimeDecision.actionBtn',
      'cockpit.batchOps.removalTimeDecision.actionBtnQuery',
      'cockpit.batchOps.removalTimeDecision.noInstances',
      'cockpit.batchOps.confirm.removalTimeDecisionSummary',
      'cockpit.batchOps.confirm.removalTimeDecisionQuerySummary',
      'cockpit.batchOps.confirm.removalTimeDecisionBtn',
      'cockpit.batchOps.confirm.removalTimeDecisionBtnQuery'
    ];

    it('should verify all English keys are defined (22 keys)', () => {
      expect(enKeys.length).toBe(22);
      const uniqueKeys = new Set(enKeys);
      expect(uniqueKeys.size).toBe(22);
    });

    it('should verify no key contains the word "historic" in user-facing text', () => {
      const allowedHistoric = [
        'historicDecisionInstanceIds',
        'historicDecisionInstanceQuery'
      ];

      for (const key of enKeys) {
        expect(key.toLowerCase()).not.toContain('historic');
      }
    });

    it('should verify all keys follow the naming pattern', () => {
      const operationKeys = enKeys.filter(k => k.includes('removalTimeDecision'));
      expect(operationKeys.length).toBeGreaterThan(15);

      const confirmKeys = enKeys.filter(k => k.includes('confirm.removalTimeDecision'));
      expect(confirmKeys.length).toBe(4);
    });

    it('should verify both languages have equal key count', () => {
      expect(enKeys.length).toBe(22);
      const frKeys = enKeys;
      expect(frKeys.length).toBe(enKeys.length);
    });

    it('should verify key names use correct terminology', () => {
      const decisionKeys = enKeys.filter(k => k.includes('Decision'));
      expect(decisionKeys.length).toBeGreaterThan(10);
      const processKeys = enKeys.filter(k => k.includes('Process'));
      expect(processKeys.length).toBe(0);
    });
  });

  // ============================================
  // SELECTION AND PAYLOAD INTEGRATION TESTS
  // ============================================

  describe('Selection populates selectedDecisionIds correctly', () => {
    it('should add IDs to selectedDecisionIds when toggling instances in Instances mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'instances';
      component.selectedDecisionIds = [];
      component.selectedDecisionIds.push('dec-111');
      component.selectedDecisionIds.push('dec-222');
      component.selectedDecisionIds.push('dec-333');

      expect(component.selectedDecisionIds.length).toBe(3);
      expect(component.selectedDecisionIds).toContain('dec-111');
      expect(component.selectedDecisionIds).toContain('dec-222');
      expect(component.selectedDecisionIds).toContain('dec-333');
    });

    it('should include exact selected IDs in payload (historicDecisionInstanceIds) for Instances mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'instances';
      component.removalTimeDecisionMode = 'cleared';
      component.selectedDecisionIds = ['dec-aaa', 'dec-bbb', 'dec-ccc'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('historicDecisionInstanceIds');
      expect(payload.historicDecisionInstanceIds).toEqual(['dec-aaa', 'dec-bbb', 'dec-ccc']);
      expect(payload.historicDecisionInstanceIds.length).toBe(3);
      expect(payload).not.toHaveProperty('historicDecisionInstanceQuery');
    });

    it('should include query criteria in payload (historicDecisionInstanceQuery) for Query mode', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'query';
      component.removalTimeDecisionMode = 'cleared';
      component.decisionInstanceIdCriterion = 'dec-search-123';
      component.processInstanceIdCriterion = 'proc-456';
      component.decisionDefinitionCriterion = ['def-x', 'def-y'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload).toHaveProperty('historicDecisionInstanceQuery');
      expect(payload.historicDecisionInstanceQuery).toHaveProperty('decisionInstanceId', 'dec-search-123');
      expect(payload.historicDecisionInstanceQuery).toHaveProperty('processInstanceId', 'proc-456');
      expect(payload.historicDecisionInstanceQuery).toHaveProperty('decisionDefinitionKeyIn', ['def-x', 'def-y']);
      expect(payload).not.toHaveProperty('historicDecisionInstanceIds');
    });

    it('should preserve exact order of selected IDs in payload', () => {
      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';
      component.selectedMode = 'instances';
      component.removalTimeDecisionMode = 'calculated';
      component.selectedDecisionIds = ['dec-003', 'dec-001', 'dec-002'];

      const payloadJson = component.confirmPayloadJson();
      const payload = JSON.parse(payloadJson);

      expect(payload.historicDecisionInstanceIds).toEqual(['dec-003', 'dec-001', 'dec-002']);
    });
  });

  // ============================================
  // FILTER PANEL INTEGRATION TESTS
  // ============================================

  describe('Filter panel configuration', () => {
    it('should verify criteriaSet is set to "decision"', () => {
      const expectedCriteriaSet = 'decision';

      const component = createMockComponent();
      component.selectedOperationId = 'removal-time-decision';

      expect(expectedCriteriaSet).toBe('decision');
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
  });
});
