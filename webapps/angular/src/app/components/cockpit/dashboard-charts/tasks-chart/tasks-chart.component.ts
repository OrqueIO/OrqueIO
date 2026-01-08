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
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Chart from 'chart.js/auto';

import { ChartCardComponent } from '../chart-card/chart-card.component';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import {
  TaskChartStats,
  CHART_COLORS,
  ChartLoadingState
} from '../../../../models/cockpit/dashboard-charts.model';
import * as DashboardActions from '../../../../store/cockpit/dashboard/dashboard.actions';
import * as DashboardSelectors from '../../../../store/cockpit/dashboard/dashboard.selectors';

@Component({
  selector: 'app-tasks-chart',
  standalone: true,
  imports: [CommonModule, ChartCardComponent, TranslatePipe],
  template: `
    <app-chart-card
      [showHeader]="false"
      [showFooter]="true"
      [loading]="loadingState"
      [error]="error"
      [height]="150"
      (refresh)="onRefresh()"
    >
      <div class="chart-container">
        <canvas #chartCanvas width="150" height="150"></canvas>

        <!-- Center label -->
        <div class="chart-center">
          <span class="chart-center__value" [style.color]="isHovering && hoveredColor ? hoveredColor : defaultColor">{{ isHovering ? hoveredValue : totalTasks }}</span>
          <span class="chart-center__percent" *ngIf="isHovering && hoveredPercentage">{{ hoveredPercentage }}%</span>
        </div>
      </div>

      <div class="chart-label" chart-footer [class.chart-label--hover]="isHovering" [style.color]="isHovering && hoveredColor ? hoveredColor : null">
        {{ isHovering ? hoveredLabel : ('cockpit.charts.tasks.humanTasks' | translate) }}
      </div>
    </app-chart-card>
  `,
  styles: [`
    :host {
      display: block;
    }

    .chart-container {
      position: relative;
      width: 150px;
      height: 150px;
      margin: 0 auto;
    }

    .chart-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
    }

    .chart-center__value {
      display: block;
      font-size: 20px;
      font-weight: 700;
      line-height: 1;
      transition: all 0.15s ease;
    }

    .chart-center__percent {
      display: block;
      font-size: 10px;
      font-weight: 500;
      color: var(--text-secondary, #525252);
      margin-top: 2px;
    }

    .chart-label {
      text-align: center;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary, #525252);
      margin-top: 4px;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      padding: 0 8px;
    }

    .chart-label--hover {
      font-weight: 600;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private destroyRef = inject(DestroyRef);
  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  private chart: Chart<'doughnut'> | null = null;
  private isChartEmpty = false; // Track if chart was created in empty state
  private currentColors: string[] = []; // Store current chart colors for hover

  stats: TaskChartStats | null = null;
  loadingState: ChartLoadingState = 'idle';
  error: string | null = null;
  totalTasks = 0;

  // Hover state
  isHovering = false;
  hoveredValue: number | null = null;
  hoveredLabel: string | null = null;
  hoveredPercentage: string | null = null;
  hoveredColor: string | null = null;

  // Default color for the center value
  readonly defaultColor = '#0f62fe';

  // Use colors from the series palette for consistency
  readonly colors = {
    assigned: CHART_COLORS.series[0],    // Teal
    withGroups: CHART_COLORS.series[3],  // Blue
    unassigned: CHART_COLORS.series[9]   // Yellow-orange
  };

  ngOnInit(): void {
    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private subscribeToStore(): void {
    // Get actual open tasks count from dashboard stats
    this.store.select(DashboardSelectors.selectDashboardStats)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(stats => {
        if (stats) {
          this.totalTasks = stats.openTasks;
          this.cdr.markForCheck();
        }
      });

    // Subscribe to task stats for chart breakdown
    this.store.select(DashboardSelectors.selectTaskStats)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(stats => {
        this.stats = stats;
        this.updateChart();
        this.cdr.markForCheck();
      });

    // Subscribe to loading state
    this.store.select(DashboardSelectors.selectTaskStatsLoading)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loadingState = loading;
        // Trigger chart update when loading state changes to success
        if (loading === 'success') {
          this.updateChart();
        }
        this.cdr.markForCheck();
      });

    // Subscribe to error
    this.store.select(DashboardSelectors.selectTaskStatsError)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(error => {
        this.error = error;
        this.cdr.markForCheck();
      });
  }

  private updateChart(): void {
    if (!this.chartCanvas?.nativeElement) {
      setTimeout(() => this.updateChart(), 50);
      return;
    }

    const hasData = !!this.stats;

    // If transitioning from empty to data (or vice versa), destroy and recreate
    if (this.chart && this.isChartEmpty !== !hasData) {
      this.destroyChart();
    }

    // If no stats, show empty gray doughnut
    if (!hasData) {
      const emptyData = [1];
      const emptyLabels = ['No data'];
      const emptyColors = ['#e0e0e0'];

      if (!this.chart) {
        this.createChart(emptyLabels, emptyData, emptyColors, true);
        this.isChartEmpty = true;
      } else {
        this.chart.data.labels = emptyLabels;
        this.chart.data.datasets[0].data = emptyData;
        this.chart.data.datasets[0].backgroundColor = emptyColors;
        this.chart.update('none');
      }
      return;
    }

    // Categories matching AngularJS:
    // 1. Assigned to user
    // 2. Assigned to group (unassigned but has candidate groups)
    // 3. Completely unassigned (unassigned and no candidate groups)
    const data = [this.stats!.assigned, this.stats!.unassigned, this.stats!.withoutCandidateGroups];
    const labels = ['Assigned to User', 'Assigned to Group', 'Unassigned'];
    const colors = [this.colors.assigned, this.colors.withGroups, this.colors.unassigned];

    // Store colors for hover handler
    this.currentColors = colors;

    if (!this.chart) {
      this.createChart(labels, data, colors, false);
      this.isChartEmpty = false;
    } else {
      this.chart.data.datasets[0].data = data;
      this.chart.update('none');
    }
  }

  private createChart(labels: string[], data: number[], colors: string[], isEmpty = false): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverBorderWidth: 0,
          hoverOffset: 0
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: true,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        },
        onHover: isEmpty ? undefined : (_event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const chartLabels = ['Assigned to User', 'Assigned to Group', 'Unassigned'];
            const chartData = this.stats
              ? [this.stats.assigned, this.stats.unassigned, this.stats.withoutCandidateGroups]
              : [0, 0, 0];
            const value = chartData[index];
            const label = chartLabels[index];
            const percentage = this.totalTasks > 0
              ? ((value / this.totalTasks) * 100).toFixed(1)
              : '0';

            this.isHovering = true;
            this.hoveredValue = value;
            this.hoveredLabel = label;
            this.hoveredPercentage = percentage;
            // Get the color of the hovered segment
            this.hoveredColor = this.currentColors[index] || this.defaultColor;
            this.cdr.detectChanges();
          } else {
            this.resetHoverState();
          }
        },
        onClick: isEmpty ? undefined : (_event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            this.navigateToFiltered(index);
          }
        }
      }
    });

    // Add mouseleave listener to reset hover state
    this.chartCanvas.nativeElement.addEventListener('mouseleave', () => {
      this.resetHoverState();
    });
  }

  private navigateToFiltered(index: number): void {
    // Navigate to tasks with appropriate filter
    this.router.navigate(['/cockpit/tasks']);
  }

  private resetHoverState(): void {
    if (this.isHovering) {
      this.isHovering = false;
      this.hoveredValue = null;
      this.hoveredLabel = null;
      this.hoveredPercentage = null;
      this.hoveredColor = null;
      this.cdr.detectChanges();
    }
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  onRefresh(): void {
    this.store.dispatch(DashboardActions.loadTaskStats());
  }
}
