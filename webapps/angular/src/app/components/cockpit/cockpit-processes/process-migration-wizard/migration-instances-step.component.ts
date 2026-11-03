import {
  Component, ChangeDetectionStrategy, output, input, signal, computed,
  inject, DestroyRef, effect, untracked, HostListener, OnDestroy,
  ViewChild, ElementRef, afterNextRender, Injector
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faQuestionCircle, faSpinner, faSearch, faLink, faSave, faChevronDown, faTimes,
  faKey, faHashtag, faExclamationTriangle, faSync, faPlay, faPauseCircle, faPlayCircle,
  faCheckCircle, faTimesCircle, faSitemap, faCalendarAlt, faCode, faCircleDot, faFilter
} from '@fortawesome/free-solid-svg-icons';
import { Subject, switchMap, catchError, of, forkJoin, map } from 'rxjs';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { CockpitService, MultiValueFilter, ProcessInstance } from '../../../../services/cockpit.service';
import { ProcessDefinitionService } from '../../../../services/process-definition.service';
import { InstanceFilterPanelComponent, FilterPanelChange } from '../../../../shared/instance-filter-panel/instance-filter-panel';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { SavedFiltersMenuComponent, SavedFilter } from './saved-filters-menu.component';
import { BpmnElement } from '../../../../shared/bpmn-viewer/bpmn-viewer';
import { CamDatePipe } from '../../../../pipes/cam-date.pipe';

export type SelectionMode = 'instance' | 'query';

