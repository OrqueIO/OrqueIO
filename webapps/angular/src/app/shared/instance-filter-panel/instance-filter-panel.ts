import {
  Component, Input, Output, EventEmitter, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef, HostListener, inject, DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faPlus, faTimes, faFilter, faChevronDown, faChevronRight,
  faKey, faHashtag, faCalendarAlt, faCode,
  faExclamationTriangle, faCheck, faCircleDot,
  faSitemap, faCodeBranch, faSquareMinus, faSquareCheck
} from '@fortawesome/free-solid-svg-icons';
import { faSquare } from '@fortawesome/free-regular-svg-icons';
import { CockpitService, MultiValueFilter, GlobalSearchField, VariableLine } from '../../services/cockpit.service';
import { DecisionService } from '../../services/decision.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslateService } from '../../i18n/translate.service';
import { MultiValueChipInputComponent } from '../multi-value-chip-input/multi-value-chip-input';
import { dateRangeConflicts } from '../../utils/search-validation';

export interface FilterPanelChange {
  criteria: MultiValueFilter[];
  vnIgnoreCase: boolean;
  vvIgnoreCase: boolean;
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

interface ProcessDefinitionVersion {
  id: string;
  version: number;
  isLatest: boolean;
}

interface ProcessDefinitionGroup {
  key: string;
  name: string;
  versions: ProcessDefinitionVersion[];
}

@Component({
  selector: 'app-instance-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TranslatePipe, MultiValueChipInputComponent],
  templateUrl: './instance-filter-panel.html',
  styleUrl: './instance-filter-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstanceFilterPanelComponent implements OnInit {
  @Input() lockedState: string | null = null;
  @Input() criteriaSet: 'process' | 'decision' = 'process';
  @Input() initialPills: MultiValueFilter[] = [];
  @Output() criteriaChange = new EventEmitter<FilterPanelChange>();

  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);
  private cockpitService = inject(CockpitService);
  private decisionService = inject(DecisionService);
  private destroyRef = inject(DestroyRef);

  faPlus = faPlus;
  faTimes = faTimes;
  faFilter = faFilter;
  faChevronDown = faChevronDown;
  faKey = faKey;
  faHashtag = faHashtag;
  faCalendarAlt = faCalendarAlt;
  faCode = faCode;
  faExclamationTriangle = faExclamationTriangle;
  faCheck = faCheck;
  faCircleDot = faCircleDot;
  faSitemap = faSitemap;
  faChevronRight = faChevronRight;
  faCodeBranch = faCodeBranch;
  faSquare = faSquare;
  faSquareMinus = faSquareMinus;
  faSquareCheck = faSquareCheck;

  showCriteriaDropdown = false;
  activeEditorType: GlobalSearchField | null = null;
  activePills: MultiValueFilter[] = [];

  pendingValues: string[] = [];
  pendingStateValues: string[] = [];
  pendingProcessDefinitionKeys: string[] = [];
  pendingProcessDefinitionIds: string[] = [];
  availableProcessDefinitionGroups: ProcessDefinitionGroup[] = [];
  expandedProcessDefinitionKeys = new Set<string>();
  processDefinitionSearchText = '';
  pendingDecisionDefinitionKeys: string[] = [];
  availableDecisionDefinitions: Array<{key: string; name: string}> = [];
  decisionDefinitionSearchText = '';
  pendingVariableOperator: VariableOperator = 'eq';
  pendingDateValue = '';
  pendingVariableLines: PendingVariableLine[] = [];
  editingPillIndex: number | null = null;
  openOperatorMenuIndex: number | null = null;
  opMenuPosition: { top: number; left: number; minWidth: number } | null = null;

  variableNamesIgnoreCase = false;
  variableValuesIgnoreCase = false;
  popoverFlipped = false;

  readonly variableOperators: { value: VariableOperator; label: string; name: string }[] = [
    { value: 'eq',   label: '=',  name: 'equals' },
    { value: 'neq',  label: '≠',  name: 'not equals' },
    { value: 'gt',   label: '>',  name: 'greater than' },
    { value: 'gteq', label: '≥',  name: 'greater or equal' },
    { value: 'lt',   label: '<',  name: 'less than' },
    { value: 'lteq', label: '≤',  name: 'less or equal' },
    { value: 'like', label: '~',  name: 'like' },
  ];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
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

  ngOnInit(): void {
    if (this.initialPills.length > 0) {
      this.activePills = this.initialPills.map(p => ({ ...p, values: [...p.values] }));
    }
    if (this.criteriaSet === 'decision') {
      this.decisionService.getDecisionDefinitions(1000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(defs => {
          this.availableDecisionDefinitions = defs
            .map(d => ({ key: d.key, name: d.name || d.key }))
            .filter((d, i, arr) => arr.findIndex(x => x.key === d.key) === i)
            .sort((a, b) => a.name.localeCompare(b.name));
          this.cdr.markForCheck();
        });
    } else {
      this.cockpitService.getProcessDefinitions(1000, false)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(defs => {
          const groupMap = new Map<string, ProcessDefinitionGroup>();
          for (const d of defs.filter(d => d.key)) {
            if (!groupMap.has(d.key)) {
              groupMap.set(d.key, { key: d.key, name: d.name || d.key, versions: [] });
            }
            groupMap.get(d.key)!.versions.push({ id: d.id, version: d.version, isLatest: false });
          }
          for (const g of groupMap.values()) {
            g.versions.sort((a, b) => b.version - a.version);
            if (g.versions.length > 0) g.versions[0].isLatest = true;
          }
          this.availableProcessDefinitionGroups = [...groupMap.values()]
            .sort((a, b) => a.name.localeCompare(b.name));
          this.cdr.markForCheck();
        });
    }
  }

  toggleCriteriaDropdown(event: Event): void {
    event.stopPropagation();
    if (this.activeEditorType || this.editingPillIndex !== null) {
      this.cancelCriterion();
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
        this.emit();
      }
      return;
    }

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
    this.pendingProcessDefinitionKeys = [];
    this.pendingProcessDefinitionIds = [];
    this.processDefinitionSearchText = '';
    this.pendingDecisionDefinitionKeys = [];
    this.decisionDefinitionSearchText = '';
    this.pendingVariableOperator = 'eq';
    this.pendingDateValue = '';
    this.pendingVariableLines = type === 'variables'
      ? [{ name: '', operator: 'eq', values: [] }]
      : [];
    this.cdr.markForCheck();
    this.schedulePositionCheck();
  }

  startEditPill(index: number, event: Event): void {
    event.stopPropagation();
    this.showCriteriaDropdown = false;
    this.editingPillIndex = index;
    this.activeEditorType = this.activePills[index].field as GlobalSearchField;
    if (this.activeEditorType === 'processDefinition') {
      this.processDefinitionSearchText = '';
    }
    if (this.activeEditorType === 'decisionDefinition') {
      this.decisionDefinitionSearchText = '';
    }
    this.populatePendingFromPill(this.activePills[index]);
    this.cdr.markForCheck();
    this.schedulePositionCheck();
  }

  toggleStateValue(v: string): void {
    const idx = this.pendingStateValues.indexOf(v);
    this.pendingStateValues = idx === -1
      ? [...this.pendingStateValues, v]
      : this.pendingStateValues.filter(s => s !== v);
    this.cdr.markForCheck();
  }

  toggleProcessDefinitionKey(key: string): void {
    const group = this.availableProcessDefinitionGroups.find(g => g.key === key);
    if (this.pendingProcessDefinitionKeys.includes(key)) {
      this.pendingProcessDefinitionKeys = this.pendingProcessDefinitionKeys.filter(k => k !== key);
    } else {
      // Selecting whole group by key: remove any individual version IDs for this group
      if (group) {
        const groupVersionIds = group.versions.map(v => v.id);
        this.pendingProcessDefinitionIds = this.pendingProcessDefinitionIds.filter(id => !groupVersionIds.includes(id));
      }
      this.pendingProcessDefinitionKeys = [...this.pendingProcessDefinitionKeys, key];
    }
    this.cdr.markForCheck();
  }

  toggleProcessDefinitionExpand(key: string): void {
    if (this.expandedProcessDefinitionKeys.has(key)) {
      this.expandedProcessDefinitionKeys.delete(key);
    } else {
      this.expandedProcessDefinitionKeys.add(key);
    }
    this.cdr.markForCheck();
  }

  toggleProcessDefinitionVersion(groupKey: string, versionId: string): void {
    const group = this.availableProcessDefinitionGroups.find(g => g.key === groupKey);
    if (!group) return;
    // Selecting a version: remove the group-level key if present
    this.pendingProcessDefinitionKeys = this.pendingProcessDefinitionKeys.filter(k => k !== groupKey);
    if (this.pendingProcessDefinitionIds.includes(versionId)) {
      this.pendingProcessDefinitionIds = this.pendingProcessDefinitionIds.filter(id => id !== versionId);
    } else {
      // If all versions of the group are now selected, switch back to key-level
      const newIds = [...this.pendingProcessDefinitionIds, versionId];
      const allVersionIds = group.versions.map(v => v.id);
      if (allVersionIds.every(id => newIds.includes(id))) {
        this.pendingProcessDefinitionIds = this.pendingProcessDefinitionIds.filter(id => !allVersionIds.includes(id));
        this.pendingProcessDefinitionKeys = [...this.pendingProcessDefinitionKeys, groupKey];
      } else {
        this.pendingProcessDefinitionIds = newIds;
      }
    }
    this.cdr.markForCheck();
  }

  isProcessGroupSelected(group: ProcessDefinitionGroup): boolean {
    return this.pendingProcessDefinitionKeys.includes(group.key) ||
      group.versions.some(v => this.pendingProcessDefinitionIds.includes(v.id));
  }

  isVersionSelected(groupKey: string, versionId: string): boolean {
    return this.pendingProcessDefinitionKeys.includes(groupKey) ||
      this.pendingProcessDefinitionIds.includes(versionId);
  }

  trackVersion(_index: number, version: ProcessDefinitionVersion): string {
    return version.id;
  }

  get filteredProcessDefinitionGroups(): ProcessDefinitionGroup[] {
    const q = this.processDefinitionSearchText.trim().toLowerCase();
    if (!q) return this.availableProcessDefinitionGroups;
    return this.availableProcessDefinitionGroups.filter(g =>
      g.name.toLowerCase().includes(q) || g.key.toLowerCase().includes(q)
    );
  }

  get pdVisibleSelectedCount(): number {
    return this.filteredProcessDefinitionGroups.filter(g =>
      this.pendingProcessDefinitionKeys.includes(g.key) ||
      g.versions.some(v => this.pendingProcessDefinitionIds.includes(v.id))
    ).length;
  }

  get pdAllSelected(): boolean {
    const groups = this.filteredProcessDefinitionGroups;
    if (!groups.length) return false;
    return groups.every(g =>
      this.pendingProcessDefinitionKeys.includes(g.key) ||
      g.versions.every(v => this.pendingProcessDefinitionIds.includes(v.id))
    );
  }

  get pdSomeSelected(): boolean {
    return this.filteredProcessDefinitionGroups.some(g =>
      this.pendingProcessDefinitionKeys.includes(g.key) ||
      g.versions.some(v => this.pendingProcessDefinitionIds.includes(v.id))
    ) && !this.pdAllSelected;
  }

  toggleSelectAllProcessDefinitions(): void {
    const visible = this.filteredProcessDefinitionGroups;
    if (this.pdAllSelected) {
      const visibleKeys = visible.map(g => g.key);
      const visibleVersionIds = visible.flatMap(g => g.versions.map(v => v.id));
      this.pendingProcessDefinitionKeys = this.pendingProcessDefinitionKeys.filter(k => !visibleKeys.includes(k));
      this.pendingProcessDefinitionIds = this.pendingProcessDefinitionIds.filter(id => !visibleVersionIds.includes(id));
    } else {
      // Select all visible groups by key, removing any individual version IDs for them
      const visibleKeys = visible.map(g => g.key);
      const visibleVersionIds = visible.flatMap(g => g.versions.map(v => v.id));
      this.pendingProcessDefinitionIds = this.pendingProcessDefinitionIds.filter(id => !visibleVersionIds.includes(id));
      const combined = new Set([...this.pendingProcessDefinitionKeys, ...visibleKeys]);
      this.pendingProcessDefinitionKeys = [...combined];
    }
    this.cdr.markForCheck();
  }

  toggleDecisionDefinitionKey(key: string): void {
    if (this.pendingDecisionDefinitionKeys.includes(key)) {
      this.pendingDecisionDefinitionKeys = this.pendingDecisionDefinitionKeys.filter(k => k !== key);
    } else {
      this.pendingDecisionDefinitionKeys = [...this.pendingDecisionDefinitionKeys, key];
    }
    this.cdr.markForCheck();
  }

  get filteredDecisionDefinitions(): Array<{key: string; name: string}> {
    const q = this.decisionDefinitionSearchText.trim().toLowerCase();
    if (!q) return this.availableDecisionDefinitions;
    return this.availableDecisionDefinitions.filter(d =>
      d.name.toLowerCase().includes(q) || d.key.toLowerCase().includes(q)
    );
  }

  get ddVisibleSelectedCount(): number {
    return this.filteredDecisionDefinitions.filter(d => this.pendingDecisionDefinitionKeys.includes(d.key)).length;
  }

  get ddAllSelected(): boolean {
    const visible = this.filteredDecisionDefinitions;
    return visible.length > 0 && visible.every(d => this.pendingDecisionDefinitionKeys.includes(d.key));
  }

  get ddSomeSelected(): boolean {
    const visible = this.filteredDecisionDefinitions;
    return visible.some(d => this.pendingDecisionDefinitionKeys.includes(d.key)) && !this.ddAllSelected;
  }

  toggleSelectAllDecisionDefinitions(): void {
    const visibleKeys = this.filteredDecisionDefinitions.map(d => d.key);
    if (this.ddAllSelected) {
      this.pendingDecisionDefinitionKeys = this.pendingDecisionDefinitionKeys.filter(k => !visibleKeys.includes(k));
    } else {
      const combined = new Set([...this.pendingDecisionDefinitionKeys, ...visibleKeys]);
      this.pendingDecisionDefinitionKeys = [...combined];
    }
    this.cdr.markForCheck();
  }

  private populatePendingFromPill(pill: MultiValueFilter): void {
    this.pendingValues = [];
    this.pendingStateValues = [];
    this.pendingProcessDefinitionKeys = [];
    this.pendingProcessDefinitionIds = [];
    this.pendingVariableLines = [];
    switch (pill.field) {
      case 'businessKey':
      case 'instanceId':
      case 'decisionInstanceId':
      case 'processInstanceId':
        this.pendingValues = [...pill.values];
        break;
      case 'state':
        this.pendingStateValues = [...pill.values];
        break;
      case 'processDefinition':
        this.pendingProcessDefinitionKeys = [...pill.values];
        this.pendingProcessDefinitionIds = pill.processDefinitionIds ? [...pill.processDefinitionIds] : [];
        break;
      case 'decisionDefinition':
        this.pendingDecisionDefinitionKeys = [...pill.values];
        break;
      case 'variable':
        this.pendingValues = [...pill.values];
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
      case 'evaluatedAfter':
      case 'evaluatedBefore':
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
      case 'decisionInstanceId':
      case 'processInstanceId':
        if (this.pendingValues.length === 0) {
          if (this.editingPillIndex !== null) {
            const idx = this.editingPillIndex;
            this.activePills = this.activePills.filter((_, i) => i !== idx);
            this.editingPillIndex = null;
            this.activeEditorType = null;
            this.popoverFlipped = false;
            this.cdr.markForCheck();
            this.emit();
          }
          return;
        }
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
            this.emit();
          }
          return;
        }
        pill = { field: 'state', values: [...this.pendingStateValues] };
        break;
      case 'processDefinition': {
        if (this.pendingProcessDefinitionKeys.length === 0 && this.pendingProcessDefinitionIds.length === 0) {
          if (this.editingPillIndex !== null) {
            const idx = this.editingPillIndex;
            this.activePills = this.activePills.filter((_, i) => i !== idx);
            this.editingPillIndex = null;
            this.activeEditorType = null;
            this.popoverFlipped = false;
            this.cdr.markForCheck();
            this.emit();
          }
          return;
        }
        const hasKeys = this.pendingProcessDefinitionKeys.length > 0;
        const hasIds = this.pendingProcessDefinitionIds.length > 0;
        let pillValues: string[];
        let pillIds: string[] | undefined;
        if (hasKeys && hasIds) {
          const resolvedIds = this.pendingProcessDefinitionKeys.flatMap(k => {
            const g = this.availableProcessDefinitionGroups.find(g => g.key === k);
            return g ? g.versions.map(v => v.id) : [];
          });
          pillValues = [];
          pillIds = [...resolvedIds, ...this.pendingProcessDefinitionIds];
        } else if (hasIds) {
          pillValues = [];
          pillIds = [...this.pendingProcessDefinitionIds];
        } else {
          pillValues = [...this.pendingProcessDefinitionKeys];
          pillIds = undefined;
        }
        pill = { field: 'processDefinition', values: pillValues, ...(pillIds ? { processDefinitionIds: pillIds } : {}) };
        break;
      }
      case 'startedAfter':
      case 'startedBefore':
      case 'finishedAfter':
      case 'finishedBefore':
      case 'evaluatedAfter':
      case 'evaluatedBefore': {
        if (!this.pendingDateValue) return;
        const endOfDay = type === 'startedBefore' || type === 'finishedBefore' || type === 'evaluatedBefore';
        const formatted = this.formatDateForApi(this.pendingDateValue, endOfDay);
        if (!formatted) return;
        pill = { field: type, values: [formatted] };
        break;
      }
      case 'decisionDefinition':
        if (this.pendingDecisionDefinitionKeys.length === 0) {
          if (this.editingPillIndex !== null) {
            const idx = this.editingPillIndex;
            this.activePills = this.activePills.filter((_, i) => i !== idx);
            this.editingPillIndex = null;
            this.activeEditorType = null;
            this.popoverFlipped = false;
            this.cdr.markForCheck();
            this.emit();
          }
          return;
        }
        pill = { field: 'decisionDefinition', values: [...this.pendingDecisionDefinitionKeys] };
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
            this.emit();
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
      this.emit();
    }
  }

  cancelCriterion(): void {
    this.activeEditorType = null;
    this.pendingValues = [];
    this.pendingStateValues = [];
    this.pendingProcessDefinitionKeys = [];
    this.pendingProcessDefinitionIds = [];
    this.processDefinitionSearchText = '';
    this.pendingDecisionDefinitionKeys = [];
    this.decisionDefinitionSearchText = '';
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
    const estimatedMenuHeight = 7 * 34 + 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= estimatedMenuHeight
      ? rect.bottom + 4
      : Math.max(4, rect.top - estimatedMenuHeight - 4);
    this.opMenuPosition = { top, left: rect.left, minWidth: Math.max(rect.width, 170) };
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
    const values = (wasMulti && !willBeMulti && line.values.length > 1) ? [line.values[0]] : line.values;
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
          const detail = conditions.map(c => `${this.getOperatorLabel(c.op as VariableOperator)} ${c.val}`).join(' and ');
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
      if (op === 'gt')        { if (val > lo || (val === lo && !loStrict)) { lo = val; loStrict = true; } }
      else if (op === 'gteq') { if (val > lo) { lo = val; loStrict = false; } }
      else if (op === 'lt')   { if (val < hi || (val === hi && !hiStrict)) { hi = val; hiStrict = true; } }
      else if (op === 'lteq') { if (val < hi) { hi = val; hiStrict = false; } }
      else if (op === 'eq')   { eqs.push(val); }
      else if (op === 'neq')  { neqs.push(val); }
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
    this.emit();
  }

  onCaseOptionChange(): void {
    this.emit();
  }

  private emit(): void {
    this.criteriaChange.emit({
      criteria: this.activePills,
      vnIgnoreCase: this.variableNamesIgnoreCase,
      vvIgnoreCase: this.variableValuesIgnoreCase
    });
  }

  getPillLabel(pill: MultiValueFilter): string {
    const t = (key: string, p?: Record<string, string>) => this.translateService.instant(key, p);
    switch (pill.field) {
      case 'businessKey':    return t('cockpit.processes.globalSearch.pill.businessKey',  { value: pill.values.join(', ') });
      case 'instanceId':     return t('cockpit.processes.globalSearch.pill.instanceId',   { value: pill.values.join(', ') });
      case 'withIncidents':  return t('cockpit.processes.globalSearch.pill.withIncidents');
      case 'processDefinition': {
        let labels: string[];
        if (pill.processDefinitionIds?.length) {
          labels = pill.processDefinitionIds.map(id => {
            for (const g of this.availableProcessDefinitionGroups) {
              const v = g.versions.find(v => v.id === id);
              if (v) return `${g.name} v${v.version}`;
            }
            return id;
          });
        } else {
          labels = pill.values.map(k => {
            const g = this.availableProcessDefinitionGroups.find(g => g.key === k);
            return g ? g.name : k;
          });
        }
        return t('cockpit.processes.globalSearch.pill.processDefinition', { value: labels.join(', ') });
      }
      case 'startedAfter':   return t('cockpit.processes.globalSearch.pill.startedAfter',  { value: this.formatDisplayDate(pill.values[0]) });
      case 'startedBefore':  return t('cockpit.processes.globalSearch.pill.startedBefore', { value: this.formatDisplayDate(pill.values[0]) });
      case 'finishedAfter':  return t('cockpit.processes.globalSearch.pill.finishedAfter', { value: this.formatDisplayDate(pill.values[0]) });
      case 'finishedBefore': return t('cockpit.processes.globalSearch.pill.finishedBefore',{ value: this.formatDisplayDate(pill.values[0]) });
      case 'decisionDefinition': {
        const names = pill.values.map(k => {
          const d = this.availableDecisionDefinitions.find(x => x.key === k);
          return d ? d.name : k;
        });
        return t('cockpit.processes.globalSearch.pill.decisionDefinition', { value: names.join(', ') });
      }
      case 'evaluatedAfter':  return t('cockpit.processes.globalSearch.pill.evaluatedAfter',  { value: this.formatDisplayDate(pill.values[0]) });
      case 'evaluatedBefore': return t('cockpit.processes.globalSearch.pill.evaluatedBefore', { value: this.formatDisplayDate(pill.values[0]) });
      case 'decisionInstanceId': return t('cockpit.processes.globalSearch.pill.decisionInstanceId', { value: pill.values.join(', ') });
      case 'processInstanceId':  return t('cockpit.processes.globalSearch.pill.processInstanceId',  { value: pill.values.join(', ') });
      case 'variables': {
        const n = pill.variableLines?.filter(l => l.variableName).length ?? 0;
        return t('cockpit.processes.globalSearch.pill.variables', { count: String(n) });
      }
      default: return '';
    }
  }

  getPillIcon(pill: MultiValueFilter): any {
    switch (pill.field) {
      case 'businessKey':                                    return this.faKey;
      case 'instanceId':
      case 'decisionInstanceId':                             return this.faHashtag;
      case 'processInstanceId':                              return this.faKey;
      case 'withIncidents':                                  return this.faExclamationTriangle;
      case 'processDefinition':
      case 'decisionDefinition':                             return this.faSitemap;
      case 'startedAfter': case 'startedBefore':
      case 'finishedAfter': case 'finishedBefore':
      case 'evaluatedAfter': case 'evaluatedBefore':         return this.faCalendarAlt;
      case 'variables': case 'variable':                     return this.faCode;
      default:                                               return this.faFilter;
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

  getOperatorLabel(op: VariableOperator): string {
    const ops: Record<VariableOperator, string> = {
      eq: '=', neq: '≠', gt: '>', gteq: '≥', lt: '<', lteq: '≤', like: '~'
    };
    return ops[op] || '=';
  }

  formatDateForApi(dateStr: string, endOfDay = false): string | null {
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
    const mon  = String(d.getMonth() + 1).padStart(2, '0');
    const day  = String(d.getDate()).padStart(2, '0');
    const hrs  = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');
    const sec  = String(d.getSeconds()).padStart(2, '0');
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
