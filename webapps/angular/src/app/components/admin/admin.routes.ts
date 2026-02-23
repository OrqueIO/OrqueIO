import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { AdminLayoutComponent } from '../../shared/admin-layout/admin-layout';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { UserListComponent } from './users/user-list/user-list';
import { UserDetailComponent } from './users/user-detail/user-detail';
import { GroupListComponent } from './groups/group-list/group-list';
import { GroupDetailComponent } from './groups/group-detail/group-detail';
import { TenantListComponent } from './tenants/tenant-list/tenant-list';
import { TenantDetailComponent } from './tenants/tenant-detail/tenant-detail';
import { AuthorizationListComponent } from './authorizations/authorization-list/authorization-list';
import { SystemDashboardComponent } from './system/system-dashboard/system-dashboard';
import { SystemGeneralComponent } from './system/system-general/system-general';
import { SystemMetricsComponent } from './system/system-metrics/system-metrics';
import { SystemDiagnosticsComponent } from './system/system-diagnostics/system-diagnostics';

// Admin NgRx State - lazy loaded with this module
import { usersReducer } from '../../store/admin/users/users.reducer';
import { groupsReducer } from '../../store/admin/groups/groups.reducer';
import { tenantsReducer } from '../../store/admin/tenants/tenants.reducer';
import { authorizationsReducer } from '../../store/admin/authorizations/authorizations.reducer';
import { systemReducer } from '../../store/admin/system/system.reducer';
import { UsersEffects } from '../../store/admin/users/users.effects';
import { AuthorizationsEffects } from '../../store/admin/authorizations/authorizations.effects';
import { TenantsEffects } from '../../store/admin/tenants/tenants.effects';
import { SystemEffects } from '../../store/admin/system/system.effects';

/**
 * Admin module routes - lazy loaded from app.routes.ts
 * NgRx state is registered here and loaded only when this module is accessed
 * Guards are applied at the parent route level in app.routes.ts
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    providers: [
      // Register admin state slices
      provideState('users', usersReducer),
      provideState('groups', groupsReducer),
      provideState('tenants', tenantsReducer),
      provideState('authorizations', authorizationsReducer),
      provideState('system', systemReducer),
      // Register admin effects
      provideEffects(UsersEffects, AuthorizationsEffects, TenantsEffects, SystemEffects)
    ],
    children: [
      { path: '', component: AdminDashboardComponent, pathMatch: 'full', title: 'PAGE_TITLE_ADMIN' },
      { path: 'users', component: UserListComponent, title: 'PAGE_TITLE_ADMIN_USERS' },
      { path: 'users/:id', component: UserDetailComponent, title: 'PAGE_TITLE_ADMIN_USER_DETAIL' },
      { path: 'groups', component: GroupListComponent, title: 'PAGE_TITLE_ADMIN_GROUPS' },
      { path: 'groups/:id', component: GroupDetailComponent, title: 'PAGE_TITLE_ADMIN_GROUP_DETAIL' },
      { path: 'tenants', component: TenantListComponent, title: 'PAGE_TITLE_ADMIN_TENANTS' },
      { path: 'tenants/:id', component: TenantDetailComponent, title: 'PAGE_TITLE_ADMIN_TENANT_DETAIL' },
      { path: 'authorizations', component: AuthorizationListComponent, title: 'PAGE_TITLE_ADMIN_AUTHORIZATIONS' },
      {
        path: 'system',
        component: SystemDashboardComponent,
        children: [
          { path: '', redirectTo: 'general', pathMatch: 'full' },
          { path: 'general', component: SystemGeneralComponent, title: 'PAGE_TITLE_ADMIN_SYSTEM_GENERAL' },
          { path: 'metrics', component: SystemMetricsComponent, title: 'PAGE_TITLE_ADMIN_SYSTEM_METRICS' },
          { path: 'diagnostics', component: SystemDiagnosticsComponent, title: 'PAGE_TITLE_ADMIN_SYSTEM_DIAGNOSTICS' }
        ]
      }
    ]
  }
];

// Default export for lazy loading
export default ADMIN_ROUTES;
