import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import {
  TaskFilter,
  FilterCriteria,
  FILTER_CRITERIA,
  BOOLEAN_CRITERIA,
  DATE_BASE_MAP,
  EXPRESSION_REGEX,
  EXPRESSION_SUPPORTED_FIELDS
} from '../../../models/tasklist/filter.model';

interface AccordionSection {
  id: string;
  titleKey: string;
  expanded: boolean;
}

interface FilterPermission {
  type: 'global' | 'user' | 'group';
  id?: string;
  name?: string;
}

interface FilterVariable {
  name: string;
  label: string;
}

interface CriterionValue {
  key: string;
  operator: string;
  value: string;
}

@Component({
  selector: 'app-filter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './filter-modal.html',
  styleUrl: './filter-modal.css'
})
export class FilterModalComponent implements OnInit {
  @Input() filter: TaskFilter | null = null;
  @Input() isOpen = false;

  @Output() save = new EventEmitter<Partial<TaskFilter>>();
  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<string>();

  // Filter criteria options
  filterCriteria = FILTER_CRITERIA;
  booleanCriteria = BOOLEAN_CRITERIA;

  // Accordion sections
  sections: AccordionSection[] = [
    { id: 'general', titleKey: 'filter.general', expanded: true },
    { id: 'criteria', titleKey: 'filter.criteria', expanded: false },
    { id: 'permissions', titleKey: 'filter.permissions', expanded: false },
    { id: 'variables', titleKey: 'filter.variables', expanded: false }
  ];

  // Form data
  filterName = '';
  filterDescription = '';
  filterColor = '#0066cc';
  filterPriority = 0;
  autoRefresh = false;
  refreshInterval = 10000;
  includeAssignedTasks = false;
  showUndefinedVariable = false;

  // Criteria
  selectedCriteria: CriterionValue[] = [];
  selectedBooleanCriteria: string[] = [];

  // Permissions
  permissions: FilterPermission[] = [];
  newPermissionType: 'global' | 'user' | 'group' = 'user';
  newPermissionId = '';

  // Variables (columns)
  variables: FilterVariable[] = [];
  newVariableName = '';
  newVariableLabel = '';

  // Predefined colors
  colorOptions = [
    '#0066cc', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
    '#6c757d', '#6610f2', '#e83e8c', '#fd7e14', '#20c997'
  ];

  // Operator options per criterion type
  // Number operators restricted to what Camunda Task API supports for priority
  // (eq → priority, gteq → minPriority, lteq → maxPriority)
  operatorOptions: Record<string, { value: string; label: string }[]> = {
    string: [
      { value: 'eq', label: '=' },
      { value: 'neq', label: '!=' },
      { value: 'like', label: 'like' },
      { value: 'notLike', label: 'not like' },
      { value: 'in', label: 'in' }
    ],
    date: [
      { value: 'before', label: 'before' },
      { value: 'after', label: 'after' }
    ],
    number: [
      { value: 'eq', label: '=' },
      { value: 'neq', label: '!=' },
      { value: 'gteq', label: '>=' },
      { value: 'lteq', label: '<=' }
    ]
  };

  get isEditMode(): boolean {
    return !!this.filter?.id;
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    if (this.filter) {
      this.filterName = this.filter.name || '';
      this.filterDescription = this.filter.properties?.description || '';
      this.filterColor = this.filter.properties?.color || '#0066cc';
      this.filterPriority = this.filter.properties?.priority || 0;
      this.autoRefresh = this.filter.properties?.refresh || false;
      this.showUndefinedVariable = this.filter.properties?.showUndefinedVariable || false;
      this.includeAssignedTasks = !!(this.filter.query as any)?.includeAssignedTasks;

      // Parse existing criteria from query
      this.parseCriteriaFromQuery(this.filter.query);

      // Parse permissions from filter (authorization links)
      this.parsePermissionsFromFilter(this.filter);

      // Parse variables from filter properties
      this.parseVariablesFromFilter(this.filter);
    } else {
      this.resetForm();
    }
  }

