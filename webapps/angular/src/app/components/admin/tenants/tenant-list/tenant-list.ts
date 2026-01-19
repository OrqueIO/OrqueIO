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
import { TranslateService } from '../../../../i18n/translate.service';
import { TenantCreateDialogComponent } from '../tenant-create-dialog/tenant-create-dialog';
import { TenantService } from '../../../../services/admin/tenant.service';
import { NotificationsService } from '../../../../services/notifications.service';
import { Tenant } from '../../../../models/admin/tenant.model';
import { TenantQueryParams } from '../../../../models/admin/query-params.model';

@Component({
  selector: 'app-tenant-list',
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
    TenantCreateDialogComponent
  ],
  templateUrl: './tenant-list.html',
  styleUrls: ['./tenant-list.css']
})
export class TenantListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private tenantService = inject(TenantService);
  private notifications = inject(NotificationsService);
  private translateService = inject(TranslateService);

  @ViewChild('actionsTemplate', { static: true }) actionsTemplate!: TemplateRef<any>;

  // Icons
  faPlus = faPlus;
  faPen = faPen;

  tenants: Tenant[] = [];
  loading: boolean = false;
  showCreateDialog: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 50;
  totalTenants: number = 0;

  // Sorting
  sortBy: string = 'id';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Search
  searchTerm: string = '';

  // Table columns
  columns: ColumnDef[] = [];

  ngOnInit(): void {
    this.setupColumns();
    this.loadTenants();
  }

  private setupColumns(): void {
    this.columns = [
      { key: 'id', labelKey: 'admin.tenants.id', sortable: true },
      { key: 'name', labelKey: 'admin.tenants.name', sortable: true },
      { key: 'actions', labelKey: 'admin.users.actions', template: this.actionsTemplate }
    ];
  }

  private loadTenants(): void {
    this.loading = true;

    const queryParams: TenantQueryParams = {
      firstResult: (this.currentPage - 1) * this.pageSize,
      maxResults: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    // Add search filter if needed
    if (this.searchTerm) {
      queryParams.id = this.searchTerm;
    }

    this.tenantService.getTenantsWithCount(queryParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.tenants = response.data;
          this.totalTenants = response.total;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.loadError'),
            message: this.translateService.instant('admin.tenants.loadError')
          });
        }
      });
  }

  onSort(event: SortEvent): void {
    this.sortBy = event.sortBy;
    this.sortOrder = event.sortOrder;
    this.loadTenants();
  }

  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.current;
    this.pageSize = event.size;
    this.loadTenants();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.loadTenants();
  }

  onRowClick(tenant: Tenant): void {
    this.router.navigate(['/admin/tenants', tenant.id]);
  }

  onCreateTenant(): void {
    this.showCreateDialog = true;
  }

  onTenantCreated(): void {
    this.showCreateDialog = false;
    this.loadTenants();
  }

  onCreateDialogCancel(): void {
    this.showCreateDialog = false;
  }

  editTenant(tenant: Tenant, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/admin/tenants', tenant.id]);
  }

  refresh(): void {
    this.loadTenants();
  }
}
