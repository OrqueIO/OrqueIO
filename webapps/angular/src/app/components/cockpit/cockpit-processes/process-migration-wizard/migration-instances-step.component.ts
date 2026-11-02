import {
  Component, ChangeDetectionStrategy, output, input, signal, computed,
  inject, DestroyRef, effect, untracked, HostListener, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faQuestionCircle, faSpinner, faSearch, faLink, faSave, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Subject, switchMap, catchError, of, forkJoin } from 'rxjs';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { CockpitService, MultiValueFilter, ProcessInstance } from '../../../../services/cockpit.service';
import { InstanceFilterPanelComponent, FilterPanelChange } from '../../../../shared/instance-filter-panel/instance-filter-panel';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';

export type SelectionMode = 'instance' | 'query';

export interface InstancesStepState {
  mode: SelectionMode;
  processInstanceIds?: string[];
  processInstanceQuery?: Record<string, unknown>;
  totalCount: number;
  label: string;
}

export interface SavedFilter {
  name: string;
  criteria: MultiValueFilter[];
  processDefinitionId?: string;
  savedAt: string;
}

export interface MigrationWizardSnapshot {
  sourceDefinitionId: string;
  targetDefinitionId: string;
  instructions: any[];
  variables: any[];
  filterCriteria: MultiValueFilter[];
  vnIgnoreCase: boolean;
  vvIgnoreCase: boolean;
  mode: SelectionMode;
  createdAt: string;
}


