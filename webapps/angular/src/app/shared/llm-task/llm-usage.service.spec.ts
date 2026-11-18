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

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of, Subject, throwError } from 'rxjs';

import { ProcessInstanceService, Variable } from '../../services/process-instance.service';
import * as DashboardActions from '../../store/cockpit/dashboard/dashboard.actions';
import { initTestEnvironment } from '../../testing/test-utils';
import { LLM_USAGE_MAX_RECORDS, LlmUsageService } from './llm-usage.service';

describe('LlmUsageService', () => {
  beforeAll(() => { initTestEnvironment(); });

  let actions$: Subject<Action>;
  let processInstanceService: {
    getLlmTaskRecordUpdates: ReturnType<typeof vi.fn>;
    getLlmTaskRecordVariables: ReturnType<typeof vi.fn>;
  };

  const record = (name: string): Variable => ({
    name, type: 'String', processInstanceId: 'pi-1', processDefinitionKey: 'claimTriage',
    value: JSON.stringify({ inputTokens: 10, outputTokens: 2, outcome: 'VALID', recordedAt: new Date().toISOString() })
  } as Variable);

  function create(updates: Observable<Variable[]>, latest: Observable<Variable[]> = of([])): LlmUsageService {
    actions$ = new Subject<Action>();
    processInstanceService = {
      getLlmTaskRecordUpdates: vi.fn().mockReturnValue(updates),
      getLlmTaskRecordVariables: vi.fn().mockReturnValue(latest)
    };
    TestBed.configureTestingModule({
      providers: [
        LlmUsageService,
        provideMockActions(() => actions$),
        { provide: ProcessInstanceService, useValue: processInstanceService }
      ]
    });
    return TestBed.inject(LlmUsageService);
  }

  it('should load the records once, whoever asks first', () => {
    const service = create(of([record('orqueioLlm_A'), record('orqueioLlm_B')]));

    service.ensureLoaded();
    service.ensureLoaded();

    expect(processInstanceService.getLlmTaskRecordUpdates).toHaveBeenCalledTimes(1);
    expect(service.state.loadingState).toBe('success');
    expect(service.state.records.map(r => r.activityId)).toEqual(['A', 'B']);
    expect(service.state.source).toBe('updates');
  });

  it('should read the last 30 days, at most the limit', () => {
    const service = create(of([]));

    service.load();

    const [since, max] = processInstanceService.getLlmTaskRecordUpdates.mock.calls[0];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    expect(since).toEqual(start);
    expect(max).toBe(LLM_USAGE_MAX_RECORDS);
  });

  it('should fall back to the latest record of each task below history level full', () => {
    const service = create(of([]), of([record('orqueioLlm_A')]));

    service.load();

    expect(processInstanceService.getLlmTaskRecordVariables).toHaveBeenCalledWith(LLM_USAGE_MAX_RECORDS);
    expect(service.state.source).toBe('latest');
    expect(service.state.records.length).toBe(1);
  });

  it('should say when the limit was reached', () => {
    const service = create(of(Array.from({ length: LLM_USAGE_MAX_RECORDS }, (_, i) => record('orqueioLlm_' + i))));

    service.load();

    expect(service.state.limited).toBe(true);
    expect(processInstanceService.getLlmTaskRecordVariables).not.toHaveBeenCalled();
  });

  it('should report a failure, keeping what was loaded before', () => {
    const service = create(of([record('orqueioLlm_A')]));
    service.load();

    processInstanceService.getLlmTaskRecordUpdates.mockReturnValue(throwError(() => new Error('403')));
    service.load();

    expect(service.state.loadingState).toBe('error');
    expect(service.state.failed).toBe(true);
    expect(service.state.records.length).toBe(1);
  });

  it('should reload when the dashboard refreshes its charts', () => {
    const service = create(of([]));
    service.load();

    actions$.next(DashboardActions.refreshAllCharts());

    expect(processInstanceService.getLlmTaskRecordUpdates).toHaveBeenCalledTimes(2);
  });

  it('should drop a load still running when a new one starts', () => {
    const first = new Subject<Variable[]>();
    const service = create(first);
    service.load();

    processInstanceService.getLlmTaskRecordUpdates.mockReturnValue(of([record('orqueioLlm_New')]));
    service.load();
    first.next([record('orqueioLlm_Old')]);

    expect(service.state.records.map(r => r.activityId)).toEqual(['New']);
  });
});
