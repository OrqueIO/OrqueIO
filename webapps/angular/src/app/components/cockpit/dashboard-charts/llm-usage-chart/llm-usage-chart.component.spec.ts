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
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Action } from '@ngrx/store';

// chart.js cannot draw in jsdom: record what the card asks of it
const charts = vi.hoisted(() => [] as any[]);
vi.mock('chart.js/auto', () => ({
  default: class {
    data: any;
    update = vi.fn();
    destroy = vi.fn();
    constructor(_ctx: unknown, config: any) {
      this.data = config.data;
      charts.push(this);
    }
  }
}));

import { LlmUsageChartComponent } from './llm-usage-chart.component';
import { LLM_USAGE_MAX_RECORDS, LlmUsageService } from '../../../../shared/llm-task/llm-usage.service';
import { ProcessInstanceService, Variable } from '../../../../services/process-instance.service';
import * as DashboardActions from '../../../../store/cockpit/dashboard/dashboard.actions';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('LlmUsageChartComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let fixture: ComponentFixture<LlmUsageChartComponent>;
  let actions$: Subject<Action>;
  let service: {
    getLlmTaskRecordUpdates: ReturnType<typeof vi.fn>;
    getLlmTaskRecordVariables: ReturnType<typeof vi.fn>;
  };

  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();
  let next = 0;
  const record = (processDefinitionKey: string, fields: Record<string, unknown>): Variable => ({
    name: 'orqueioLlm_Task_' + next++, type: 'String',
    processInstanceId: 'pi-1', processDefinitionKey,
    value: JSON.stringify({
      provider: 'ollama', model: 'qwen2.5:7b', inputTokens: 250, outputTokens: 30, latencyMs: 2000,
      fromCache: false, outcome: 'VALID', recordedAt: hoursAgo(1), ...fields
    })
  } as Variable);

  async function create(updates: Observable<Variable[]>, latest: Observable<Variable[]> = of([])): Promise<HTMLElement> {
    charts.length = 0;
    actions$ = new Subject<Action>();
    service = {
      getLlmTaskRecordUpdates: vi.fn().mockReturnValue(updates),
      getLlmTaskRecordVariables: vi.fn().mockReturnValue(latest)
    };
    await TestBed.configureTestingModule({
      imports: [LlmUsageChartComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideMockActions(() => actions$),
        LlmUsageService,
        { provide: ProcessInstanceService, useValue: service }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LlmUsageChartComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  const kpis = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('.llm-kpi__value')).map(kpi => kpi.textContent!.trim());

  it('should read the records of the last 30 days, newest first, at most the limit', async () => {
    await create(of([]));

    const [since, max] = service.getLlmTaskRecordUpdates.mock.calls[0];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    expect(since).toEqual(start);
    expect(max).toBe(LLM_USAGE_MAX_RECORDS);
  });

  it('should stay hidden while loading, and while no LLM task has run', async () => {
    const pending = new Subject<Variable[]>();
    const root = await create(pending);

    expect(fixture.componentInstance.loadingState).toBe('loading');
    expect(root.hasAttribute('hidden')).toBe(true);

    pending.next([]);
    fixture.detectChanges();
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
    expect(root.querySelector('.llm-note')!.textContent!.trim()).toBe('cockpit.charts.llmUsage.note');

    const rows = Array.from(root.querySelectorAll('.llm-processes tbody tr'))
      .map(row => Array.from(row.querySelectorAll('td')).map(td => td.textContent!.trim()));
    expect(rows).toEqual([['invoice', '1', '1,100'], ['claimTriage', '2', '560']]);
  });

  it('should count every execution of a task, such as a loop', async () => {
    // The variable updates hold one record per execution, under the same variable name
    const loop = [record('claimTriage', {}), record('claimTriage', {}), record('claimTriage', {})]
      .map(variable => ({ ...variable, name: 'orqueioLlm_Task_Loop' }));
    const root = await create(of(loop));

    expect(kpis(root)[0]).toBe('3');
  });

  it('should include older calls when a longer period is chosen', async () => {
    const root = await create(of([record('claimTriage', {}), record('claimTriage', { recordedAt: hoursAgo(24 * 10) })]));

    const buttons = Array.from(root.querySelectorAll('.period-btn')) as HTMLButtonElement[];
    expect(buttons.length).toBe(3);
    buttons[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.days).toBe(14);
    expect(kpis(root)[0]).toBe('2');
  });

  it('should fall back to the latest record of each task below history level full, and say so', async () => {
    const root = await create(of([]), of([record('claimTriage', {})]));

    expect(service.getLlmTaskRecordVariables).toHaveBeenCalledWith(LLM_USAGE_MAX_RECORDS);
    expect(kpis(root)[0]).toBe('1');
    expect(root.querySelector('.llm-note')!.textContent!.trim()).toBe('cockpit.charts.llmUsage.noteLatestOnly');
  });

  it('should say when more records may exist than were read', async () => {
    const many = Array.from({ length: LLM_USAGE_MAX_RECORDS }, () => record('claimTriage', {}));
    const root = await create(of(many));

    expect(fixture.componentInstance.limited).toBe(true);
    expect(service.getLlmTaskRecordVariables).not.toHaveBeenCalled();
    expect(root.querySelector('.llm-note')!.textContent!.trim()).toBe('cockpit.charts.llmUsage.noteLimited');
  });

  it('should show an error when the records cannot be loaded', async () => {
    const root = await create(throwError(() => new Error('403')));

    expect(fixture.componentInstance.loadingState).toBe('error');
    expect(fixture.componentInstance.error).toBe('cockpit.charts.llmUsage.error');
    expect(root.hasAttribute('hidden')).toBe(false);
  });

  it('should reload when the dashboard refreshes its charts', async () => {
    await create(of([record('claimTriage', {})]));
    expect(service.getLlmTaskRecordUpdates).toHaveBeenCalledTimes(1);

    actions$.next(DashboardActions.refreshAllCharts());

    expect(service.getLlmTaskRecordUpdates).toHaveBeenCalledTimes(2);
  });

  describe('the chart', () => {
    const proto = HTMLCanvasElement.prototype as any;
    let getContext: unknown;
    beforeAll(() => {
      getContext = proto.getContext;
      proto.getContext = () => ({});
    });
    afterAll(() => {
      proto.getContext = getContext;
    });

    const drawn = () => new Promise(resolve => setTimeout(resolve));

    it('should draw the input and output tokens of each day, update them, and be destroyed with the card', async () => {
      await create(of([record('claimTriage', {})]));
      await drawn();

      expect(charts.length).toBe(1);
      const chart = charts[0];
      expect(chart.data.labels.length).toBe(7);
      expect(chart.data.datasets[0].data[6]).toBe(250);
      expect(chart.data.datasets[1].data[6]).toBe(30);

      fixture.componentInstance.onPeriodChange(30);
      await drawn();
      expect(charts.length).toBe(1);
      expect(chart.data.labels.length).toBe(30);
      expect(chart.update).toHaveBeenCalled();

      fixture.destroy();
      expect(chart.destroy).toHaveBeenCalled();
    });

    it('should not draw once the card is destroyed', async () => {
      await create(of([record('claimTriage', {})]));
      fixture.destroy();
      await drawn();

      expect(charts.length).toBe(0);
    });
  });
});
