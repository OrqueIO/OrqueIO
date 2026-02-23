import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CockpitService } from '../../../services/cockpit.service';
import * as ProcessesActions from './processes.actions';

@Injectable()
export class ProcessesEffects {
  private actions$ = inject(Actions);
  private cockpitService = inject(CockpitService);

  loadProcessDefinitions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProcessesActions.loadProcessDefinitions),
      switchMap(() =>
        this.cockpitService.getProcessDefinitions().pipe(
          map(definitions => ProcessesActions.loadProcessDefinitionsSuccess({ definitions })),
          catchError(error => of(ProcessesActions.loadProcessDefinitionsFailure({ error })))
        )
      )
    )
  );

  loadProcessInstances$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProcessesActions.loadProcessInstances),
      switchMap(({ params }) =>
        forkJoin({
          instances: this.cockpitService.getProcessInstances(params),
          count: this.cockpitService.getProcessInstancesCount(params)
        }).pipe(
          map(({ instances, count }) =>
            ProcessesActions.loadProcessInstancesSuccess({
              instances,
              total: count
            })
          ),
          catchError(error => of(ProcessesActions.loadProcessInstancesFailure({ error })))
        )
      )
    )
  );

  loadProcessInstance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProcessesActions.loadProcessInstance),
      switchMap(({ processId }) =>
        forkJoin({
          process: this.cockpitService.getProcessInstance(processId),
          variables: this.cockpitService.getProcessInstanceVariables(processId),
          activities: this.cockpitService.getProcessInstanceActivities(processId)
        }).pipe(
          map(({ process, variables, activities }) => {
            if (!process) {
              return ProcessesActions.loadProcessInstanceFailure({ error: 'Process not found' });
            }
            return ProcessesActions.loadProcessInstanceSuccess({
              process: { ...process, variables, activities }
            });
          }),
          catchError(error => of(ProcessesActions.loadProcessInstanceFailure({ error })))
        )
      )
    )
  );
}
