import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TaskFilter, FilterCriteria, FILTER_CRITERIA, BOOLEAN_CRITERIA } from '../../../models/tasklist/filter.model';

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
  operatorOptions: Record<string, { value: string; label: string }[]> = {
    string: [
      { value: 'eq', label: '=' },
      { value: 'neq', label: '!=' },
      { value: 'like', label: 'like' }
    ],
    date: [
      { value: 'before', label: 'before' },
      { value: 'after', label: 'after' }
    ],
    number: [
      { value: 'eq', label: '=' },
      { value: 'neq', label: '!=' },
      { value: 'gt', label: '>' },
      { value: 'gteq', label: '>=' },
      { value: 'lt', label: '<' },
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

      // Parse existing criteria from query
      this.parseCriteriaFromQuery(this.filter.query);

      // TODO: Parse permissions from filter
      // TODO: Parse variables from filter properties
    } else {
      this.resetForm();
    }
  }

  private parseCriteriaFromQuery(query: Record<string, any>): void {
    if (!query) return;

    this.selectedCriteria = [];
    this.selectedBooleanCriteria = [];

    // Map query properties to criteria
    Object.entries(query).forEach(([key, value]) => {
      // Check if it's a boolean criterion
      if (this.booleanCriteria.some(bc => bc.key === key)) {
        if (value === true) {
          this.selectedBooleanCriteria.push(key);
        }
        return;
      }

      // Find matching criterion
      for (const group of this.filterCriteria) {
        const criterion = group.options.find(opt => opt.key === key);
        if (criterion) {
          this.selectedCriteria.push({
            key,
            operator: 'eq',
            value: String(value)
          });
          break;
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

  toggleBooleanCriterion(key: string): void {
    const index = this.selectedBooleanCriteria.indexOf(key);
    if (index >= 0) {
      this.selectedBooleanCriteria.splice(index, 1);
    } else {
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

  // Form actions
  onSave(): void {
    if (!this.filterName.trim()) {
      return;
    }

    // Build query from criteria
    const query: Record<string, any> = {};

    // Add regular criteria
    this.selectedCriteria.forEach(criterion => {
      if (criterion.key && criterion.value) {
        query[criterion.key] = criterion.value;
      }
    });

    // Add boolean criteria
    this.selectedBooleanCriteria.forEach(key => {
      query[key] = true;
    });

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
