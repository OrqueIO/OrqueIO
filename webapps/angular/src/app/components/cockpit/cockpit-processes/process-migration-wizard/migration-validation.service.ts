import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of, forkJoin, Observable } from 'rxjs';
import { debounceTime, switchMap, catchError, tap, map } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { MigrationService } from '../../../../services/migration.service';
import type { MigrationPlanDto, MigrationPlanReportDto } from '../../../../services/migration.model';
import type { PlanVariable } from './migration-variables.utils';
import { buildValidationPayload, parseVariableReports, VariableValidationState } from './migration-engine-validation.utils';

@Injectable()
export class MigrationValidationService {
  private migrationService = inject(MigrationService);
  private destroyRef = inject(DestroyRef);

  variableValidationStates = signal<VariableValidationState[]>([]);

  private validateTrigger$ = new Subject<{ plan: MigrationPlanDto; variables: PlanVariable[] }>();

  constructor() {
    this.validateTrigger$.pipe(
      debounceTime(300),

      switchMap(({ plan, variables }) => {
        if (variables.length === 0) {
          return of([]);
        }

        const pendingStates: VariableValidationState[] = variables.map(v => ({
          name: v.name,
          status: 'pending',
          messages: []
        }));
        this.variableValidationStates.set(pendingStates);

        const payload = buildValidationPayload(plan, variables);

        return this.validateWithRetry(payload, plan, variables);
      }),

      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  private validateWithRetry(
    payload: MigrationPlanDto,
    plan: MigrationPlanDto,
    variables: PlanVariable[]
  ) {
    return this.migrationService.validateMigrationPlan(payload).pipe(
      tap(response => {
        const states = parseVariableReports(response, variables);
        this.variableValidationStates.set(states);
      }),

      catchError((error: HttpErrorResponse) => {
        if (error.status === 400 || error.status === 500) {
          return this.retryPerVariable(plan, variables, error);
        }

        const errorStates: VariableValidationState[] = variables.map(v => ({
          name: v.name,
          status: 'error',
          messages: ['Could not validate variables']
        }));
        this.variableValidationStates.set(errorStates);
        return of(errorStates);
      })
    );
  }

  private retryPerVariable(
    plan: MigrationPlanDto,
    variables: PlanVariable[],
    originalError: HttpErrorResponse
  ) {
    const validationObservables: Observable<VariableValidationState>[] = variables.map(variable => {
      const singleVarPayload = buildValidationPayload(plan, [variable]);
      return this.migrationService.validateMigrationPlan(singleVarPayload).pipe(
        map((response): VariableValidationState => {
          const states = parseVariableReports(response, [variable]);
          return states[0];
        }),
        catchError((error: HttpErrorResponse): Observable<VariableValidationState> => {

          const message = error.error?.message || error.message || 'Validation failed';
          return of({
            name: variable.name,
            status: 'invalid' as const,
            messages: [message]
          });
        })
      );
    });

    return forkJoin(validationObservables).pipe(
      tap((states) => {
        const allError = states.every(s => s.status === 'error');
        if (allError) {
          const message = originalError.error?.message || originalError.message || 'Could not validate';
          const fallbackStates: VariableValidationState[] = variables.map(v => ({
            name: v.name,
            status: 'error',
            messages: [message]
          }));
          this.variableValidationStates.set(fallbackStates);
        } else {
          this.variableValidationStates.set(states);
        }
      })
    );
  }

  /**
   * @param plan
   * @param variables
   */
  validateVariables(plan: MigrationPlanDto | null, variables: PlanVariable[]): void {
    if (!plan) {
      this.variableValidationStates.set([]);
      return;
    }

    this.validateTrigger$.next({ plan, variables });
  }

  /**
   * @param variableName
   * @returns
   */
  getVariableState(variableName: string): VariableValidationState | null {
    const states = this.variableValidationStates();
    return states.find(s => s.name === variableName) || null;
  }


  areAllVariablesValid(): boolean {
    const states = this.variableValidationStates();
    if (states.length === 0) return true;
    return states.every(s => s.status === 'valid');
  }


  isValidationPending(): boolean {
    const states = this.variableValidationStates();
    return states.some(s => s.status === 'pending');
  }


  hasValidationErrors(): boolean {
    const states = this.variableValidationStates();
    return states.some(s => s.status === 'error');
  }
}
