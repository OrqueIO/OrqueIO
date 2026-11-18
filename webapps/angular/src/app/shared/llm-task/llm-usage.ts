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

export interface LlmUsageDay {
  /** The local day, as YYYY-MM-DD. */
  date: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmUsageProcess {
  processDefinitionKey: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

/** What the LLM tasks used over a period, from their records. */
export interface LlmUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  /** Calls whose answer was invalid, so the task threw its BPMN error. */
  invalidAnswers: number;
  /** Calls answered from an earlier call of the same request, which cost nothing. */
  reusedAnswers: number;
  /** Over the calls that reported a latency; null when none did. */
  averageLatencyMs: number | null;
  /** One entry per day of the period, oldest first, including days without calls. */
  days: LlmUsageDay[];
  /** The processes that called a model, the most tokens first. */
  processes: LlmUsageProcess[];
}

function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${ date.getFullYear() }-${ month }-${ day }`;
}

/**
 * Sums the readable records written during the last {@code days} days, today included.
 * Unknown token counts (a provider that reports none) count as 0.
 */
export function summarizeLlmUsage(records: LlmTaskRecord[], days: number, now: Date = new Date()): LlmUsage {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));

  const byDay = new Map<string, LlmUsageDay>();
  for (let i = 0; i < days; i++) {
    const date = localDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    byDay.set(date, { date, calls: 0, inputTokens: 0, outputTokens: 0 });
  }

  const byProcess = new Map<string, LlmUsageProcess>();
  const usage: LlmUsage = {
    calls: 0, inputTokens: 0, outputTokens: 0, invalidAnswers: 0, reusedAnswers: 0,
    averageLatencyMs: null, days: [], processes: []
  };
  let latencySum = 0;
  let latencyCount = 0;

  for (const record of records) {
    const time = record.readable && record.recordedAt ? new Date(record.recordedAt) : null;
    // No upper bound: the server clock may run ahead of the browser's
    if (!time || isNaN(time.getTime()) || time < start) {
      continue;
    }

    const input = record.inputTokens ?? 0;
    const output = record.outputTokens ?? 0;

    usage.calls++;
    usage.inputTokens += input;
    usage.outputTokens += output;
    if (record.outcome === 'BPMN_ERROR') {
      usage.invalidAnswers++;
    }
    if (record.fromCache) {
      usage.reusedAnswers++;
    }
    if (record.latencyMs !== undefined) {
      latencySum += record.latencyMs;
      latencyCount++;
    }

    const day = byDay.get(localDay(time));
    if (day) {
      day.calls++;
      day.inputTokens += input;
      day.outputTokens += output;
    }

    const key = record.processDefinitionKey || '-';
    const process = byProcess.get(key) ?? { processDefinitionKey: key, calls: 0, inputTokens: 0, outputTokens: 0 };
    process.calls++;
    process.inputTokens += input;
    process.outputTokens += output;
    byProcess.set(key, process);
  }

  usage.averageLatencyMs = latencyCount > 0 ? Math.round(latencySum / latencyCount) : null;
  usage.days = [...byDay.values()];
  usage.processes = [...byProcess.values()].sort((a, b) =>
    (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens)
    || b.calls - a.calls
    || a.processDefinitionKey.localeCompare(b.processDefinitionKey));

  return usage;
}
