import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CockpitService } from '../../../services/cockpit.service';
import * as DashboardActions from './dashboard.actions';

@Injectable()
export class DashboardEffects {
  private actions$ = inject(Actions);
  private cockpitService = inject(CockpitService);

  loadDashboardStats$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadDashboardStats, DashboardActions.refreshDashboard),
      switchMap(() =>
        this.cockpitService.getDashboardStats().pipe(
          map(stats => DashboardActions.loadDashboardStatsSuccess({ stats })),
          catchError(error => of(DashboardActions.loadDashboardStatsFailure({ error })))
        )
      )
    )
  );
}