  private parsePermissionsFromFilter(filter: TaskFilter): void {
    this.permissions = [];
    const auth = (filter as any).authorized;
    if (auth && Array.isArray(auth)) {
      auth.forEach((entry: any) => {
        if (entry.type === 'global' || entry.type === '*') {
          this.permissions.push({ type: 'global' });
        } else if (entry.userId) {
          this.permissions.push({ type: 'user', id: entry.userId, name: entry.userId });
        } else if (entry.groupId) {
          this.permissions.push({ type: 'group', id: entry.groupId, name: entry.groupId });
        }
      });
    }
  }

  private parseVariablesFromFilter(filter: TaskFilter): void {
    this.variables = [];
    const vars = filter.properties?.variables;
    if (vars && Array.isArray(vars)) {
      vars.forEach(v => {
        this.variables.push({
          name: v.name,
          label: v.label || v.name
        });
      });
    }
  }

  /** Operator suffixes used by the Camunda task filter query API */
  private static readonly OPERATOR_SUFFIXES: Record<string, string> = {
    Like: 'like',
    NotLike: 'notLike',
    Before: 'before',
    After: 'after',
    Expression: 'eq'
  };

  /** Reverse map: Camunda priority keys → criterion key + operator */
  private static readonly PRIORITY_REVERSE_MAP: Record<string, { key: string; operator: string }> = {
    minPriority: { key: 'priority', operator: 'gteq' },
    maxPriority: { key: 'priority', operator: 'lteq' }
  };

  /** Reverse map: Camunda date API keys → criterion key + operator */
  private static readonly DATE_REVERSE_MAP: Record<string, { key: string; operator: string }> = {
    dueBefore: { key: 'dueDate', operator: 'before' },
    dueAfter: { key: 'dueDate', operator: 'after' },
    followUpBefore: { key: 'followUpDate', operator: 'before' },
    followUpAfter: { key: 'followUpDate', operator: 'after' },
    createdBefore: { key: 'createdDate', operator: 'before' },
    createdAfter: { key: 'createdDate', operator: 'after' }
  };

  /** Fields that trigger the includeAssignedTasks checkbox */
  private static readonly INCLUDE_ASSIGNED_TASKS_FIELDS = [
    'candidateGroup', 'candidateGroups', 'candidateUser'
  ];

  private parseCriteriaFromQuery(query: Record<string, any>): void {
    if (!query) return;

    this.selectedCriteria = [];
    this.selectedBooleanCriteria = [];

    // Build a set of all known criterion keys for quick lookup
    const allCriterionKeys = new Set<string>();
    for (const group of this.filterCriteria) {
      for (const opt of group.options) {
        allCriterionKeys.add(opt.key);
      }
    }

    // Map query properties to criteria
    Object.entries(query).forEach(([key, value]) => {
      // Skip includeAssignedTasks (handled separately)
      if (key === 'includeAssignedTasks') return;

      // Skip orQueries (handled by matchType)
      if (key === 'orQueries') return;

      // Check if it's a boolean criterion
      if (this.booleanCriteria.some(bc => bc.key === key)) {
        if (value === true) {
          this.selectedBooleanCriteria.push(key);
        }
        return;
      }

      // Check for special Camunda priority keys (minPriority / maxPriority)
      const priorityMapping = FilterModalComponent.PRIORITY_REVERSE_MAP[key];
      if (priorityMapping) {
        this.selectedCriteria.push({
          key: priorityMapping.key,
          operator: priorityMapping.operator,
          value: String(value)
        });
        return;
      }

      // Check for Camunda date API keys (dueBefore → dueDate + before, etc.)
      const dateMapping = FilterModalComponent.DATE_REVERSE_MAP[key];
      if (dateMapping) {
        this.selectedCriteria.push({
          key: dateMapping.key,
          operator: dateMapping.operator,
          value: String(value)
        });
        return;
      }

      // Direct match — operator is 'eq'
      if (allCriterionKeys.has(key)) {
        this.selectedCriteria.push({
          key,
          operator: 'eq',
          value: String(value)
        });
        return;
      }

      // Try to detect operator suffix (e.g. assigneeLike → assignee + like)
      for (const [suffix, operator] of Object.entries(FilterModalComponent.OPERATOR_SUFFIXES)) {
        if (key.endsWith(suffix)) {
          const baseKey = key.slice(0, -suffix.length);
          if (allCriterionKeys.has(baseKey)) {
            this.selectedCriteria.push({
              key: baseKey,
              operator,
              value: String(value)
            });
            return;
          }
        }
      }
    });
  }

