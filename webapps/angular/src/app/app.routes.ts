import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome-component/welcome-component';
import { LoginComponent } from './components/login/login';
import { SetupComponent } from './components/setup/setup.component';
import { ProfilePageComponent } from './components/profile-page/profile-page';
import { AccessDeniedComponent } from './components/access-denied/access-denied.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { setupGuard } from './guards/setup.guard';
import { tasklistGuard, cockpitGuard, adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', component: WelcomeComponent, canActivate: [authGuard], title: 'PAGE_TITLE_HOME' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'PAGE_TITLE_LOGIN' },
  { path: 'setup', component: SetupComponent, canActivate: [setupGuard], title: 'PAGE_TITLE_SETUP' },
  { path: 'profile', component: ProfilePageComponent, canActivate: [authGuard], title: 'PAGE_TITLE_PROFILE' },
  { path: 'access-denied', component: AccessDeniedComponent, canActivate: [authGuard], title: 'PAGE_TITLE_ACCESS_DENIED' },

  {
    path: 'tasklist',
    canActivate: [authGuard, tasklistGuard],
    loadChildren: () => import('./components/tasklist/tasklist.routes').then(m => m.TASKLIST_ROUTES)
  },
  {
    path: 'cockpit',
    canActivate: [authGuard, cockpitGuard],
    loadChildren: () => import('./components/cockpit/cockpit.routes').then(m => m.COCKPIT_ROUTES)
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./components/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },

  { path: '**', redirectTo: '' } 
];
