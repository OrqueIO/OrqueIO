import {
  Component, OnInit, OnDestroy, DestroyRef, inject,
  ChangeDetectionStrategy, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner, faSearch, faCogs, faExclamationTriangle, faCheckCircle,
  faPlayCircle, faEye, faSort, faSortUp, faSortDown,
  faPlus, faTimes, faPauseCircle, faTimesCircle, faFilter,
  faChevronLeft, faChevronRight, faChevronDown,
  faKey, faHashtag, faCircleDot, faCalendarAlt, faCode, faRotateLeft, faCheck
} from '@fortawesome/free-solid-svg-icons';

interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

type VariableOperator = 'eq' | 'neq' | 'gt' | 'gteq' | 'lt' | 'lteq' | 'like';

interface PendingVariableLine {
  name: string;
  operator: VariableOperator;
  values: string[];
}

interface VariableConflictInfo {
  name: string;
  type: 'generic' | 'impossible';
  detail: string;
}

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import {
  CockpitService,
  ProcessDefinitionStatistics,
  ProcessInstance,
  MultiValueFilter,
  GlobalSearchField,
  VariableLine
} from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { dateRangeConflicts } from '../../../../utils/search-validation';
import { ClipboardDirective } from '../../../../shared/clipboard-directive/clipboard.directive';
import { MultiValueChipInputComponent } from '../../../../shared/multi-value-chip-input/multi-value-chip-input';

