import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Chart from 'chart.js/auto';

import { ChartCardComponent } from '../chart-card/chart-card.component';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import {
  TimelineDataPoint,
  TimelinePeriod,
  CHART_COLORS,
  ChartLoadingState
} from '../../../../models/cockpit/dashboard-charts.model';
import * as DashboardActions from '../../../../store/cockpit/dashboard/dashboard.actions';
import * as DashboardSelectors from '../../../../store/cockpit/dashboard/dashboard.selectors';

@Component({
  selector: 'app-timeline-chart',
  standalone: true,
  imports: [CommonModule, ChartCardComponent, TranslatePipe],
  template: `
    <app-chart-card
      titleKey="cockpit.charts.timeline.title"
      [loading]="loadingState"
      [error]="error"
      [height]="200"
      [showFooter]="true"
      (refresh)="onRefresh()"
    >
      <div class="chart-container">
        <canvas #chartCanvas></canvas>

        <!-- Empty state -->
        <div class="chart-empty" *ngIf="loadingState === 'success' && timeline.length === 0">
          <span>{{ 'cockpit.charts.noData' | translate }}</span>
        </div>
      </div>

      <!-- Period selector in footer -->
      <div class="chart-footer" chart-footer>
        <div class="period-selector">
          <button
            *ngFor="let p of periods"
            class="period-btn"
            [class.period-btn--active]="p.value === selectedPeriod"
            (click)="onPeriodChange(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
        <div class="chart-totals" *ngIf="timeline.length > 0">
          <span class="total-item">
            <span class="total-dot" [style.background]="colors.started"></span>
            {{ 'cockpit.charts.timeline.started' | translate }}: <strong>{{ totals.started }}</strong>
          </span>
          <span class="total-item">
            <span class="total-dot" [style.background]="colors.completed"></span>
            {{ 'cockpit.charts.timeline.completed' | translate }}: <strong>{{ totals.completed }}</strong>
          </span>
        </div>
      </div>
    </app-chart-card>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
      height: 100%;
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
      transition: all 0.15s ease;
    }

    .period-btn:hover {
      color: var(--text-primary, #161616);
    }

    .period-btn--active {
      background: var(--card-bg, #ffffff);
      color: var(--primary-color, #0f62fe);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .chart-totals {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: var(--text-secondary, #525252);
    }

    .total-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .total-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .total-item strong {
      color: var(--text-primary, #161616);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private destroyRef = inject(DestroyRef);
  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  private chart: Chart<'line'> | null = null;

  timeline: TimelineDataPoint[] = [];
  selectedPeriod: TimelinePeriod = '7d';
  loadingState: ChartLoadingState = 'idle';
  error: string | null = null;

  readonly periods = [
    { value: '7d' as TimelinePeriod, label: '7 days' },
    { value: '14d' as TimelinePeriod, label: '14 days' },
    { value: '30d' as TimelinePeriod, label: '30 days' }
  ];

  readonly colors = {
    started: CHART_COLORS.active,
    completed: CHART_COLORS.completed
  };

  totals = { started: 0, completed: 0 };

  ngOnInit(): void {
    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private subscribeToStore(): void {
    // Subscribe to timeline data
    this.store.select(DashboardSelectors.selectTimeline)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(timeline => {
        this.timeline = timeline;
        this.calculateTotals();
        this.updateChart();
        this.cdr.markForCheck();
      });

    // Subscribe to selected period
    this.store.select(DashboardSelectors.selectTimelinePeriod)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(period => {
        this.selectedPeriod = period;
        this.cdr.markForCheck();
      });

    // Subscribe to loading state
    this.store.select(DashboardSelectors.selectTimelineLoading)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loadingState = loading;
        this.cdr.markForCheck();
      });

    // Subscribe to error
    this.store.select(DashboardSelectors.selectTimelineError)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(error => {
        this.error = error;
        this.cdr.markForCheck();
      });
  }

  private calculateTotals(): void {
    this.totals = {
      started: this.timeline.reduce((sum, point) => sum + point.started, 0),
      completed: this.timeline.reduce((sum, point) => sum + point.completed, 0)
    };
  }

  private updateChart(): void {
    if (!this.chartCanvas?.nativeElement) {
      setTimeout(() => this.updateChart(), 50);
      return;
    }

    if (this.timeline.length === 0) {
      return;
    }

    const labels = this.timeline.map(point => this.formatDate(point.date));
    const startedData = this.timeline.map(point => point.started);
    const completedData = this.timeline.map(point => point.completed);

    if (!this.chart) {
      this.createChart(labels, startedData, completedData);
    } else {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = startedData;
      this.chart.data.datasets[1].data = completedData;
      this.chart.update('none');
    }
  }

  private createChart(labels: string[], startedData: number[], completedData: number[]): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: this.translateService.instant('CHART_STARTED'),
            data: startedData,
            borderColor: this.colors.started,
            backgroundColor: this.getGradient(ctx, this.colors.started),
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: this.colors.started,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          },
          {
            label: this.translateService.instant('CHART_COMPLETED'),
            data: completedData,
            borderColor: this.colors.completed,
            backgroundColor: this.getGradient(ctx, this.colors.completed),
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: this.colors.completed,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 4,
            titleFont: { size: 13 },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { size: 11 },
              maxRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: { size: 11 },
              precision: 0
            }
          }
        }
      }
    });
  }

  private getGradient(ctx: CanvasRenderingContext2D, color: string): CanvasGradient {
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, this.hexToRgba(color, 0.3));
    gradient.addColorStop(1, this.hexToRgba(color, 0.02));
    return gradient;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  onPeriodChange(period: TimelinePeriod): void {
    this.store.dispatch(DashboardActions.setTimelinePeriod({ period }));
  }

  onRefresh(): void {
    this.store.dispatch(DashboardActions.loadTimeline({ period: this.selectedPeriod }));
  }
}
