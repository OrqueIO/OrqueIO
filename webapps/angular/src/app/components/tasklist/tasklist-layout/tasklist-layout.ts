import { Component, OnInit, OnDestroy, inject, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, interval, switchMap, filter, distinctUntilChanged, map, take } from 'rxjs';
import { TranslatePipe } from '../../../i18n/translate.pipe';

import {
  TasksActions,
  FiltersActions,
  TaskDetailActions,
  TasklistUIActions,
  selectTasklistViewModel,
  selectSelectedTask,
  selectTaskDetail,
  selectActiveTab,
  selectSelectedFilter,
  selectMaximizedColumn
} from '../../../store/tasklist';
import { MaximizedColumn } from '../../../store/tasklist/tasklist.state';

import { TaskFiltersComponent } from '../task-filters/task-filters';
import { TaskListComponent } from '../task-list/task-list';
import { TaskDetailComponent } from '../task-detail/task-detail';
import { StartProcessModalComponent } from '../start-process-modal/start-process-modal';
import { FilterModalComponent } from '../filter-modal/filter-modal';
import { KeyboardShortcutsModalComponent } from '../keyboard-shortcuts-modal/keyboard-shortcuts-modal';
import { CreateTaskModalComponent } from '../create-task-modal/create-task-modal';
import { TaskFilter } from '../../../models/tasklist/filter.model';
import { NavActionsService } from '../../../services/nav-actions.service';

// Auto-refresh interval in milliseconds (10 seconds like AngularJS)
const AUTO_REFRESH_INTERVAL = 10000;

