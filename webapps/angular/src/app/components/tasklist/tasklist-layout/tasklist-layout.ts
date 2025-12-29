import { Component, OnInit, OnDestroy, inject, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, interval, switchMap, filter, distinctUntilChanged, map } from 'rxjs';
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
  selectSelectedFilter
} from '../../../store/tasklist';

import { TaskFiltersComponent } from '../task-filters/task-filters';
import { TaskListComponent } from '../task-list/task-list';
import { TaskDetailComponent } from '../task-detail/task-detail';

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
    TaskDetailComponent
  ],
  templateUrl: './tasklist-layout.html',
  styleUrl: './tasklist-layout.css'
})
export class TasklistLayoutComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly destroy$ = new Subject<void>();

  vm$ = this.store.select(selectTasklistViewModel);
  selectedTask$ = this.store.select(selectSelectedTask);
  taskDetail$ = this.store.select(selectTaskDetail);
  activeTab$ = this.store.select(selectActiveTab);
  selectedFilter$ = this.store.select(selectSelectedFilter);

  ngOnInit(): void {
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
        const tab = params['detailsTab'] as 'form' | 'history' | 'diagram' | 'description';
        if (['form', 'history', 'diagram', 'description'].includes(tab)) {
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
        // Check if we still should refresh
        this.selectedFilter$.pipe(
          takeUntil(this.destroy$)
        ).subscribe(selectedFilter => {
          if (selectedFilter?.properties?.refresh) {
            this.ngZone.run(() => {
              this.store.dispatch(TasksActions.refreshTasks());
            });
          } else {
            this.stopAutoRefresh();
          }
        }).unsubscribe();
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
    // Skip if focused on input
    if (this.isInputFocused()) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.navigateTasks('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.navigateTasks('down');
        break;
      case 'c':
      case 'C':
        // Claim task shortcut
        this.claimCurrentTask();
        break;
      case 'Escape':
        this.store.dispatch(TasksActions.clearSelection());
        this.store.dispatch(TaskDetailActions.clearTaskDetail());
        this.updateUrl({ task: null });
        break;
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
    this.store.dispatch(TasklistUIActions.toggleFiltersPanel());
  }

  toggleDetail(): void {
    this.store.dispatch(TasklistUIActions.toggleDetailPanel());
  }

  onFilterSelect(filterId: string | null): void {
    this.store.dispatch(FiltersActions.selectFilter({ filterId }));
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

  onTabChange(tab: 'form' | 'history' | 'diagram' | 'description'): void {
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
    }
  }

  onTaskDismiss(): void {
    this.store.dispatch(TasksActions.clearSelection());
    this.store.dispatch(TaskDetailActions.clearTaskDetail());
    this.store.dispatch(TasksActions.refreshTasks());
    this.updateUrl({ task: null, detailsTab: null });
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
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
