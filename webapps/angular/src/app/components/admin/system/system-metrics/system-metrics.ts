import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  DestroyRef,
  ChangeDetectorRef,
  AfterViewInit,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faExclamationTriangle,
  faClipboard,
  faQuestionCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import * as SystemActions from '../../../../store/admin/system/system.actions';
import * as SystemSelectors from '../../../../store/admin/system/system.selectors';
import {
  ProcessedMetric,
  LoadingState,
  METRIC_KEYS,
  METRIC_COLORS,
  TelemetryData
} from '../../../../models/admin/system.model';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-system-metrics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TranslatePipe
  ],
  templateUrl: './system-metrics.html',
  styleUrls: ['./system-metrics.css']
})
export class SystemMetricsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('metricsChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private store = inject(Store);
  private chart: Chart | null = null;

  // Icons
  faSpinner = faSpinner;
  faExclamationTriangle = faExclamationTriangle;
  faClipboard = faClipboard;
  faQuestionCircle = faQuestionCircle;
  faInfoCircle = faInfoCircle;

  // State
  startDate = '';
  displayLegacyMetrics = false;
  monthlyMetrics: ProcessedMetric[] = [];
  annualMetrics: ProcessedMetric[] = [];
  monthlyLoadingState: LoadingState = 'INITIAL';
  annualLoadingState: LoadingState = 'INITIAL';
  monthlyError: string | null = null;
  annualError: string | null = null;
  telemetryData: TelemetryData | null = null;
  maxDate = new Date().toISOString().split('T')[0];

  // For chart data (reversed for chronological display)
  chartMetrics: ProcessedMetric[] = [];

  ngOnInit(): void {
    this.initializeStartDate();
    this.subscribeToState();
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Chart will be initialized when data is loaded
    this.initChart();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private initializeStartDate(): void {
    // Check local storage for saved start date
    const savedDate = localStorage.getItem('metricsContractStartDate');
    if (savedDate) {
      this.startDate = savedDate;
    } else {
      // Default to start of current year
      const now = new Date();
      this.startDate = `${now.getFullYear()}-01-01`;
    }
  }

  private subscribeToState(): void {
    this.store.select(SystemSelectors.selectMonthlyMetrics)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(metrics => {
        this.monthlyMetrics = metrics;
        this.cdr.markForCheck();
        this.updateChart();
      });

    this.store.select(SystemSelectors.selectAnnualMetrics)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(metrics => {
        this.annualMetrics = metrics;
        this.cdr.markForCheck();
      });

    this.store.select(SystemSelectors.selectMonthlyLoadingState)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        this.monthlyLoadingState = state;
        this.cdr.markForCheck();
      });

    this.store.select(SystemSelectors.selectAnnualLoadingState)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        this.annualLoadingState = state;
        this.cdr.markForCheck();
      });

    this.store.select(SystemSelectors.selectMonthlyError)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(error => {
        this.monthlyError = error;
        this.cdr.markForCheck();
      });

    this.store.select(SystemSelectors.selectAnnualError)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(error => {
        this.annualError = error;
        this.cdr.markForCheck();
      });

    this.store.select(SystemSelectors.selectTelemetryData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        this.telemetryData = data;
        this.cdr.markForCheck();
      });

    this.store.select(SystemSelectors.selectMonthlyMetricsForChart)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(metrics => {
        this.chartMetrics = metrics;
        this.updateChart();
      });
  }

  private loadData(): void {
    this.store.dispatch(SystemActions.loadMonthlyMetrics({
      startDate: this.startDate,
      displayLegacy: this.displayLegacyMetrics
    }));
    this.store.dispatch(SystemActions.loadAnnualMetrics({
      startDate: this.startDate
    }));
    this.store.dispatch(SystemActions.loadTelemetryData({}));
  }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) {
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: []
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
            position: 'top'
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        }
      }
    });

    this.updateChart();
  }

  private updateChart(): void {
    // If chart doesn't exist, try to initialize it
    if (!this.chart) {
      this.initChart();
    }

    // If still no chart or no data, return
    if (!this.chart || this.chartMetrics.length === 0) {
      // Clear chart if no data
      if (this.chart) {
        this.chart.data.labels = [];
        this.chart.data.datasets = [];
        this.chart.update();
      }
      return;
    }

    const createDataset = (label: string, metricKey: string, color: string) => {
      return {
        label,
        data: this.chartMetrics.map(m => (m as any)[METRIC_KEYS[metricKey as keyof typeof METRIC_KEYS]]?.sum || 0),
        backgroundColor: color,
        borderRadius: 4
      };
    };

    const datasets = [
      createDataset('PI', 'PI', METRIC_COLORS['PI']),
      createDataset('DI', 'DI', METRIC_COLORS['DI']),
      createDataset('TU', 'TU', METRIC_COLORS['TU'])
    ];

    if (this.displayLegacyMetrics) {
      datasets.push(createDataset('FNI', 'FNI', METRIC_COLORS['FNI']));
      datasets.push(createDataset('EDE', 'EDE', METRIC_COLORS['EDE']));
    }

    this.chart.data.labels = this.chartMetrics.map(m => m.labelFmt);
    this.chart.data.datasets = datasets;
    this.chart.update('none'); // Use 'none' mode for faster update without animation
  }

  onStartDateChange(): void {
    if (this.isValidDate(this.startDate)) {
      localStorage.setItem('metricsContractStartDate', this.startDate);
      this.loadData();
    }
  }

  onLegacyMetricsChange(): void {
    this.store.dispatch(SystemActions.loadMonthlyMetrics({
      startDate: this.startDate,
      displayLegacy: this.displayLegacyMetrics
    }));
  }

  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }

  getRowStyle(metric: ProcessedMetric): { [key: string]: string } {
    return metric.activeYear ? {} : { opacity: '0.7' };
  }

  copyToClipboard(metric: ProcessedMetric): void {
    let text = `${metric.labelFmt}\n`;
    text += `- PI: ${metric['process-instances'].sumFmt}\n`;
    text += `- DI: ${metric['decision-instances'].sumFmt}\n`;
    text += `- TU: ${metric['task-users'].sumFmt}\n`;
    text += `- FNI: ${metric['flow-node-instances'].sumFmt}\n`;
    text += `- EDE: ${metric['executed-decision-elements'].sumFmt}\n`;
    text += '\n';
    if (this.telemetryData) {
      text += JSON.stringify(this.telemetryData, null, 2);
    }

    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  }

  copyValue(value: number): void {
    navigator.clipboard.writeText(value.toString());
  }
}
