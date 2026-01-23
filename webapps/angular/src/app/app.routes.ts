import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome-component/welcome-component';
import { LoginComponent } from './components/login/login';
import { SetupComponent } from './components/setup/setup.component';
import { ProfilePageComponent } from './components/profile-page/profile-page';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { setupGuard } from './guards/setup.guard';
import { cockpitRoutes } from './components/cockpit/cockpit.routes';
import { adminRoutes } from './components/admin/admin.routes';
import { TASKLIST_ROUTES } from './components/tasklist/tasklist.routes';

export const routes: Routes = [
  { path: '', component: WelcomeComponent, canActivate: [authGuard], title: 'PAGE_TITLE_HOME' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'PAGE_TITLE_LOGIN' },
  { path: 'setup', component: SetupComponent, canActivate: [setupGuard], title: 'PAGE_TITLE_SETUP' },
  { path: 'profile', component: ProfilePageComponent, canActivate: [authGuard], title: 'PAGE_TITLE_PROFILE' },
  { path: 'tasklist', children: TASKLIST_ROUTES, canActivate: [authGuard] },
  ...cockpitRoutes,
  ...adminRoutes,
  { path: '**', redirectTo: '' }  // Catch-all route for unknown URLs
];