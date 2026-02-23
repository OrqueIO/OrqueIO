import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CockpitService } from '../../../services/cockpit.service';
import * as DecisionsActions from './decisions.actions';

@Injectable()
export class DecisionsEffects {
  private actions$ = inject(Actions);
  private cockpitService = inject(CockpitService);

  loadDecisionDefinitions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DecisionsActions.loadDecisionDefinitions),
      switchMap(() =>
        this.cockpitService.getDecisionDefinitions().pipe(
          map(definitions => DecisionsActions.loadDecisionDefinitionsSuccess({ definitions })),
          catchError(error => of(DecisionsActions.loadDecisionDefinitionsFailure({ error })))
        )
      )
    )
  );

  loadDecisionInstances$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DecisionsActions.loadDecisionInstances),
      switchMap(({ definitionId, maxResults }) =>
        this.cockpitService.getDecisionInstances(definitionId, maxResults).pipe(
          map(instances => DecisionsActions.loadDecisionInstancesSuccess({ instances })),
          catchError(error => of(DecisionsActions.loadDecisionInstancesFailure({ error })))
        )
      )
    )
  );

  loadDecisionInstance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DecisionsActions.loadDecisionInstance),
      switchMap(({ decisionId }) =>
        this.cockpitService.getDecisionInstance(decisionId).pipe(
          map(decision => {
            if (!decision) {
              return DecisionsActions.loadDecisionInstanceFailure({ error: 'Decision not found' });
            }
            return DecisionsActions.loadDecisionInstanceSuccess({ decision });
          }),
          catchError(error => of(DecisionsActions.loadDecisionInstanceFailure({ error })))
        )
      )
    )
  );
}
