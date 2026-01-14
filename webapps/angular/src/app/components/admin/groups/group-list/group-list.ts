import { Component, OnInit, inject, DestroyRef, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faPen } from '@fortawesome/free-solid-svg-icons';
import { AdminPageHeaderComponent } from '../../../../shared/admin-page-header/admin-page-header';
import { DataTableComponent, ColumnDef, SortEvent } from '../../../../shared/data-table/data-table';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { SearchBarComponent } from '../../../../shared/search-bar/search-bar';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { GroupService } from '../../../../services/admin/group.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { Group } from '../../../../models/admin/group.model';
import { GroupQueryParams } from '../../../../models/admin/query-params.model';
import { GroupCreateDialogComponent } from '../group-create-dialog/group-create-dialog';

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    AdminPageHeaderComponent,
    DataTableComponent,
    PaginationComponent,
    SearchBarComponent,
    TranslatePipe,
    GroupCreateDialogComponent
  ],
  templateUrl: './group-list.html',
  styleUrls: ['./group-list.css']
})
export class GroupListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private groupService = inject(GroupService);
  private notifications = inject(NotificationsService);

  @ViewChild('actionsTemplate', { static: true }) actionsTemplate!: TemplateRef<any>;

  // Icons
  faPlus = faPlus;
  faPen = faPen;

  groups: Group[] = [];
  loading: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 50;
  totalGroups: number = 0;

  // Sorting
  sortBy: string = 'id';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Search
  searchTerm: string = '';

  // Table columns
  columns: ColumnDef[] = [];

  // Create dialog
  showCreateDialog: boolean = false;

  ngOnInit(): void {
    this.setupColumns();
    this.loadGroups();
  }

  private setupColumns(): void {
    this.columns = [
      { key: 'id', labelKey: 'admin.groups.id', sortable: true },
      { key: 'name', labelKey: 'admin.groups.name', sortable: true },
      { key: 'type', labelKey: 'admin.groups.type', sortable: true },
      { key: 'actions', labelKey: 'admin.users.actions', template: this.actionsTemplate }
    ];
  }

  private loadGroups(): void {
    this.loading = true;

    const queryParams: GroupQueryParams = {
      firstResult: (this.currentPage - 1) * this.pageSize,
      maxResults: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    // Add search filter if needed
    if (this.searchTerm) {
      queryParams.id = this.searchTerm;
    }

    this.groupService.getGroupsWithCount(queryParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.groups = response.data;
          this.totalGroups = response.total;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
          this.notifications.addError({
            status: 'admin.groups.loadError',
            message: 'Failed to load groups'
          });
        }
      });
  }

  onSort(event: SortEvent): void {
    this.sortBy = event.sortBy;
    this.sortOrder = event.sortOrder;
    this.loadGroups();
  }

  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.current;
    this.pageSize = event.size;
    this.loadGroups();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.loadGroups();
  }

  onRowClick(group: Group): void {
    this.router.navigate(['/admin/groups', group.id]);
  }

  onCreateGroup(): void {
    this.showCreateDialog = true;
  }

  onGroupCreated(): void {
    this.showCreateDialog = false;
    this.loadGroups();
  }

  onCreateDialogCancel(): void {
    this.showCreateDialog = false;
  }

  editGroup(group: Group, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/admin/groups', group.id]);
  }

  refresh(): void {
    this.loadGroups();
  }
}
