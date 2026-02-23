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
  TaskGroupData,
  CHART_COLORS,
  ChartLoadingState
} from '../../../../models/cockpit/dashboard-charts.model';
import * as DashboardActions from '../../../../store/cockpit/dashboard/dashboard.actions';
import * as DashboardSelectors from '../../../../store/cockpit/dashboard/dashboard.selectors';

@Component({
  selector: 'app-tasks-by-group-chart',
  standalone: true,
  imports: [CommonModule, ChartCardComponent, TranslatePipe],
  template: `
    <app-chart-card
      titleKey="cockpit.charts.tasksByGroup.title"
      [subtitle]="totalTasks > 0 ? (totalTasks + ' tasks') : ''"
      [loading]="loadingState"
      [error]="error"
      [height]="180"
      (refresh)="onRefresh()"
    >
      <div class="chart-container">
        <canvas #chartCanvas></canvas>

        <!-- Empty state -->
        <div class="chart-empty" *ngIf="loadingState === 'success' && groups.length === 0">
          <span>{{ 'cockpit.charts.tasksByGroup.noTasks' | translate }}</span>
        </div>
      </div>

      <!-- Summary footer -->
      <div class="summary-footer" *ngIf="groups.length > 0" chart-footer>
        <div class="summary-item">
          <span class="summary-label">{{ 'cockpit.charts.tasksByGroup.groups' | translate }}</span>
          <span class="summary-value">{{ groups.length }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ 'cockpit.charts.tasksByGroup.avgPerGroup' | translate }}</span>
          <span class="summary-value">{{ averageTasksPerGroup }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ 'cockpit.charts.tasksByGroup.highest' | translate }}</span>
          <span class="summary-value highlight">{{ highestGroup?.groupName || '-' }}</span>
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

    .summary-footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .summary-label {
      font-size: 11px;
      color: var(--text-secondary, #525252);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary, #161616);
    }

    .summary-value.highlight {
      color: var(--primary-color, #0f62fe);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksByGroupChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private destroyRef = inject(DestroyRef);
  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  private chart: Chart<'bar'> | null = null;

  groups: TaskGroupData[] = [];
  loadingState: ChartLoadingState = 'idle';
  error: string | null = null;
  totalTasks = 0;

  get averageTasksPerGroup(): number {
    if (this.groups.length === 0) return 0;
    return Math.round(this.totalTasks / this.groups.length);
  }

  get highestGroup(): TaskGroupData | null {
    if (this.groups.length === 0) return null;
    return this.groups.reduce((max, g) => g.taskCount > max.taskCount ? g : max, this.groups[0]);
  }

  ngOnInit(): void {
    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private subscribeToStore(): void {
    // Subscribe to tasks by group data
    this.store.select(DashboardSelectors.selectTasksByGroup)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(groups => {
        this.groups = groups;
        this.totalTasks = groups.reduce((sum, g) => sum + g.taskCount, 0);
        this.updateChart();
        this.cdr.markForCheck();
      });

    // Subscribe to loading state
    this.store.select(DashboardSelectors.selectTasksByGroupLoading)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loadingState = loading;
        this.cdr.markForCheck();
      });

    // Subscribe to error
    this.store.select(DashboardSelectors.selectTasksByGroupError)
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

    if (this.groups.length === 0) {
      this.destroyChart();
      return;
    }

    // Show top 8 groups
    const displayData = this.groups.slice(0, 8);
    const labels = displayData.map(g => this.truncateLabel(g.groupName, 20));
    const data = displayData.map(g => g.taskCount);
    const colors = displayData.map((_, i) => CHART_COLORS.series[i % CHART_COLORS.series.length]);

    if (!this.chart) {
      this.createChart(labels, data, colors);
    } else {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.data.datasets[0].backgroundColor = colors;
      this.chart.update('none');
    }
  }

  private truncateLabel(label: string, maxLength: number): string {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength - 3) + '...';
  }

  private createChart(labels: string[], data: number[], colors: string[]): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false,
          barThickness: 20
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 4,
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
            callbacks: {
              title: (items) => {
                const index = items[0].dataIndex;
                return this.groups[index]?.groupName || '';
              },
              label: (context) => {
                const value = context.raw as number;
                const percentage = this.totalTasks > 0
                  ? ((value / this.totalTasks) * 100).toFixed(1)
                  : 0;
                return `${value} tasks (${percentage}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: { size: 11 },
              precision: 0
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              font: { size: 11 }
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const group = this.groups[index];
            if (group) {
              this.navigateToGroup(group.groupId);
            }
          }
        }
      }
    });
  }

  navigateToGroup(groupId: string): void {
    this.router.navigate(['/cockpit/tasks'], {
      queryParams: { candidateGroup: groupId }
    });
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  onRefresh(): void {
    this.store.dispatch(DashboardActions.loadTasksByGroup());
  }
}
