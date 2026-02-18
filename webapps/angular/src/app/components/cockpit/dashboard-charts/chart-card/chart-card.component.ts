import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSync,
  faSpinner,
  faExclamationTriangle,
  faExpand,
  faCompress
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { ChartLoadingState } from '../../../../models/cockpit/dashboard-charts.model';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslatePipe],
  template: `
    <div class="chart-card" [class.chart-card--loading]="loading === 'loading'" [class.chart-card--error]="loading === 'error'" [class.chart-card--no-header]="!showHeader">
      <!-- Header -->
      <div class="chart-card__header" *ngIf="showHeader">
        <div class="chart-card__title-wrapper">
          <h3 class="chart-card__title">
            {{ titleKey ? (titleKey | translate) : title }}
          </h3>
          <span class="chart-card__subtitle" *ngIf="subtitle">{{ subtitle }}</span>
        </div>
        <div class="chart-card__actions">
          <button
            *ngIf="showRefresh"
            class="chart-card__action-btn"
            (click)="onRefresh()"
            [disabled]="loading === 'loading'"
            [title]="'common.refresh' | translate"
          >
            <fa-icon [icon]="loading === 'loading' ? faSpinner : faSync" [animation]="loading === 'loading' ? 'spin' : undefined"></fa-icon>
          </button>
          <button
            *ngIf="expandable"
            class="chart-card__action-btn"
            (click)="onToggleExpand()"
            [title]="expanded ? ('common.collapse' | translate) : ('common.expand' | translate)"
          >
            <fa-icon [icon]="expanded ? faCompress : faExpand"></fa-icon>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="chart-card__content">
        <!-- Loading overlay -->
        <div class="chart-card__loading" *ngIf="loading === 'loading' && showLoadingOverlay">
          <fa-icon [icon]="faSpinner" animation="spin" size="2x"></fa-icon>
          <span>{{ 'common.loading' | translate }}</span>
        </div>

        <!-- Error state -->
        <div class="chart-card__error" *ngIf="loading === 'error'">
          <fa-icon [icon]="faExclamationTriangle" size="2x"></fa-icon>
          <span>{{ error || ('common.error' | translate) }}</span>
          <button class="chart-card__retry-btn" (click)="onRefresh()">
            {{ 'common.retry' | translate }}
          </button>
        </div>

        <!-- Chart content -->
        <div class="chart-card__chart" *ngIf="loading !== 'error'" [class.chart-card__chart--hidden]="loading === 'loading' && showLoadingOverlay">
          <ng-content></ng-content>
        </div>
      </div>

      <!-- Footer (optional) -->
      <div class="chart-card__footer" *ngIf="showFooter">
        <ng-content select="[chart-footer]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .chart-card {
      background: var(--card-bg, #ffffff);
      border-radius: 8px;
      box-shadow: none;
      border: none;
    }

    .chart-card:hover {
      /* hover handled by parent metric-card */
    }

    .chart-card--loading {
      opacity: 0.85;
    }

    .chart-card--error {
      border: 1px solid var(--error-color, #da1e28);
    }

    .chart-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px 8px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }

    .chart-card__title-wrapper {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .chart-card__title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary, #161616);
    }

    .chart-card__subtitle {
      font-size: 11px;
      color: var(--text-secondary, #525252);
    }

    .chart-card__actions {
      display: flex;
      gap: 4px;
    }

    .chart-card__action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: var(--text-secondary, #525252);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 11px;
    }

    .chart-card__action-btn:hover:not(:disabled) {
      background: rgba(15, 98, 254, 0.08);
      color: #0f62fe;
    }

    .chart-card__action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .chart-card__content {
      position: relative;
      padding: 0;
      text-align: center;
    }

    .chart-card__loading,
    .chart-card__error {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.95);
      z-index: 10;
      font-size: 12px;
    }

    .chart-card__loading {
      color: var(--text-secondary, #525252);
    }

    .chart-card__loading fa-icon {
      color: #0f62fe;
    }

    .chart-card__error {
      color: var(--error-color, #da1e28);
    }

    .chart-card__retry-btn {
      margin-top: 4px;
      padding: 6px 12px;
      border: none;
      background: var(--error-color, #da1e28);
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      transition: all 0.15s ease;
    }

    .chart-card__retry-btn:hover {
      background: #b81922;
    }

    .chart-card__chart {
    }

    .chart-card__chart--hidden {
      visibility: hidden;
    }

    .chart-card__footer {
      padding: 0;
    }

    .chart-card--no-header .chart-card__content {
    }

    .chart-card--no-header .chart-card__footer {
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartCardComponent {
  @Input() title = '';
  @Input() titleKey = '';
  @Input() subtitle = '';
  @Input() loading: ChartLoadingState = 'idle';
  @Input() error: string | null = null;
  @Input() height = 150;
  @Input() showHeader = true;
  @Input() showRefresh = true;
  @Input() showLoadingOverlay = true;
  @Input() showFooter = false;
  @Input() expandable = false;
  @Input() expanded = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() expandedChange = new EventEmitter<boolean>();

  // Icons
  faSync = faSync;
  faSpinner = faSpinner;
  faExclamationTriangle = faExclamationTriangle;
  faExpand = faExpand;
  faCompress = faCompress;

  onRefresh(): void {
    this.refresh.emit();
  }

  onToggleExpand(): void {
    this.expanded = !this.expanded;
    this.expandedChange.emit(this.expanded);
  }
}