export interface InstancesStepState {
  mode: SelectionMode;
  processInstanceIds?: string[];
  processInstanceQuery?: Record<string, unknown>;
  totalCount: number;
  label: string;
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
    CamDatePipe,
    InstanceFilterPanelComponent,
    PaginationComponent,
    SavedFiltersMenuComponent
  ],
  templateUrl: './migration-instances-step.component.html',
  styleUrl: './migration-instances-step.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationInstancesStepComponent implements OnDestroy {
  private cockpitService = inject(CockpitService);
  private translateService = inject(TranslateService);
  private processDefinitionService = inject(ProcessDefinitionService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);

  @ViewChild('saveMenuButton', { read: ElementRef }) saveMenuButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('savedFiltersMenuContainer', { read: ElementRef }) savedFiltersMenuContainer?: ElementRef<HTMLDivElement>;

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
  readonly faTimes = faTimes;
  readonly faKey = faKey;
  readonly faHashtag = faHashtag;
  readonly faExclamationTriangle = faExclamationTriangle;
  readonly faSync = faSync;
  readonly faPlay = faPlay;
  readonly faPauseCircle = faPauseCircle;
  readonly faPlayCircle = faPlayCircle;
  readonly faCheckCircle = faCheckCircle;
  readonly faTimesCircle = faTimesCircle;
  readonly faSitemap = faSitemap;
  readonly faCalendarAlt = faCalendarAlt;
  readonly faCode = faCode;
  readonly faCircleDot = faCircleDot;
  readonly faFilter = faFilter;

  readonly mode = signal<SelectionMode>('instance');

  readonly filterCriteria = signal<MultiValueFilter[]>([]);
  readonly vnIgnoreCase = signal(false);
  readonly vvIgnoreCase = signal(false);

  readonly instances = signal<ProcessInstance[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly error = signal(false);

  readonly availableActivities = signal<BpmnElement[]>([]);

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
  readonly showNewSaveMenu = signal(false);
  readonly saveMenuPosition = signal<{ top: number; left: number; maxHeight?: number | null } | null>(null);
  readonly statusMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  private readonly loadInstances$ = new Subject<void>();
  private readonly loadActivities$ = new Subject<string>();
  private readonly SAVED_FILTERS_KEY = 'cockpit-saved-filters';
  private readonly SNAPSHOT_KEY_PREFIX = 'migration-wizard-link:';
  private readonly SNAPSHOT_MAX_COUNT = 10;
  private readonly SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  private statusMessageTimeout: ReturnType<typeof setTimeout> | null = null;

  private scrollListener?: () => void;
  private resizeListener?: () => void;

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
          const hadProcessDefinition = criteria.some(c => c.field === 'processDefinition');
          const filtered = criteria.filter(c => c.field !== 'processDefinition' && c.field !== 'state');
          this.filterCriteria.set(filtered);
          this.vnIgnoreCase.set(this.initialVnIgnoreCase());
          this.vvIgnoreCase.set(this.initialVvIgnoreCase());

          if (hadProcessDefinition) {
            const processDefLabel = this.translateService.instant('cockpit.processes.filters.processDefinition');
            this.showStatusMessage(
              'success',
              this.translateService.instant('migration.instances.filterLoadedWithIgnored', { fields: processDefLabel })
            );
          }

          this.loadInstances$.next();
        });
      }
    });

    this.loadActivities$.pipe(
      switchMap(defId => {
        if (!defId) return of([]);
        return this.processDefinitionService.getBpmn20Xml(defId).pipe(
          map(res => res ? this.parseBpmnActivities(res.bpmn20Xml) : []),
          catchError(() => of([]))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(activities => {
      this.availableActivities.set(activities);
    });

    effect(() => {
      const defId = this.sourceDefinitionId();
      if (defId) {
        untracked(() => {
          this.loadActivities$.next(defId);
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

  toggleNewSaveMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const isOpening = !this.showNewSaveMenu();
    this.showNewSaveMenu.update(show => !show);

    if (isOpening) {
      afterNextRender(() => {
        this.calculateMenuPosition();
        this.attachPositionListeners();
      }, { injector: this.injector });
    } else {
      this.detachPositionListeners();
    }
  }

  private calculateMenuPosition(): void {
    const button = this.saveMenuButton?.nativeElement;
    const menuContainer = this.savedFiltersMenuContainer?.nativeElement;

    if (!button || !menuContainer) {
      this.saveMenuPosition.set({ top: 100, left: 20 });
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuRect = menuContainer.getBoundingClientRect();
    const menuHeight = menuRect.height || 300;
    const menuWidth = menuRect.width || 300;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    const MARGIN = 8;

    let left = rect.right - menuWidth;

    if (left < MARGIN) {
      left = MARGIN;
    }
    if (left + menuWidth > viewportWidth - MARGIN) {
      left = viewportWidth - menuWidth - MARGIN;
    }

    let top: number;
    let maxHeight: number | null = null;

    if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
      top = rect.bottom + 8;

      if (top + menuHeight > viewportHeight - MARGIN) {
        maxHeight = viewportHeight - top - MARGIN;
      }
    } else {
      top = rect.top - 8 - menuHeight;
      if (top < MARGIN) {
        top = MARGIN;
        maxHeight = rect.top - MARGIN - 8;
      }
    }

    if (top < MARGIN) {
      top = MARGIN;
    }

    this.saveMenuPosition.set({ top, left, maxHeight });
  }

  private attachPositionListeners(): void {
    this.detachPositionListeners();

    this.scrollListener = () => this.calculateMenuPosition();
    this.resizeListener = () => this.calculateMenuPosition();

    window.addEventListener('scroll', this.scrollListener, { capture: true });
    window.addEventListener('resize', this.resizeListener);
  }

  private detachPositionListeners(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener, { capture: true });
      this.scrollListener = undefined;
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }
  }

  closeNewSaveMenu(): void {
    this.showNewSaveMenu.set(false);
    this.detachPositionListeners();
  }

  onFilterSaved(filter: SavedFilter): void {
    this.showStatusMessage('success', this.translateService.instant('migration.instances.filterSaved'));
  }

  onFilterLoaded(filter: SavedFilter): void {
    const hadProcessDefinition = filter.criteria.some(c => c.field === 'processDefinition');
    const criteriaWithoutProcDef = filter.criteria.filter(c => c.field !== 'processDefinition');

    const knownFields: Set<string> = new Set([
      'businessKey', 'instanceId', 'state', 'stateActive', 'stateSuspended',
      'withIncidents', 'withJobsRetrying', 'startedAfter', 'startedBefore',
      'finishedAfter', 'finishedBefore', 'variable', 'variables'
    ]);

    const applicableCriteria: MultiValueFilter[] = [];
    const ignoredCriteria: string[] = [];

    if (hadProcessDefinition) {
      ignoredCriteria.push(this.translateService.instant('cockpit.processes.filters.processDefinition'));
    }

    for (const criterion of criteriaWithoutProcDef) {
      if (knownFields.has(criterion.field)) {
        applicableCriteria.push(criterion);
      } else {
        ignoredCriteria.push(criterion.field);
      }
    }

    if (applicableCriteria.length === 0 && criteriaWithoutProcDef.length > 0) {
      this.closeNewSaveMenu();
      this.showStatusMessage('error', this.translateService.instant('migration.instances.filterNoApplicableCriteria'));
      return;
    }

    if (applicableCriteria.length === 0 && criteriaWithoutProcDef.length === 0) {
      this.closeNewSaveMenu();
      this.showStatusMessage('error', this.translateService.instant('migration.instances.filterEmpty'));
      return;
    }

    this.filterCriteria.set(applicableCriteria);
    this.currentPage.set(1);
    this.loadInstances$.next();
    this.closeNewSaveMenu();

    if (ignoredCriteria.length > 0) {
      const ignoredNames = ignoredCriteria.join(', ');
      this.showStatusMessage(
        'success',
        this.translateService.instant('migration.instances.filterLoadedWithIgnored', { fields: ignoredNames })
      );
    } else {
      this.showStatusMessage('success', this.translateService.instant('migration.instances.filterLoaded'));
    }
  }

  onFilterDeleted(filter: SavedFilter): void {
    this.showStatusMessage('success', this.translateService.instant('migration.instances.filterDeleted'));
  }

  getPillIcon(pill: MultiValueFilter): any {
    switch (pill.field) {
      case 'businessKey':       return this.faKey;
      case 'instanceId':        return this.faHashtag;
      case 'withIncidents':     return this.faExclamationTriangle;
      case 'withJobsRetrying':  return this.faSync;
      case 'stateActive':       return this.faPlay;
      case 'stateSuspended':    return this.faPauseCircle;
      case 'stateCompleted':    return this.faCheckCircle;
      case 'stateTerminated':   return this.faTimesCircle;
      case 'processDefinition': return this.faSitemap;
      case 'startedAfter':
      case 'startedBefore':
      case 'finishedAfter':
      case 'finishedBefore':    return this.faCalendarAlt;
      case 'variable':
      case 'variables':         return this.faCode;
      case 'state':             return this.faCircleDot;
      default:                  return this.faFilter;
    }
  }

  getPillLabel(pill: MultiValueFilter): string {
    const t = (key: string, params?: Record<string, string>) => this.translateService.instant(key, params);

    switch (pill.field) {
      case 'businessKey':
        return t('cockpit.processes.globalSearch.pill.businessKey', { value: pill.values.join(', ') });
      case 'instanceId':
        return t('cockpit.processes.globalSearch.pill.instanceId', { value: pill.values.join(', ') });
      case 'withIncidents':
        return t('cockpit.processes.globalSearch.pill.withIncidents');
      case 'withJobsRetrying':
        return t('cockpit.processes.globalSearch.pill.withJobsRetrying');
      case 'stateActive':
        return t('cockpit.processes.globalSearch.pill.stateActive');
      case 'stateSuspended':
        return t('cockpit.processes.globalSearch.pill.stateSuspended');
      case 'stateCompleted':
        return t('cockpit.processes.globalSearch.pill.stateCompleted');
      case 'stateTerminated':
        return t('cockpit.processes.globalSearch.pill.stateTerminated');
      case 'startedAfter':
        return t('cockpit.processes.globalSearch.pill.startedAfter', { value: pill.values.join(', ') });
      case 'startedBefore':
        return t('cockpit.processes.globalSearch.pill.startedBefore', { value: pill.values.join(', ') });
      case 'finishedAfter':
        return t('cockpit.processes.globalSearch.pill.finishedAfter', { value: pill.values.join(', ') });
      case 'finishedBefore':
        return t('cockpit.processes.globalSearch.pill.finishedBefore', { value: pill.values.join(', ') });
      case 'variable':
      case 'variables':
        if (pill.variableName) {
          return t('cockpit.processes.globalSearch.pill.variable', { name: pill.variableName, value: pill.values.join(', ') });
        }
        return t('cockpit.processes.globalSearch.pill.variables', { count: pill.values.length.toString() });
      default:
        return `${pill.field}: ${pill.values.join(', ')}`;
    }
  }

  removePill(index: number): void {
    const current = this.filterCriteria();
    const updated = current.filter((_, i) => i !== index);
    this.filterCriteria.set(updated);
    this.currentPage.set(1);
    this.loadInstances$.next();
  }

  clearAllPills(): void {
    this.filterCriteria.set([]);
    this.currentPage.set(1);
    this.loadInstances$.next();
  }

  getStateBadgeClass(state: string): string {
    const computedState = this.computeInstanceState(state);
    switch (computedState) {
      case 'running':    return 'state-active';
      case 'suspended':  return 'state-suspended';
      case 'completed':  return 'state-completed';
      case 'terminated': return 'state-terminated';
      default:           return '';
    }
  }

  getStateBadgeIcon(state: string): any {
    const computedState = this.computeInstanceState(state);
    switch (computedState) {
      case 'running':    return this.faPlayCircle;
      case 'suspended':  return this.faPauseCircle;
      case 'completed':  return this.faCheckCircle;
      case 'terminated': return this.faTimesCircle;
      default:           return this.faPlayCircle;
    }
  }

  getStateLabel(state: string): string {
    const computedState = this.computeInstanceState(state);
    switch (computedState) {
      case 'running':    return 'cockpit.processes.globalSearch.instanceStateRunning';
      case 'suspended':  return 'cockpit.processes.filters.stateSuspended';
      case 'completed':  return 'cockpit.processes.filters.stateCompleted';
      case 'terminated': return 'cockpit.processes.filters.stateTerminated';
      default:           return '';
    }
  }

  private computeInstanceState(state: string): string {
    if (state === 'SUSPENDED') return 'suspended';
    if (state === 'COMPLETED') return 'completed';
    if (state === 'EXTERNALLY_TERMINATED' || state === 'INTERNALLY_TERMINATED') return 'terminated';
    return 'running';  // ACTIVE or any other state
  }

  private parseBpmnActivities(xml: string): BpmnElement[] {
    const FLOW_NODE_TYPES = new Set([
      'task', 'userTask', 'serviceTask', 'manualTask', 'businessRuleTask',
      'scriptTask', 'sendTask', 'receiveTask', 'callActivity',
      'subProcess', 'transaction', 'adHocSubProcess',
      'startEvent', 'endEvent',
      'intermediateThrowEvent', 'intermediateCatchEvent', 'boundaryEvent',
      'exclusiveGateway', 'inclusiveGateway', 'parallelGateway',
      'eventBasedGateway', 'complexGateway'
    ]);
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const result: BpmnElement[] = [];
      const processElements = Array.from(doc.getElementsByTagName('*'))
        .filter(el => el.localName === 'process');
      for (const processEl of processElements) {
        const walker = doc.createTreeWalker(processEl, NodeFilter.SHOW_ELEMENT);
        let node: Node | null = walker.nextNode();
        while (node) {
          const el = node as Element;
          if (FLOW_NODE_TYPES.has(el.localName)) {
            const id = el.getAttribute('id');
            if (id) {
              const pascal = el.localName.charAt(0).toUpperCase() + el.localName.slice(1);
              result.push({ id, type: `bpmn:${pascal}`, name: el.getAttribute('name') || undefined });
            }
          }
          node = walker.nextNode();
        }
      }
      return result;
    } catch {
      return [];
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
    this.detachPositionListeners();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showSaveDropdown()) {
      this.showSaveDropdown.set(false);
    }
    if (this.showNewSaveMenu()) {
      this.closeNewSaveMenu();
    }
  }
}
