import {
  Component, ChangeDetectionStrategy, input, output, signal, computed,
  inject, DestroyRef, effect, untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner, faCheck, faTimes, faExclamationTriangle, faCopy, faArrowRight, faArrowDown, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { MigrationService } from '../../../../services/migration.service';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { MigrationPlanDto, MigrationPlanReportDto, MigrationInstructionDto } from '../../../../services/migration.model';
import { PlanVariable } from './migration-variables.utils';
import { buildValidationPayload } from './migration-engine-validation.utils';
import { InstancesStepState } from './migration-instances-step.component';
import { buildRuntimeProcessInstanceQuery } from './migration-query-converter.utils';
import { MultiValueFilter } from '../../../../services/cockpit.service';

export interface MigrationExecutionResult {
  mode: 'sync' | 'async';
  batchId?: string;
  totalCount: number;
  payload: MigrationExecutionPayload;
}

export interface MigrationExecutionPayload {
  migrationPlan: MigrationPlanDto;
  processInstanceIds?: string[];
  processInstanceQuery?: Record<string, unknown>;
  skipCustomListeners: boolean;
  skipIoMappings: boolean;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid' | 'error';


@Component({
  selector: 'app-migration-confirm-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TranslatePipe
  ],
  templateUrl: './migration-confirm-step.component.html',
  styleUrl: './migration-confirm-step.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationConfirmStepComponent {
  private migrationService = inject(MigrationService);
  private processInstanceService = inject(ProcessInstanceService);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly back = output<void>();
  readonly next = output<MigrationExecutionResult>();

  readonly migrationPlan = input.required<MigrationPlanDto>();
  readonly variables = input<PlanVariable[]>([]);
  readonly instancesState = input.required<InstancesStepState>();
  readonly sourceXml = input<string | null>(null);
  readonly targetXml = input<string | null>(null);

  readonly faSpinner = faSpinner;
  readonly faCheck = faCheck;
  readonly faTimes = faTimes;
  readonly faExclamationTriangle = faExclamationTriangle;
  readonly faCopy = faCopy;
  readonly faArrowRight = faArrowRight;
  readonly faArrowDown = faArrowDown;
  readonly faChevronDown = faChevronDown;
  readonly faChevronUp = faChevronUp;

  readonly validationState = signal<ValidationState>('idle');
  readonly validationErrors = signal<{ activity?: string; variable?: string; message: string }[]>([]);

  readonly asyncMode = signal(true);
  readonly skipCustomListeners = signal(false);
  readonly skipIoMappings = signal(false);

  readonly executing = signal(false);
  readonly executionError = signal<string | null>(null);

  readonly showTechnicalDetails = signal(false);
  readonly payloadCopied = signal(false);

  readonly countVerifying = signal(false);
  readonly verifiedCount = signal<number | null>(null);
  readonly countMismatch = computed(() => {
    const state = this.instancesState();
    const verified = this.verifiedCount();
    if (state.mode !== 'query' || verified === null) return false;
    return verified !== state.totalCount;
  });

  private readonly activityNamesCache = signal<Map<string, { source: string; target: string }>>(new Map());

  readonly canExecute = computed(() => {
    const validationState = this.validationState();
    const executing = this.executing();
    return validationState === 'valid' && !executing;
  });

  readonly executionPayload = computed<MigrationExecutionPayload>(() => {
    return this.buildExecutionPayload();
  });

  readonly payloadJson = computed(() => {
    return JSON.stringify(this.executionPayload(), null, 2);
  });

  // Unsupported criteria are now excluded from the filter menu in step 3,
  // so no need to track them here anymore

  constructor() {
    effect(() => {
      const plan = this.migrationPlan();
      const vars = this.variables();

      untracked(() => {
        this.validatePlan(plan, vars);
      });
    });

    effect(() => {
      const sourceXml = this.sourceXml();
      const targetXml = this.targetXml();

      untracked(() => {
        if (sourceXml && targetXml) {
          this.parseActivityNames(sourceXml, targetXml);
        }
      });
    });

    effect(() => {
      const state = this.instancesState();
      const plan = this.migrationPlan();

      untracked(() => {
        if (state.mode === 'query') {
          this.verifyCount(state.filterCriteria || [], plan.sourceProcessDefinitionId);
        }
      });
    });
  }

  onBack(): void {
    this.back.emit();
  }

  onExecute(): void {
    if (!this.canExecute()) return;

    this.executing.set(true);
    this.executionError.set(null);

    const payload = this.executionPayload();
    const asyncMode = this.asyncMode();

    const executeObservable = asyncMode
      ? this.migrationService.executeMigrationAsync(payload)
      : this.migrationService.executeMigration(payload);

    executeObservable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.executing.set(false);

          const result: MigrationExecutionResult = {
            mode: asyncMode ? 'async' : 'sync',
            batchId: asyncMode ? response?.id : undefined,
            totalCount: this.instancesState().totalCount,
            payload
          };

          this.next.emit(result);
        },
        error: (error) => {
          this.executing.set(false);
          const errorMessage = error?.error?.message || error?.message || 'Unknown error occurred';
          this.executionError.set(errorMessage);
        }
      });
  }

  onToggleTechnicalDetails(): void {
    this.showTechnicalDetails.set(!this.showTechnicalDetails());
  }

  onCopyPayload(): void {
    const json = this.payloadJson();
    navigator.clipboard.writeText(json).then(() => {
      this.payloadCopied.set(true);
      setTimeout(() => this.payloadCopied.set(false), 2000);
    });
  }

  getProcessName(side: 'source' | 'target'): string {
    const defId = side === 'source'
      ? this.migrationPlan().sourceProcessDefinitionId
      : this.migrationPlan().targetProcessDefinitionId;

    const parts = defId.split(':');
    return parts[0] || defId;
  }

  getProcessVersion(side: 'source' | 'target'): string {
    const defId = side === 'source'
      ? this.migrationPlan().sourceProcessDefinitionId
      : this.migrationPlan().targetProcessDefinitionId;

    const parts = defId.split(':');
    return parts[1] || '1';
  }

  getEndpoint(): string {
    const baseUrl = '/engine-rest/engine/default';
    return this.asyncMode()
      ? `POST ${baseUrl}/migration/executeAsync`
      : `POST ${baseUrl}/migration/execute`;
  }

  getActivityName(activityId: string, side: 'source' | 'target'): string {
    const cached = this.activityNamesCache().get(activityId);
    if (cached) {
      return side === 'source' ? cached.source : cached.target;
    }
    return activityId;
  }

  getVariableValueString(variable: PlanVariable): string {
    return String(variable.value);
  }

  private validatePlan(plan: MigrationPlanDto, vars: PlanVariable[]): void {
    this.validationState.set('validating');
    this.validationErrors.set([]);

    const payload = buildValidationPayload(plan, vars);

    this.migrationService.validateMigrationPlan(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report: MigrationPlanReportDto) => {
          const errors = this.parseValidationErrors(report);

          if (errors.length > 0) {
            this.validationState.set('invalid');
            this.validationErrors.set(errors);
          } else {
            this.validationState.set('valid');
            this.validationErrors.set([]);
          }
        },
        error: (error) => {
          this.validationState.set('error');
          const errorMessage = error?.error?.message || error?.message || 'Validation request failed';
          this.validationErrors.set([{ message: errorMessage }]);
        }
      });
  }

  private parseValidationErrors(report: MigrationPlanReportDto): { activity?: string; variable?: string; message: string }[] {
    const errors: { activity?: string; variable?: string; message: string }[] = [];

    if (report.instructionReports) {
      for (const instrReport of report.instructionReports) {
        if (instrReport.failures && instrReport.failures.length > 0) {
          const sourceActivity = instrReport.instruction.sourceActivityIds[0];
          for (const failure of instrReport.failures) {
            errors.push({
              activity: sourceActivity,
              message: failure
            });
          }
        }
      }
    }

    if (report.variableReports) {
      for (const [varName, varReport] of Object.entries(report.variableReports)) {
        if (varReport.failures && varReport.failures.length > 0) {
          for (const failure of varReport.failures) {
            errors.push({
              variable: varName,
              message: failure
            });
          }
        }
      }
    }

    return errors;
  }

  private buildExecutionPayload(): MigrationExecutionPayload {
    const plan = this.migrationPlan();
    const vars = this.variables();
    const state = this.instancesState();

    const migrationPlan = buildValidationPayload(plan, vars);

    const payload: MigrationExecutionPayload = {
      migrationPlan,
      skipCustomListeners: this.skipCustomListeners(),
      skipIoMappings: this.skipIoMappings()
    };

    if (state.mode === 'instance') {
      payload.processInstanceIds = state.processInstanceIds;
    } else {
      const criteria = state.filterCriteria || [];
      payload.processInstanceQuery = buildRuntimeProcessInstanceQuery(criteria, plan.sourceProcessDefinitionId);
    }

    return payload;
  }

  private parseActivityNames(sourceXml: string, targetXml: string): void {
    const plan = this.migrationPlan();
    const cache = new Map<string, { source: string; target: string }>();

    for (const instruction of plan.instructions) {
      const sourceId = instruction.sourceActivityIds[0];
      const targetId = instruction.targetActivityIds[0];

      const sourceName = this.extractActivityName(sourceXml, sourceId) || sourceId;
      const targetName = this.extractActivityName(targetXml, targetId) || targetId;

      cache.set(sourceId, { source: sourceName, target: sourceName });
      cache.set(targetId, { source: targetName, target: targetName });
    }

    this.activityNamesCache.set(cache);
  }

  private extractActivityName(xml: string, activityId: string): string | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const element = doc.querySelector(`[id="${activityId}"]`);
      return element?.getAttribute('name') || null;
    } catch {
      return null;
    }
  }

  private verifyCount(criteria: MultiValueFilter[], sourceDefinitionId: string): void {
    this.countVerifying.set(true);
    this.verifiedCount.set(null);

    const query = buildRuntimeProcessInstanceQuery(criteria, sourceDefinitionId);

    this.processInstanceService.queryRuntimeProcessInstancesCount(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => {
          this.verifiedCount.set(count);
          this.countVerifying.set(false);
        },
        error: () => {
          this.verifiedCount.set(null);
          this.countVerifying.set(false);
        }
      });
  }
}