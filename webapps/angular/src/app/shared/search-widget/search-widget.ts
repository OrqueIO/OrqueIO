import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTimes,
  faPlus,
  faSave,
  faFolder,
  faTrash,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslateService } from '../../i18n/translate.service';
export interface SearchType {
  key: string;
  label: string; // Translation key or already translated text
  operators: SearchOperator[];
  allowName?: boolean; // For extended searches like variableValues
  placeholder?: string; // Translation key or already translated text
}

export interface SearchOperator {
  key: string;
  label: string;
}

export interface SearchCriteria {
  type: SearchType;
  operator: SearchOperator;
  value: string;
  name?: string; // For extended searches
}

export interface SearchQuery {
  [key: string]: any;
}

@Component({
  selector: 'app-search-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './search-widget.html',
  styleUrls: ['./search-widget.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchWidgetComponent implements OnInit, OnDestroy {
  @Input() searchTypes: SearchType[] = [];
  // Translation key or already translated text
  @Input() placeholder = 'cockpit.processDetail.variables.addCriteria';
  @Input() storageKey = 'search-criteria';

  @Output() searchChange = new EventEmitter<SearchCriteria[]>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Icons
  faTimes = faTimes;
  faPlus = faPlus;
  faSave = faSave;
  faFolder = faFolder;
  faTrash = faTrash;
  faChevronDown = faChevronDown;

  // State
  searches: SearchCriteria[] = [];
  inputQuery = '';
  showDropdown = false;
  showStoredDropdown = false;
  filteredTypes: SearchType[] = [];
  storedCriteria: { [name: string]: SearchCriteria[] } = {};
  newCriteriaName = '';

  // For editing
  editingIndex: number | null = null;

  private translate = inject(TranslateService);

  constructor(
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.filteredTypes = [...this.searchTypes];
    this.loadStoredCriteria();
  }

  ngOnDestroy(): void {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDropdown = false;
      this.showStoredDropdown = false;
      this.cdr.markForCheck();
    }
  }

  onInputFocus(): void {
    this.showDropdown = true;
    this.filterTypes();
    this.cdr.markForCheck();
  }

  onInputChange(): void {
    this.filterTypes();
    this.showDropdown = true;
    this.cdr.markForCheck();
  }

  filterTypes(): void {
    const query = this.inputQuery.toLowerCase().trim();
    if (!query) {
      this.filteredTypes = [...this.searchTypes];
    } else {
      this.filteredTypes = this.searchTypes.filter(type =>
        this.translate.instant(type.label).toLowerCase().includes(query) ||
        type.key.toLowerCase().includes(query)
      );
    }
  }

  selectType(type: SearchType): void {
    const defaultOperator = type.operators[0];
    const newSearch: SearchCriteria = {
      type,
      operator: defaultOperator,
      value: '',
      name: type.allowName ? '' : undefined
    };
    this.searches.push(newSearch);
    this.inputQuery = '';
    this.showDropdown = false;
    this.editingIndex = this.searches.length - 1;
    this.cdr.markForCheck();

    // Focus on value input after DOM update
    setTimeout(() => {
      const valueInput = document.querySelector('.search-pill.editing .pill-value-input') as HTMLInputElement;
      if (valueInput) {
        valueInput.focus();
      }
    }, 50);
  }

  updateOperator(index: number, operator: SearchOperator): void {
    if (this.searches[index]) {
      this.searches[index].operator = operator;
      this.emitChange();
      this.cdr.markForCheck();
    }
  }

  updateValue(index: number, value: string): void {
    if (this.searches[index]) {
      this.searches[index].value = value;
      this.cdr.markForCheck();
    }
  }

  updateName(index: number, name: string): void {
    if (this.searches[index]) {
      this.searches[index].name = name;
      this.cdr.markForCheck();
    }
  }

  confirmSearch(index: number): void {
    const search = this.searches[index];
    if (search && this.isValidSearch(search)) {
      this.editingIndex = null;
      this.emitChange();
      this.cdr.markForCheck();
    }
  }

  isValidSearch(search: SearchCriteria): boolean {
    if (!search.value.trim()) return false;
    if (search.type.allowName && !search.name?.trim()) return false;
    return true;
  }

  removeSearch(index: number): void {
    this.searches.splice(index, 1);
    if (this.editingIndex === index) {
      this.editingIndex = null;
    } else if (this.editingIndex !== null && this.editingIndex > index) {
      this.editingIndex--;
    }
    this.emitChange();
    this.cdr.markForCheck();
  }

  editSearch(index: number): void {
    this.editingIndex = index;
    this.cdr.markForCheck();
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmSearch(index);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (!this.isValidSearch(this.searches[index])) {
        this.removeSearch(index);
      } else {
        this.editingIndex = null;
        this.cdr.markForCheck();
      }
    }
  }

  emitChange(): void {
    const validSearches = this.searches.filter(s => this.isValidSearch(s));
    this.searchChange.emit(validSearches);
  }

  clearAll(): void {
    this.searches = [];
    this.editingIndex = null;
    this.emitChange();
    this.cdr.markForCheck();
  }

  // Stored criteria management
  toggleStoredDropdown(): void {
    this.showStoredDropdown = !this.showStoredDropdown;
    this.showDropdown = false;
    this.cdr.markForCheck();
  }

  loadStoredCriteria(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.storedCriteria = JSON.parse(stored);
      }
    } catch (e) {
      this.storedCriteria = {};
    }
  }

  saveCurrentCriteria(): void {
    if (!this.newCriteriaName.trim() || this.searches.length === 0) return;

    this.storedCriteria[this.newCriteriaName.trim()] = [...this.searches];
    localStorage.setItem(this.storageKey, JSON.stringify(this.storedCriteria));
    this.newCriteriaName = '';
    this.cdr.markForCheck();
  }

  loadCriteria(name: string): void {
    const criteria = this.storedCriteria[name];
    if (criteria) {
      this.searches = criteria.map(c => this.withCurrentLabels(c));
      this.editingIndex = null;
      this.showStoredDropdown = false;
      this.emitChange();
      this.cdr.markForCheck();
    }
  }

  /**
   * Saved criteria keep the labels of the day they were saved; take the type and operator
   * from the current search types instead, matched by key, so they follow the current language.
   */
  private withCurrentLabels(criteria: SearchCriteria): SearchCriteria {
    const type = this.searchTypes.find(t => t.key === criteria.type.key) ?? criteria.type;
    const operator = type.operators.find(o => o.key === criteria.operator.key) ?? criteria.operator;
    return { ...criteria, type, operator };
  }

  deleteCriteria(name: string, event: MouseEvent): void {
    event.stopPropagation();
    delete this.storedCriteria[name];
    localStorage.setItem(this.storageKey, JSON.stringify(this.storedCriteria));
    this.cdr.markForCheck();
  }

  get storedCriteriaNames(): string[] {
    return Object.keys(this.storedCriteria);
  }

  trackByIndex(index: number): number {
    return index;
  }

  compareOperators(o1: SearchOperator, o2: SearchOperator): boolean {
    return o1 && o2 ? o1.key === o2.key : o1 === o2;
  }
}
