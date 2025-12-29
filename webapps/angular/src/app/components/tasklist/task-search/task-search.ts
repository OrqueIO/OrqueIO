import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { FILTER_CRITERIA, FilterCriterionOption } from '../../../models/tasklist/filter.model';
import { Subject, debounceTime, takeUntil } from 'rxjs';

export interface SearchPill {
  id: string;
  key: string;
  label: string;
  operator: string;
  value: string;
  type: string;
}

interface SearchSuggestion {
  key: string;
  label: string;
  type: string;
  group: string;
}

@Component({
  selector: 'app-task-search',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './task-search.html',
  styleUrl: './task-search.css'
})
export class TaskSearchComponent implements OnInit, OnDestroy {
  @Input() pills: SearchPill[] = [];
  @Output() pillsChange = new EventEmitter<SearchPill[]>();
  @Output() search = new EventEmitter<SearchPill[]>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  searchText = '';
  showSuggestions = false;
  suggestions: SearchSuggestion[] = [];
  filteredSuggestions: SearchSuggestion[] = [];
  selectedSuggestionIndex = -1;

  // Currently editing pill
  editingPill: SearchPill | null = null;
  pendingCriterion: SearchSuggestion | null = null;
  pendingOperator = '';
  inputMode: 'criterion' | 'operator' | 'value' = 'criterion';

  // Operators
  operators: Record<string, { value: string; label: string }[]> = {
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

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.buildSuggestions();

    // Debounce search input
    this.searchSubject
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe(text => {
        this.filterSuggestions(text);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildSuggestions(): void {
    this.suggestions = [];

    for (const group of FILTER_CRITERIA) {
      for (const option of group.options) {
        this.suggestions.push({
          key: option.key,
          label: option.labelKey, // Will be translated in template
          type: option.type,
          group: group.groupKey
        });
      }
    }
  }

  private filterSuggestions(text: string): void {
    if (!text.trim()) {
      this.filteredSuggestions = this.suggestions.slice(0, 10);
    } else {
      const lowerText = text.toLowerCase();
      this.filteredSuggestions = this.suggestions
        .filter(s =>
          s.key.toLowerCase().includes(lowerText) ||
          s.label.toLowerCase().includes(lowerText)
        )
        .slice(0, 10);
    }
    this.selectedSuggestionIndex = -1;
  }

  onInputChange(): void {
    if (this.inputMode === 'criterion') {
      this.searchSubject.next(this.searchText);
      this.showSuggestions = true;
    }
  }

  onInputFocus(): void {
    if (this.inputMode === 'criterion') {
      this.filterSuggestions(this.searchText);
      this.showSuggestions = true;
    }
  }

  onInputBlur(): void {
    // Delay to allow click on suggestion
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.filteredSuggestions.length > 0) {
          this.selectedSuggestionIndex = Math.min(
            this.selectedSuggestionIndex + 1,
            this.filteredSuggestions.length - 1
          );
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.filteredSuggestions.length > 0) {
          this.selectedSuggestionIndex = Math.max(
            this.selectedSuggestionIndex - 1,
            0
          );
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (this.inputMode === 'criterion' && this.selectedSuggestionIndex >= 0) {
          this.selectSuggestion(this.filteredSuggestions[this.selectedSuggestionIndex]);
        } else if (this.inputMode === 'value' && this.searchText.trim()) {
          this.confirmPill();
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.cancelInput();
        break;

      case 'Backspace':
        if (!this.searchText && this.inputMode === 'criterion' && this.pills.length > 0) {
          // Remove last pill
          this.removePill(this.pills[this.pills.length - 1].id);
        } else if (!this.searchText && this.inputMode === 'operator') {
          // Go back to criterion mode
          this.inputMode = 'criterion';
          this.pendingCriterion = null;
          this.filterSuggestions('');
          this.showSuggestions = true;
        }
        break;
    }
  }

  selectSuggestion(suggestion: SearchSuggestion): void {
    this.pendingCriterion = suggestion;
    this.inputMode = 'operator';
    this.searchText = '';
    this.showSuggestions = false;
  }

  selectOperator(operator: string): void {
    this.pendingOperator = operator;
    this.inputMode = 'value';
    this.searchText = '';
    this.searchInput?.nativeElement?.focus();
  }

  confirmPill(): void {
    if (this.pendingCriterion && this.pendingOperator && this.searchText.trim()) {
      const newPill: SearchPill = {
        id: this.generateId(),
        key: this.pendingCriterion.key,
        label: this.pendingCriterion.label,
        operator: this.pendingOperator,
        value: this.searchText.trim(),
        type: this.pendingCriterion.type
      };

      const updatedPills = [...this.pills, newPill];
      this.pillsChange.emit(updatedPills);
      this.search.emit(updatedPills);

      this.resetInput();
    }
  }

  removePill(id: string): void {
    const updatedPills = this.pills.filter(p => p.id !== id);
    this.pillsChange.emit(updatedPills);
    this.search.emit(updatedPills);
    this.searchInput?.nativeElement?.focus();
  }

  editPill(pill: SearchPill): void {
    this.editingPill = pill;
    this.searchText = pill.value;
    this.pendingCriterion = {
      key: pill.key,
      label: pill.label,
      type: pill.type,
      group: ''
    };
    this.pendingOperator = pill.operator;
    this.inputMode = 'value';
    this.searchInput?.nativeElement?.focus();
  }

  updatePill(): void {
    if (this.editingPill && this.searchText.trim()) {
      const updatedPills = this.pills.map(p =>
        p.id === this.editingPill!.id
          ? { ...p, value: this.searchText.trim(), operator: this.pendingOperator }
          : p
      );
      this.pillsChange.emit(updatedPills);
      this.search.emit(updatedPills);
      this.resetInput();
    }
  }

  cancelInput(): void {
    this.resetInput();
  }

  clearAll(): void {
    this.pillsChange.emit([]);
    this.search.emit([]);
    this.resetInput();
  }

  private resetInput(): void {
    this.searchText = '';
    this.pendingCriterion = null;
    this.pendingOperator = '';
    this.inputMode = 'criterion';
    this.editingPill = null;
    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;
  }

  getOperatorsForType(type: string): { value: string; label: string }[] {
    return this.operators[type] || this.operators['string'];
  }

  getOperatorLabel(operator: string): string {
    for (const ops of Object.values(this.operators)) {
      const found = ops.find(o => o.value === operator);
      if (found) return found.label;
    }
    return operator;
  }

  getPlaceholder(): string {
    switch (this.inputMode) {
      case 'criterion':
        return 'search.selectCriterion';
      case 'operator':
        return 'search.selectOperator';
      case 'value':
        return 'search.enterValue';
      default:
        return 'search.placeholder';
    }
  }

  private generateId(): string {
    return `pill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
