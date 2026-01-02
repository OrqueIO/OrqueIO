import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, debounceTime, takeUntil, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import {
  SearchPill,
  SearchOperator,
  FILTER_CRITERIA,
  FilterCriterionOption,
  SEARCH_OPERATORS,
  EXPRESSION_SUPPORTED_FIELDS,
  FilterVariable
} from '../../../models/tasklist/filter.model';
import { TasklistUIActions } from '../../../store/tasklist/tasklist.actions';
import {
  selectSearchPills,
  selectMatchAny,
  selectFilterVariables,
  selectIsSearchActive
} from '../../../store/tasklist/tasklist.selectors';

interface SearchSuggestion {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  group: string;
  expressionSupport?: boolean;
  variableType?: 'processVariables' | 'taskVariables' | 'caseInstanceVariables';
  isVariable?: boolean;
  variableName?: string;
}

@Component({
  selector: 'app-task-search',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './task-search.html',
  styleUrl: './task-search.css'
})
export class TaskSearchComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('variableNameInput') variableNameInput!: ElementRef<HTMLInputElement>;

  // Store observables
  pills$: Observable<SearchPill[]> = this.store.select(selectSearchPills);
  matchAny$: Observable<boolean> = this.store.select(selectMatchAny);
  filterVariables$: Observable<FilterVariable[]> = this.store.select(selectFilterVariables);
  isSearchActive$: Observable<boolean> = this.store.select(selectIsSearchActive);

  // Local state for pills (synced with store)
  pills: SearchPill[] = [];
  matchAny = false;
  filterVariables: FilterVariable[] = [];

  searchText = '';
  showSuggestions = false;
  suggestions: SearchSuggestion[] = [];
  filteredSuggestions: SearchSuggestion[] = [];
  selectedSuggestionIndex = -1;

  // Currently editing pill
  editingPill: SearchPill | null = null;
  pendingCriterion: SearchSuggestion | null = null;
  pendingOperator: SearchOperator | null = null;
  pendingVariableName = '';
  inputMode: 'criterion' | 'operator' | 'variableName' | 'value' = 'criterion';

  // Operators from filter model
  readonly operators = SEARCH_OPERATORS;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.buildSuggestions();

    // Subscribe to store
    combineLatest([
      this.pills$,
      this.matchAny$,
      this.filterVariables$
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([pills, matchAny, filterVariables]) => {
        this.pills = pills;
        this.matchAny = matchAny;
        this.filterVariables = filterVariables;
        // Rebuild suggestions when filter variables change
        this.buildSuggestions();
      });

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

    // Add standard filter criteria
    for (const group of FILTER_CRITERIA) {
      for (const option of group.options) {
        this.suggestions.push({
          key: option.key,
          label: option.labelKey,
          type: option.type,
          group: group.groupKey,
          expressionSupport: option.expressionSupport,
          variableType: option.variableType
        });
      }
    }

    // Add filter-defined variables as suggestions
    if (this.filterVariables.length > 0) {
      for (const variable of this.filterVariables) {
        // Add as process variable suggestion
        this.suggestions.push({
          key: 'processVariables',
          label: variable.label || variable.name,
          type: 'string',
          group: 'filter.criteria.filterVariables',
          variableType: 'processVariables',
          isVariable: true,
          variableName: variable.name
        });
      }
    }
  }

  private filterSuggestions(text: string): void {
    if (!text.trim()) {
      this.filteredSuggestions = this.suggestions.slice(0, 15);
    } else {
      const lowerText = text.toLowerCase();
      this.filteredSuggestions = this.suggestions
        .filter(s =>
          s.key.toLowerCase().includes(lowerText) ||
          s.label.toLowerCase().includes(lowerText) ||
          (s.variableName && s.variableName.toLowerCase().includes(lowerText))
        )
        .slice(0, 15);
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
        } else if (this.inputMode === 'variableName' && this.pendingVariableName.trim()) {
          this.confirmVariableName();
        } else if (this.inputMode === 'value' && this.searchText.trim()) {
          this.confirmPill();
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.cancelInput();
        break;

      case 'Backspace':
        if (!this.searchText) {
          if (this.inputMode === 'criterion' && this.pills.length > 0) {
            this.dispatchRemovePill(this.pills[this.pills.length - 1].id);
          } else if (this.inputMode === 'operator') {
            this.inputMode = 'criterion';
            this.pendingCriterion = null;
            this.filterSuggestions('');
            this.showSuggestions = true;
          } else if (this.inputMode === 'variableName' && !this.pendingVariableName) {
            this.inputMode = 'operator';
            this.pendingOperator = null;
          } else if (this.inputMode === 'value') {
            if (this.pendingCriterion?.variableType) {
              this.inputMode = 'variableName';
            } else {
              this.inputMode = 'operator';
              this.pendingOperator = null;
            }
          }
        }
        break;
    }
  }

  selectSuggestion(suggestion: SearchSuggestion): void {
    this.pendingCriterion = suggestion;

    // If it's a pre-defined variable from filter, skip variable name input
    if (suggestion.isVariable && suggestion.variableName) {
      this.pendingVariableName = suggestion.variableName;
      this.inputMode = 'operator';
    } else if (suggestion.variableType) {
      // Variable type - need to enter variable name
      this.inputMode = 'variableName';
      this.pendingVariableName = '';
    } else {
      this.inputMode = 'operator';
    }

    this.searchText = '';
    this.showSuggestions = false;
  }

  confirmVariableName(): void {
    if (this.pendingVariableName.trim()) {
      this.inputMode = 'operator';
      setTimeout(() => this.searchInput?.nativeElement?.focus(), 0);
    }
  }

  selectOperator(operator: string): void {
    this.pendingOperator = operator as SearchOperator;
    this.inputMode = 'value';
    this.searchText = '';
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 0);
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

      // Add variable info if applicable
      if (this.pendingCriterion.variableType && this.pendingVariableName) {
        newPill.variableType = this.pendingCriterion.variableType;
        newPill.variableName = this.pendingVariableName;
      }

      this.dispatchAddPill(newPill);
      this.resetInput();
    }
  }

  dispatchRemovePill(id: string): void {
    this.store.dispatch(TasklistUIActions.removeSearchPill({ id }));
    this.store.dispatch(TasklistUIActions.applySearch());
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 0);
  }

  dispatchAddPill(pill: SearchPill): void {
    this.store.dispatch(TasklistUIActions.addSearchPill({ pill }));
    this.store.dispatch(TasklistUIActions.applySearch());
  }

  editPill(pill: SearchPill): void {
    this.editingPill = pill;
    this.searchText = pill.value;
    this.pendingCriterion = {
      key: pill.key,
      label: pill.label,
      type: pill.type,
      group: '',
      variableType: pill.variableType
    };
    this.pendingOperator = pill.operator;
    this.pendingVariableName = pill.variableName || '';
    this.inputMode = 'value';
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 0);
  }

  updatePill(): void {
    if (this.editingPill && this.searchText.trim() && this.pendingOperator) {
      this.store.dispatch(TasklistUIActions.updateSearchPill({
        id: this.editingPill.id,
        pill: {
          value: this.searchText.trim(),
          operator: this.pendingOperator
        }
      }));
      this.store.dispatch(TasklistUIActions.applySearch());
      this.resetInput();
    }
  }

  cancelInput(): void {
    this.resetInput();
  }

  clearAll(): void {
    this.store.dispatch(TasklistUIActions.clearSearchPills());
    this.store.dispatch(TasklistUIActions.applySearch());
    this.resetInput();
  }

  toggleMatchAny(): void {
    this.store.dispatch(TasklistUIActions.setMatchAny({ matchAny: !this.matchAny }));
    if (this.pills.length > 0) {
      this.store.dispatch(TasklistUIActions.applySearch());
    }
  }

  private resetInput(): void {
    this.searchText = '';
    this.pendingCriterion = null;
    this.pendingOperator = null;
    this.pendingVariableName = '';
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
      case 'variableName':
        return 'search.enterVariableName';
      case 'value':
        return 'search.enterValue';
      default:
        return 'search.placeholder';
    }
  }

  getPillDisplayLabel(pill: SearchPill): string {
    if (pill.variableName) {
      return `${pill.variableName}`;
    }
    return pill.label;
  }

  isExpressionSupported(criterion: SearchSuggestion | null): boolean {
    if (!criterion) return false;
    return criterion.expressionSupport || EXPRESSION_SUPPORTED_FIELDS.includes(criterion.key);
  }

  private generateId(): string {
    return `pill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
