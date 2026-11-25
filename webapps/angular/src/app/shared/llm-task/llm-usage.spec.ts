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

import { LlmTaskRecord } from './llm-task-records';
import { summarizeLlmUsage } from './llm-usage';

// Local times, so the days do not depend on the machine's time zone
const NOW = new Date(2026, 10, 18, 15, 0, 0);
const at = (day: number, hour = 10) => new Date(2026, 10, day, hour, 0, 0).toISOString();

let next = 0;
const record = (fields: Partial<LlmTaskRecord>): LlmTaskRecord => ({
  variableName: 'orqueioLlm_Task_' + next,
  activityId: 'Task_' + next++,
  processDefinitionKey: 'claimTriage',
  readable: true,
  raw: '{}',
  inputTokens: 100,
  outputTokens: 20,
  latencyMs: 1000,
  fromCache: false,
  outcome: 'VALID',
  recordedAt: at(18),
  ...fields
});

describe('summarizeLlmUsage', () => {

  it('should sum the calls, tokens, invalid and reused answers of the period', () => {
    const usage = summarizeLlmUsage([
      record({}),
      record({ recordedAt: at(16), outcome: 'BPMN_ERROR', latencyMs: 3000 }),
      record({ recordedAt: at(12), inputTokens: 0, outputTokens: 0, fromCache: true, latencyMs: 2000 })
    ], 7, NOW);

    expect(usage.calls).toBe(3);
    expect(usage.inputTokens).toBe(200);
    expect(usage.outputTokens).toBe(40);
    expect(usage.invalidAnswers).toBe(1);
    expect(usage.reusedAnswers).toBe(1);
    expect(usage.averageLatencyMs).toBe(2000);
  });

  it('should give one entry per day of the period, today included, with days without calls', () => {
    const usage = summarizeLlmUsage([record({}), record({ recordedAt: at(18, 9) }), record({ recordedAt: at(14) })], 7, NOW);

    expect(usage.days.map(day => day.date)).toEqual([
      '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'
    ]);
    expect(usage.days.map(day => day.calls)).toEqual([0, 0, 1, 0, 0, 0, 2]);
    expect(usage.days[6]).toEqual({ date: '2026-11-18', calls: 2, inputTokens: 200, outputTokens: 40 });
  });

  it('should leave out records outside the period, unreadable or without a date', () => {
    const usage = summarizeLlmUsage([
      record({ recordedAt: at(11, 23) }),
      record({ recordedAt: at(12, 0) }),
      record({ readable: false }),
      record({ recordedAt: undefined }),
      record({ recordedAt: 'not a date' })
    ], 7, NOW);

    expect(usage.calls).toBe(1);
  });

  it('should count a record dated a little after the browser clock, written by a server ahead of it', () => {
    const usage = summarizeLlmUsage([record({ recordedAt: new Date(NOW.getTime() + 60000).toISOString() })], 7, NOW);

    expect(usage.calls).toBe(1);
    expect(usage.days[6].calls).toBe(1);
  });

  it('should count unknown token counts as 0, and give no average latency without one', () => {
    const usage = summarizeLlmUsage([record({ inputTokens: null, outputTokens: undefined, latencyMs: undefined })], 7, NOW);

    expect(usage.calls).toBe(1);
    expect(usage.inputTokens).toBe(0);
    expect(usage.outputTokens).toBe(0);
    expect(usage.averageLatencyMs).toBeNull();
  });

  it('should list the processes, the most tokens first', () => {
    const usage = summarizeLlmUsage([
      record({ processDefinitionKey: 'small', inputTokens: 10, outputTokens: 1 }),
      record({ processDefinitionKey: 'big', inputTokens: 500, outputTokens: 50 }),
      record({ processDefinitionKey: 'big', inputTokens: 500, outputTokens: 50 }),
      record({ processDefinitionKey: undefined, inputTokens: 1, outputTokens: 0 })
    ], 7, NOW);

    expect(usage.processes).toEqual([
      { processDefinitionKey: 'big', calls: 2, inputTokens: 1000, outputTokens: 100 },
      { processDefinitionKey: 'small', calls: 1, inputTokens: 10, outputTokens: 1 },
      { processDefinitionKey: '-', calls: 1, inputTokens: 1, outputTokens: 0 }
    ]);
  });

  it('should give an empty summary without records', () => {
    const usage = summarizeLlmUsage([], 7, NOW);

    expect(usage.calls).toBe(0);
    expect(usage.days.length).toBe(7);
    expect(usage.processes).toEqual([]);
  });
});
