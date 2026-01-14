import { Component, OnInit, inject, DestroyRef, TemplateRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faPen } from '@fortawesome/free-solid-svg-icons';
import { AdminPageHeaderComponent } from '../../../../shared/admin-page-header/admin-page-header';
import { DataTableComponent, ColumnDef, SortEvent } from '../../../../shared/data-table/data-table';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { SearchBarComponent } from '../../../../shared/search-bar/search-bar';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { UserCreateDialogComponent } from '../user-create-dialog/user-create-dialog';
import { User } from '../../../../models/admin/user.model';
import { UserQueryParams } from '../../../../models/admin/query-params.model';
import * as UsersActions from '../../../../store/admin/users/users.actions';
import * as UsersSelectors from '../../../../store/admin/users/users.selectors';

@Component({
  selector: 'app-user-list',
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
    UserCreateDialogComponent
  ],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('actionsTemplate', { static: true }) actionsTemplate!: TemplateRef<any>;

  // Icons
  faPlus = faPlus;
  faPen = faPen;

  showCreateDialog = false;

  // Observables from store
  users$: Observable<User[]> = this.store.select(UsersSelectors.selectAllUsers);
  loading$: Observable<boolean> = this.store.select(UsersSelectors.selectUsersLoading);
  total$: Observable<number> = this.store.select(UsersSelectors.selectUsersTotal);
  queryParams$: Observable<UserQueryParams> = this.store.select(UsersSelectors.selectUsersQueryParams);

  // Local state for form controls
  currentPage: number = 1;
  pageSize: number = 50;
  sortBy: string = 'userId';
  sortOrder: 'asc' | 'desc' = 'asc';
  searchTerm: string = '';

  // Mapping from column keys to API sort fields
  private sortFieldMap: Record<string, string> = {
    'id': 'userId',
    'firstName': 'firstName',
    'lastName': 'lastName',
    'email': 'email'
  };

  // Table columns
  columns: ColumnDef[] = [];

  ngOnInit(): void {
    this.setupColumns();
    this.loadUsers();
  }

  private setupColumns(): void {
    this.columns = [
      { key: 'id', labelKey: 'admin.users.id', sortable: true },
      { key: 'firstName', labelKey: 'admin.users.firstName', sortable: true },
      { key: 'lastName', labelKey: 'admin.users.lastName', sortable: true },
      { key: 'email', labelKey: 'admin.users.email', sortable: true },
      { key: 'actions', labelKey: 'admin.users.actions', template: this.actionsTemplate }
    ];
  }

  private loadUsers(): void {
    const queryParams: UserQueryParams = {
      firstResult: (this.currentPage - 1) * this.pageSize,
      maxResults: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    // Add search filter if needed
    if (this.searchTerm) {
      queryParams.id = this.searchTerm;
    }

    // Dispatch action to update query params and load users
    this.store.dispatch(UsersActions.setUsersQueryParams({ params: queryParams }));
    this.store.dispatch(UsersActions.loadUsers({ params: queryParams }));
  }

  onSort(event: SortEvent): void {
    this.sortBy = this.sortFieldMap[event.sortBy] || event.sortBy;
    this.sortOrder = event.sortOrder;
    this.loadUsers();
  }

  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.current;
    this.pageSize = event.size;
    this.loadUsers();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.loadUsers();
  }

  onRowClick(user: User): void {
    this.router.navigate(['/admin/users', user.id]);
  }

  onCreateUser(): void {
    this.showCreateDialog = true;
    this.cdr.markForCheck();
  }

  onUserCreated(): void {
    this.showCreateDialog = false;
    this.loadUsers();
    this.cdr.markForCheck();
  }

  onCreateDialogCancel(): void {
    this.showCreateDialog = false;
    this.cdr.markForCheck();
  }

  editUser(user: User, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/admin/users', user.id]);
  }

  refresh(): void {
    this.loadUsers();
  }
}
