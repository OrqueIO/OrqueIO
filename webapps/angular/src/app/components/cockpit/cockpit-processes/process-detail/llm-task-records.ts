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

/**
 * The prefix of the process variables in which the AI starter records each LLM task
 * execution, followed by the task's activity id (LlmTaskAuditor in starter-ai).
 */
export const LLM_RECORD_PREFIX = 'orqueioLlm_';

/** What an LLM task execution used and cost, read from its record variable. */
export interface LlmTaskRecord {
  /** The record variable's name. */
  variableName: string;
  /** The id of the LLM task that wrote the record. */
  activityId: string;
  /** False when the record is not the expected JSON: only {@link raw} is then set. */
  readable: boolean;
  /** The variable's value as stored. */
  raw: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
  /** Null when the provider reported no usage, 0 for a reused answer. */
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number;
  /** Whether the answer was reused from an earlier call of the same request. */
  fromCache?: boolean;
  /** VALID or BPMN_ERROR. */
  outcome?: string;
  recordedAt?: string;
  /** Only recorded when the starter is configured to include content. */
  prompt?: string;
  answer?: string;
  /** Whether the prompt or the answer were shortened to fit the variable. */
  truncated?: boolean;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function count(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }
  return typeof value === 'number' && isFinite(value) ? value : undefined;
}

/**
 * Reads one record variable. A value that is not the expected JSON object gives a record
 * that is not readable, so the view can still show the raw value.
 */
export function parseLlmTaskRecord(variable: Variable): LlmTaskRecord {
  const raw = typeof variable.value === 'string'
    ? variable.value
    : variable.value === null || variable.value === undefined ? '' : JSON.stringify(variable.value);

  const record: LlmTaskRecord = {
    variableName: variable.name,
    activityId: variable.name.substring(LLM_RECORD_PREFIX.length),
    readable: false,
    raw
  };

  let json: unknown;
  try {
    json = typeof variable.value === 'string' ? JSON.parse(variable.value) : variable.value;
  } catch {
    return record;
  }

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return record;
  }

  const data = json as Record<string, unknown>;

  return {
    ...record,
    readable: true,
    provider: text(data['provider']),
    model: text(data['model']),
    promptVersion: text(data['promptVersion']),
    inputTokens: count(data['inputTokens']),
    outputTokens: count(data['outputTokens']),
    latencyMs: count(data['latencyMs']) ?? undefined,
    fromCache: data['fromCache'] === true,
    outcome: text(data['outcome']),
    recordedAt: text(data['recordedAt']),
    prompt: text(data['prompt']),
    answer: text(data['answer']),
    truncated: data['truncated'] === true
  };
}

/**
 * The LLM task records among a process instance's variables, in the order they were
 * written; records without a date come last, by activity id.
 */
export function llmTaskRecords(variables: Variable[]): LlmTaskRecord[] {
  return variables
    .filter(variable => variable.name.startsWith(LLM_RECORD_PREFIX) && variable.name.length > LLM_RECORD_PREFIX.length)
    .map(parseLlmTaskRecord)
    .sort((a, b) => {
      if (a.recordedAt && b.recordedAt && a.recordedAt !== b.recordedAt) {
        return a.recordedAt < b.recordedAt ? -1 : 1;
      }
      if (!a.recordedAt !== !b.recordedAt) {
        return a.recordedAt ? -1 : 1;
      }
      return a.activityId.localeCompare(b.activityId);
    });
}
