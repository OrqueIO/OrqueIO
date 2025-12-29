import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faTasks,
  faUser,
  faUsers,
  faCalendarAlt,
  faChevronLeft,
  faChevronRight,
  faExclamationCircle,
  faCheckCircle,
  faEye,
  faSort,
  faSortUp,
  faSortDown,
  faCopy,
  faCheck,
  faEdit,
  faTimes,
  faSave,
  faFilter,
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faExternalLinkAlt,
  faClock,
  faFlag
} from '@fortawesome/free-solid-svg-icons';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { CockpitService, Task, TaskQueryParams, UserTask, IdentityLink } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { PaginationComponent } from '../../../../shared/pagination/pagination';

interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface TableColumn {
  id: string;
  label: string;
  translateKey: string;
  sortable: boolean;
  sortField?: string;
  class?: string;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    PaginationComponent
  ],
  templateUrl: './task-list.html',
  styleUrls: ['./task-list.css']
})
export class TaskListComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  // Icons
  faSpinner = faSpinner;
  faTasks = faTasks;
  faUser = faUser;
  faUsers = faUsers;
  faCalendarAlt = faCalendarAlt;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faExclamationCircle = faExclamationCircle;
  faCheckCircle = faCheckCircle;
  faEye = faEye;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faCopy = faCopy;
  faCheck = faCheck;
  faEdit = faEdit;
  faTimes = faTimes;
  faSave = faSave;
  faFilter = faFilter;
  faAngleDoubleLeft = faAngleDoubleLeft;
  faAngleDoubleRight = faAngleDoubleRight;
  faExternalLinkAlt = faExternalLinkAlt;
  faClock = faClock;
  faFlag = faFlag;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Tasks', translateKey: 'cockpit.menu.tasks', route: '/cockpit/tasks' },
    { label: 'List', translateKey: 'cockpit.tasks.list' }
  ];

  // Table columns configuration
  columns: TableColumn[] = [
    { id: 'name', label: 'Activity', translateKey: 'cockpit.tasks.columns.activity', sortable: true, sortField: 'name', class: 'col-activity' },
    { id: 'assignee', label: 'Assignee', translateKey: 'cockpit.tasks.columns.assignee', sortable: true, sortField: 'assignee', class: 'col-assignee' },
    { id: 'owner', label: 'Owner', translateKey: 'cockpit.tasks.columns.owner', sortable: false, class: 'col-owner' },
    { id: 'created', label: 'Created', translateKey: 'cockpit.tasks.columns.created', sortable: true, sortField: 'created', class: 'col-created' },
    { id: 'due', label: 'Due Date', translateKey: 'cockpit.tasks.columns.dueDate', sortable: true, sortField: 'dueDate', class: 'col-due' },
    { id: 'followUp', label: 'Follow-up', translateKey: 'cockpit.tasks.columns.followUp', sortable: true, sortField: 'followUpDate', class: 'col-followup' },
    { id: 'priority', label: 'Priority', translateKey: 'cockpit.tasks.columns.priority', sortable: true, sortField: 'priority', class: 'col-priority' },
    { id: 'delegationState', label: 'Delegation', translateKey: 'cockpit.tasks.columns.delegationState', sortable: false, class: 'col-delegation' },
    { id: 'id', label: 'Task ID', translateKey: 'cockpit.tasks.columns.taskId', sortable: true, sortField: 'id', class: 'col-id' },
    { id: 'actions', label: 'Actions', translateKey: 'cockpit.tasks.columns.actions', sortable: false, class: 'col-actions' }
  ];

  loading = true;
  tasks: UserTask[] = [];
  totalCount = 0;

  // Sorting
  sorting: SortConfig = { sortBy: 'created', sortOrder: 'desc' };

  // Filters
  filters = {
    assignee: '',
    candidateGroup: '',
    processDefinitionKey: '',
    filterType: '' // 'assigned', 'unassigned', 'withCandidateGroups', 'withoutCandidateGroups'
  };
  showFilters = false;

  // Pagination
  currentPage = 1;
  pageSize = 50;

  // Inline editing
  editingTaskId: string | null = null;
  editingAssignee: string = '';

  // Clipboard
  copiedId: string | null = null;

  // Identity Links Modal
  showIdentityModal = false;
  identityModalType: 'group' | 'user' = 'group';
  identityModalTask: UserTask | null = null;
  identityLinks: IdentityLink[] = [];
  newIdentityValue = '';

  constructor(private cockpitService: CockpitService) {}

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS);
    this.loadSortingFromStorage();
    this.parseQueryParams();
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  private parseQueryParams(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        if (params['filter']) {
          this.filters.filterType = params['filter'];
        }
        if (params['assignee']) {
          this.filters.assignee = params['assignee'];
        }
        if (params['candidateGroup']) {
          this.filters.candidateGroup = params['candidateGroup'];
        }
        if (params['processDefinitionKey']) {
          this.filters.processDefinitionKey = params['processDefinitionKey'];
        }
      });
  }

  private loadSortingFromStorage(): void {
    const saved = localStorage.getItem('cockpit.tasks.sorting');
    if (saved) {
      try {
        this.sorting = JSON.parse(saved);
      } catch {
        // Use default
      }
    }
  }

  private saveSortingToStorage(): void {
    localStorage.setItem('cockpit.tasks.sorting', JSON.stringify(this.sorting));
  }

  loadTasks(): void {
    this.loading = true;

    const params: TaskQueryParams = {
      firstResult: (this.currentPage - 1) * this.pageSize,
      maxResults: this.pageSize,
      sortBy: this.sorting.sortBy,
      sortOrder: this.sorting.sortOrder
    };

    // Apply filters
    if (this.filters.assignee) {
      params.assignee = this.filters.assignee;
    }
    if (this.filters.candidateGroup) {
      params.candidateGroup = this.filters.candidateGroup;
    }
    if (this.filters.processDefinitionKey) {
      params.processDefinitionKey = this.filters.processDefinitionKey;
    }

    // Apply filter type
    switch (this.filters.filterType) {
      case 'assigned':
        params.assigned = true;
        break;
      case 'unassigned':
        params.unassigned = true;
        params.withoutCandidateGroups = true;
        break;
      case 'withCandidateGroups':
        params.unassigned = true;
        params.withCandidateGroups = true;
        break;
      case 'withoutCandidateGroups':
        params.unassigned = true;
        params.withoutCandidateGroups = true;
        break;
    }

    // Load count
    this.cockpitService.getTasksCountWithParams(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => {
          this.totalCount = count;
          this.cdr.detectChanges();
        }
      });

    // Load tasks
    this.cockpitService.getTasksWithParams(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tasks) => {
          this.tasks = tasks as UserTask[];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Sorting
  onSort(column: TableColumn): void {
    if (!column.sortable || !column.sortField) return;

    if (this.sorting.sortBy === column.sortField) {
      this.sorting.sortOrder = this.sorting.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sorting.sortBy = column.sortField;
      this.sorting.sortOrder = 'asc';
    }

    this.saveSortingToStorage();
    this.currentPage = 1;
    this.loadTasks();
  }

  getSortIcon(column: TableColumn): any {
    if (!column.sortable || !column.sortField) return null;
    if (this.sorting.sortBy !== column.sortField) return this.faSort;
    return this.sorting.sortOrder === 'asc' ? this.faSortUp : this.faSortDown;
  }

  // Filtering
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadTasks();
  }

  clearFilters(): void {
    this.filters = {
      assignee: '',
      candidateGroup: '',
      processDefinitionKey: '',
      filterType: ''
    };
    this.currentPage = 1;
    this.loadTasks();
  }

  // Pagination
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadTasks();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  // Inline Assignee Editing
  startEditAssignee(task: UserTask): void {
    this.editingTaskId = task.id;
    this.editingAssignee = task.assignee || '';
  }

  cancelEditAssignee(): void {
    this.editingTaskId = null;
    this.editingAssignee = '';
  }

  saveAssignee(task: UserTask): void {
    const newAssignee = this.editingAssignee.trim() || null;

    this.cockpitService.setTaskAssignee(task.id, newAssignee)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          task.assignee = newAssignee || undefined;
          this.editingTaskId = null;
          this.editingAssignee = '';
          this.cdr.detectChanges();
        },
        error: () => {
          // Revert on error
          this.editingTaskId = null;
          this.editingAssignee = '';
        }
      });
  }

  // Clipboard
  copyToClipboard(text: string, id: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedId = id;
      setTimeout(() => {
        this.copiedId = null;
        this.cdr.detectChanges();
      }, 2000);
      this.cdr.detectChanges();
    });
  }

  isCopied(id: string): boolean {
    return this.copiedId === id;
  }

  // Identity Links Modal
  openIdentityModal(task: UserTask, type: 'group' | 'user'): void {
    this.identityModalTask = task;
    this.identityModalType = type;
    this.newIdentityValue = '';
    this.showIdentityModal = true;
    this.loadIdentityLinks(task.id);
  }

  closeIdentityModal(): void {
    this.showIdentityModal = false;
    this.identityModalTask = null;
    this.identityLinks = [];
    this.newIdentityValue = '';
  }

  private loadIdentityLinks(taskId: string): void {
    this.cockpitService.getTaskIdentityLinks(taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (links) => {
          // Filter based on modal type
          const key = this.identityModalType === 'group' ? 'groupId' : 'userId';
          this.identityLinks = links.filter(l => l[key] && l.type !== 'assignee' && l.type !== 'owner');
          this.cdr.detectChanges();
        }
      });
  }

  addIdentityLink(): void {
    if (!this.newIdentityValue.trim() || !this.identityModalTask) return;

    const userId = this.identityModalType === 'user' ? this.newIdentityValue.trim() : null;
    const groupId = this.identityModalType === 'group' ? this.newIdentityValue.trim() : null;

    this.cockpitService.addTaskIdentityLink(this.identityModalTask.id, userId, groupId, 'candidate')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.identityLinks.push({
            userId: userId || undefined,
            groupId: groupId || undefined,
            type: 'candidate'
          });
          this.newIdentityValue = '';
          this.cdr.detectChanges();
        }
      });
  }

  removeIdentityLink(link: IdentityLink): void {
    if (!this.identityModalTask) return;

    this.cockpitService.deleteTaskIdentityLink(
      this.identityModalTask.id,
      link.userId || null,
      link.groupId || null,
      link.type
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const index = this.identityLinks.indexOf(link);
          if (index > -1) {
            this.identityLinks.splice(index, 1);
          }
          this.cdr.detectChanges();
        }
      });
  }

  // Utilities
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  isOverdue(dueDate: string | undefined): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  getProcessInstanceUrl(task: UserTask): string {
    if (!task.processInstanceId) return '#';
    return `/cockpit/processes/${task.processInstanceId}`;
  }

  getTasklistUrl(task: UserTask): string {
    // Link to tasklist with task ID
    return `/tasklist/#/?task=${task.id}`;
  }

  truncateId(id: string, length: number = 8): string {
    if (!id || id.length <= length) return id || '';
    return id.substring(0, length) + '...';
  }
}
