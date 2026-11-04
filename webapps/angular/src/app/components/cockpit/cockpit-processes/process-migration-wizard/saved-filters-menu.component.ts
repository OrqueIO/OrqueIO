import {
  Component, ChangeDetectionStrategy, output, input, signal, computed,
  inject, HostListener, effect, untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { MultiValueFilter } from '../../../../services/cockpit.service';

export interface SavedFilter {
  name: string;
  criteria: MultiValueFilter[];
  processDefinitionId?: string;
  savedAt: string;
}

@Component({
  selector: 'app-saved-filters-menu',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TranslatePipe
  ],
  templateUrl: './saved-filters-menu.component.html',
  styleUrl: './saved-filters-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavedFiltersMenuComponent {
  private translateService = inject(TranslateService);

  readonly currentCriteria = input.required<MultiValueFilter[]>();
  readonly processDefinitionId = input.required<string>();

  readonly close = output<void>();
  readonly filterSaved = output<SavedFilter>();
  readonly filterLoaded = output<SavedFilter>();
  readonly filterDeleted = output<SavedFilter>();

  readonly faTrash = faTrash;

  readonly filterNameInput = signal('');
  readonly savedFilters = signal<SavedFilter[]>([]);
  readonly filterToDelete = signal<SavedFilter | null>(null);

  readonly filterCount = computed(() => this.savedFilters().length);

  private readonly SAVED_FILTERS_KEY = 'cockpit-saved-filters';

  constructor() {
    this.loadSavedFilters();
  }

  isSaveDisabled(): boolean {
    return !this.filterNameInput().trim();
  }

  saveFilter(): void {
    const name = this.filterNameInput().trim();
    if (!name) {
      return;
    }

    const newFilter: SavedFilter = {
      name,
      criteria: [...this.currentCriteria()],
      processDefinitionId: this.processDefinitionId(),
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
    this.filterNameInput.set('');
    this.filterSaved.emit(newFilter);
  }

  loadFilter(filter: SavedFilter): void {
    this.filterLoaded.emit(filter);
  }

  showDeleteConfirmation(filter: SavedFilter, event: Event): void {
    event.stopPropagation();
    this.filterToDelete.set(filter);
  }

  cancelDelete(): void {
    this.filterToDelete.set(null);
  }

  confirmDelete(): void {
    const filter = this.filterToDelete();
    if (!filter) return;

    const filters = this.savedFilters().filter(f => f.name !== filter.name);
    this.savedFilters.set(filters);
    this.persistFilters();
    this.filterToDelete.set(null);
    this.filterDeleted.emit(filter);
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

  onEscape(): void {
    if (this.filterToDelete()) {
      this.cancelDelete();
    } else {
      this.close.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    this.onEscape();
  }
}