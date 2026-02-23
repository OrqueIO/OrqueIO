import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faExclamationTriangle,
  faInfoCircle,
  faChevronDown,
  faChevronRight,
  faCopy,
  faSync
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import * as SystemActions from '../../../../store/admin/system/system.actions';
import * as SystemSelectors from '../../../../store/admin/system/system.selectors';
import { TelemetryData } from '../../../../models/admin/system.model';

@Component({
  selector: 'app-system-diagnostics',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    TranslatePipe
  ],
  templateUrl: './system-diagnostics.html',
  styleUrls: ['./system-diagnostics.css']
})
export class SystemDiagnosticsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private store = inject(Store);

  // Icons
  faSpinner = faSpinner;
  faExclamationTriangle = faExclamationTriangle;
  faInfoCircle = faInfoCircle;
  faChevronDown = faChevronDown;
  faChevronRight = faChevronRight;
  faCopy = faCopy;
  faSync = faSync;

  // State
  telemetryData: TelemetryData | null = null;
  loading = false;
  error: string | null = null;
  expandedSections: Set<string> = new Set(['product']);

  ngOnInit(): void {
    this.loadData();
    this.subscribeToState();
  }

  private loadData(): void {
    this.store.dispatch(SystemActions.loadTelemetryData({}));
  }

  private subscribeToState(): void {
    this.store.select(SystemSelectors.selectTelemetryData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        this.telemetryData = data;
        this.cdr.markForCheck();
      });

    this.store.select(SystemSelectors.selectTelemetryLoading)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    this.store.select(SystemSelectors.selectTelemetryError)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(error => {
        this.error = error;
        this.cdr.markForCheck();
      });
  }

  refresh(): void {
    this.loadData();
  }

  toggleSection(section: string): void {
    if (this.expandedSections.has(section)) {
      this.expandedSections.delete(section);
    } else {
      this.expandedSections.add(section);
    }
    this.cdr.markForCheck();
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections.has(section);
  }

  copyToClipboard(): void {
    if (this.telemetryData) {
      const text = JSON.stringify(this.telemetryData, null, 2);
      navigator.clipboard.writeText(text);
    }
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }
}