@Component({
  selector: 'app-migration-instances-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TranslatePipe,
    InstanceFilterPanelComponent,
    PaginationComponent
  ],
  templateUrl: './migration-instances-step.component.html',
  styleUrl: './migration-instances-step.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationInstancesStepComponent implements OnDestroy {
  private cockpitService = inject(CockpitService);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly back = output<void>();
  readonly next = output<InstancesStepState>();

  readonly sourceDefinitionId = input.required<string>();
  readonly sourceVersion = input.required<number>();
  readonly targetDefinitionId = input.required<string>();

  readonly instructions = input<any[]>([]);
  readonly variables = input<any[]>([]);

  readonly initialCriteria = input<MultiValueFilter[] | null>(null);
  readonly initialVnIgnoreCase = input<boolean>(false);
  readonly initialVvIgnoreCase = input<boolean>(false);

  readonly faQuestionCircle = faQuestionCircle;
  readonly faSpinner = faSpinner;
  readonly faSearch = faSearch;
  readonly faLink = faLink;
  readonly faSave = faSave;
  readonly faChevronDown = faChevronDown;

  readonly mode = signal<SelectionMode>('instance');

  readonly filterCriteria = signal<MultiValueFilter[]>([]);
  readonly vnIgnoreCase = signal(false);
  readonly vvIgnoreCase = signal(false);

  readonly instances = signal<ProcessInstance[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly error = signal(false);

  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly Math = Math;

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly allOnPageSelected = computed(() => {
    const instances = this.instances();
    const selectedIds = this.selectedIds();
    return instances.length > 0 && instances.every(inst => selectedIds.has(inst.id));
  });

  readonly isIndeterminate = computed(() => {
    const instances = this.instances();
    const selectedIds = this.selectedIds();
    const selectedOnPage = instances.filter(inst => selectedIds.has(inst.id)).length;
    return selectedOnPage > 0 && selectedOnPage < instances.length;
  });

  readonly showSaveDropdown = signal(false);
  readonly savedFilters = signal<SavedFilter[]>([]);
  readonly statusMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly filterNameInput = signal('');

  private readonly loadInstances$ = new Subject<void>();
  private readonly SAVED_FILTERS_KEY = 'cockpit-saved-filters';
  private readonly SNAPSHOT_KEY_PREFIX = 'migration-wizard-link:';
  private readonly SNAPSHOT_MAX_COUNT = 10;
  private readonly SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  private statusMessageTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly showExtendedCriteria = true;

  constructor() {
    this.loadSavedFilters();

    this.loadInstances$.pipe(
      switchMap(() => {
        this.loading.set(true);
        this.error.set(false);

        const criteria = this.buildQueryCriteria();
        const firstResult = (this.currentPage() - 1) * this.pageSize;

        return forkJoin({
          results: this.cockpitService.searchProcessInstancesGlobal(
            criteria,
            this.vnIgnoreCase(),
            this.vvIgnoreCase(),
            firstResult,
            this.pageSize
          ),
          count: this.cockpitService.searchProcessInstancesGlobalCount(
            criteria,
            this.vnIgnoreCase(),
            this.vvIgnoreCase()
          )
        }).pipe(
          catchError(() => {
            this.loading.set(false);
            this.error.set(true);
            return of({ results: [], count: 0 });
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ results, count }) => {
      this.instances.set(results);
      this.totalCount.set(count);
      this.loading.set(false);
    });

    effect(() => {
      const defId = this.sourceDefinitionId();
      const initialCriteria = this.initialCriteria();

      if (defId && (!initialCriteria || initialCriteria.length === 0)) {
        untracked(() => {
          this.loadInstances$.next();
        });
      }
    });

    effect(() => {
      const criteria = this.initialCriteria();
      const defId = this.sourceDefinitionId();

      if (criteria && criteria.length > 0 && defId) {
        untracked(() => {
          const filtered = criteria.filter(c => c.field !== 'processDefinition' && c.field !== 'state');
          this.filterCriteria.set(filtered);
          this.vnIgnoreCase.set(this.initialVnIgnoreCase());
          this.vvIgnoreCase.set(this.initialVvIgnoreCase());

          this.loadInstances$.next();
        });
      }
    });
  }


  private buildQueryCriteria(): MultiValueFilter[] {
    const criteria: MultiValueFilter[] = [...this.filterCriteria()];

    const defId = this.sourceDefinitionId();
    if (defId) {
      criteria.unshift({
        field: 'processDefinition' as const,
        values: [],
        processDefinitionIds: [defId]
      });
    }

    const hasStateActive = criteria.some(f => f.field === 'stateActive');
    const hasStateSuspended = criteria.some(f => f.field === 'stateSuspended');

    const stateValue = (hasStateActive && !hasStateSuspended) ? 'active'
      : (hasStateSuspended && !hasStateActive) ? 'suspended'
      : 'unfinished';

    criteria.unshift({
      field: 'state' as const,
      values: [stateValue]
    });

    return criteria;
  }


  onModeChange(newMode: SelectionMode): void {
    if (newMode === this.mode()) return;

    this.mode.set(newMode);

    if (newMode === 'query') {
      this.selectedIds.set(new Set());
    }
  }

  onFilterChange(change: FilterPanelChange): void {
    this.filterCriteria.set(change.criteria);
    this.vnIgnoreCase.set(change.vnIgnoreCase);
    this.vvIgnoreCase.set(change.vvIgnoreCase);
    this.currentPage.set(1); // Reset to first page
    this.loadInstances$.next();
  }

  toggleInstanceSelection(instanceId: string): void {
    const selected = new Set(this.selectedIds());
    if (selected.has(instanceId)) {
      selected.delete(instanceId);
    } else {
      selected.add(instanceId);
    }
    this.selectedIds.set(selected);
  }

  toggleSelectAll(): void {
    const instances = this.instances();
    const selected = new Set(this.selectedIds());

    if (this.allOnPageSelected()) {
      instances.forEach(inst => selected.delete(inst.id));
    } else {
      instances.forEach(inst => selected.add(inst.id));
    }

    this.selectedIds.set(selected);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadInstances$.next();
  }

  onPaginationChange(event: PageChangeEvent): void {
    this.currentPage.set(event.current);
    if (event.size !== this.pageSize) {
    }
    this.loadInstances$.next();
  }


  retry(): void {
    this.loadInstances$.next();
  }

  getPrimaryButtonLabel(): string {
    const mode = this.mode();
    const selectedCount = this.selectedIds().size;
    const totalCount = this.totalCount();

    const count = mode === 'query' ? totalCount : selectedCount;

    return this.translateService.instant('migration.instances.migrateSelectedInstances', {
      count: count.toString()
    });
  }

  isPrimaryButtonDisabled(): boolean {
    const mode = this.mode();

    if (this.loading()) {
      return true;
    }

    if (mode === 'instance') {
      return this.selectedIds().size === 0;
    } else {
      return this.totalCount() === 0;
    }
  }

  getDisabledReason(): string | null {
    const mode = this.mode();

    if (mode === 'instance' && this.selectedIds().size === 0) {
      return null;
    }

    if (mode === 'query' && this.totalCount() === 0) {
      return this.translateService.instant('migration.instances.noRunningInstances');
    }

    return null;
  }

  onNextClick(): void {
    if (this.isPrimaryButtonDisabled()) return;

    const mode = this.mode();
    const selectedCount = this.selectedIds().size;
    const totalCount = this.totalCount();

    let state: InstancesStepState;

    if (mode === 'query') {
      const queryParams = this.buildQueryParamsForApi();
      state = {
        mode: 'query',
        processInstanceQuery: queryParams,
        totalCount: totalCount,
        label: this.translateService.instant('migration.instances.selectedLabel', {
          count: totalCount.toString()
        })
      };
    } else {
      state = {
        mode: 'instance',
        processInstanceIds: Array.from(this.selectedIds()),
        totalCount: selectedCount,
        label: this.translateService.instant('migration.instances.selectedLabel', {
          count: selectedCount.toString()
        })
      };
    }

    this.next.emit(state);
  }

  private buildQueryParamsForApi(): Record<string, unknown> {
    const params: Record<string, unknown> = {
      processDefinitionId: this.sourceDefinitionId()
    };

    this.filterCriteria().forEach(filter => {
      switch (filter.field) {
        case 'businessKey':
          if (filter.values.length > 0) {
            params['businessKey'] = filter.values[0];
          }
          break;
        case 'instanceId':
          if (filter.values.length > 0) {
            params['processInstanceIds'] = filter.values;
          }
          break;
        case 'startedAfter':
          if (filter.values.length > 0) {
            params['startedAfter'] = filter.values[0];
          }
          break;
        case 'startedBefore':
          if (filter.values.length > 0) {
            params['startedBefore'] = filter.values[0];
          }
          break;
        case 'activityId':
          if (filter.values.length > 0) {
            params['activityIdIn'] = filter.values;
          }
          break;
        case 'incidentId':
          if (filter.values.length > 0) {
            params['incidentId'] = filter.values[0];
          }
          break;
      }
    });

    return params;
  }


  onBackClick(): void {
    this.back.emit();
  }

  getProcessKeyFromDefinitionId(): string {
    const defId = this.sourceDefinitionId();
    if (!defId) return '';
    const parts = defId.split(':');
    return parts.length > 0 ? parts[0] : '';
  }

  async copyFilterLink(): Promise<void> {
    try {
      const url = this.buildFilterUrl();
      await navigator.clipboard.writeText(url);
      this.showStatusMessage('success', this.translateService.instant('migration.instances.linkCopied'));
    } catch (error) {
      this.showStatusMessage('error', this.translateService.instant('migration.instances.linkCopyFailed'));
    }
  }

  private buildFilterUrl(): string {
    const baseUrl = window.location.origin + '/cockpit/processes/migration';
    const params = new URLSearchParams();

    const snapshotId = this.saveSnapshot();
    if (snapshotId) {
      params.append('restore', snapshotId);
    }

    const sourceDefId = this.sourceDefinitionId();
    const targetDefId = this.targetDefinitionId();
    if (sourceDefId) {
      params.append('source', sourceDefId);
    }
    if (targetDefId) {
      params.append('target', targetDefId);
    }

    const criteria = this.filterCriteria().filter(c =>
      c.field !== 'processDefinition' && c.field !== 'state'
    );
    if (criteria.length > 0) {
      params.append('criteria', JSON.stringify(criteria));
    }

    if (this.vnIgnoreCase()) {
      params.append('vnIgnoreCase', 'true');
    }

    if (this.vvIgnoreCase()) {
      params.append('vvIgnoreCase', 'true');
    }

    return `${baseUrl}?${params.toString()}`;
  }

  private saveSnapshot(): string | null {
    try {
      const snapshotId = crypto.randomUUID();
      const snapshot: MigrationWizardSnapshot = {
        sourceDefinitionId: this.sourceDefinitionId(),
        targetDefinitionId: this.targetDefinitionId(),
        instructions: this.instructions(),
        variables: this.variables(),
        filterCriteria: this.filterCriteria().filter(c =>
          c.field !== 'processDefinition' && c.field !== 'state'
        ),
        vnIgnoreCase: this.vnIgnoreCase(),
        vvIgnoreCase: this.vvIgnoreCase(),
        mode: this.mode(),
        createdAt: new Date().toISOString()
      };

      const key = this.SNAPSHOT_KEY_PREFIX + snapshotId;
      localStorage.setItem(key, JSON.stringify(snapshot));

      this.cleanupSnapshots();

      return snapshotId;
    } catch (error) {
      console.warn('Failed to save migration snapshot to localStorage:', error);
      return null;
    }
  }

  private cleanupSnapshots(): void {
    try {
      const now = Date.now();
      const snapshots: { key: string; createdAt: number }[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.SNAPSHOT_KEY_PREFIX)) {
          try {
            const data = JSON.parse(localStorage.getItem(key)!);
            const createdAt = new Date(data.createdAt).getTime();

            if (now - createdAt > this.SNAPSHOT_MAX_AGE_MS) {
              localStorage.removeItem(key);
            } else {
              snapshots.push({ key, createdAt });
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      }

      if (snapshots.length > this.SNAPSHOT_MAX_COUNT) {
        snapshots.sort((a, b) => b.createdAt - a.createdAt);
        for (let i = this.SNAPSHOT_MAX_COUNT; i < snapshots.length; i++) {
          localStorage.removeItem(snapshots[i].key);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup snapshots:', error);
    }
  }

  toggleSaveDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showSaveDropdown.update(show => !show);
  }

  closeSaveDropdown(): void {
    this.showSaveDropdown.set(false);
    this.filterNameInput.set('');
  }

  saveCurrentFilter(): void {
    const name = this.filterNameInput().trim();
    if (!name) {
      return;
    }

    const newFilter: SavedFilter = {
      name,
      criteria: [...this.filterCriteria()],
      processDefinitionId: this.sourceDefinitionId(),
      savedAt: new Date().toISOString()
    };

    const filters = this.savedFilters();
    const existingIndex = filters.findIndex(f => f.name === name);

    if (existingIndex >= 0) {
      filters[existingIndex] = newFilter;
    } else {
      filters.push(newFilter);
    }

    this.savedFilters.set([...filters]);
    this.persistFilters();
    this.closeSaveDropdown();
    this.showStatusMessage('success', this.translateService.instant('migration.instances.filterSaved'));
  }

  loadFilter(filter: SavedFilter): void {
    const criteriaWithoutProcDef = filter.criteria.filter(c => c.field !== 'processDefinition');
    this.filterCriteria.set(criteriaWithoutProcDef);
    this.currentPage.set(1);
    this.loadInstances$.next();
    this.closeSaveDropdown();
    this.showStatusMessage('success', this.translateService.instant('migration.instances.filterLoaded'));
  }

  deleteFilter(filter: SavedFilter, event: Event): void {
    event.stopPropagation();
    const filters = this.savedFilters().filter(f => f.name !== filter.name);
    this.savedFilters.set(filters);
    this.persistFilters();
    this.showStatusMessage('success', this.translateService.instant('migration.instances.filterDeleted'));
  }

  private loadSavedFilters(): void {
    try {
      const stored = localStorage.getItem(this.SAVED_FILTERS_KEY);
      if (stored) {
        const filters = JSON.parse(stored) as SavedFilter[];
        this.savedFilters.set(filters);
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
  }

  private persistFilters(): void {
    try {
      localStorage.setItem(this.SAVED_FILTERS_KEY, JSON.stringify(this.savedFilters()));
    } catch (error) {
      console.error('Failed to persist filters:', error);
    }
  }

  private showStatusMessage(type: 'success' | 'error', text: string): void {
    if (this.statusMessageTimeout) {
      clearTimeout(this.statusMessageTimeout);
    }

    this.statusMessage.set({ type, text });
    this.statusMessageTimeout = setTimeout(() => {
      this.statusMessage.set(null);
      this.statusMessageTimeout = null;
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.statusMessageTimeout) {
      clearTimeout(this.statusMessageTimeout);
      this.statusMessageTimeout = null;
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showSaveDropdown()) {
      this.closeSaveDropdown();
    }
  }
}
