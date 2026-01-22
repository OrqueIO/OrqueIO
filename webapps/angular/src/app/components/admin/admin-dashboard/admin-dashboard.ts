import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faUsers,
  faUsersCog,
  faBuilding,
  faShieldAlt,
  faSpinner,
  faPlus,
  faList,
  faUser,
  faKey,
  faServer,
  faCogs,
  faChartBar,
  faHeartbeat,
  faUserPlus,
  faArrowRight,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { UserService } from '../../../services/admin/user.service';
import { GroupService } from '../../../services/admin/group.service';
import { TenantService } from '../../../services/admin/tenant.service';
import { AuthorizationService } from '../../../services/admin/authorization.service';
import { AuthService } from '../../../services/auth';
import { UserCreateDialogComponent } from '../users/user-create-dialog/user-create-dialog';
import { GroupCreateDialogComponent } from '../groups/group-create-dialog/group-create-dialog';
import { TenantCreateDialogComponent } from '../tenants/tenant-create-dialog/tenant-create-dialog';
import { AdminPageHeaderComponent } from '../../../shared/admin-page-header/admin-page-header';

interface AdminStat {
  icon: any;
  titleKey: string;
  count: number;
  route: string;
  loading: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    TranslatePipe,
    UserCreateDialogComponent,
    GroupCreateDialogComponent,
    TenantCreateDialogComponent,
    AdminPageHeaderComponent
  ],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private userService = inject(UserService);
  private groupService = inject(GroupService);
  private tenantService = inject(TenantService);
  private authorizationService = inject(AuthorizationService);
  private authService = inject(AuthService);

  // Icons
  faUsers = faUsers;
  faUsersCog = faUsersCog;
  faBuilding = faBuilding;
  faShieldAlt = faShieldAlt;
  faSpinner = faSpinner;
  faPlus = faPlus;
  faList = faList;
  faUser = faUser;
  faKey = faKey;
  faServer = faServer;
  faCogs = faCogs;
  faChartBar = faChartBar;
  faHeartbeat = faHeartbeat;
  faUserPlus = faUserPlus;
  faArrowRight = faArrowRight;
  faSearch = faSearch;

  // State
  isRefreshing = false;
  currentUserId = '';

  // Dialogs
  showCreateUserDialog = false;
  showCreateGroupDialog = false;
  showCreateTenantDialog = false;

  stats: AdminStat[] = [
    {
      icon: faUsers,
      titleKey: 'admin.dashboard.users',
      count: 0,
      route: '/admin/users',
      loading: true
    },
    {
      icon: faUsersCog,
      titleKey: 'admin.dashboard.groups',
      count: 0,
      route: '/admin/groups',
      loading: true
    },
    {
      icon: faBuilding,
      titleKey: 'admin.dashboard.tenants',
      count: 0,
      route: '/admin/tenants',
      loading: true
    },
    {
      icon: faShieldAlt,
      titleKey: 'admin.dashboard.authorizations',
      count: 0,
      route: '/admin/authorizations',
      loading: true
    }
  ];

  ngOnInit(): void {
    this.loadDashboardStats();
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.authService.authentication$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(auth => {
        this.currentUserId = auth?.name || '';
        this.cdr.markForCheck();
      });
  }

  private loadDashboardStats(): void {
    // Load users count
    this.userService.getUsersCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: count => {
          this.stats[0].count = count;
          this.stats[0].loading = false;
          this.checkRefreshComplete();
          this.cdr.markForCheck();
        },
        error: () => {
          this.stats[0].loading = false;
          this.checkRefreshComplete();
          this.cdr.markForCheck();
        }
      });

    // Load groups count
    this.groupService.getGroupsCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: count => {
          this.stats[1].count = count;
          this.stats[1].loading = false;
          this.checkRefreshComplete();
          this.cdr.markForCheck();
        },
        error: () => {
          this.stats[1].loading = false;
          this.checkRefreshComplete();
          this.cdr.markForCheck();
        }
      });

    // Load tenants count
    this.tenantService.getTenantsCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: count => {
          this.stats[2].count = count;
          this.stats[2].loading = false;
          this.checkRefreshComplete();
          this.cdr.markForCheck();
        },
        error: () => {
          this.stats[2].loading = false;
          this.checkRefreshComplete();
          this.cdr.markForCheck();
        }
      });

    // Load authorizations count
    this.authorizationService.getAuthorizationsCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: count => {
          this.stats[3].count = count;
          this.stats[3].loading = false;
          this.checkRefreshComplete();
          this.cdr.markForCheck();
        },
        error: () => {
          this.stats[3].loading = false;
          this.checkRefreshComplete();
          this.cdr.markForCheck();
        }
      });
  }

  private checkRefreshComplete(): void {
    if (this.stats.every(stat => !stat.loading)) {
      this.isRefreshing = false;
    }
  }

  refresh(): void {
    this.isRefreshing = true;
    this.stats.forEach(stat => stat.loading = true);
    this.loadDashboardStats();
  }

  // User dialog
  openCreateUserDialog(): void {
    this.showCreateUserDialog = true;
    this.cdr.markForCheck();
  }

  closeCreateUserDialog(): void {
    this.showCreateUserDialog = false;
    this.cdr.markForCheck();
  }

  onUserCreated(): void {
    this.showCreateUserDialog = false;
    this.refresh();
  }

  // Group dialog
  openCreateGroupDialog(): void {
    this.showCreateGroupDialog = true;
    this.cdr.markForCheck();
  }

  closeCreateGroupDialog(): void {
    this.showCreateGroupDialog = false;
    this.cdr.markForCheck();
  }

  onGroupCreated(): void {
    this.showCreateGroupDialog = false;
    this.refresh();
  }

  // Tenant dialog
  openCreateTenantDialog(): void {
    this.showCreateTenantDialog = true;
    this.cdr.markForCheck();
  }

  closeCreateTenantDialog(): void {
    this.showCreateTenantDialog = false;
    this.cdr.markForCheck();
  }

  onTenantCreated(): void {
    this.showCreateTenantDialog = false;
    this.refresh();
  }
}
