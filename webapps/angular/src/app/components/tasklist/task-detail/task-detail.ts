import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, fromEvent, interval, switchMap, filter } from 'rxjs';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { Task, IdentityLink } from '../../../models/tasklist';
import { AuthService } from '../../../services/auth';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import {
  selectTaskForm,
  selectTaskComments,
  selectTaskHistory,
  selectTaskIdentityLinks,
  selectTaskDetailLoading,
  selectTaskDetailErrorType,
  selectInstanceSuspended,
  selectTaskActionsDisabled
} from '../../../store/tasklist';
import { TaskErrorType } from '../../../store/tasklist/tasklist.state';

// Check interval for task existence (10 seconds - same as auto-refresh)
const TASK_CHECK_INTERVAL = 10000;

import { TaskMetaComponent } from '../task-meta/task-meta';
import { TaskFormTabComponent } from '../task-form-tab/task-form-tab';
import { TaskHistoryTabComponent } from '../task-history-tab/task-history-tab';
import { TaskDiagramTabComponent } from '../task-diagram-tab/task-diagram-tab';
import { TaskDescriptionTabComponent } from '../task-description-tab/task-description-tab';
import { TaskVariablesTabComponent } from '../task-variables-tab/task-variables-tab';
import { GroupsModalComponent } from '../groups-modal/groups-modal';

type TabId = 'form' | 'history' | 'diagram' | 'description' | 'variables';

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
    TaskDescriptionTabComponent,
    TaskVariablesTabComponent,
    GroupsModalComponent
  ],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.css'
})
export class TaskDetailComponent implements OnInit, OnDestroy, OnChanges {
  private readonly store = inject(Store);
  private readonly authService = inject(AuthService);
  private readonly tasklistService = inject(TasklistService);
  private readonly ngZone = inject(NgZone);
  private readonly destroy$ = new Subject<void>();

  @Input() task!: Task;
  @Input() activeTab: TabId = 'form';

  @Output() tabChange = new EventEmitter<TabId>();
  @Output() taskAction = new EventEmitter<{ type: string; taskId: string; data?: any }>();
  @Output() dismiss = new EventEmitter<void>();
  @Output() taskRemoved = new EventEmitter<string>();

  loading$ = this.store.select(selectTaskDetailLoading);
  form$ = this.store.select(selectTaskForm);
  comments$ = this.store.select(selectTaskComments);
  history$ = this.store.select(selectTaskHistory);
  identityLinks$ = this.store.select(selectTaskIdentityLinks);
  errorType$ = this.store.select(selectTaskDetailErrorType);
  instanceSuspended$ = this.store.select(selectInstanceSuspended);
  actionsDisabled$ = this.store.select(selectTaskActionsDisabled);

  taskExists = true;
  instanceSuspended = false;
  errorType: TaskErrorType = null;
  private currentTaskId: string | null = null;

  // Groups modal state
  showGroupsModal = false;
  currentIdentityLinks: IdentityLink[] = [];

  tabs: Tab[] = [
    { id: 'form', label: 'tasklist.tabs.form', priority: 1000 },
    { id: 'history', label: 'tasklist.tabs.history', priority: 800 },
    { id: 'diagram', label: 'tasklist.tabs.diagram', priority: 600 },
    { id: 'variables', label: 'tasklist.tabs.variables', priority: 400 },
    { id: 'description', label: 'tasklist.tabs.description', priority: 100 }
  ];

