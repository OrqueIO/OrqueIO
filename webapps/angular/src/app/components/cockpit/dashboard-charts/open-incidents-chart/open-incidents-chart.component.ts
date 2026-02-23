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
  IncidentsByProcess,
  CHART_COLORS,
  ChartLoadingState
} from '../../../../models/cockpit/dashboard-charts.model';
import * as DashboardActions from '../../../../store/cockpit/dashboard/dashboard.actions';
import * as DashboardSelectors from '../../../../store/cockpit/dashboard/dashboard.selectors';

@Component({
  selector: 'app-open-incidents-chart',
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
          <span class="chart-center__value" [style.color]="isHovering && hoveredColor ? hoveredColor : defaultColor">{{ isHovering ? hoveredValue : totalIncidents }}</span>
          <span class="chart-center__percent" *ngIf="isHovering && hoveredPercentage">{{ hoveredPercentage }}%</span>
        </div>
      </div>

      <div class="chart-label" chart-footer [class.chart-label--hover]="isHovering" [style.color]="isHovering && hoveredColor ? hoveredColor : null">
        {{ isHovering ? hoveredLabel : ('cockpit.dashboard.openIncidents' | translate) }}
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
export class OpenIncidentsChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private destroyRef = inject(DestroyRef);
  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  private chart: Chart<'doughnut'> | null = null;
  private isChartEmpty = false; // Track if chart was created in empty state
  private currentColors: string[] = []; // Store current chart colors for hover

  incidentsByProcess: IncidentsByProcess[] = [];
  loadingState: ChartLoadingState = 'idle';
  error: string | null = null;
  totalIncidents = 0;

  // Hover state
  isHovering = false;
  hoveredValue: number | null = null;
  hoveredLabel: string | null = null;
  hoveredPercentage: string | null = null;
  hoveredColor: string | null = null;

  // Default color for the center value
  readonly defaultColor = '#0f62fe';

  ngOnInit(): void {
    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private subscribeToStore(): void {
    // Calculate total from incidentsByProcess (root incidents only, like AngularJS)
    this.store.select(DashboardSelectors.selectIncidentsByProcess)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(incidents => {
        this.incidentsByProcess = incidents;
        // Calculate total from sum of root incidents (matches AngularJS behavior)
        this.totalIncidents = incidents.reduce((sum, p) => sum + p.incidentCount, 0);
        this.updateChart();
        this.cdr.markForCheck();
      });

    this.store.select(DashboardSelectors.selectIncidentsByProcessLoading)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loadingState = loading;
        // Trigger chart update when loading state changes to success
        if (loading === 'success') {
          this.updateChart();
        }
        this.cdr.markForCheck();
      });

    this.store.select(DashboardSelectors.selectIncidentsByProcessError)
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

    const hasData = this.incidentsByProcess.length > 0 && this.totalIncidents > 0;

    // If transitioning from empty to data (or vice versa), destroy and recreate
    if (this.chart && this.isChartEmpty !== !hasData) {
      this.destroyChart();
    }

    // If no incidents, show empty gray doughnut
    if (!hasData) {
      const emptyData = [1];
      const emptyLabels = ['No incidents'];
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

    // Limit to top 8 processes for better visualization
    const displayData = this.incidentsByProcess.slice(0, 8);
    const data = displayData.map(p => p.incidentCount);
    const labels = displayData.map(p => p.processName);
    const colors = displayData.map((_, i) => CHART_COLORS.series[i % CHART_COLORS.series.length]);

    // Store colors for hover handler
    this.currentColors = colors;

    if (!this.chart) {
      this.createChart(labels, data, colors, false);
      this.isChartEmpty = false;
    } else {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.data.datasets[0].backgroundColor = colors;
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
            const process = this.incidentsByProcess[index];
            if (process) {
              this.isHovering = true;
              this.hoveredValue = process.incidentCount;
              this.hoveredLabel = process.processName;
              const percentage = this.totalIncidents > 0
                ? ((process.incidentCount / this.totalIncidents) * 100).toFixed(1)
                : '0';
              this.hoveredPercentage = percentage;
              // Get the color of the hovered segment
              this.hoveredColor = this.currentColors[index] || this.defaultColor;
              this.cdr.detectChanges();
            }
          } else {
            this.resetHoverState();
          }
        },
        onClick: isEmpty ? undefined : (_event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const process = this.incidentsByProcess[index];
            if (process) {
              this.navigateToProcess(process.processKey);
            }
          }
        }
      }
    });

    // Add mouseleave listener to reset hover state
    this.chartCanvas.nativeElement.addEventListener('mouseleave', () => {
      this.resetHoverState();
    });
  }

  navigateToProcess(processKey: string): void {
    this.router.navigate(['/cockpit/processes'], {
      queryParams: { processKey }
    });
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
    this.store.dispatch(DashboardActions.loadIncidentsByProcess());
  }
}
