import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import { IdentityLink } from '../../../models/tasklist/task.model';
import { catchError, of } from 'rxjs';

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
export class GroupsModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() taskId = '';
  @Input() taskName = '';
  @Input() identityLinks: IdentityLink[] = [];

  @Output() update = new EventEmitter<{ added: string[]; removed: string[] }>();
  @Output() close = new EventEmitter<void>();

  private tasklistService = inject(TasklistService);

  groups: GroupItem[] = [];
  newGroupId = '';
  validating = false;
  errorMessage = '';

  private originalGroupIds = new Set<string>();

  ngOnInit(): void {
    this.initializeGroups();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['identityLinks'] || changes['isOpen']) {
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

  async addGroup(): Promise<void> {
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

    try {
      const valid = await this.tasklistService.validateGroup(groupId)
        .pipe(catchError(() => of(true))) // Default to true if validation fails
        .toPromise();

      if (valid) {
        this.groups.push({
          id: groupId,
          name: groupId,
          type: 'candidate',
          isNew: true
        });
        this.newGroupId = '';
      } else {
        this.errorMessage = 'groups.groupNotFound';
      }
    } catch (error) {
      this.errorMessage = 'groups.validationError';
    } finally {
      this.validating = false;
    }
  }

  removeGroup(groupId: string): void {
    this.groups = this.groups.filter(g => g.id !== groupId);
  }

  onSave(): void {
    const currentGroupIds = new Set(this.groups.map(g => g.id));

    // Find added groups
    const added = this.groups
      .filter(g => !this.originalGroupIds.has(g.id))
      .map(g => g.id);

    // Find removed groups
    const removed = Array.from(this.originalGroupIds)
      .filter(id => !currentGroupIds.has(id));

    this.update.emit({ added, removed });
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
