import { Component, OnInit, inject, DestroyRef, TemplateRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Observable, map, tap } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { AdminPageHeaderComponent } from '../../../../shared/admin-page-header/admin-page-header';
import { DataTableComponent, ColumnDef, SortEvent } from '../../../../shared/data-table/data-table';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { SearchBarComponent } from '../../../../shared/search-bar/search-bar';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { UserCreateDialogComponent } from '../user-create-dialog/user-create-dialog';
import { UserService } from '../../../../services/admin/user.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { AuthService } from '../../../../services/auth';
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
    UserCreateDialogComponent,
    ConfirmDialogComponent
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
  private userService = inject(UserService);
  private notifications = inject(NotificationsService);
  private translateService = inject(TranslateService);
  private authService = inject(AuthService);

  @ViewChild('actionsTemplate', { static: true }) actionsTemplate!: TemplateRef<any>;

  // Icons
  faPlus = faPlus;
  faPen = faPen;
  faTrash = faTrash;

  showCreateDialog = false;
  showDeleteConfirm = false;
  userToDelete: User | null = null;

  // Observables from store
  allUsers$: Observable<User[]> = this.store.select(UsersSelectors.selectAllUsers);
  users$: Observable<User[]> = this.allUsers$;
  loading$: Observable<boolean> = this.store.select(UsersSelectors.selectUsersLoading);
  total$: Observable<number> = this.store.select(UsersSelectors.selectUsersTotal);
  filteredTotal: number = 0;
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
      maxResults: 1000,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    // Dispatch action to load all users
    this.store.dispatch(UsersActions.setUsersQueryParams({ params: queryParams }));
    this.store.dispatch(UsersActions.loadUsers({ params: queryParams }));

    // Apply client-side filtering
    this.applyFilter();
  }

  private applyFilter(): void {
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      this.users$ = this.allUsers$.pipe(
        map(users => {
          const filtered = users.filter(user =>
            user.id.toLowerCase().includes(term) ||
            (user.firstName && user.firstName.toLowerCase().includes(term)) ||
            (user.lastName && user.lastName.toLowerCase().includes(term)) ||
            (user.email && user.email.toLowerCase().includes(term))
          );
          // Apply pagination
          const start = (this.currentPage - 1) * this.pageSize;
          return { filtered, paginated: filtered.slice(start, start + this.pageSize) };
        }),
        tap(({ filtered }) => {
          this.filteredTotal = filtered.length;
          this.cdr.markForCheck();
        }),
        map(({ paginated }) => paginated)
      );
    } else {
      this.users$ = this.allUsers$.pipe(
        map(users => {
          const start = (this.currentPage - 1) * this.pageSize;
          return { total: users.length, paginated: users.slice(start, start + this.pageSize) };
        }),
        tap(({ total }) => {
          this.filteredTotal = total;
          this.cdr.markForCheck();
        }),
        map(({ paginated }) => paginated)
      );
    }
  }

  onSort(event: SortEvent): void {
    this.sortBy = this.sortFieldMap[event.sortBy] || event.sortBy;
    this.sortOrder = event.sortOrder;
    this.loadUsers();
  }

  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.current;
    this.pageSize = event.size;
    this.applyFilter();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.applyFilter();
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

  deleteUser(user: User, event: Event): void {
    event.stopPropagation();
    this.userToDelete = user;
    this.showDeleteConfirm = true;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (!this.userToDelete) return;
    this.showDeleteConfirm = false;
    const userId = this.userToDelete.id;
    const currentUser = this.authService.currentAuthentication;
    const isSelfDeletion = currentUser?.name === userId;

    this.userService.deleteUser(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.users.userDeleted', 'User deleted successfully');
          this.userToDelete = null;
          if (isSelfDeletion) {
            this.authService.smartLogout()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: () => this.router.navigate(['/login']),
                error: () => this.router.navigate(['/login'])
              });
          } else {
            this.loadUsers();
          }
        },
        error: () => {
          this.userToDelete = null;
          this.notifications.addError({
            status: this.translateService.instant('admin.users.deleteError'),
            message: this.translateService.instant('admin.users.deleteError')
          });
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.userToDelete = null;
    this.cdr.markForCheck();
  }

  refresh(): void {
    this.loadUsers();
  }
}
