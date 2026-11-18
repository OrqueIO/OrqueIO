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

import { Variable } from '../../../../services/cockpit.service';
import { llmTaskRecords, parseLlmTaskRecord } from './llm-task-records';

const variable = (name: string, value: unknown, type = 'String'): Variable =>
  ({ name, type, value, processInstanceId: 'pi-1' });

// As LlmTaskAuditor writes it, without content
const RECORD = {
  provider: 'openai',
  model: 'gpt-4o-mini-2024-07-18',
  promptVersion: '3f2a9c1e0b7d4a6f',
  inputTokens: 412,
  outputTokens: 27,
  latencyMs: 930,
  fromCache: false,
  outcome: 'VALID',
  recordedAt: '2026-11-18T09:30:00Z'
};

describe('LLM task records', () => {

  it('should read a record as the AI starter writes it', () => {
    const record = parseLlmTaskRecord(variable('orqueioLlm_Task_Triage', JSON.stringify(RECORD)));

    expect(record).toEqual({
      variableName: 'orqueioLlm_Task_Triage',
      activityId: 'Task_Triage',
      readable: true,
      raw: JSON.stringify(RECORD),
      ...RECORD,
      prompt: undefined,
      answer: undefined,
      truncated: false
    });
  });

  it('should read the prompt and the answer when they were recorded, and whether they were shortened', () => {
    const record = parseLlmTaskRecord(variable('orqueioLlm_Task_Triage',
      JSON.stringify({ ...RECORD, prompt: 'Classify <claimText>', answer: '{"category":"water"}', truncated: true })));

    expect(record.prompt).toBe('Classify <claimText>');
    expect(record.answer).toBe('{"category":"water"}');
    expect(record.truncated).toBe(true);
  });

  it('should keep unknown token counts apart from a reused answer that cost nothing', () => {
    const unknown = parseLlmTaskRecord(variable('orqueioLlm_A', JSON.stringify({ ...RECORD, inputTokens: null, outputTokens: null })));
    const reused = parseLlmTaskRecord(variable('orqueioLlm_B', JSON.stringify({ ...RECORD, inputTokens: 0, outputTokens: 0, fromCache: true })));

    expect(unknown.inputTokens).toBeNull();
    expect(unknown.outputTokens).toBeNull();
    expect(reused.inputTokens).toBe(0);
    expect(reused.fromCache).toBe(true);
  });

  it('should read a record already parsed into an object', () => {
    const record = parseLlmTaskRecord(variable('orqueioLlm_Task_Triage', RECORD, 'Json'));

    expect(record.readable).toBe(true);
    expect(record.model).toBe(RECORD.model);
  });

  it('should keep the raw value of a record that cannot be read', () => {
    for (const value of ['not json', '[1,2]', '"text"', '{"outcome":', null]) {
      const record = parseLlmTaskRecord(variable('orqueioLlm_Task_Triage', value));

      expect(record.readable).toBe(false);
      expect(record.activityId).toBe('Task_Triage');
      expect(record.raw).toBe(value ?? '');
    }
  });

  it('should ignore fields of the wrong type', () => {
    const record = parseLlmTaskRecord(variable('orqueioLlm_A',
      JSON.stringify({ model: 42, inputTokens: '412', latencyMs: 'slow', fromCache: 'yes', outcome: ['VALID'] })));

    expect(record.readable).toBe(true);
    expect(record.model).toBeUndefined();
    expect(record.inputTokens).toBeUndefined();
    expect(record.latencyMs).toBeUndefined();
    expect(record.fromCache).toBe(false);
    expect(record.outcome).toBeUndefined();
  });

  it('should pick only the record variables, in the order they were written', () => {
    const records = llmTaskRecords([
      variable('claimText', 'My basement is flooded'),
      variable('orqueioLlm_Task_Second', JSON.stringify({ ...RECORD, recordedAt: '2026-11-18T09:31:00Z' })),
      variable('orqueioLlm_', '{}'),
      variable('orqueioLlm_Task_Broken', 'not json'),
      variable('orqueioLlm_Task_First', JSON.stringify(RECORD)),
      variable('category', 'water')
    ]);

    expect(records.map(record => record.activityId)).toEqual(['Task_First', 'Task_Second', 'Task_Broken']);
  });
});
