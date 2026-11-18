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

import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { ProcessInstanceService } from '../../services/process-instance.service';
import { ChartLoadingState } from '../../models/cockpit/dashboard-charts.model';
import * as DashboardActions from '../../store/cockpit/dashboard/dashboard.actions';
import { LlmTaskRecord, llmTaskRecords } from './llm-task-records';

/** The most records read, the newest first. */
export const LLM_USAGE_MAX_RECORDS = 2000;

/** The longest period the dashboard offers, so the records of every period are read at once. */
export const LLM_USAGE_LONGEST_PERIOD = 30;

/**
 * Where the records come from: the variable updates hold one per execution; below history
 * level full there are none, and only the latest record of each task and instance is left.
 */
export type LlmRecordSource = 'updates' | 'latest';

export interface LlmUsageState {
  loadingState: ChartLoadingState;
  records: LlmTaskRecord[];
  source: LlmRecordSource;
  /** Whether more records may exist than were read. */
  limited: boolean;
  /** Whether the records could not be loaded. */
  failed: boolean;
}

const INITIAL: LlmUsageState = { loadingState: 'idle', records: [], source: 'updates', limited: false, failed: false };

/**
 * The LLM task records of the last days, loaded once for everything the dashboard shows
 * about them, and again when the dashboard refreshes. Provided by the dashboard.
 */
@Injectable()
export class LlmUsageService {
  private processInstanceService = inject(ProcessInstanceService);
  private destroyRef = inject(DestroyRef);

  private stateSubject = new BehaviorSubject<LlmUsageState>(INITIAL);
  private loading: Subscription | null = null;

  readonly state$: Observable<LlmUsageState> = this.stateSubject.asObservable();

  constructor() {
    inject(Actions)
      .pipe(ofType(DashboardActions.refreshAllCharts), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  get state(): LlmUsageState {
    return this.stateSubject.value;
  }

  /** Loads the records unless they were loaded or are loading. */
  ensureLoaded(): void {
    if (this.state.loadingState === 'idle') {
      this.load();
    }
  }

  load(): void {
    this.loading?.unsubscribe();
    this.stateSubject.next({ ...this.state, loadingState: 'loading', failed: false });

    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (LLM_USAGE_LONGEST_PERIOD - 1));

    this.loading = this.processInstanceService.getLlmTaskRecordUpdates(since, LLM_USAGE_MAX_RECORDS)
      .pipe(
        switchMap(updates => updates.length > 0
          ? of({ variables: updates, source: 'updates' as LlmRecordSource })
          : this.processInstanceService.getLlmTaskRecordVariables(LLM_USAGE_MAX_RECORDS)
            .pipe(map(variables => ({ variables, source: 'latest' as LlmRecordSource })))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ variables, source }) => this.stateSubject.next({
          loadingState: 'success',
          records: llmTaskRecords(variables),
          source,
          limited: variables.length >= LLM_USAGE_MAX_RECORDS,
          failed: false
        }),
        error: () => this.stateSubject.next({ ...this.state, loadingState: 'error', failed: true })
      });
  }
}
