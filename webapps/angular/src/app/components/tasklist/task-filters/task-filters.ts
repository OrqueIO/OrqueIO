import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TooltipDirective } from '../../../shared/tooltip/tooltip.directive';
import { TaskFilter } from '../../../models/tasklist';
import { FiltersActions, selectCanCreateFilter } from '../../../store/tasklist';

@Component({
  selector: 'app-task-filters',
  standalone: true,
  imports: [CommonModule, TranslatePipe, TooltipDirective],
  templateUrl: './task-filters.html',
  styleUrl: './task-filters.css'
})
export class TaskFiltersComponent implements OnChanges {
  private readonly store = inject(Store);

  @Input() filters: TaskFilter[] = [];
  @Input() selectedFilterId: string | null = null;
  @Input() filterCount = 0;
  @Input() loading = false;
  @Input() error: string | null = null;

  @Output() filterSelect = new EventEmitter<string | null>();
  @Output() filterCreate = new EventEmitter<void>();
  @Output() filterEdit = new EventEmitter<TaskFilter>();

  canCreate$ = this.store.select(selectCanCreateFilter);

  private hasAutoSelected = false;

  searchQuery = '';

  get filteredFilters(): TaskFilter[] {
    if (!this.searchQuery.trim()) return this.filters;
    const q = this.searchQuery.toLowerCase();
    return this.filters.filter(f => f.name.toLowerCase().includes(q));
  }

  onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Auto-select first filter when filters are loaded and none is selected
    if (changes['filters'] && this.filters.length > 0 && !this.selectedFilterId && !this.hasAutoSelected) {
      this.hasAutoSelected = true;
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        this.selectFilter(this.filters[0]);
      }, 0);
    }
  }

  selectFilter(filter: TaskFilter): void {
    this.filterSelect.emit(filter.id);
  }

  clearFilter(): void {
    this.filterSelect.emit(null);
  }

  isSelected(filter: TaskFilter): boolean {
    return this.selectedFilterId === filter.id;
  }

  openCreateModal(): void {
    this.filterCreate.emit();
  }

  openEditModal(event: Event, filter: TaskFilter): void {
    event.stopPropagation();
    this.filterEdit.emit(filter);
  }

  getFilterStyle(filter: TaskFilter): Record<string, string> {
    const color = filter.properties?.color;
    if (color) {
      return {
        '--filter-color': color,
        borderLeftColor: color
      };
    }
    return {};
  }

  getFilterTextStyle(filter: TaskFilter): Record<string, string> {
    const color = filter.properties?.color;
    if (color) {
      return { color };
    }
    return {};
  }

  hasRefreshEnabled(filter: TaskFilter): boolean {
    return filter.properties?.refresh === true;
  }

  trackByFilterId(index: number, filter: TaskFilter): string {
    return filter.id;
  }
}
