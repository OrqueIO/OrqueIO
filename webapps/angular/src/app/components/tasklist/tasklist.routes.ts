import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { TasklistLayoutComponent } from './tasklist-layout/tasklist-layout';

// Tasklist NgRx State - lazy loaded with this module
import { tasklistReducer } from '../../store/tasklist/tasklist.reducer';
import { TasklistEffects } from '../../store/tasklist/tasklist.effects';

/**
 * Tasklist module routes - lazy loaded from app.routes.ts
 * NgRx state is registered here and loaded only when this module is accessed
 * Guards are applied at the parent route level in app.routes.ts
 */
export const TASKLIST_ROUTES: Routes = [
  {
    path: '',
    providers: [
      // Register tasklist state
      provideState('tasklist', tasklistReducer),
      // Register tasklist effects
      provideEffects(TasklistEffects)
    ],
    children: [
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
    ]
  }
];

// Default export for lazy loading
export default TASKLIST_ROUTES;