  ngOnInit(): void {
    // Listen for claim task shortcut
    fromEvent<CustomEvent>(document, 'claim-current-task').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.claimTask();
    });

    // Listen for refresh events (dispatched by auto-refresh)
    fromEvent<CustomEvent>(document, 'tasklist-refresh').pipe(
      takeUntil(this.destroy$),
      filter(() => this.taskExists && !!this.task?.id)
    ).subscribe(() => {
      this.checkTaskExists();
    });

    // Subscribe to error type changes
    this.errorType$.pipe(takeUntil(this.destroy$)).subscribe(errorType => {
      this.errorType = errorType;
      if (errorType === 'TASK_NOT_EXIST') {
        this.taskExists = false;
      }
    });

    // Subscribe to instance suspended state
    this.instanceSuspended$.pipe(takeUntil(this.destroy$)).subscribe(suspended => {
      this.instanceSuspended = suspended;
    });

    // Setup periodic task existence check
    this.setupTaskExistenceCheck();

    // Sort tabs by priority (highest first)
    this.tabs.sort((a, b) => b.priority - a.priority);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task']) {
      const newTask = changes['task'].currentValue;
      const oldTask = changes['task'].previousValue;

      // Reset taskExists when task changes
      if (newTask?.id !== oldTask?.id) {
        this.taskExists = true;
        this.currentTaskId = newTask?.id || null;
      }
    }
  }

  /**
   * Setup periodic check for task existence
   * Runs outside Angular zone to avoid unnecessary change detection
   */
  private setupTaskExistenceCheck(): void {
    this.ngZone.runOutsideAngular(() => {
      interval(TASK_CHECK_INTERVAL).pipe(
        takeUntil(this.destroy$),
        filter(() => this.taskExists && !!this.task?.id)
      ).subscribe(() => {
        this.checkTaskExists();
      });
    });
  }

  /**
   * Check if the current task still exists in the system
   * Shows notification if task has been removed (e.g., completed by another user)
   */
  private checkTaskExists(): void {
    if (!this.task?.id || !this.taskExists) return;

    this.tasklistService.getTask(this.task.id).subscribe(task => {
      if (task === null && this.taskExists) {
        // Task no longer exists
        this.ngZone.run(() => {
          this.taskExists = false;
          this.taskRemoved.emit(this.task.id);
        });
      }
    });
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

  // ==================== Groups Modal ====================

  openGroupsModal(): void {
    // Get current identity links from store
    this.identityLinks$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(links => {
      this.currentIdentityLinks = links;
    }).unsubscribe();
    this.showGroupsModal = true;
  }

  closeGroupsModal(): void {
    this.showGroupsModal = false;
  }

  onGroupsUpdate(changes: { added: string[]; removed: string[] }): void {
    if (!this.task) return;

    // Add new groups
    for (const groupId of changes.added) {
      this.tasklistService.addIdentityLink(this.task.id, {
        groupId,
        type: 'candidate'
      }).subscribe();
    }

    // Remove groups
    for (const groupId of changes.removed) {
      this.tasklistService.deleteIdentityLink(this.task.id, {
        groupId,
        type: 'candidate'
      }).subscribe();
    }

    this.closeGroupsModal();

    // Emit action to refresh identity links
    this.taskAction.emit({ type: 'refreshIdentityLinks', taskId: this.task.id });
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
      return `/cockpit/processes/instance/${this.task.processInstanceId}`;
    }
    if (this.task.caseInstanceId) {
      return `/cockpit/cases/instance/${this.task.caseInstanceId}`;
    }
    return null;
  }

  getTaskDisplayName(): string {
    return this.task.name || this.task.taskDefinitionKey || this.task.id;
  }

  /**
   * Check if task actions should be disabled
   * Actions are disabled when:
   * - Task doesn't exist (TASK_NOT_EXIST)
   * - Process instance is suspended (INSTANCE_SUSPENDED)
   */
  areActionsDisabled(): boolean {
    return !this.taskExists || this.instanceSuspended;
  }

  /**
   * Get the appropriate alert message key based on error type
   */
  getAlertMessageKey(): string {
    if (this.errorType === 'TASK_NOT_EXIST') {
      return 'tasklist.taskHasBeenRemoved';
    }
    if (this.instanceSuspended) {
      return 'tasklist.instanceSuspended';
    }
    return '';
  }

  /**
   * Check if we should show any error/warning alert
   */
  shouldShowAlert(): boolean {
    return !this.taskExists || this.instanceSuspended;
  }
}