@Component({
  selector: 'app-process-definitions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    ClipboardDirective,
    MultiValueChipInputComponent
  ],
  templateUrl: './process-definitions.html',
  styleUrls: ['./process-definitions.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessDefinitionsComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cockpitService = inject(CockpitService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translateService = inject(TranslateService);

  // Icons
  faSpinner = faSpinner;
  faSearch = faSearch;
  faCogs = faCogs;
  faExclamationTriangle = faExclamationTriangle;
  faCheckCircle = faCheckCircle;
  faPlayCircle = faPlayCircle;
  faEye = faEye;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faPlus = faPlus;
  faTimes = faTimes;
  faPauseCircle = faPauseCircle;
  faTimesCircle = faTimesCircle;
  faFilter = faFilter;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faKey = faKey;
  faHashtag = faHashtag;
  faCircleDot = faCircleDot;
  faCalendarAlt = faCalendarAlt;
  faCode = faCode;
  faRotateLeft = faRotateLeft;
  faChevronDown = faChevronDown;
  faCheck = faCheck;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Processes', translateKey: 'cockpit.menu.processes' }
  ];

  // ===========================
  // Definitions state (existing)
  // ===========================
  processDefinitions: ProcessDefinitionStatistics[] = [];
  filteredDefinitions: ProcessDefinitionStatistics[] = [];
  totalCount = 0;
  loading = true;
  searchQuery = '';
  sortConfig: SortConfig = { sortBy: 'name', sortOrder: 'asc' };
  private readonly SORT_CONFIG_KEY = 'cockpit.processes.sortConfig';
  private readonly GLOBAL_SEARCH_PREFS_KEY = 'globalSearchPreferences';

  // ===========================
  // Global Search state
  // ===========================
  showCriteriaDropdown = false;
  activeEditorType: GlobalSearchField | null = null;
  activePills: MultiValueFilter[] = [];

  // Criterion editor inputs
  pendingValues: string[] = [];
  pendingVariableName = '';
  pendingVariableOperator: VariableOperator = 'eq';
  pendingStateValues: string[] = [];
  pendingDateValue = '';
  pendingVariableLines: PendingVariableLine[] = [];
  editingPillIndex: number | null = null;
  openOperatorMenuIndex: number | null = null;
  opMenuPosition: { top: number; left: number; minWidth: number } | null = null;

  // Case-sensitivity options (variable filters)
  variableNamesIgnoreCase = false;
  variableValuesIgnoreCase = false;
  popoverFlipped = false;

  // Operator options for the custom dropdown in the Variables popover
  readonly variableOperators: { value: VariableOperator; label: string; name: string }[] = [
    { value: 'eq',   label: '=',  name: 'equals' },
    { value: 'neq',  label: '≠',  name: 'not equals' },
    { value: 'gt',   label: '>',  name: 'greater than' },
    { value: 'gteq', label: '≥',  name: 'greater or equal' },
    { value: 'lt',   label: '<',  name: 'less than' },
    { value: 'lteq', label: '≤',  name: 'less or equal' },
    { value: 'like', label: '~',  name: 'like' },
  ];

  // Search results
  searchResults: ProcessInstance[] = [];
  searchResultsCount = 0;
  searchLoading = false;
  searchExecuted = false;
  searchError = false;

  // Search pagination
  searchCurrentPage = 1;
  searchPageSize = 20;
  readonly searchPageSizeOptions = [10, 20, 50, 100];

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadSortConfig();
    this.loadPageSize();
    this.loadFromUrl();
    this.loadProcessDefinitions();
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  // ===========================
  // Definitions methods (existing)
  // ===========================

  private loadSortConfig(): void {
    const saved = localStorage.getItem(this.SORT_CONFIG_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.sortBy && config.sortOrder) {
          this.sortConfig = config;
        }
      } catch { /* use default */ }
    }
  }

  private saveSortConfig(): void {
    localStorage.setItem(this.SORT_CONFIG_KEY, JSON.stringify(this.sortConfig));
  }

  private loadPageSize(): void {
    const saved = localStorage.getItem(this.GLOBAL_SEARCH_PREFS_KEY);
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (this.searchPageSizeOptions.includes(prefs.pageSize)) {
          this.searchPageSize = prefs.pageSize;
        }
      } catch { /* use default */ }
    }
  }

  private savePageSize(): void {
    localStorage.setItem(this.GLOBAL_SEARCH_PREFS_KEY, JSON.stringify({ pageSize: this.searchPageSize }));
  }

  private loadFromUrl(): void {
    const params = this.route.snapshot.queryParams;
    const criteriaJson: string | null = params['criteria'] ?? null;
    if (!criteriaJson) return;
    try {
      const pills = JSON.parse(criteriaJson) as MultiValueFilter[];
      if (!Array.isArray(pills) || pills.length === 0) return;
      this.activePills = pills;
      this.variableNamesIgnoreCase = params['vnIgnoreCase'] === 'true';
      this.variableValuesIgnoreCase = params['vvIgnoreCase'] === 'true';
      this.cdr.markForCheck();
      this.executeSearch();
    } catch { /* ignore malformed criteria */ }
  }

  private syncCriteriaToUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        criteria: this.activePills.length > 0 ? JSON.stringify(this.activePills) : null,
        vnIgnoreCase: this.variableNamesIgnoreCase ? 'true' : null,
        vvIgnoreCase: this.variableValuesIgnoreCase ? 'true' : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSort(columnId: string): void {
    if (this.sortConfig.sortBy === columnId) {
      this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.sortBy = columnId;
      this.sortConfig.sortOrder = 'asc';
    }
    this.saveSortConfig();
    this.applyFilter();
  }

  getSortIcon(columnId: string): any {
    if (this.sortConfig.sortBy !== columnId) return this.faSort;
    return this.sortConfig.sortOrder === 'asc' ? this.faSortUp : this.faSortDown;
  }

  loadProcessDefinitions(): void {
    this.loading = true;
    this.cdr.markForCheck();

    forkJoin({
      definitions: this.cockpitService.getProcessDefinitionsWithStatistics(),
      count: this.cockpitService.getProcessDefinitionsCount()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ definitions, count }) => {
          this.processDefinitions = definitions;
          this.totalCount = count;
          this.applyFilter();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredDefinitions = [...this.processDefinitions];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredDefinitions = this.processDefinitions.filter(def => {
        const name = (def.definition?.name || def.definition?.key || '').toLowerCase();
        const key = (def.definition?.key || '').toLowerCase();
        return name.includes(query) || key.includes(query);
      });
    }

    this.filteredDefinitions.sort((a, b) => {
      let valueA: any;
      let valueB: any;
      switch (this.sortConfig.sortBy) {
        case 'name':
          valueA = this.getDefinitionName(a).toLowerCase();
          valueB = this.getDefinitionName(b).toLowerCase();
          break;
        case 'key':
          valueA = this.getDefinitionKey(a).toLowerCase();
          valueB = this.getDefinitionKey(b).toLowerCase();
          break;
        case 'tenant':
          valueA = (a.definition?.tenantId || '').toLowerCase();
          valueB = (b.definition?.tenantId || '').toLowerCase();
          break;
        case 'instances':
          valueA = a.instances || 0;
          valueB = b.instances || 0;
          break;
        case 'incidents':
          valueA = this.getTotalIncidents(a);
          valueB = this.getTotalIncidents(b);
          break;
        default:
          valueA = this.getDefinitionName(a).toLowerCase();
          valueB = this.getDefinitionName(b).toLowerCase();
      }
      if (valueA < valueB) return this.sortConfig.sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortConfig.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.cdr.markForCheck();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  getDefinitionName(def: ProcessDefinitionStatistics): string {
    return def.definition?.name || def.definition?.key || def.id;
  }

  getDefinitionKey(def: ProcessDefinitionStatistics): string {
    return def.definition?.key || def.id;
  }

  getTotalIncidents(def: ProcessDefinitionStatistics): number {
    if (!def.incidents || def.incidents.length === 0) return 0;
    return def.incidents.reduce((sum, inc) => sum + inc.incidentCount, 0);
  }

  getStateClass(def: ProcessDefinitionStatistics): string {
    const incidents = this.getTotalIncidents(def);
    if (incidents > 0) return 'state-error';
    if (def.instances > 0) return 'state-running';
    return 'state-ok';
  }

  getStateIcon(def: ProcessDefinitionStatistics): any {
    const incidents = this.getTotalIncidents(def);
    if (incidents > 0) return this.faExclamationTriangle;
    if (def.instances > 0) return this.faPlayCircle;
    return this.faCheckCircle;
  }

  // ===========================
  // Global Search methods
  // ===========================

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Close the operator dropdown when clicking outside its wrapper
    if (this.openOperatorMenuIndex !== null && !target.closest('.op-dropdown-wrapper')) {
      this.openOperatorMenuIndex = null;
      this.opMenuPosition = null;
      this.cdr.markForCheck();
    }
    if (this.editingPillIndex !== null) {
      if (!target.closest('.pill-wrapper') && !target.closest('.criteria-dropdown-wrapper')) {
        this.confirmCriterion();
        if (this.activeEditorType) this.cancelCriterion();
      }
    } else {
      if (!target.closest('.criteria-dropdown-wrapper')) {
        if (this.showCriteriaDropdown) {
          this.showCriteriaDropdown = false;
          this.cdr.markForCheck();
        }
        if (this.activeEditorType) {
          this.confirmCriterion();
          if (this.activeEditorType) this.cancelCriterion();
        }
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    let changed = false;
    if (this.openOperatorMenuIndex !== null) {
      this.openOperatorMenuIndex = null;
      this.opMenuPosition = null;
      changed = true;
    } else if (this.activeEditorType) {
      this.activeEditorType = null;
      this.pendingValues = [];
      this.editingPillIndex = null;
      changed = true;
    } else if (this.showCriteriaDropdown) {
      this.showCriteriaDropdown = false;
      changed = true;
    }
    if (changed) this.cdr.markForCheck();
  }

  toggleCriteriaDropdown(event: Event): void {
    event.stopPropagation();
    if (this.activeEditorType) {
      this.activeEditorType = null;
      this.pendingValues = [];
    }
    this.showCriteriaDropdown = !this.showCriteriaDropdown;
    this.cdr.markForCheck();
  }

  selectCriteriaType(type: GlobalSearchField): void {
    this.showCriteriaDropdown = false;

    if (type === 'withIncidents') {
      if (!this.activePills.some(p => p.field === 'withIncidents')) {
        this.activePills = [...this.activePills, { field: 'withIncidents', values: [] }];
        this.cdr.markForCheck();
        this.syncCriteriaToUrl();
      }
      return;
    }

    // If a pill of this type already exists, reopen its editor instead of creating a duplicate
    const existingIndex = this.activePills.findIndex(p => p.field === type);
    if (existingIndex !== -1) {
      this.editingPillIndex = existingIndex;
      this.activeEditorType = this.activePills[existingIndex].field as GlobalSearchField;
      this.populatePendingFromPill(this.activePills[existingIndex]);
      this.cdr.markForCheck();
      this.schedulePositionCheck();
      return;
    }

    this.activeEditorType = type;
    this.pendingValues = [];
    this.pendingVariableName = '';
    this.pendingVariableOperator = 'eq';
    this.pendingStateValues = [];
    this.pendingDateValue = '';
    this.pendingVariableLines = type === 'variables'
      ? [{ name: '', operator: 'eq', values: [] }]
      : [];
    this.cdr.markForCheck();
    this.schedulePositionCheck();
  }

  toggleStateValue(value: string): void {
    if (this.pendingStateValues.includes(value)) {
      this.pendingStateValues = this.pendingStateValues.filter(v => v !== value);
    } else {
      this.pendingStateValues = [...this.pendingStateValues, value];
    }
    this.cdr.markForCheck();
  }

  startEditPill(index: number, event: Event): void {
    event.stopPropagation();
    this.showCriteriaDropdown = false;
    this.editingPillIndex = index;
    this.activeEditorType = this.activePills[index].field as GlobalSearchField;
    this.populatePendingFromPill(this.activePills[index]);
    this.cdr.markForCheck();
    this.schedulePositionCheck();
  }

  private populatePendingFromPill(pill: MultiValueFilter): void {
    this.pendingValues = [];
    this.pendingStateValues = [];
    this.pendingVariableLines = [];
    switch (pill.field) {
      case 'businessKey':
      case 'instanceId':
        this.pendingValues = [...pill.values];
        break;
      case 'state':
        this.pendingStateValues = [...pill.values];
        break;
      case 'variable':
        this.pendingValues = [...pill.values];
        this.pendingVariableName = pill.variableName || '';
        this.pendingVariableOperator = pill.variableOperator || 'eq';
        break;
      case 'variables':
        this.pendingVariableLines = (pill.variableLines ?? []).map(l => ({
          name: l.variableName,
          operator: (l.variableOperator || 'eq') as VariableOperator,
          values: [...l.values]
        }));
        break;
      case 'startedAfter':
      case 'startedBefore':
      case 'finishedAfter':
      case 'finishedBefore':
        this.pendingDateValue = this.extractDateOnly(pill.values[0] || '');
        break;
    }
  }

  confirmCriterion(): void {
    if (!this.activeEditorType) return;
    const type = this.activeEditorType;
    let pill: MultiValueFilter | null = null;

    switch (type) {
      case 'businessKey':
      case 'instanceId':
        if (this.pendingValues.length === 0) return;
        pill = { field: type, values: [...this.pendingValues] };
        break;
      case 'state':
        if (this.pendingStateValues.length === 0) {
          if (this.editingPillIndex !== null) {
            const idx = this.editingPillIndex;
            this.activePills = this.activePills.filter((_, i) => i !== idx);
            this.editingPillIndex = null;
            this.activeEditorType = null;
            this.popoverFlipped = false;
            this.cdr.markForCheck();
            this.syncCriteriaToUrl();
          }
          return;
        }
        pill = { field: 'state', values: [...this.pendingStateValues] };
        break;
      case 'startedAfter':
      case 'startedBefore':
      case 'finishedAfter':
      case 'finishedBefore': {
        if (!this.pendingDateValue) return;
        const endOfDay = type === 'startedBefore' || type === 'finishedBefore';
        const formatted = this.formatDateForApi(this.pendingDateValue, endOfDay);
        if (!formatted) return;
        pill = { field: type, values: [formatted] };
        break;
      }
      case 'variable':
        if (!this.pendingVariableName.trim() || this.pendingValues.length === 0) return;
        pill = {
          field: 'variable',
          values: [...this.pendingValues],
          variableName: this.pendingVariableName.trim(),
          variableOperator: this.pendingVariableOperator
        };
        break;
      case 'variables': {
        const validLines: VariableLine[] = this.pendingVariableLines
          .filter(l => l.name.trim() && l.values.length > 0)
          .map(l => ({ variableName: l.name.trim(), variableOperator: l.operator, values: [...l.values] }));
        if (validLines.length === 0) {
          if (this.editingPillIndex !== null) {
            const idx = this.editingPillIndex;
            this.activePills = this.activePills.filter((_, i) => i !== idx);
            this.editingPillIndex = null;
            this.activeEditorType = null;
            this.popoverFlipped = false;
            this.cdr.markForCheck();
            this.syncCriteriaToUrl();
          }
          return;
        }
        pill = { field: 'variables', values: [], variableLines: validLines };
        break;
      }
    }

    if (pill) {
      if (this.editingPillIndex !== null) {
        const idx = this.editingPillIndex;
        this.activePills = this.activePills.map((p, i) => i === idx ? pill! : p);
        this.editingPillIndex = null;
      } else {
        this.activePills = [...this.activePills, pill];
      }
      this.activeEditorType = null;
      this.pendingValues = [];
      this.popoverFlipped = false;
      this.cdr.markForCheck();
      this.syncCriteriaToUrl();
    }
  }

  cancelCriterion(): void {
    this.activeEditorType = null;
    this.pendingValues = [];
    this.pendingStateValues = [];
    this.pendingVariableLines = [];
    this.editingPillIndex = null;
    this.openOperatorMenuIndex = null;
    this.opMenuPosition = null;
    this.popoverFlipped = false;
    this.cdr.markForCheck();
  }

  checkPopoverPosition(el?: HTMLElement): void {
    const popover = el ?? (document.querySelector('.criterion-editor-popover') as HTMLElement);
    if (!popover) { this.popoverFlipped = false; return; }
    const rect = popover.getBoundingClientRect();
    const overflows = rect.right > window.innerWidth - 8;
    if (overflows !== this.popoverFlipped) {
      this.popoverFlipped = overflows;
      this.cdr.markForCheck();
    }
  }

  private schedulePositionCheck(): void {
    setTimeout(() => this.checkPopoverPosition(), 0);
  }

  addVariableLine(): void {
    this.pendingVariableLines = [...this.pendingVariableLines, { name: '', operator: 'eq', values: [] }];
    this.cdr.markForCheck();
  }

  removeVariableLine(index: number): void {
    this.pendingVariableLines = this.pendingVariableLines.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  onVariableLineValuesChange(index: number, values: string[]): void {
    this.pendingVariableLines[index].values = values;
    this.cdr.markForCheck();
  }

  trackVariableLine(index: number): number {
    return index;
  }

  isMultiValueOperator(op: VariableOperator): boolean {
    return op === 'eq' || op === 'neq' || op === 'like';
  }

  isComparisonValueInvalid(line: PendingVariableLine): boolean {
    if (this.isMultiValueOperator(line.operator)) return false;
    if (line.values.length === 0 || line.values[0].trim() === '') return false;
    return isNaN(Number(line.values[0].trim()));
  }

  get hasInvalidVariableValues(): boolean {
    return this.pendingVariableLines.some(l => this.isComparisonValueInvalid(l));
  }

  toggleOperatorMenu(index: number, trigger: HTMLElement): void {
    if (this.openOperatorMenuIndex === index) {
      this.openOperatorMenuIndex = null;
      this.opMenuPosition = null;
      this.cdr.markForCheck();
      return;
    }
    const rect = trigger.getBoundingClientRect();
    // Estimate menu height (7 items × 34px + 12px padding) to decide open-below vs open-above
    const estimatedMenuHeight = 7 * 34 + 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= estimatedMenuHeight
      ? rect.bottom + 4
      : Math.max(4, rect.top - estimatedMenuHeight - 4);
    this.opMenuPosition = {
      top,
      left: rect.left,
      minWidth: Math.max(rect.width, 170),
    };
    this.openOperatorMenuIndex = index;
    this.cdr.markForCheck();
  }

  closeOperatorMenu(): void {
    if (this.openOperatorMenuIndex !== null) {
      this.openOperatorMenuIndex = null;
      this.opMenuPosition = null;
      this.cdr.markForCheck();
    }
  }

  selectOperator(index: number, op: VariableOperator): void {
    const line = this.pendingVariableLines[index];
    const wasMulti = this.isMultiValueOperator(line.operator);
    const willBeMulti = this.isMultiValueOperator(op);
    // Switching from multi-value (eq/neq/like) to comparison (>/≥/</≤): keep only first value
    const values = (wasMulti && !willBeMulti && line.values.length > 1)
      ? [line.values[0]]
      : line.values;
    this.pendingVariableLines[index] = { ...line, operator: op, values };
    this.openOperatorMenuIndex = null;
    this.opMenuPosition = null;
    this.cdr.markForCheck();
  }

  onVariableLineSingleValueChange(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pendingVariableLines[index].values = value.trim() ? [value] : [];
    this.cdr.markForCheck();
  }

  get validVariableLineCount(): number {
    return this.pendingVariableLines.filter(l => l.name.trim() && l.values.length > 0).length;
  }

  get startedDateConflict(): boolean {
    const after  = this.activePills.find(p => p.field === 'startedAfter')?.values[0];
    const before = this.activePills.find(p => p.field === 'startedBefore')?.values[0];
    return dateRangeConflicts(after, before);
  }

  get finishedDateConflict(): boolean {
    const after  = this.activePills.find(p => p.field === 'finishedAfter')?.values[0];
    const before = this.activePills.find(p => p.field === 'finishedBefore')?.values[0];
    return dateRangeConflicts(after, before);
  }

  get incidentsWithTerminalStateConflict(): boolean {
    if (!this.activePills.some(p => p.field === 'withIncidents')) return false;
    const statePill = this.activePills.find(p => p.field === 'state');
    if (!statePill || statePill.values.length === 0) return false;
    const activeStates = new Set(['active', 'suspended']);
    return !statePill.values.some(v => activeStates.has(v));
  }

  get variableConflicts(): VariableConflictInfo[] {
    const nameLines = new Map<string, PendingVariableLine[]>();
    for (const line of this.pendingVariableLines) {
      const name = line.name.trim().toLowerCase();
      if (!name) continue;
      if (!nameLines.has(name)) nameLines.set(name, []);
      nameLines.get(name)!.push(line);
    }
    const conflicts: VariableConflictInfo[] = [];
    for (const [name, lines] of nameLines) {
      const ops = new Set(lines.map(l => l.operator));
      if (ops.size <= 1) continue;

      const numericOps = new Set<VariableOperator>(['eq', 'neq', 'gt', 'gteq', 'lt', 'lteq']);
      const allNumericOps = lines.every(l => numericOps.has(l.operator));
      const allNumericValues = lines.every(l => {
        if (l.values.length !== 1) return false;
        const n = Number(l.values[0].trim());
        return l.values[0].trim() !== '' && !isNaN(n);
      });

      if (allNumericOps && allNumericValues) {
        const conditions = lines.map(l => ({ op: l.operator, val: Number(l.values[0].trim()) }));
        if (!this.conditionsIntersect(conditions)) {
          const detail = conditions
            .map(c => `${this.getOperatorLabel(c.op as VariableOperator)} ${c.val}`)
            .join(' and ');
          conflicts.push({ name, type: 'impossible', detail });
        }
      } else {
        conflicts.push({ name, type: 'generic', detail: '' });
      }
    }
    return conflicts;
  }

  private conditionsIntersect(conditions: Array<{ op: string; val: number }>): boolean {
    let lo = -Infinity, hi = Infinity;
    let loStrict = false, hiStrict = false;
    const eqs: number[] = [], neqs: number[] = [];

    for (const { op, val } of conditions) {
      if (op === 'gt') {
        if (val > lo || (val === lo && !loStrict)) { lo = val; loStrict = true; }
      } else if (op === 'gteq') {
        if (val > lo) { lo = val; loStrict = false; }
      } else if (op === 'lt') {
        if (val < hi || (val === hi && !hiStrict)) { hi = val; hiStrict = true; }
      } else if (op === 'lteq') {
        if (val < hi) { hi = val; hiStrict = false; }
      } else if (op === 'eq') {
        eqs.push(val);
      } else if (op === 'neq') {
        neqs.push(val);
      }
    }

    if (lo > hi) return false;
    if (lo === hi && (loStrict || hiStrict)) return false;

    if (eqs.length > 0) {
      const firstEq = eqs[0];
      if (eqs.some(v => v !== firstEq)) return false;
      if (firstEq < lo || (firstEq === lo && loStrict)) return false;
      if (firstEq > hi || (firstEq === hi && hiStrict)) return false;
      if (neqs.includes(firstEq)) return false;
    }

    if (lo === hi && !loStrict && !hiStrict && neqs.includes(lo)) return false;

    return true;
  }

  removePill(index: number): void {
    this.activePills = this.activePills.filter((_, i) => i !== index);
    this.cdr.markForCheck();
    this.syncCriteriaToUrl();
  }

  getPillLabel(pill: MultiValueFilter): string {
    const t = (key: string, p?: Record<string, string>) => this.translateService.instant(key, p);
    switch (pill.field) {
      case 'businessKey':    return t('cockpit.processes.globalSearch.pill.businessKey', { value: pill.values.join(', ') });
      case 'instanceId':     return t('cockpit.processes.globalSearch.pill.instanceId', { value: pill.values.join(', ') });
      case 'state':          return t('cockpit.processes.globalSearch.pill.state', { value: pill.values.map(v => this.getStateDisplayLabel(v)).join(', ') });
      case 'withIncidents':  return t('cockpit.processes.globalSearch.pill.withIncidents');
      case 'startedAfter':   return t('cockpit.processes.globalSearch.pill.startedAfter', { value: this.formatDisplayDate(pill.values[0]) });
      case 'startedBefore':  return t('cockpit.processes.globalSearch.pill.startedBefore', { value: this.formatDisplayDate(pill.values[0]) });
      case 'finishedAfter':  return t('cockpit.processes.globalSearch.pill.finishedAfter', { value: this.formatDisplayDate(pill.values[0]) });
      case 'finishedBefore': return t('cockpit.processes.globalSearch.pill.finishedBefore', { value: this.formatDisplayDate(pill.values[0]) });
      case 'variables': {
        const n = pill.variableLines?.filter(l => l.variableName).length ?? 0;
        return t('cockpit.processes.globalSearch.pill.variables', { count: String(n) });
      }
      case 'variable': {
        const op = this.getOperatorLabel(pill.variableOperator || 'eq');
        return `${pill.variableName} ${op} ${pill.values.join(', ')}`;
      }
      default: return '';
    }
  }

  getPillIcon(pill: MultiValueFilter): any {
    switch (pill.field) {
      case 'businessKey':     return this.faKey;
      case 'instanceId':      return this.faHashtag;
      case 'state':           return this.faCircleDot;
      case 'withIncidents':   return this.faExclamationTriangle;
      case 'startedAfter':
      case 'startedBefore':
      case 'finishedAfter':
      case 'finishedBefore':  return this.faCalendarAlt;
      case 'variable':        return this.faCode;
      default:                return this.faFilter;
    }
  }

  getEditorIcon(): any {
    return this.activeEditorType
      ? this.getPillIcon({ field: this.activeEditorType, values: [] })
      : this.faFilter;
  }

  hasVariableFilter(): boolean {
    return this.activePills.some(p => p.field === 'variable' || p.field === 'variables');
  }

  @HostListener('document:keydown.enter', ['$event'])
  onDocumentEnter(event: Event): void {
    // criterion-editor-popover calls stopPropagation, so Enter events originating inside
    // the popover never reach here. Enter arriving here from outside (e.g. focus on
    // document.body after clicking on an empty area of the card) should confirm the popover.
    if ((event.target as HTMLElement).tagName === 'BUTTON') return;
    if (this.activeEditorType !== null || this.editingPillIndex !== null) {
      this.confirmCriterion();
      return;
    }
    this.executeSearch();
  }

  executeSearch(): void {
    if (this.activePills.length === 0) return;
    this.searchLoading = true;
    this.searchExecuted = true;
    this.searchError = false;
    this.searchCurrentPage = 1;
    this.cdr.markForCheck();
    this.loadSearchResults();
  }

  private loadSearchResults(): void {
    const instanceIdPill = this.activePills.find(p => p.field === 'instanceId');
    const apiPills = instanceIdPill
      ? this.activePills.filter(p => p.field !== 'instanceId')
      : this.activePills;

    if (instanceIdPill) {
      // Camunda 7 history API has no LIKE operator for instance IDs, only exact match.
      // Fetch all results matching other criteria then filter client-side by substring.
      // When no other criteria exist, use an orQueries union of finished+unfinished to
      // guarantee Camunda returns all instances (empty {} body is unreliable in some configs).
      const fetch$ = apiPills.length > 0
        ? this.cockpitService.searchProcessInstancesGlobal(
            apiPills, this.variableNamesIgnoreCase, this.variableValuesIgnoreCase, 0, 2000
          )
        : this.cockpitService.queryProcessInstances({}, 0, 2000);

      fetch$
      .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: results => {
            const terms = instanceIdPill.values.map(t => t.toLowerCase());
            const filtered = results.filter(r => r.id && terms.some(t => r.id.toLowerCase().includes(t)));
            this.searchResultsCount = filtered.length;
            const start = (this.searchCurrentPage - 1) * this.searchPageSize;
            this.searchResults = filtered.slice(start, start + this.searchPageSize);
            this.searchLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.searchLoading = false;
            this.searchError = true;
            this.cdr.detectChanges();
          }
        });
    } else {
      const firstResult = (this.searchCurrentPage - 1) * this.searchPageSize;
      forkJoin({
        results: this.cockpitService.searchProcessInstancesGlobal(
          apiPills, this.variableNamesIgnoreCase, this.variableValuesIgnoreCase,
          firstResult, this.searchPageSize
        ),
        count: this.cockpitService.searchProcessInstancesGlobalCount(
          apiPills, this.variableNamesIgnoreCase, this.variableValuesIgnoreCase
        )
      }).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ results, count }) => {
            this.searchResults = results;
            this.searchResultsCount = count;
            this.searchLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.searchLoading = false;
            this.searchError = true;
            this.cdr.detectChanges();
          }
        });
    }
  }

  clearSearch(): void {
    this.activePills = [];
    this.searchResults = [];
    this.searchResultsCount = 0;
    this.searchExecuted = false;
    this.searchError = false;
    this.activeEditorType = null;
    this.showCriteriaDropdown = false;
    this.variableNamesIgnoreCase = false;
    this.variableValuesIgnoreCase = false;
    this.pendingValues = [];
    this.cdr.markForCheck();
    this.syncCriteriaToUrl();
  }

  get searchTotalPages(): number {
    return Math.ceil(this.searchResultsCount / this.searchPageSize);
  }

  get searchStartIndex(): number {
    if (this.searchResultsCount === 0) return 0;
    return (this.searchCurrentPage - 1) * this.searchPageSize + 1;
  }

  get searchEndIndex(): number {
    return Math.min(this.searchCurrentPage * this.searchPageSize, this.searchResultsCount);
  }

  onSearchPageChange(page: number): void {
    this.searchCurrentPage = page;
    this.searchLoading = true;
    this.cdr.markForCheck();
    this.loadSearchResults();
  }

  onSearchPageSizeChange(): void {
    this.searchCurrentPage = 1;
    this.searchLoading = true;
    this.savePageSize();
    this.cdr.markForCheck();
    this.loadSearchResults();
  }

  // Instance state helpers — mirrors process-list patterns
  getInstanceStateClass(instance: ProcessInstance): string {
    switch (this.computeInstanceState(instance)) {
      case 'running':    return 'state-active';
      case 'suspended':  return 'state-suspended';
      case 'completed':  return 'state-completed';
      case 'terminated': return 'state-terminated';
      case 'incidents':  return 'state-error';
      default:           return '';
    }
  }

  getInstanceStateIcon(instance: ProcessInstance): any {
    switch (this.computeInstanceState(instance)) {
      case 'running':    return this.faPlayCircle;
      case 'suspended':  return this.faPauseCircle;
      case 'completed':  return this.faCheckCircle;
      case 'terminated': return this.faTimesCircle;
      case 'incidents':  return this.faExclamationTriangle;
      default:           return this.faCheckCircle;
    }
  }

  getInstanceStateLabel(instance: ProcessInstance): string {
    const t = (key: string) => this.translateService.instant(key);
    switch (this.computeInstanceState(instance)) {
      case 'running':    return t('cockpit.processes.globalSearch.instanceStateRunning');
      case 'suspended':  return t('cockpit.processes.filters.stateSuspended');
      case 'completed':  return t('cockpit.processes.filters.stateCompleted');
      case 'terminated': return t('cockpit.processes.filters.stateTerminated');
      case 'incidents':  return t('cockpit.processes.globalSearch.instanceStateWithIncidents');
      default:           return '';
    }
  }

  private computeInstanceState(instance: ProcessInstance): string {
    if (instance.state === 'SUSPENDED') return 'suspended';
    if (instance.state === 'COMPLETED') return 'completed';
    if (instance.state === 'EXTERNALLY_TERMINATED' || instance.state === 'INTERNALLY_TERMINATED') return 'terminated';
    if (instance.incidents && instance.incidents.length > 0) return 'incidents';
    return 'running';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  }

  extractVersionNumber(processDefinitionId: string): number | null {
    if (!processDefinitionId) return null;
    const parts = processDefinitionId.split(':');
    if (parts.length >= 3) {
      const v = parseInt(parts[1], 10);
      return isNaN(v) ? null : v;
    }
    return null;
  }

  private getStateDisplayLabel(state: string): string {
    const keyMap: Record<string, string> = {
      active: 'cockpit.processes.filters.stateActive',
      suspended: 'cockpit.processes.filters.stateSuspended',
      completed: 'cockpit.processes.filters.stateCompleted',
      terminated: 'cockpit.processes.filters.stateTerminated'
    };
    const key = keyMap[state];
    return key ? this.translateService.instant(key) : state;
  }

  getOperatorLabel(op: VariableOperator): string {
    const ops: Record<VariableOperator, string> = {
      eq: '=', neq: '≠', gt: '>', gteq: '≥', lt: '<', lteq: '≤', like: '~'
    };
    return ops[op] || '=';
  }

  formatDateForApi(dateStr: string, endOfDay = false): string | null {
    // Accept both "YYYY-MM-DD" (from type="date") and full ISO strings
    const withTime = dateStr.length === 10
      ? `${dateStr}${endOfDay ? 'T23:59:59' : 'T00:00:00'}`
      : dateStr;
    const d = new Date(withTime);
    if (isNaN(d.getTime())) return null;
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOff = Math.abs(offset);
    const hh = String(Math.floor(absOff / 60)).padStart(2, '0');
    const mm = String(absOff % 60).padStart(2, '0');
    const year = d.getFullYear();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hrs = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${mon}-${day}T${hrs}:${min}:${sec}.000${sign}${hh}${mm}`;
  }

  private extractDateOnly(isoStr: string): string {
    const match = isoStr.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }

  private formatDisplayDate(isoStr: string): string {
    if (!isoStr) return '';
    try { return new Date(isoStr).toLocaleDateString(); }
    catch { return isoStr; }
  }
}
