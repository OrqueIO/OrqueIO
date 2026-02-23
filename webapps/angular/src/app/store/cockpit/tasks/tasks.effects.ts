import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CockpitService } from '../../../services/cockpit.service';
import * as TasksActions from './tasks.actions';

@Injectable()
export class TasksEffects {
  private actions$ = inject(Actions);
  private cockpitService = inject(CockpitService);

  loadTasks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.loadTasks),
      switchMap(({ params }) =>
        forkJoin({
          tasks: this.cockpitService.getTasks(params),
          count: this.cockpitService.getTasksCount(params)
        }).pipe(
          map(({ tasks, count }) =>
            TasksActions.loadTasksSuccess({
              tasks,
              total: count
            })
          ),
          catchError(error => of(TasksActions.loadTasksFailure({ error })))
        )
      )
    )
  );

  loadTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.loadTask),
      switchMap(({ taskId }) =>
        this.cockpitService.getTask(taskId).pipe(
          map(task => {
            if (!task) {
              return TasksActions.loadTaskFailure({ error: 'Task not found' });
            }
            return TasksActions.loadTaskSuccess({ task });
          }),
          catchError(error => of(TasksActions.loadTaskFailure({ error })))
        )
      )
    )
  );
}
