import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  ChangeDetectorRef, inject, DestroyRef, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { CockpitService, ProcessInstance } from '../../../../services/cockpit.service';

export interface InstanceSelectionResult {
  mode: 'instance' | 'query';
  instanceIds: string[];
  query: Record<string, unknown> | null;
  count: number;
}

@Component({
  selector: 'app-select-instances-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TranslatePipe],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-container modal-lg" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">{{ 'cockpit.modify.selectDialog.title' | translate }}</h3>
        </div>
        <div class="modal-body">
          <div class="selection-type">
            <span class="selection-type-label">{{ 'cockpit.modify.selectDialog.selectionType' | translate }}</span>
            <div class="mode-selector">
              <button class="mode-btn" [class.mode-btn--active]="selectionMode === 'instance'"
                      (click)="switchMode('instance')" type="button">
                {{ 'cockpit.modify.selectDialog.instance' | translate }}
              </button>
              <button class="mode-btn" [class.mode-btn--active]="selectionMode === 'query'"
                      (click)="switchMode('query')" type="button">
                {{ 'cockpit.modify.selectDialog.query' | translate }}
              </button>
            </div>
          </div>

          <!-- Instance mode -->
          <ng-container *ngIf="selectionMode === 'instance'">
            <div class="filter-row">
              <div class="filter-pills" *ngIf="sourceActivityId && useActivityFilter">
                <span class="filter-pill">
                  <span class="filter-pill-key">Activity ID</span>
                  <span class="filter-pill-sep">=</span>
                  <span class="filter-pill-val">{{ sourceActivityId }}</span>
                  <button class="filter-pill-remove" (click)="clearActivityFilter()" type="button">
                    <fa-icon [icon]="faTimes" size="xs"></fa-icon>
                  </button>
                </span>
              </div>
              <input class="filter-input" type="text"
                     [placeholder]="'cockpit.modify.selectDialog.filterPlaceholder' | translate"
                     [(ngModel)]="filterText" (input)="applyFilter()" />
              <span class="instance-count" *ngIf="!loading">{{ filteredInstances.length }}</span>
            </div>

            <div class="instances-loading" *ngIf="loading">
              <fa-icon [icon]="faSpinner" animation="spin"></fa-icon>
            </div>

            <div class="instances-error" *ngIf="loadError">
              {{ 'cockpit.modify.selectDialog.loadError' | translate }}
            </div>

            <div class="instances-table-wrapper" *ngIf="!loading && !loadError">
              <table class="instances-table" *ngIf="filteredInstances.length > 0">
                <thead>
                  <tr>
                    <th class="col-check">
                      <input type="checkbox" [checked]="allSelected" (change)="toggleSelectAll()" />
                    </th>
                    <th>{{ 'cockpit.modify.selectDialog.columnId' | translate }}</th>
                    <th>{{ 'cockpit.modify.selectDialog.columnBusinessKey' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let instance of filteredInstances"
                      [class.selected]="selectedIds.has(instance.id)"
                      (click)="toggleInstance(instance.id)">
                    <td class="col-check">
                      <input type="checkbox" [checked]="selectedIds.has(instance.id)"
                             (click)="$event.stopPropagation()" (change)="toggleInstance(instance.id)" />
                    </td>
                    <td class="mono">{{ instance.id }}</td>
                    <td>{{ instance.businessKey || '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="instances-empty" *ngIf="filteredInstances.length === 0">
                {{ 'cockpit.modify.selectDialog.noInstances' | translate }}
              </div>
            </div>
          </ng-container>

          <!-- Query mode -->
          <ng-container *ngIf="selectionMode === 'query'">
            <div class="query-form">
              <div class="query-field">
                <label>{{ 'cockpit.modify.selectDialog.queryBusinessKey' | translate }}</label>
                <input type="text" [(ngModel)]="queryBusinessKey"
                       [placeholder]="'cockpit.modify.selectDialog.queryBusinessKeyPlaceholder' | translate" />
              </div>
              <div class="query-field">
                <label>{{ 'cockpit.modify.selectDialog.queryActivityId' | translate }}</label>
                <input type="text" [(ngModel)]="queryActivityId"
                       [placeholder]="'cockpit.modify.selectDialog.queryActivityIdPlaceholder' | translate" />
              </div>
              <div class="query-field">
                <label>{{ 'cockpit.modify.selectDialog.queryStartedAfter' | translate }}</label>
                <input type="datetime-local" [(ngModel)]="queryStartedAfter" />
              </div>
              <div class="query-field">
                <label>{{ 'cockpit.modify.selectDialog.queryStartedBefore' | translate }}</label>
                <input type="datetime-local" [(ngModel)]="queryStartedBefore" />
              </div>
            </div>

            <div class="query-actions">
              <button type="button" class="query-search-btn" (click)="runQuery()"
                      [disabled]="queryLoading">
                <fa-icon [icon]="queryLoading ? faSpinner : faSearch"
                         [animation]="queryLoading ? 'spin' : undefined"></fa-icon>
                {{ 'cockpit.modify.selectDialog.querySearch' | translate }}
              </button>
            </div>

            <div class="instances-error" *ngIf="queryError">
              {{ 'cockpit.modify.selectDialog.loadError' | translate }}
            </div>

            <ng-container *ngIf="queryResults !== null">
              <div class="filter-row">
                <span class="instance-count">{{ querySelectedIds.size }} / {{ queryResults.length }}
                  {{ 'cockpit.modify.selectDialog.queryMatchingInstances' | translate }}</span>
              </div>
              <div class="instances-table-wrapper" *ngIf="queryResults.length > 0">
                <table class="instances-table">
                  <thead>
                    <tr>
                      <th class="col-check">
                        <input type="checkbox" [checked]="allQuerySelected" (change)="toggleQuerySelectAll()" />
                      </th>
                      <th>{{ 'cockpit.modify.selectDialog.columnId' | translate }}</th>
                      <th>{{ 'cockpit.modify.selectDialog.columnBusinessKey' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let instance of queryResults"
                        [class.selected]="querySelectedIds.has(instance.id)"
                        (click)="toggleQueryInstance(instance.id)">
                      <td class="col-check">
                        <input type="checkbox" [checked]="querySelectedIds.has(instance.id)"
                               (click)="$event.stopPropagation()" (change)="toggleQueryInstance(instance.id)" />
                      </td>
                      <td class="mono">{{ instance.id }}</td>
                      <td>{{ instance.businessKey || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="instances-empty" *ngIf="queryResults.length === 0">
                {{ 'cockpit.modify.selectDialog.noInstances' | translate }}
              </div>
            </ng-container>
          </ng-container>
        </div>
        <div class="modal-footer">
          <button type="button" class="modal-btn modal-btn-secondary" (click)="onCancel()">
            {{ 'cockpit.modify.selectDialog.cancel' | translate }}
          </button>
          <button type="button" class="modal-btn modal-btn-primary confirm-select-btn"
                  [disabled]="!canConfirm"
                  (click)="onConfirm()">
            {{ 'cockpit.modify.selectDialog.confirm' | translate }} ({{ activeSelectedCount }})
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .selection-type {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .selection-type-label {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .mode-selector {
      display: inline-flex;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
    }
    .mode-btn {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      border: none;
      background: var(--bg-base);
      cursor: pointer;
      color: var(--text-primary);
    }
    .mode-btn + .mode-btn {
      border-left: 1px solid var(--border-color);
    }
    .mode-btn--active {
      background: var(--color-orange, #f97316);
      color: white;
    }
    .confirm-select-btn {
      background: var(--color-primary, #2563eb) !important;
      border-color: var(--color-primary, #2563eb) !important;
      color: #fff !important;
    }
    .confirm-select-btn:hover:not(:disabled) {
      background: var(--color-primary-dark, #1d4ed8) !important;
    }
    .confirm-select-btn:disabled {
      opacity: 0.5;
    }
    .filter-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .filter-pills {
      display: flex;
      gap: 0.25rem;
    }
    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.3rem 0.55rem;
      background: var(--color-primary-bg, rgba(37, 99, 235, 0.06));
      border: 1px solid var(--color-primary-light, #93c5fd);
      border-radius: 6px;
      font-size: 0.78rem;
    }
    .filter-pill-key {
      font-weight: 600;
      color: var(--color-primary, #2563eb);
    }
    .filter-pill-sep {
      color: var(--text-muted);
    }
    .filter-pill-val {
      font-family: monospace;
      font-size: 0.76rem;
    }
    .filter-pill-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 0;
      margin-left: 0.15rem;
      display: flex;
    }
    .filter-pill-remove:hover {
      color: var(--text-danger, #e74c3c);
    }
    .filter-input {
      flex: 1;
      min-width: 200px;
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.85rem;
      background: var(--bg-input, var(--bg-base));
      color: var(--text-primary);
    }
    .instance-count {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .instances-loading, .instances-error, .instances-empty {
      padding: 2rem;
      text-align: center;
      color: var(--text-muted);
    }
    .instances-error {
      color: var(--text-danger, #e74c3c);
    }
    .instances-table-wrapper {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: 6px;
    }
    .instances-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .instances-table thead {
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .instances-table th {
      padding: 0.5rem 0.75rem;
      text-align: left;
      background: var(--bg-base);
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .instances-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border-color-light, var(--border-color));
    }
    .instances-table tbody tr {
      cursor: pointer;
    }
    .instances-table tbody tr:hover {
      background: var(--bg-hover);
    }
    .instances-table tbody tr.selected {
      background: var(--bg-info, #e8f4fd);
    }
    .col-check {
      width: 40px;
      text-align: center;
    }
    .mono {
      font-family: monospace;
      font-size: 0.8rem;
    }
    .query-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .query-field label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }
    .query-field input {
      width: 100%;
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.85rem;
      background: var(--bg-input, var(--bg-base));
      color: var(--text-primary);
      box-sizing: border-box;
    }
    .query-actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .query-search-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.85rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-base);
      color: var(--text-primary);
      font-size: 0.85rem;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .query-search-btn:hover:not(:disabled) {
      border-color: var(--color-primary, #2563eb);
      color: var(--color-primary, #2563eb);
    }
    .query-search-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectInstancesDialogComponent implements OnInit {
  private cockpitService = inject(CockpitService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @Input() processDefinitionId!: string;
  @Input() sourceActivityId: string | null = null;

  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<InstanceSelectionResult>();

  faSpinner = faSpinner;
  faTimes = faTimes;
  faSearch = faSearch;

  selectionMode: 'instance' | 'query' = 'instance';
  loading = true;
  loadError = false;
  filterText = '';
  useActivityFilter = true;

  instances: ProcessInstance[] = [];
  filteredInstances: ProcessInstance[] = [];
  selectedIds = new Set<string>();

  queryBusinessKey = '';
  queryActivityId = '';
  queryStartedAfter = '';
  queryStartedBefore = '';
  queryResults: ProcessInstance[] | null = null;
  querySelectedIds = new Set<string>();
  queryLoading = false;
  queryError = false;

  ngOnInit(): void {
    if (this.sourceActivityId) {
      this.queryActivityId = this.sourceActivityId;
    }
    this.loadInstances();
  }

  switchMode(mode: 'instance' | 'query'): void {
    this.selectionMode = mode;
    this.cdr.markForCheck();
  }

  get activeSelectedCount(): number {
    return this.selectionMode === 'instance' ? this.selectedIds.size : this.querySelectedIds.size;
  }

  get canConfirm(): boolean {
    return this.activeSelectedCount > 0;
  }

  private loadInstances(): void {
    this.loading = true;
    this.loadError = false;
    this.cdr.markForCheck();

    const body: Record<string, unknown> = {
      processDefinitionId: this.processDefinitionId,
      active: true,
      sorting: [{ sortBy: 'startTime', sortOrder: 'desc' }]
    };

    if (this.sourceActivityId && this.useActivityFilter) {
      body['activeActivityIdIn'] = [this.sourceActivityId];
    }

    this.cockpitService.queryProcessInstances(body, 0, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (instances) => {
          this.instances = instances;
          this.applyFilter();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadError = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  applyFilter(): void {
    const text = this.filterText.trim().toLowerCase();
    this.filteredInstances = text
      ? this.instances.filter(i =>
          i.id.toLowerCase().includes(text) ||
          (i.businessKey && i.businessKey.toLowerCase().includes(text))
        )
      : [...this.instances];
  }

  clearActivityFilter(): void {
    this.useActivityFilter = false;
    this.loadInstances();
  }

  get allSelected(): boolean {
    return this.filteredInstances.length > 0 &&
      this.filteredInstances.every(i => this.selectedIds.has(i.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.filteredInstances.forEach(i => this.selectedIds.delete(i.id));
    } else {
      this.filteredInstances.forEach(i => this.selectedIds.add(i.id));
    }
    this.cdr.markForCheck();
  }

  toggleInstance(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.cdr.markForCheck();
  }

  buildQueryBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {
      processDefinitionId: this.processDefinitionId,
      active: true
    };
    if (this.queryBusinessKey.trim()) {
      body['processInstanceBusinessKeyLike'] = `%${this.queryBusinessKey.trim()}%`;
    }
    if (this.queryActivityId.trim()) {
      body['activeActivityIdIn'] = this.queryActivityId.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (this.queryStartedAfter) {
      body['startedAfter'] = new Date(this.queryStartedAfter).toISOString();
    }
    if (this.queryStartedBefore) {
      body['startedBefore'] = new Date(this.queryStartedBefore).toISOString();
    }
    return body;
  }

  runQuery(): void {
    this.queryLoading = true;
    this.queryError = false;
    this.queryResults = null;
    this.querySelectedIds.clear();
    this.cdr.markForCheck();

    const body = {
      ...this.buildQueryBody(),
      sorting: [{ sortBy: 'startTime', sortOrder: 'desc' }]
    };

    this.cockpitService.queryProcessInstances(body, 0, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (instances) => {
          this.queryResults = instances;
          instances.forEach(i => this.querySelectedIds.add(i.id));
          this.queryLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.queryError = true;
          this.queryLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  get allQuerySelected(): boolean {
    return !!this.queryResults && this.queryResults.length > 0 &&
      this.queryResults.every(i => this.querySelectedIds.has(i.id));
  }

  toggleQuerySelectAll(): void {
    if (!this.queryResults) return;
    if (this.allQuerySelected) {
      this.queryResults.forEach(i => this.querySelectedIds.delete(i.id));
    } else {
      this.queryResults.forEach(i => this.querySelectedIds.add(i.id));
    }
    this.cdr.markForCheck();
  }

  toggleQueryInstance(id: string): void {
    if (this.querySelectedIds.has(id)) {
      this.querySelectedIds.delete(id);
    } else {
      this.querySelectedIds.add(id);
    }
    this.cdr.markForCheck();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onConfirm(): void {
    if (this.selectionMode === 'instance') {
      this.confirmed.emit({
        mode: 'instance',
        instanceIds: Array.from(this.selectedIds),
        query: null,
        count: this.selectedIds.size
      });
    } else {
      this.confirmed.emit({
        mode: 'query',
        instanceIds: Array.from(this.querySelectedIds),
        query: null,
        count: this.querySelectedIds.size
      });
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cancelled.emit();
    }
  }
}
