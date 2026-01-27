import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, fromEvent, interval, takeUntil } from 'rxjs';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TimeAgoPipe } from '../../../pipes';
import { Task, TaskSorting, FilterVariable } from '../../../models/tasklist';
import { TaskCardComponent } from '../task-card/task-card';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe, TimeAgoPipe, TaskCardComponent],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css'
})
export class TaskListComponent implements OnInit, OnDestroy, OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('taskListContainer') taskListContainer!: ElementRef<HTMLElement>;

  @Input() tasks: Task[] = [];
  @Input() selectedTaskId: string | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = 15;
  @Input() sorting: TaskSorting[] = [{ sortBy: 'created', sortOrder: 'desc' }];
  @Input() filterVariables: FilterVariable[] = [];
  @Input() showUndefinedVariable = false;

  @Output() taskSelect = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() sortingChange = new EventEmitter<TaskSorting[]>();
  @Output() taskExpand = new EventEmitter<{ taskId: string; expanded: boolean }>();

  expandedTasks: Set<string> = new Set();
  now = new Date();

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize) || 1;
  }

  get startIndex(): number {
    return this.total > 0 ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get endIndex(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  get canGoPrevious(): boolean {
    return this.page > 1;
  }

  get canGoNext(): boolean {
    return this.page < this.totalPages;
  }

  goToPage(pageNum: number): void {
    if (pageNum >= 1 && pageNum <= this.totalPages && pageNum !== this.page) {
      this.pageChange.emit(pageNum);
      if (this.taskListContainer?.nativeElement) {
        this.taskListContainer.nativeElement.scrollTop = 0;
      }
    }
  }

  ngOnInit(): void {
    // Listen for keyboard navigation events
    fromEvent<CustomEvent>(document, 'navigate-tasks').pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      this.navigateTasks(event.detail.direction);
    });

    // Update "now" every minute for relative dates
    interval(60000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.now = new Date();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      // Clear expanded state when tasks change
      this.expandedTasks.clear();
    }
  }

  selectTask(task: Task): void {
    this.taskSelect.emit(task.id);
  }

  isSelected(task: Task): boolean {
    return this.selectedTaskId === task.id;
  }

  isExpanded(task: Task): boolean {
    return this.expandedTasks.has(task.id);
  }

  toggleExpand(event: Event, task: Task): void {
    event.stopPropagation();

    // Create a new Set to ensure Angular detects the change
    const newExpandedTasks = new Set(this.expandedTasks);

    if (newExpandedTasks.has(task.id)) {
      newExpandedTasks.delete(task.id);
      this.taskExpand.emit({ taskId: task.id, expanded: false });
    } else {
      newExpandedTasks.add(task.id);
      this.taskExpand.emit({ taskId: task.id, expanded: true });
    }

    this.expandedTasks = newExpandedTasks;
    this.cdr.detectChanges();
  }

  onPageChange(event: { current: number }): void {
    this.pageChange.emit(event.current);
    // Scroll to top of list
    if (this.taskListContainer?.nativeElement) {
      this.taskListContainer.nativeElement.scrollTop = 0;
    }
  }

  goToFirstPage(): void {
    this.pageChange.emit(1);
    if (this.taskListContainer?.nativeElement) {
      this.taskListContainer.nativeElement.scrollTop = 0;
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateTasks('down');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateTasks('up');
    } else if (event.key === 'Enter' && this.selectedTaskId) {
      // Already selected, might trigger action
    }
  }

  private navigateTasks(direction: 'up' | 'down'): void {
    if (this.tasks.length === 0) return;

    const currentIndex = this.selectedTaskId
      ? this.tasks.findIndex(t => t.id === this.selectedTaskId)
      : -1;

    let newIndex: number;
    if (direction === 'down') {
      newIndex = currentIndex < this.tasks.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : this.tasks.length - 1;
    }

    const newTask = this.tasks[newIndex];
    if (newTask) {
      this.selectTask(newTask);
      this.scrollToTask(newTask.id);
    }
  }

  private scrollToTask(taskId: string): void {
    setTimeout(() => {
      const element = document.querySelector(`[data-task-id="${taskId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  getTaskDisplayName(task: Task): string {
    return task.name || task.taskDefinitionKey || task.id;
  }

  getProcessName(task: Task): string | null {
    if (task._embedded?.processDefinition?.[0]) {
      const pd = task._embedded.processDefinition[0];
      return pd.name || pd.key;
    }
    return null;
  }

  getCaseName(task: Task): string | null {
    if (task._embedded?.caseDefinition?.[0]) {
      const cd = task._embedded.caseDefinition[0];
      return cd.name || cd.key;
    }
    return null;
  }

  getAssigneeName(task: Task): string | null {
    if (!task.assignee) return null;

    if (task._embedded?.assignee?.[0]) {
      const assignee = task._embedded.assignee[0];
      if (assignee.firstName || assignee.lastName) {
        return `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim();
      }
      return assignee.id;
    }
    return task.assignee;
  }

  isOverdue(date: string | undefined): boolean {
    if (!date) return false;
    return new Date(date) < this.now;
  }

  hasAssignee(task: Task): boolean {
    return task.assignee != null;
  }

  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }

  getTaskUrl(task: Task): string {
    return `#/?task=${task.id}`;
  }
}
