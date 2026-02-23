import { Component, OnInit, inject, DestroyRef, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { AdminPageHeaderComponent } from '../../../../shared/admin-page-header/admin-page-header';
import { DataTableComponent, ColumnDef, SortEvent } from '../../../../shared/data-table/data-table';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { SearchBarComponent } from '../../../../shared/search-bar/search-bar';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
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
    TenantCreateDialogComponent,
    ConfirmDialogComponent
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
  faTrash = faTrash;

  showDeleteConfirm = false;
  tenantToDelete: Tenant | null = null;

  allTenants: Tenant[] = [];
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
      maxResults: 1000,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    this.tenantService.getTenantsWithCount(queryParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.allTenants = response.data;
          this.applyFilter();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.loadError'),
            message: this.translateService.instant('admin.tenants.loadError')
          });
        }
      });
  }

  private applyFilter(): void {
    let filtered = this.allTenants;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = this.allTenants.filter(tenant =>
        tenant.id.toLowerCase().includes(term) ||
        (tenant.name && tenant.name.toLowerCase().includes(term))
      );
    }

    this.totalTenants = filtered.length;
    const start = (this.currentPage - 1) * this.pageSize;
    this.tenants = filtered.slice(start, start + this.pageSize);
  }

  onSort(event: SortEvent): void {
    this.sortBy = event.sortBy;
    this.sortOrder = event.sortOrder;
    this.loadTenants();
  }

  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.current;
    this.pageSize = event.size;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.applyFilter();
    this.cdr.markForCheck();
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

  deleteTenant(tenant: Tenant, event: Event): void {
    event.stopPropagation();
    this.tenantToDelete = tenant;
    this.showDeleteConfirm = true;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (!this.tenantToDelete) return;
    this.showDeleteConfirm = false;
    const tenantId = this.tenantToDelete.id;

    this.tenantService.deleteTenant(tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.addSuccess('admin.tenants.tenantDeleted', 'Tenant deleted successfully');
          this.tenantToDelete = null;
          this.loadTenants();
        },
        error: () => {
          this.tenantToDelete = null;
          this.notifications.addError({
            status: this.translateService.instant('admin.tenants.deleteError'),
            message: this.translateService.instant('admin.tenants.deleteError')
          });
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.tenantToDelete = null;
    this.cdr.markForCheck();
  }

  refresh(): void {
    this.loadTenants();
  }
}
