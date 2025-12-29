import { Routes } from '@angular/router';
import { TasklistLayoutComponent } from './tasklist-layout/tasklist-layout';

export const TASKLIST_ROUTES: Routes = [
  {
    path: '',
    component: TasklistLayoutComponent,
    title: 'Tasklist'
  },
  {
    path: ':filterId',
    component: TasklistLayoutComponent,
    title: 'Tasklist'
  },
  {
    path: ':filterId/:taskId',
    component: TasklistLayoutComponent,
    title: 'Tasklist'
  }
];
