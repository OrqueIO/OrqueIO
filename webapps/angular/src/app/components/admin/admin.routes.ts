import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';
import { AdminLayoutComponent } from '../../shared/admin-layout/admin-layout';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { UserListComponent } from './users/user-list/user-list';
import { UserDetailComponent } from './users/user-detail/user-detail';
import { GroupListComponent } from './groups/group-list/group-list';
import { GroupDetailComponent } from './groups/group-detail/group-detail';
import { TenantListComponent } from './tenants/tenant-list/tenant-list';
import { TenantDetailComponent } from './tenants/tenant-detail/tenant-detail';
import { AuthorizationListComponent } from './authorizations/authorization-list/authorization-list';

export const adminRoutes: Routes = [
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'users', component: UserListComponent },
      { path: 'users/:id', component: UserDetailComponent },
      { path: 'groups', component: GroupListComponent },
      { path: 'groups/:id', component: GroupDetailComponent },
      { path: 'tenants', component: TenantListComponent },
      { path: 'tenants/:id', component: TenantDetailComponent },
      { path: 'authorizations', component: AuthorizationListComponent }
    ]
  }
];
