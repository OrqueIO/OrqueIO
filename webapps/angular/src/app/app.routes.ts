import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome-component/welcome-component';
import { LoginComponent } from './components/login/login';
import { ProfilePageComponent } from './components/profile-page/profile-page';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { cockpitRoutes } from './components/cockpit/cockpit.routes';
import { adminRoutes } from './components/admin/admin.routes';
import { TASKLIST_ROUTES } from './components/tasklist/tasklist.routes';

export const routes: Routes = [
  { path: '', component: WelcomeComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'profile', component: ProfilePageComponent, canActivate: [authGuard] },
  { path: 'tasklist', children: TASKLIST_ROUTES, canActivate: [authGuard] },
  ...cockpitRoutes,
  ...adminRoutes,
  { path: '**', redirectTo: '' }  // Catch-all route for unknown URLs
];