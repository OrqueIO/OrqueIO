import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, fromEvent } from 'rxjs';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { Task, IdentityLink } from '../../../models/tasklist';
import { AuthService } from '../../../services/auth';
import {
  selectTaskForm,
  selectTaskComments,
  selectTaskHistory,
  selectTaskIdentityLinks,
  selectTaskDetailLoading
} from '../../../store/tasklist';

import { TaskMetaComponent } from '../task-meta/task-meta';
import { TaskFormTabComponent } from '../task-form-tab/task-form-tab';
import { TaskHistoryTabComponent } from '../task-history-tab/task-history-tab';
import { TaskDiagramTabComponent } from '../task-diagram-tab/task-diagram-tab';
import { TaskDescriptionTabComponent } from '../task-description-tab/task-description-tab';

type TabId = 'form' | 'history' | 'diagram' | 'description';

interface Tab {
  id: TabId;
  label: string;
  priority: number;
}

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    TaskMetaComponent,
    TaskFormTabComponent,
    TaskHistoryTabComponent,
    TaskDiagramTabComponent,
    TaskDescriptionTabComponent
  ],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.css'
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  @Input() task!: Task;
  @Input() activeTab: TabId = 'form';

  @Output() tabChange = new EventEmitter<TabId>();
  @Output() taskAction = new EventEmitter<{ type: string; taskId: string; data?: any }>();
  @Output() dismiss = new EventEmitter<void>();

  loading$ = this.store.select(selectTaskDetailLoading);
  form$ = this.store.select(selectTaskForm);
  comments$ = this.store.select(selectTaskComments);
  history$ = this.store.select(selectTaskHistory);
  identityLinks$ = this.store.select(selectTaskIdentityLinks);

  taskExists = true;

  tabs: Tab[] = [
    { id: 'form', label: 'tasklist.tabs.form', priority: 1000 },
    { id: 'history', label: 'tasklist.tabs.history', priority: 800 },
    { id: 'diagram', label: 'tasklist.tabs.diagram', priority: 600 },
    { id: 'description', label: 'tasklist.tabs.description', priority: 100 }
  ];

  ngOnInit(): void {
    // Listen for claim task shortcut
    fromEvent<CustomEvent>(document, 'claim-current-task').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.claimTask();
    });

    // Sort tabs by priority (highest first)
    this.tabs.sort((a, b) => b.priority - a.priority);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tab: Tab): void {
    this.activeTab = tab.id;
    this.tabChange.emit(tab.id);
  }

  isActiveTab(tab: Tab): boolean {
    return this.activeTab === tab.id;
  }

  // ==================== Task Actions ====================

  claimTask(): void {
    if (!this.task || this.task.assignee) return;

    const userId = this.getCurrentUserId();
    if (userId) {
      this.taskAction.emit({ type: 'claim', taskId: this.task.id, data: { userId } });
    }
  }

  unclaimTask(): void {
    if (!this.task) return;
    this.taskAction.emit({ type: 'unclaim', taskId: this.task.id });
  }

  completeTask(variables?: Record<string, any>): void {
    if (!this.task) return;
    this.taskAction.emit({ type: 'complete', taskId: this.task.id, data: { variables } });
  }

  setAssignee(userId: string | null): void {
    if (!this.task) return;
    this.taskAction.emit({ type: 'setAssignee', taskId: this.task.id, data: { userId } });
  }

  updateTask(updates: Partial<Task>): void {
    if (!this.task) return;
    this.taskAction.emit({ type: 'update', taskId: this.task.id, data: updates });
  }

  dismissTask(): void {
    this.dismiss.emit();
  }

  // ==================== Helpers ====================

  getCurrentUserId(): string | null {
    return this.authService.currentAuthentication?.name || null;
  }

  isCurrentUserAssignee(): boolean {
    const currentUserId = this.getCurrentUserId();
    return currentUserId !== null && this.task.assignee === currentUserId;
  }

  getProcessName(): string | null {
    if (this.task._embedded?.processDefinition?.[0]) {
      const pd = this.task._embedded.processDefinition[0];
      return pd.name || pd.key;
    }
    return null;
  }

  getProcessVersion(): string | null {
    if (this.task._embedded?.processDefinition?.[0]?.versionTag) {
      return this.task._embedded.processDefinition[0].versionTag;
    }
    return null;
  }

  getCaseName(): string | null {
    if (this.task._embedded?.caseDefinition?.[0]) {
      const cd = this.task._embedded.caseDefinition[0];
      return cd.name || cd.key;
    }
    return null;
  }

  getInstanceLink(): string | null {
    if (this.task.processInstanceId) {
      return `/cockpit/processes/${this.task.processInstanceId}`;
    }
    if (this.task.caseInstanceId) {
      return `/cockpit/cases/${this.task.caseInstanceId}`;
    }
    return null;
  }

  getTaskDisplayName(): string {
    return this.task.name || this.task.taskDefinitionKey || this.task.id;
  }
}
