import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faPlus,
  faEdit,
  faTrash,
  faUser,
  faUsers,
  faRefresh,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { AdminPageHeaderComponent } from '../../../../shared/admin-page-header/admin-page-header';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
import { AuthorizationModalComponent } from '../authorization-modal/authorization-modal';
import {
  Authorization,
  CreateAuthorizationRequest,
  RESOURCE_TYPES,
  ResourceType,
  ResourceTypeInfo,
  AUTHORIZATION_TYPE,
  AUTHORIZATION_TYPE_LABELS,
  getPermissionsForResourceType,
  formatPermissions,
  getIdentityInfo
} from '../../../../models/admin/authorization.model';
import { AuthorizationsActions, AuthorizationsSelectors } from '../../../../store/admin';

@Component({
  selector: 'app-authorization-list',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    TranslatePipe,
    AdminPageHeaderComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    AuthorizationModalComponent
  ],
  templateUrl: './authorization-list.html',
  styleUrls: ['./authorization-list.css']
})
export class AuthorizationListComponent implements OnInit {
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  faPlus = faPlus;
  faEdit = faEdit;
  faTrash = faTrash;
  faUser = faUser;
  faUsers = faUsers;
  faRefresh = faRefresh;
  faExclamationTriangle = faExclamationTriangle;

  // Resource types for sidebar
  resourceTypes = RESOURCE_TYPES;

  // Authorization type labels
  authTypeLabels = AUTHORIZATION_TYPE_LABELS;
  AUTHORIZATION_TYPE = AUTHORIZATION_TYPE;

  // State from store
  authorizations: Authorization[] = [];
  loading = false;
  total = 0;
  selectedResourceType: number = 0;

  // Pagination
  currentPage = 1;
  pageSize = 25;

  // Modal state
  showModal = false;
  selectedAuthorization: Authorization | null = null;

  // Delete confirmation
  showDeleteConfirm = false;
  authorizationToDelete: Authorization | null = null;

  ngOnInit(): void {
    // Subscribe to store
    this.store.select(AuthorizationsSelectors.selectAllAuthorizations)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(authorizations => {
        this.authorizations = authorizations;
        this.cdr.detectChanges();
      });

    this.store.select(AuthorizationsSelectors.selectAuthorizationsLoading)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.detectChanges();
      });

    this.store.select(AuthorizationsSelectors.selectAuthorizationsTotal)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(total => {
        this.total = total;
        this.cdr.detectChanges();
      });

    this.store.select(AuthorizationsSelectors.selectSelectedResourceType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resourceType => {
        this.selectedResourceType = resourceType;
        this.cdr.detectChanges();
      });

    // Check for resource type in query params
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const resourceType = params['resource'];
        if (resourceType !== undefined) {
          const type = parseInt(resourceType, 10);
          if (!isNaN(type) && RESOURCE_TYPES.some(r => r.id === type)) {
            this.selectResourceType(type as ResourceType);
          }
        } else {
          // Load initial data
          this.loadAuthorizations();
        }
      });
  }

  get currentPermissions(): string[] {
    return getPermissionsForResourceType(this.selectedResourceType as ResourceType);
  }

  selectResourceType(resourceType: ResourceType): void {
    this.currentPage = 1;
    this.store.dispatch(AuthorizationsActions.setSelectedResourceType({ resourceType }));

    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { resource: resourceType },
      queryParamsHandling: 'merge'
    });
  }

  loadAuthorizations(): void {
    this.store.dispatch(AuthorizationsActions.loadAuthorizations({
      params: {
        resourceType: this.selectedResourceType as ResourceType,
        firstResult: (this.currentPage - 1) * this.pageSize,
        maxResults: this.pageSize,
        sortBy: 'resourceId',
        sortOrder: 'asc'
      }
    }));
  }

  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.current;
    this.pageSize = event.size;
    this.loadAuthorizations();
  }

  refresh(): void {
    this.loadAuthorizations();
  }

  // Modal methods
  openCreateModal(): void {
    this.selectedAuthorization = null;
    this.showModal = true;
  }

  openEditModal(authorization: Authorization): void {
    this.selectedAuthorization = authorization;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedAuthorization = null;
  }

  onSaveAuthorization(request: CreateAuthorizationRequest): void {
    if (this.selectedAuthorization?.id) {
      // Update existing
      this.store.dispatch(AuthorizationsActions.updateAuthorization({
        authorizationId: this.selectedAuthorization.id,
        updates: {
          type: request.type,
          resourceId: request.resourceId,
          permissions: request.permissions,
          userId: request.userId,
          groupId: request.groupId
        }
      }));
    } else {
      // Create new
      this.store.dispatch(AuthorizationsActions.createAuthorization({
        authorization: request
      }));
    }
    this.closeModal();
  }

  // Delete methods
  confirmDelete(authorization: Authorization): void {
    this.authorizationToDelete = authorization;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.authorizationToDelete = null;
  }

  onDeleteConfirmed(): void {
    if (this.authorizationToDelete?.id) {
      this.store.dispatch(AuthorizationsActions.deleteAuthorization({
        authorizationId: this.authorizationToDelete.id
      }));
    }
    this.cancelDelete();
  }

  // Helper methods
  getAuthTypeLabelKey(type: number): string {
    return this.authTypeLabels[type as keyof typeof this.authTypeLabels] || 'UNKNOWN';
  }

  getIdentityDisplay(auth: Authorization): { type: 'user' | 'group'; id: string } {
    return getIdentityInfo(auth);
  }

  formatPermissionsDisplay(auth: Authorization): string {
    return formatPermissions(auth.permissions, this.currentPermissions);
  }

  isUserAuthorization(auth: Authorization): boolean {
    return !!auth.userId;
  }

  isResourceTypeActive(resourceType: ResourceTypeInfo): boolean {
    return this.selectedResourceType === resourceType.id;
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
