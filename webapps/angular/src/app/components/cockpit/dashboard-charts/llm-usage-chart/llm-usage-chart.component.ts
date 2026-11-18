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

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostBinding
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Chart from 'chart.js/auto';

import { ChartCardComponent } from '../chart-card/chart-card.component';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { CHART_COLORS, ChartLoadingState } from '../../../../models/cockpit/dashboard-charts.model';
import { LlmTaskRecord } from '../../../../shared/llm-task/llm-task-records';
import { LlmUsage, summarizeLlmUsage } from '../../../../shared/llm-task/llm-usage';
import {
  LLM_USAGE_MAX_RECORDS,
  LlmRecordSource,
  LlmUsageService
} from '../../../../shared/llm-task/llm-usage.service';

/**
 * What the LLM tasks used over the last days, from the record each LLM task execution
 * leaves in the history. Hidden while no LLM task has ever run.
 */
@Component({
  selector: 'app-llm-usage-chart',
  standalone: true,
  imports: [CommonModule, RouterModule, ChartCardComponent, TranslatePipe],
  template: `
    <app-chart-card
      titleKey="cockpit.charts.llmUsage.title"
      [loading]="loadingState"
      [error]="error"
      [height]="200"
      [showFooter]="true"
      (refresh)="load()"
    >
      <div class="llm-usage">
        <div class="llm-kpis">
          <div class="llm-kpi">
            <span class="llm-kpi__value">{{ usage.calls }}</span>
            <span class="llm-kpi__label">{{ 'cockpit.charts.llmUsage.calls' | translate }}</span>
          </div>
          <div class="llm-kpi">
            <span class="llm-kpi__value">{{ usage.inputTokens | number }}</span>
            <span class="llm-kpi__label">{{ 'cockpit.charts.llmUsage.inputTokens' | translate }}</span>
          </div>
          <div class="llm-kpi">
            <span class="llm-kpi__value">{{ usage.outputTokens | number }}</span>
            <span class="llm-kpi__label">{{ 'cockpit.charts.llmUsage.outputTokens' | translate }}</span>
          </div>
          <div class="llm-kpi" [class.llm-kpi--warning]="usage.invalidAnswers > 0">
            <span class="llm-kpi__value">{{ usage.invalidAnswers }}</span>
            <span class="llm-kpi__label">{{ 'cockpit.charts.llmUsage.invalidAnswers' | translate }}</span>
          </div>
          <div class="llm-kpi">
            <span class="llm-kpi__value">{{ usage.averageLatencyMs !== null ? (usage.averageLatencyMs / 1000 | number:'1.1-1') + ' s' : '-' }}</span>
            <span class="llm-kpi__label">{{ 'cockpit.charts.llmUsage.averageLatency' | translate }}</span>
          </div>
        </div>

        <div class="llm-body">
          <div class="chart-container">
            <canvas #chartCanvas></canvas>
            <div class="chart-empty" *ngIf="loadingState === 'success' && usage.calls === 0">
              <span>{{ 'cockpit.charts.noData' | translate }}</span>
            </div>
          </div>

          <table class="llm-processes" *ngIf="usage.processes.length > 0">
            <thead>
              <tr>
                <th>{{ 'cockpit.charts.llmUsage.process' | translate }}</th>
                <th class="llm-number">{{ 'cockpit.charts.llmUsage.calls' | translate }}</th>
                <th class="llm-number">{{ 'cockpit.charts.llmUsage.tokens' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let process of usage.processes.slice(0, 5)">
                <td>
                  <a *ngIf="process.processDefinitionKey !== '-'; else noKey"
                     [routerLink]="['/cockpit/processes', process.processDefinitionKey, 'instances']">
                    {{ process.processDefinitionKey }}
                  </a>
                  <ng-template #noKey>-</ng-template>
                </td>
                <td class="llm-number">{{ process.calls }}</td>
                <td class="llm-number">{{ process.inputTokens + process.outputTokens | number }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="chart-footer" chart-footer>
        <div class="period-selector">
          <button
            *ngFor="let p of periods"
            type="button"
            class="period-btn"
            [class.period-btn--active]="p === days"
            (click)="onPeriodChange(p)"
          >
            {{ 'cockpit.charts.llmUsage.days' | translate:{ count: '' + p } }}
          </button>
        </div>
        <span class="llm-note" [title]="'cockpit.charts.llmUsage.noteHint' | translate">
          {{ noteKey | translate:{ count: '' + maxRecords } }}
        </span>
      </div>
    </app-chart-card>
  `,
  styles: [`
    :host[hidden] {
      display: none;
    }

    .llm-usage {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
    }

    .llm-kpis {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
    }

    .llm-kpi {
      display: flex;
      flex-direction: column;
      padding: 6px 8px;
      border-radius: 6px;
      background: var(--bg-secondary, #f4f4f4);
    }

    .llm-kpi__value {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary, #161616);
    }

    .llm-kpi__label {
      font-size: 11px;
      color: var(--text-secondary, #525252);
    }

    .llm-kpi--warning .llm-kpi__value {
      color: ${ CHART_COLORS.failed };
    }

    .llm-body {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
      gap: 12px;
      flex: 1;
      min-height: 160px;
    }

    .chart-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 160px;
    }

    canvas {
      width: 100% !important;
      height: 100% !important;
    }

    .chart-empty {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary, #525252);
      font-size: 14px;
    }

    .llm-processes {
      width: 100%;
      align-self: start;
      border-collapse: collapse;
      font-size: 12px;
    }

    .llm-processes th {
      text-align: left;
      font-weight: 600;
      color: var(--text-secondary, #525252);
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }

    .llm-processes td {
      text-align: left;
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-color-light, #f0f0f0);
    }

    .llm-number {
      text-align: right !important;
      white-space: nowrap;
    }

    .chart-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .period-selector {
      display: flex;
      gap: 4px;
      background: var(--bg-secondary, #f4f4f4);
      padding: 4px;
      border-radius: 6px;
    }

    .period-btn {
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--text-secondary, #525252);
      font-size: 12px;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
    }

    .period-btn--active {
      background: var(--card-bg, #ffffff);
      color: var(--primary-color, #0f62fe);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .llm-note {
      font-size: 12px;
      color: var(--text-secondary, #525252);
    }

    @media (max-width: 992px) {
      .llm-kpis {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .llm-body {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LlmUsageChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private llmUsageService = inject(LlmUsageService);
  private translateService = inject(TranslateService);

  private chart: Chart<'bar'> | null = null;
  private records: LlmTaskRecord[] = [];
  private drawTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  readonly periods = [7, 14, 30];
  readonly maxRecords = LLM_USAGE_MAX_RECORDS;

  days = 7;
  loadingState: ChartLoadingState = 'idle';
  error: string | null = null;
  /** Whether more records may exist than were read. */
  limited = false;
  source: LlmRecordSource = 'updates';
  usage: LlmUsage = summarizeLlmUsage([], 7);

  /**
   * Hidden while no LLM task has run in the longest period, loading included, so
   * installations without LLM tasks see nothing new. Shown on errors.
   */
  @HostBinding('hidden')
  get hidden(): boolean {
    return this.loadingState !== 'error' && this.records.length === 0;
  }

  get noteKey(): string {
    if (this.source === 'latest') {
      return 'cockpit.charts.llmUsage.noteLatestOnly';
    }
    return this.limited ? 'cockpit.charts.llmUsage.noteLimited' : 'cockpit.charts.llmUsage.note';
  }

  ngOnInit(): void {
    // The records are shared with the dashboard's LLM figures, and reloaded with its refresh
    this.llmUsageService.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        this.loadingState = state.loadingState;
        this.error = state.failed ? this.translateService.instant('cockpit.charts.llmUsage.error') : null;
        this.records = state.records;
        this.source = state.source;
        this.limited = state.limited;
        if (state.loadingState === 'success') {
          this.summarize();
        } else {
          this.cdr.markForCheck();
        }
      });
    this.llmUsageService.ensureLoaded();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.drawTimer) {
      clearTimeout(this.drawTimer);
    }
    this.chart?.destroy();
    this.chart = null;
  }

  load(): void {
    this.llmUsageService.load();
  }

  onPeriodChange(days: number): void {
    this.days = days;
    this.summarize();
  }

  private summarize(): void {
    this.usage = summarizeLlmUsage(this.records, this.days);
    this.cdr.markForCheck();
    // The canvas exists once the card shows its content
    if (this.drawTimer) {
      clearTimeout(this.drawTimer);
    }
    this.drawTimer = setTimeout(() => {
      this.drawTimer = null;
      this.updateChart();
    });
  }

  private updateChart(): void {
    if (this.destroyed) {
      return;
    }
    const ctx = this.chartCanvas?.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const labels = this.usage.days.map(day =>
      new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const input = this.usage.days.map(day => day.inputTokens);
    const output = this.usage.days.map(day => day.outputTokens);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = input;
      this.chart.data.datasets[1].data = output;
      this.chart.update('none');
      return;
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: this.translateService.instant('cockpit.charts.llmUsage.inputTokens'),
            data: input,
            backgroundColor: CHART_COLORS.active,
            stack: 'tokens'
          },
          {
            label: this.translateService.instant('cockpit.charts.llmUsage.outputTokens'),
            data: output,
            backgroundColor: CHART_COLORS.unassigned,
            stack: 'tokens'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 0 } },
          y: { stacked: true, beginAtZero: true, ticks: { font: { size: 11 }, precision: 0 } }
        }
      }
    });
  }
}
