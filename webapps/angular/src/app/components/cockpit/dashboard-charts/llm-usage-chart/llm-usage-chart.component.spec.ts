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

import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LlmUsageChartComponent, LLM_USAGE_MAX_RECORDS } from './llm-usage-chart.component';
import { ProcessInstanceService, Variable } from '../../../../services/process-instance.service';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('LlmUsageChartComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let fixture: ComponentFixture<LlmUsageChartComponent>;
  let service: { getLlmTaskRecordVariables: ReturnType<typeof vi.fn> };

  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const record = (processDefinitionKey: string, fields: Record<string, unknown>): Variable => ({
    name: 'orqueioLlm_Task_' + Math.random().toString(36).slice(2), type: 'String',
    processInstanceId: 'pi-1', processDefinitionKey,
    value: JSON.stringify({
      provider: 'ollama', model: 'qwen2.5:7b', inputTokens: 250, outputTokens: 30, latencyMs: 2000,
      fromCache: false, outcome: 'VALID', recordedAt: hoursAgo(1), ...fields
    })
  } as Variable);

  async function create(result: ReturnType<typeof of>): Promise<HTMLElement> {
    service = { getLlmTaskRecordVariables: vi.fn().mockReturnValue(result) };
    await TestBed.configureTestingModule({
      imports: [LlmUsageChartComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ProcessInstanceService, useValue: service }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LlmUsageChartComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  const kpis = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('.llm-kpi__value')).map(kpi => kpi.textContent!.trim());

  it('should stay hidden while no LLM task has ever run', async () => {
    const root = await create(of([]));

    expect(service.getLlmTaskRecordVariables).toHaveBeenCalledWith(LLM_USAGE_MAX_RECORDS);
    expect(root.hasAttribute('hidden')).toBe(true);
  });

  it('should show the calls, tokens, invalid answers and average latency of the last 7 days', async () => {
    const root = await create(of([
      record('claimTriage', {}),
      record('claimTriage', { outcome: 'BPMN_ERROR', latencyMs: 4000 }),
      record('invoice', { inputTokens: 1000, outputTokens: 100 }),
      record('invoice', { recordedAt: hoursAgo(24 * 10) })
    ]));

    expect(root.hasAttribute('hidden')).toBe(false);
    expect(kpis(root)).toEqual(['3', '1,500', '160', '1', '2.7 s']);
    expect(root.querySelector('.llm-kpi--warning')).not.toBeNull();

    const rows = Array.from(root.querySelectorAll('.llm-processes tbody tr'))
      .map(row => Array.from(row.querySelectorAll('td')).map(td => td.textContent!.trim()));
    expect(rows).toEqual([['invoice', '1', '1,100'], ['claimTriage', '2', '560']]);
  });

  it('should include older calls when a longer period is chosen', async () => {
    const root = await create(of([record('claimTriage', {}), record('claimTriage', { recordedAt: hoursAgo(24 * 10) })]));

    const buttons = Array.from(root.querySelectorAll('.period-btn')) as HTMLButtonElement[];
    expect(buttons.map(button => button.textContent!.trim())).toEqual([
      'cockpit.charts.llmUsage.days', 'cockpit.charts.llmUsage.days', 'cockpit.charts.llmUsage.days'
    ]);
    buttons[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.days).toBe(14);
    expect(kpis(root)[0]).toBe('2');
  });

  it('should say when more records may exist than were read', async () => {
    const many = Array.from({ length: LLM_USAGE_MAX_RECORDS }, () => record('claimTriage', {}));
    const root = await create(of(many));

    expect(fixture.componentInstance.limited).toBe(true);
    expect(root.querySelector('.llm-note')!.textContent!.trim()).toBe('cockpit.charts.llmUsage.noteLimited');
  });

  it('should show an error when the records cannot be loaded', async () => {
    const root = await create(throwError(() => new Error('403')));

    expect(fixture.componentInstance.loadingState).toBe('error');
    expect(fixture.componentInstance.error).toBe('cockpit.charts.llmUsage.error');
    expect(root.hasAttribute('hidden')).toBe(false);
  });
});
