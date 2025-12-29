import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs';
import { of } from 'rxjs';

interface UserSuggestion {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

@Component({
  selector: 'app-delegate-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './delegate-modal.html',
  styleUrl: './delegate-modal.css'
})
export class DelegateModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() taskId = '';
  @Input() taskName = '';

  @Output() delegate = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  private tasklistService = inject(TasklistService);

  userId = '';
  validating = false;
  isValid: boolean | null = null;
  errorMessage = '';

  suggestions: UserSuggestion[] = [];
  showSuggestions = false;
  selectedIndex = -1;

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    // Set up user search with debounce
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (term.length < 2) {
            return of([]);
          }
          return this.tasklistService.searchUsers({
            firstName: term,
            maxResults: 10
          }).pipe(
            catchError(() => of([]))
          );
        })
      )
      .subscribe(users => {
        this.suggestions = users.map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          displayName: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.id
        }));
        this.showSuggestions = this.suggestions.length > 0;
      });
  }

  onUserIdChange(): void {
    this.isValid = null;
    this.errorMessage = '';
    this.searchSubject.next(this.userId);
  }

  onInputFocus(): void {
    if (this.suggestions.length > 0) {
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
    if (!this.showSuggestions || this.suggestions.length === 0) {
      if (event.key === 'Enter') {
        this.validateAndDelegate();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0) {
          this.selectUser(this.suggestions[this.selectedIndex]);
        } else {
          this.validateAndDelegate();
        }
        break;
      case 'Escape':
        this.showSuggestions = false;
        this.selectedIndex = -1;
        break;
    }
  }

  selectUser(user: UserSuggestion): void {
    this.userId = user.id;
    this.isValid = true;
    this.showSuggestions = false;
    this.selectedIndex = -1;
  }

  getUserDisplayName(user: UserSuggestion): string {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.id;
  }

  async validateAndDelegate(): Promise<void> {
    if (!this.userId.trim()) {
      this.errorMessage = 'delegate.userRequired';
      return;
    }

    this.validating = true;
    this.errorMessage = '';

    try {
      const valid = await this.tasklistService.validateUser(this.userId).toPromise();

      if (valid) {
        this.isValid = true;
        this.delegate.emit(this.userId);
      } else {
        this.isValid = false;
        this.errorMessage = 'delegate.userNotFound';
      }
    } catch (error) {
      this.isValid = false;
      this.errorMessage = 'delegate.validationError';
    } finally {
      this.validating = false;
    }
  }

  onClose(): void {
    this.userId = '';
    this.isValid = null;
    this.errorMessage = '';
    this.suggestions = [];
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }
}