  private resetForm(): void {
    this.filterName = '';
    this.filterDescription = '';
    this.filterColor = '#0066cc';
    this.filterPriority = 0;
    this.autoRefresh = false;
    this.refreshInterval = 10000;
    this.includeAssignedTasks = false;
    this.showUndefinedVariable = false;
    this.selectedCriteria = [];
    this.selectedBooleanCriteria = [];
    this.permissions = [];
    this.variables = [];
  }

  toggleSection(sectionId: string): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      section.expanded = !section.expanded;
    }
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.sections.find(s => s.id === sectionId)?.expanded || false;
  }

  // Criteria management
  addCriterion(): void {
    this.selectedCriteria.push({
      key: '',
      operator: 'eq',
      value: ''
    });
  }

  removeCriterion(index: number): void {
    this.selectedCriteria.splice(index, 1);
  }

  getOperatorsForCriterion(criterionKey: string): { value: string; label: string }[] {
    // Find the criterion type
    for (const group of this.filterCriteria) {
      const criterion = group.options.find(opt => opt.key === criterionKey);
      if (criterion) {
        return this.operatorOptions[criterion.type] || this.operatorOptions['string'];
      }
    }
    return this.operatorOptions['string'];
  }

  /** Pairs of mutually exclusive boolean criteria */
  private static readonly EXCLUSIVE_PAIRS: Record<string, string> = {
    assigned: 'unassigned',
    unassigned: 'assigned',
    withCandidateGroups: 'withoutCandidateGroups',
    withoutCandidateGroups: 'withCandidateGroups',
    withCandidateUsers: 'withoutCandidateUsers',
    withoutCandidateUsers: 'withCandidateUsers',
    active: 'suspended',
    suspended: 'active'
  };

  toggleBooleanCriterion(key: string): void {
    const index = this.selectedBooleanCriteria.indexOf(key);
    if (index >= 0) {
      this.selectedBooleanCriteria.splice(index, 1);
    } else {
      // Remove mutually exclusive counterpart before adding
      const opposite = FilterModalComponent.EXCLUSIVE_PAIRS[key];
      if (opposite) {
        const oppositeIndex = this.selectedBooleanCriteria.indexOf(opposite);
        if (oppositeIndex >= 0) {
          this.selectedBooleanCriteria.splice(oppositeIndex, 1);
        }
      }
      this.selectedBooleanCriteria.push(key);
    }
  }

  isBooleanCriterionSelected(key: string): boolean {
    return this.selectedBooleanCriteria.includes(key);
  }

  // Permissions management
  addPermission(): void {
    if (this.newPermissionType === 'global') {
      this.permissions.push({ type: 'global' });
    } else if (this.newPermissionId.trim()) {
      this.permissions.push({
        type: this.newPermissionType,
        id: this.newPermissionId.trim(),
        name: this.newPermissionId.trim()
      });
      this.newPermissionId = '';
    }
  }

  removePermission(index: number): void {
    this.permissions.splice(index, 1);
  }

  // Variables management
  addVariable(): void {
    if (this.newVariableName.trim()) {
      this.variables.push({
        name: this.newVariableName.trim(),
        label: this.newVariableLabel.trim() || this.newVariableName.trim()
      });
      this.newVariableName = '';
      this.newVariableLabel = '';
    }
  }

  removeVariable(index: number): void {
    this.variables.splice(index, 1);
  }

  /** Standard suffix mapping for string / date operators */
  private static readonly OPERATOR_TO_SUFFIX: Record<string, string> = {
    eq: '',
    neq: 'NotEquals',
    like: 'Like',
    notLike: 'NotLike',
    before: 'Before',
    after: 'After',
    in: 'In'
  };

  /**
   * Priority uses dedicated Camunda keys instead of generic suffixes:
   *   gteq → minPriority,  lteq → maxPriority,  eq → priority
   */
  private static readonly PRIORITY_OPERATOR_MAP: Record<string, string> = {
    eq: 'priority',
    gteq: 'minPriority',
    lteq: 'maxPriority'
  };

  /**
   * Build the Camunda-compatible query key for a given criterion + operator.
   * Handles special cases for priority, date fields, and expression values.
   */
  private buildQueryKey(criterionKey: string, operator: string, value?: string): string {
    // Priority field has special Camunda keys
    if (criterionKey === 'priority') {
      return FilterModalComponent.PRIORITY_OPERATOR_MAP[operator] || 'priority';
    }

    // followUpBeforeOrNotExistent is a direct API key — no suffix needed
    if (criterionKey === 'followUpBeforeOrNotExistent') {
      // Append Expression suffix if value is an expression
      if (value && EXPRESSION_REGEX.test(value)) {
        return criterionKey + 'Expression';
      }
      return criterionKey;
    }

    // Date fields: the Camunda API uses dueBefore/dueAfter, not dueDateBefore/dueDateAfter
    const dateBase = DATE_BASE_MAP[criterionKey];
    if (dateBase) {
      const suffix = FilterModalComponent.OPERATOR_TO_SUFFIX[operator] ?? '';
      const apiKey = suffix ? dateBase + suffix : criterionKey;
      // Append Expression suffix if value is an expression
      if (value && EXPRESSION_REGEX.test(value) && EXPRESSION_SUPPORTED_FIELDS.includes(criterionKey)) {
        return apiKey + 'Expression';
      }
      return apiKey;
    }

    let key = criterionKey;
    const suffix = FilterModalComponent.OPERATOR_TO_SUFFIX[operator] ?? '';
    key = key + suffix;

    // Append Expression suffix for supported fields with expression values
    if (value && EXPRESSION_REGEX.test(value) && EXPRESSION_SUPPORTED_FIELDS.includes(criterionKey)) {
      key += 'Expression';
    }

    return key;
  }

  /** Check if includeAssignedTasks checkbox should be visible */
  get showIncludeAssignedTasks(): boolean {
    return this.selectedCriteria.some(c =>
      FilterModalComponent.INCLUDE_ASSIGNED_TASKS_FIELDS.includes(c.key)
    );
  }

  // Form actions
  onSave(): void {
    if (!this.filterName.trim()) {
      return;
    }

    // Build query from criteria using Camunda-compatible keys
    const query: Record<string, any> = {};

    this.selectedCriteria.forEach(criterion => {
      if (criterion.key && criterion.value) {
        const queryKey = this.buildQueryKey(criterion.key, criterion.operator, criterion.value);
        let value: any = criterion.value;

        // Number fields
        if (criterion.key === 'priority' || criterion.key === 'maxPriority' || criterion.key === 'minPriority') {
          value = Number(value) || 0;
        }
        // Comma-separated list fields (candidateGroups, *In keys)
        else if (criterion.key === 'candidateGroups' || criterion.key.endsWith('In') || criterion.operator === 'in') {
          if (typeof value === 'string') {
            value = value.split(',').map((v: string) => v.trim());
          }
        }
        // Like operator: wrap with % wildcards if not already present
        else if (criterion.operator === 'like' || criterion.operator === 'notLike') {
          if (typeof value === 'string' && !EXPRESSION_REGEX.test(value)) {
            if (value[0] !== '%') value = '%' + value;
            if (value[value.length - 1] !== '%') value = value + '%';
          }
        }

        query[queryKey] = value;
      }
    });

    // Add boolean criteria
    this.selectedBooleanCriteria.forEach(key => {
      query[key] = true;
    });

    // Add includeAssignedTasks if enabled and relevant criteria selected
    if (this.includeAssignedTasks && this.showIncludeAssignedTasks) {
      query['includeAssignedTasks'] = true;
    }

    const filterData: Partial<TaskFilter> = {
      id: this.filter?.id,
      name: this.filterName.trim(),
      resourceType: 'Task',
      query,
      properties: {
        description: this.filterDescription.trim(),
        color: this.filterColor,
        priority: this.filterPriority,
        refresh: this.autoRefresh,
        showUndefinedVariable: this.showUndefinedVariable,
        variables: this.variables
      }
    };

    this.save.emit(filterData);
  }

  onDelete(): void {
    if (this.filter?.id) {
      this.delete.emit(this.filter.id);
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }
}