@Component({
  selector: 'app-tasklist-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslatePipe,
    TaskFiltersComponent,
    TaskListComponent,
    TaskDetailComponent,
    StartProcessModalComponent,
    FilterModalComponent,
    KeyboardShortcutsModalComponent,
    CreateTaskModalComponent
  ],
  templateUrl: './tasklist-layout.html',
  styleUrl: './tasklist-layout.css'
})
export class TasklistLayoutComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly navActionsService = inject(NavActionsService);
  private readonly destroy$ = new Subject<void>();

  vm$ = this.store.select(selectTasklistViewModel);
  selectedTask$ = this.store.select(selectSelectedTask);
  taskDetail$ = this.store.select(selectTaskDetail);
  activeTab$ = this.store.select(selectActiveTab);
  selectedFilter$ = this.store.select(selectSelectedFilter);
  maximizedColumn$ = this.store.select(selectMaximizedColumn);

  // Modal states
  showStartProcessModal = false;
  showFilterModal = false;
  showCreateTaskModal = false;
  showKeyboardShortcutsModal = false;
  editingFilter: TaskFilter | null = null;

  // Assign notification state (like AngularJS cam-tasklist-assign-notification)
  assignNotification: { taskId: string; taskName: string; processName: string } | null = null;

  ngOnInit(): void {
    // Register navbar actions
    this.navActionsService.setActions([
      {
        id: 'keyboard-shortcuts',
        label: 'tasklist.keyboardShortcuts',
        svgIcon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h8"/></svg>',
        callback: () => this.openKeyboardShortcutsModal()
      },
      {
        id: 'create-task',
        label: 'tasklist.createTask',
        svgIcon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        callback: () => this.openCreateTaskModal()
      },
      {
        id: 'start-process',
        label: 'tasklist.startProcess',
        svgIcon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z"/></svg>',
        primary: true,
        callback: () => this.openStartProcessModal()
      }
    ]);

    // Load filters on init
    this.store.dispatch(FiltersActions.loadFilters());

    // Handle URL parameters
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      // Handle filter selection from URL
      if (params['filter']) {
        this.store.dispatch(FiltersActions.selectFilter({ filterId: params['filter'] }));
      }

      // Handle task selection from URL
      if (params['task']) {
        this.store.dispatch(TasksActions.selectTask({ taskId: params['task'] }));
        this.store.dispatch(TaskDetailActions.loadTaskDetail({ taskId: params['task'] }));
      }

      // Handle page from URL
      if (params['page']) {
        const page = parseInt(params['page'], 10);
        if (!isNaN(page)) {
          this.store.dispatch(TasksActions.setPage({ page }));
        }
      }

      // Handle sorting from URL
      if (params['sorting']) {
        try {
          const sorting = JSON.parse(params['sorting']);
          this.store.dispatch(TasksActions.setSorting({ sorting }));
        } catch {
          // Invalid sorting, ignore
        }
      }

      // Handle details tab from URL
      if (params['detailsTab']) {
        const tab = params['detailsTab'] as 'form' | 'history' | 'diagram' | 'description' | 'variables';
        if (['form', 'history', 'diagram', 'description', 'variables'].includes(tab)) {
          this.store.dispatch(TaskDetailActions.setActiveTab({ tab }));
        }
      }
    });

    // Load tasks
    this.store.dispatch(TasksActions.loadTasks());

    // Setup auto-refresh based on filter properties
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.navActionsService.clearActions();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup auto-refresh mechanism
   * Refreshes tasks every 10 seconds if the selected filter has refresh=true
   */
  private setupAutoRefresh(): void {
    // Run interval outside Angular zone to prevent change detection on every tick
    this.ngZone.runOutsideAngular(() => {
      interval(AUTO_REFRESH_INTERVAL).pipe(
        takeUntil(this.destroy$),
        // Only proceed if we have a selected filter with refresh enabled
        switchMap(() => this.selectedFilter$),
        filter(selectedFilter => selectedFilter?.properties?.refresh === true),
        // Only trigger if the refresh flag is true
        distinctUntilChanged((prev, curr) => prev?.id === curr?.id)
      ).subscribe(() => {
        // Run the refresh inside Angular zone
        this.ngZone.run(() => {
          this.store.dispatch(TasksActions.refreshTasks());
          this.store.dispatch(FiltersActions.updateFilterCount({ count: -1 })); // -1 triggers re-fetch
        });
      });
    });

    // Alternative: simpler approach that always refreshes when filter has refresh=true
    this.selectedFilter$.pipe(
      takeUntil(this.destroy$),
      map(f => f?.properties?.refresh === true),
      distinctUntilChanged()
    ).subscribe(shouldRefresh => {
      if (shouldRefresh) {
        this.startAutoRefresh();
      }
    });
  }

  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.ngZone.runOutsideAngular(() => {
      this.autoRefreshTimer = setInterval(() => {
        // Check if we still should refresh using take(1) instead of subscribe/unsubscribe
        this.selectedFilter$.pipe(
          take(1)
        ).subscribe(selectedFilter => {
          if (selectedFilter?.properties?.refresh) {
            this.ngZone.run(() => {
              this.store.dispatch(TasksActions.refreshTasks());
            });
          } else {
            this.stopAutoRefresh();
          }
        });
      }, AUTO_REFRESH_INTERVAL);
    });
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  // Keyboard navigation
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Handle Escape key for closing modals (works even in inputs)
    if (event.key === 'Escape') {
      if (this.showKeyboardShortcutsModal) {
        this.closeKeyboardShortcutsModal();
      } else if (this.showCreateTaskModal) {
        this.closeCreateTaskModal();
      } else if (this.showFilterModal) {
        this.closeFilterModal();
      } else if (this.showStartProcessModal) {
        this.closeStartProcessModal();
      }
      return;
    }

    // ctrl+alt+c - Claim task
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      this.claimCurrentTask();
      return;
    }

    // ctrl+shift+f - Focus first filter
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.focusFirstFilter();
      return;
    }

    // ctrl+alt+l - Focus first task in list
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      this.focusFirstTask();
      return;
    }

    // ctrl+alt+f - Focus first input in form
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.focusFirstFormInput();
      return;
    }

    // ctrl+alt+p - Open start process modal
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.openStartProcessModal();
      return;
    }
  }

  private focusFirstFilter(): void {
    const firstFilter = document.querySelector('.filter-item') as HTMLElement;
    if (firstFilter) {
      firstFilter.focus();
    }
  }

  private focusFirstTask(): void {
    const firstTask = document.querySelector('.task-item') as HTMLElement;
    if (firstTask) {
      firstTask.focus();
    }
  }

  private focusFirstFormInput(): void {
    const firstInput = document.querySelector('.task-detail input, .task-detail textarea') as HTMLElement;
    if (firstInput) {
      firstInput.focus();
    }
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return activeElement instanceof HTMLInputElement ||
           activeElement instanceof HTMLTextAreaElement ||
           activeElement instanceof HTMLSelectElement;
  }

  private navigateTasks(direction: 'up' | 'down'): void {
    // This will be handled by the task-list component
    const event = new CustomEvent('navigate-tasks', { detail: { direction } });
    document.dispatchEvent(event);
  }

  private claimCurrentTask(): void {
    // This will be handled by the task-detail component
    const event = new CustomEvent('claim-current-task');
    document.dispatchEvent(event);
  }

  toggleFilters(): void {
    this.vm$.pipe(take(1)).subscribe(vm => {
      // If trying to collapse, check if at least one other column stays expanded
      if (!vm.filtersCollapsed && vm.listCollapsed && vm.detailCollapsed) {
        return; // Don't collapse if it would leave no columns visible
      }
      this.store.dispatch(TasklistUIActions.toggleFiltersPanel());
    });
  }

  toggleList(): void {
    this.vm$.pipe(take(1)).subscribe(vm => {
      // If trying to collapse, check if at least one other column stays expanded
      if (!vm.listCollapsed && vm.filtersCollapsed && vm.detailCollapsed) {
        return; // Don't collapse if it would leave no columns visible
      }
      this.store.dispatch(TasklistUIActions.toggleListPanel());
    });
  }

  toggleDetail(): void {
    this.vm$.pipe(take(1)).subscribe(vm => {
      // If trying to collapse, check if at least one other column stays expanded
      if (!vm.detailCollapsed && vm.filtersCollapsed && vm.listCollapsed) {
        return; // Don't collapse if it would leave no columns visible
      }
      this.store.dispatch(TasklistUIActions.toggleDetailPanel());
    });
  }

  // Column maximize methods (matching AngularJS maximize-column-left/right)
  maximizeColumn(column: MaximizedColumn): void {
    this.store.dispatch(TasklistUIActions.maximizeColumn({ column }));
  }

  resetColumnSizes(): void {
    this.store.dispatch(TasklistUIActions.resetColumnSizes());
  }

  isColumnMaximized(column: MaximizedColumn): boolean {
    let result = false;
    this.maximizedColumn$.pipe(take(1)).subscribe(maximized => {
      result = maximized === column;
    });
    return result;
  }

  // Start Process Modal
  openStartProcessModal(): void {
    this.showStartProcessModal = true;
  }

  closeStartProcessModal(): void {
    this.showStartProcessModal = false;
  }

  onProcessStarted(processInstanceId: string): void {
    // Refresh task list after starting a process
    this.store.dispatch(TasksActions.refreshTasks());
    this.closeStartProcessModal();
  }

  // Assign notification (matches AngularJS cam-tasklist-assign-notification)
  onTaskAssignedAfterStart(data: { taskId: string; taskName: string; processName: string }): void {
    this.assignNotification = data;
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (this.assignNotification?.taskId === data.taskId) {
        this.assignNotification = null;
      }
    }, 10000);
  }

  navigateToAssignedTask(): void {
    if (this.assignNotification) {
      this.onTaskSelect(this.assignNotification.taskId);
      this.assignNotification = null;
    }
  }

  dismissAssignNotification(): void {
    this.assignNotification = null;
  }

  // Create Task Modal
  openCreateTaskModal(): void {
    this.showCreateTaskModal = true;
  }

  closeCreateTaskModal(): void {
    this.showCreateTaskModal = false;
  }

  onTaskCreated(taskId: string): void {
    // Refresh task list after creating a task
    this.store.dispatch(TasksActions.refreshTasks());
    this.closeCreateTaskModal();
  }

  // Keyboard Shortcuts Modal
  openKeyboardShortcutsModal(): void {
    this.showKeyboardShortcutsModal = true;
  }

  closeKeyboardShortcutsModal(): void {
    this.showKeyboardShortcutsModal = false;
  }

  // Edit current filter
  private editCurrentFilter(): void {
    this.selectedFilter$.pipe(
      take(1)
    ).subscribe(filter => {
      if (filter) {
        this.onFilterEdit(filter);
      }
    });
  }

  // Filter Modal
  onFilterCreate(): void {
    this.editingFilter = null;
    this.showFilterModal = true;
  }

  onFilterEdit(filter: TaskFilter): void {
    this.editingFilter = filter;
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
    this.editingFilter = null;
  }

  onFilterSave(filterData: Partial<TaskFilter>): void {
    if (filterData.id) {
      // Update existing filter
      this.store.dispatch(FiltersActions.updateFilter({
        filterId: filterData.id,
        filter: filterData
      }));
    } else {
      // Create new filter
      this.store.dispatch(FiltersActions.createFilter({
        filter: filterData as Omit<TaskFilter, 'id'>
      }));
    }
    this.closeFilterModal();
  }

  onFilterDelete(filterId: string): void {
    if (confirm('Are you sure you want to delete this filter?')) {
      this.store.dispatch(FiltersActions.deleteFilter({ filterId }));
      this.closeFilterModal();
    }
  }

  onFilterSelect(filterId: string | null): void {
    this.store.dispatch(FiltersActions.selectFilter({ filterId }));
    this.store.dispatch(TasksActions.setPage({ page: 1 }));
    this.store.dispatch(TasksActions.clearSelection());
    this.store.dispatch(TaskDetailActions.clearTaskDetail());
    this.updateUrl({ filter: filterId, task: null, page: null });
  }

  onTaskSelect(taskId: string): void {
    this.store.dispatch(TasksActions.selectTask({ taskId }));
    this.store.dispatch(TaskDetailActions.loadTaskDetail({ taskId }));
    this.updateUrl({ task: taskId });
  }

  onPageChange(page: number): void {
    this.store.dispatch(TasksActions.setPage({ page }));
    this.updateUrl({ page: page > 1 ? page : null });
  }

  onSortingChange(sorting: any[]): void {
    this.store.dispatch(TasksActions.setSorting({ sorting }));
    this.updateUrl({ sorting: JSON.stringify(sorting) });
  }

  onTabChange(tab: 'form' | 'history' | 'diagram' | 'description' | 'variables'): void {
    this.store.dispatch(TaskDetailActions.setActiveTab({ tab }));
    this.updateUrl({ detailsTab: tab !== 'form' ? tab : null });
  }

  onTaskAction(action: { type: string; taskId: string; data?: any }): void {
    switch (action.type) {
      case 'claim':
        this.store.dispatch(TasksActions.claimTask({
          taskId: action.taskId,
          userId: action.data?.userId
        }));
        break;
      case 'unclaim':
        this.store.dispatch(TasksActions.unclaimTask({ taskId: action.taskId }));
        break;
      case 'complete':
        this.store.dispatch(TasksActions.completeTask({
          taskId: action.taskId,
          variables: action.data?.variables
        }));
        break;
      case 'setAssignee':
        this.store.dispatch(TasksActions.setAssignee({
          taskId: action.taskId,
          userId: action.data?.userId
        }));
        break;
      case 'update':
        this.store.dispatch(TasksActions.updateTask({
          taskId: action.taskId,
          updates: action.data
        }));
        break;
      case 'refreshIdentityLinks':
        this.store.dispatch(TaskDetailActions.loadIdentityLinks({
          taskId: action.taskId
        }));
        break;
    }
  }

  onTaskDismiss(): void {
    this.store.dispatch(TasksActions.clearSelection());
    this.store.dispatch(TaskDetailActions.clearTaskDetail());
    this.store.dispatch(TasksActions.refreshTasks());
    this.updateUrl({ task: null, detailsTab: null });
  }

  onDiagramExpand(expanded: boolean): void {
    if (expanded) {
      this.maximizeColumn('detail');
    } else {
      this.resetColumnSizes();
    }
  }

  private updateUrl(params: Record<string, string | number | null>): void {
    const currentParams = { ...this.route.snapshot.queryParams };

    for (const [key, value] of Object.entries(params)) {
      if (value === null) {
        delete currentParams[key];
      } else {
        currentParams[key] = value;
      }
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: currentParams,
      replaceUrl: true
    });
  }
}
