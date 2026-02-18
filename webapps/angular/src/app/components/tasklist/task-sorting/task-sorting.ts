import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TaskSorting } from '../../../models/tasklist/task.model';

interface SortOption {
  key: string;
  labelKey: string;
  type: 'date' | 'string' | 'number';
}

interface SortGroup {
  groupKey: string;
  options: SortOption[];
}

@Component({
  selector: 'app-task-sorting',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './task-sorting.html',
  styleUrl: './task-sorting.css'
})
export class TaskSortingComponent {
  @Input() sorting: TaskSorting[] = [];
  @Output() sortingChange = new EventEmitter<TaskSorting[]>();

  isOpen = false;

  // Available sort options
  sortGroups: SortGroup[] = [
    {
      groupKey: 'sorting.taskProperties',
      options: [
        { key: 'created', labelKey: 'sorting.created', type: 'date' },
        { key: 'dueDate', labelKey: 'sorting.dueDate', type: 'date' },
        { key: 'followUpDate', labelKey: 'sorting.followUpDate', type: 'date' },
        { key: 'lastUpdated', labelKey: 'sorting.lastUpdated', type: 'date' },
        { key: 'priority', labelKey: 'sorting.priority', type: 'number' },
        { key: 'name', labelKey: 'sorting.taskName', type: 'string' },
        { key: 'assignee', labelKey: 'sorting.assignee', type: 'string' }
      ]
    },
    {
      groupKey: 'sorting.processProperties',
      options: [
        { key: 'processInstanceId', labelKey: 'sorting.processInstanceId', type: 'string' },
        { key: 'processDefinitionId', labelKey: 'sorting.processDefinitionId', type: 'string' },
        { key: 'processDefinitionKey', labelKey: 'sorting.processDefinitionKey', type: 'string' },
        { key: 'processDefinitionName', labelKey: 'sorting.processDefinitionName', type: 'string' },
        { key: 'executionId', labelKey: 'sorting.executionId', type: 'string' }
      ]
    },
    {
      groupKey: 'sorting.caseProperties',
      options: [
        { key: 'caseInstanceId', labelKey: 'sorting.caseInstanceId', type: 'string' },
        { key: 'caseDefinitionId', labelKey: 'sorting.caseDefinitionId', type: 'string' },
        { key: 'caseDefinitionKey', labelKey: 'sorting.caseDefinitionKey', type: 'string' },
        { key: 'caseExecutionId', labelKey: 'sorting.caseExecutionId', type: 'string' }
      ]
    },
    {
      groupKey: 'sorting.other',
      options: [
        { key: 'taskDefinitionKey', labelKey: 'sorting.taskDefinitionKey', type: 'string' },
        { key: 'tenantId', labelKey: 'sorting.tenantId', type: 'string' }
      ]
    }
  ];

  get allOptions(): SortOption[] {
    return this.sortGroups.flatMap(g => g.options);
  }

  get availableOptions(): SortOption[] {
    const usedKeys = new Set(this.sorting.map(s => s.sortBy));
    return this.allOptions.filter(opt => !usedKeys.has(opt.key));
  }

  get sortingSummary(): string {
    if (this.sorting.length === 0) {
      return '';
    }
    return this.sorting
      .map(s => {
        const option = this.allOptions.find(o => o.key === s.sortBy);
        const dir = s.sortOrder === 'asc' ? '↑' : '↓';
        return option ? `${dir}` : '';
      })
      .join(' ');
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  addSortLevel(key: string): void {
    const option = this.allOptions.find(o => o.key === key);
    if (!option) return;

    // Default order based on type
    const defaultOrder = option.type === 'date' ? 'desc' : 'asc';

    const newSorting: TaskSorting[] = [
      ...this.sorting,
      { sortBy: key, sortOrder: defaultOrder }
    ];

    this.sortingChange.emit(newSorting);
  }

  removeSortLevel(index: number): void {
    const newSorting = this.sorting.filter((_, i) => i !== index);
    this.sortingChange.emit(newSorting);
  }

  toggleSortOrder(index: number): void {
    const newSorting = this.sorting.map((s, i) => {
      if (i === index) {
        return {
          ...s,
          sortOrder: s.sortOrder === 'asc' ? 'desc' : 'asc'
        } as TaskSorting;
      }
      return s;
    });
    this.sortingChange.emit(newSorting);
  }

  moveSortLevel(index: number, direction: 'up' | 'down'): void {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === this.sorting.length - 1)
    ) {
      return;
    }

    const newSorting = [...this.sorting];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSorting[index], newSorting[targetIndex]] = [newSorting[targetIndex], newSorting[index]];

    this.sortingChange.emit(newSorting);
  }

  getSortLabel(sortBy: string): string {
    const option = this.allOptions.find(o => o.key === sortBy);
    return option?.labelKey || sortBy;
  }

  resetToDefault(): void {
    this.sortingChange.emit([{ sortBy: 'created', sortOrder: 'desc' }]);
  }

  clearAll(): void {
    this.sortingChange.emit([]);
  }

  onBackdropClick(): void {
    this.closeDropdown();
  }

  isSortKeyUsed(key: string): boolean {
    return this.sorting.some(s => s.sortBy === key);
  }
}
