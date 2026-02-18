import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import { IdentityLink, GroupRef } from '../../../models/tasklist/task.model';
import { catchError, of, Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';

interface GroupItem {
  id: string;
  name: string;
  type: 'candidate';
  isNew?: boolean;
}

@Component({
  selector: 'app-groups-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './groups-modal.html',
  styleUrl: './groups-modal.css'
})
export class GroupsModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() taskId = '';
  @Input() taskName = '';
  @Input() identityLinks: IdentityLink[] = [];

  @Output() update = new EventEmitter<{ added: string[]; removed: string[] }>();
  @Output() close = new EventEmitter<void>();

  private tasklistService = inject(TasklistService);
  private cdr = inject(ChangeDetectorRef);

  groups: GroupItem[] = [];
  newGroupId = '';
  validating = false;
  errorMessage = '';

  // Autocomplete
  suggestions: GroupRef[] = [];
  showSuggestions = false;
  isSearching = false;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  private originalGroupIds = new Set<string>();

  ngOnInit(): void {
    this.initializeGroups();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchSubscription(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || term.length < 1) {
          return of([]);
        }
        this.isSearching = true;
        return this.tasklistService.searchGroups({ name: term, maxResults: 10 }).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      // Filter out groups already added
      const existingIds = new Set(this.groups.map(g => g.id));
      this.suggestions = results.filter(g => !existingIds.has(g.id));
      this.isSearching = false;
      this.showSuggestions = this.suggestions.length > 0;
      this.cdr.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only reinitialize when the modal opens (isOpen changes from false to true)
    // This prevents resetting user's pending changes if identityLinks updates while modal is open
    if (changes['isOpen']) {
      if (this.isOpen && !changes['isOpen'].previousValue) {
        // Modal just opened
        this.initializeGroups();
      }
    } else if (changes['identityLinks'] && !this.isOpen) {
      // Update groups only when modal is closed
      this.initializeGroups();
    }
  }

  private initializeGroups(): void {
    // Extract candidate groups from identity links
    this.groups = this.identityLinks
      .filter(link => link.type === 'candidate' && link.groupId)
      .map(link => ({
        id: link.groupId!,
        name: link.groupId!, // Could be enhanced with group name lookup
        type: 'candidate' as const
      }));

    // Store original IDs for comparison
    this.originalGroupIds = new Set(this.groups.map(g => g.id));
    this.errorMessage = '';
    this.newGroupId = '';
  }

  onSearchInput(): void {
    this.errorMessage = '';
    this.searchSubject.next(this.newGroupId.trim());
  }

  selectGroup(group: GroupRef): void {
    // Check if already exists
    if (this.groups.some(g => g.id === group.id)) {
      this.errorMessage = 'groups.alreadyExists';
      return;
    }

    this.groups = [...this.groups, {
      id: group.id,
      name: group.name || group.id,
      type: 'candidate',
      isNew: true
    }];
    this.newGroupId = '';
    this.showSuggestions = false;
    this.suggestions = [];
    this.cdr.detectChanges();
  }

  hideSuggestions(): void {
    // Delay to allow click on suggestion to register
    setTimeout(() => {
      this.showSuggestions = false;
      this.cdr.detectChanges();
    }, 200);
  }

  addGroup(): void {
    const groupId = this.newGroupId.trim();

    if (!groupId) {
      return;
    }

    // Check if already exists
    if (this.groups.some(g => g.id === groupId)) {
      this.errorMessage = 'groups.alreadyExists';
      return;
    }

    this.validating = true;
    this.errorMessage = '';
    this.showSuggestions = false;

    this.tasklistService.validateGroup(groupId)
      .pipe(catchError(() => of(true))) // Default to true if validation fails
      .subscribe({
        next: (valid) => {
          if (valid) {
            this.groups = [...this.groups, {
              id: groupId,
              name: groupId,
              type: 'candidate',
              isNew: true
            }];
            this.newGroupId = '';
            this.suggestions = [];
          } else {
            this.errorMessage = 'groups.groupNotFound';
          }
          this.validating = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'groups.validationError';
          this.validating = false;
          this.cdr.detectChanges();
        }
      });
  }

  removeGroup(groupId: string): void {
    this.groups = this.groups.filter(g => g.id !== groupId);
    this.cdr.detectChanges();
  }

  onSave(): void {
    const currentGroupIds = new Set(this.groups.map(g => g.id));

    // Find added groups (groups in current state but not in original)
    const added = this.groups
      .filter(g => !this.originalGroupIds.has(g.id))
      .map(g => g.id);

    // Find removed groups (groups in original but not in current state)
    const removed = Array.from(this.originalGroupIds)
      .filter(id => !currentGroupIds.has(id));

    if (added.length > 0 || removed.length > 0) {
      this.update.emit({ added, removed });
    } else {
      // No changes, just close
      this.close.emit();
    }
  }

  onClose(): void {
    this.initializeGroups(); // Reset to original state
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addGroup();
    }
  }

  get hasChanges(): boolean {
    const currentGroupIds = new Set(this.groups.map(g => g.id));

    if (currentGroupIds.size !== this.originalGroupIds.size) {
      return true;
    }

    for (const id of currentGroupIds) {
      if (!this.originalGroupIds.has(id)) {
        return true;
      }
    }

    return false;
  }
}
