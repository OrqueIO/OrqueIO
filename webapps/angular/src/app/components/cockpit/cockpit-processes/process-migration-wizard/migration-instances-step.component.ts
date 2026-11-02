import {
  Component, ChangeDetectionStrategy, output, input, signal, computed,
  inject, DestroyRef, effect, untracked
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

export type SelectionMode = 'instance' | 'query';

export interface InstancesStepState {
  mode: SelectionMode;
  processInstanceIds?: string[];
  processInstanceQuery?: Record<string, unknown>;
  totalCount: number;
  label: string;
}


@Component({
  selector: 'app-migration-instances-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TranslatePipe,
    InstanceFilterPanelComponent
  ],
  templateUrl: './migration-instances-step.component.html',
  styleUrl: './migration-instances-step.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationInstancesStepComponent {
  private cockpitService = inject(CockpitService);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly back = output<void>();
  readonly next = output<InstancesStepState>();

  readonly sourceDefinitionId = input.required<string>();
  readonly sourceVersion = input.required<number>();

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

  private readonly loadInstances$ = new Subject<void>();

  readonly showExtendedCriteria = true;

  constructor() {
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
      if (defId) {
        untracked(() => {
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
}
