import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faTimes, faSpinner, faUser, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, of, catchError } from 'rxjs';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { UserService } from '../../services/admin/user.service';
import { User } from '../../models/admin/user.model';

@Component({
  selector: 'app-user-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './user-autocomplete.html',
  styleUrls: ['./user-autocomplete.css']
})
export class UserAutocompleteComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Search user...';
  @Input() initialValue = '';
  @Input() allowClear = true;
  @Input() debounceMs = 300;
  @Input() minChars = 1;

  @Output() userSelected = new EventEmitter<User | null>();
  @Output() cancelled = new EventEmitter<void>();

  faSearch = faSearch;
  faTimes = faTimes;
  faSpinner = faSpinner;
  faUser = faUser;
  faCheck = faCheck;

  searchTerm = '';
  users: User[] = [];
  loading = false;
  showDropdown = false;
  selectedUser: User | null = null;
  highlightedIndex = -1;
  noResults = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private elementRef = inject(ElementRef);
  private userService = inject(UserService);

  ngOnInit(): void {
    this.searchTerm = this.initialValue;

    this.searchSubject.pipe(
      debounceTime(this.debounceMs),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      switchMap(term => {
        if (!term || term.length < this.minChars) {
          return of([]);
        }
        this.loading = true;
        this.noResults = false;
        return this.userService.getUsers({
          idLike: `%${term}%`,
          maxResults: 10
        }).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe(users => {
      this.users = users;
      this.loading = false;
      this.noResults = this.searchTerm.length >= this.minChars && users.length === 0;
      this.showDropdown = true;
      this.highlightedIndex = -1;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDropdown = false;
    }
  }

  onSearchChange(term: string): void {
    this.selectedUser = null;
    this.searchSubject.next(term);
  }

  onInputFocus(): void {
    if (this.searchTerm.length >= this.minChars) {
      this.searchSubject.next(this.searchTerm);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.showDropdown || this.users.length === 0) {
      if (event.key === 'Escape') {
        this.cancel();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.users.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedIndex >= 0 && this.highlightedIndex < this.users.length) {
          this.selectUser(this.users[this.highlightedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.cancel();
        break;
    }
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.searchTerm = user.id;
    this.showDropdown = false;
    this.userSelected.emit(user);
  }

  clearSelection(): void {
    this.selectedUser = null;
    this.searchTerm = '';
    this.users = [];
    this.showDropdown = false;
    this.userSelected.emit(null);
  }

  cancel(): void {
    this.showDropdown = false;
    this.cancelled.emit();
  }

  confirm(): void {
    if (this.selectedUser) {
      this.userSelected.emit(this.selectedUser);
    }
  }

  getUserDisplayName(user: User): string {
    const parts: string[] = [];
    if (user.firstName) parts.push(user.firstName);
    if (user.lastName) parts.push(user.lastName);
    if (parts.length > 0) {
      return `${parts.join(' ')} (${user.id})`;
    }
    return user.id;
  }

  get isValid(): boolean {
    return this.selectedUser !== null;
  }
}
