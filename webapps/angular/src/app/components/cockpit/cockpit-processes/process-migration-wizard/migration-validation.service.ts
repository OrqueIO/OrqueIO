import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, catchError, tap } from 'rxjs/operators';

import { MigrationService } from '../../../../services/migration.service';
import type { MigrationPlanDto } from '../../../../services/migration.model';
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

        return this.migrationService.validateMigrationPlan(payload).pipe(
          tap(response => {
            const states = parseVariableReports(response, variables);
            this.variableValidationStates.set(states);
          }),

          catchError(() => {
            const errorStates: VariableValidationState[] = variables.map(v => ({
              name: v.name,
              status: 'error',
              messages: ['Could not validate variables']
            }));
            this.variableValidationStates.set(errorStates);
            return of(errorStates);
          })
        );
      }),

      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
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
