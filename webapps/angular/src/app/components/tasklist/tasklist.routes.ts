import { Routes } from '@angular/router';
import { TasklistLayoutComponent } from './tasklist-layout/tasklist-layout';

export const TASKLIST_ROUTES: Routes = [
  {
    path: '',
    component: TasklistLayoutComponent,
    title: 'PAGE_TITLE_TASKLIST'
  },
  {
    path: ':filterId',
    component: TasklistLayoutComponent,
    title: 'PAGE_TITLE_TASKLIST'
  },
  {
    path: ':filterId/:taskId',
    component: TasklistLayoutComponent,
    title: 'PAGE_TITLE_TASKLIST'
  }
];
