import { Component, ChangeDetectionStrategy, output, input, signal, effect, afterNextRender, Injector, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPencilAlt, faTrash, faSpinner, faCheck, faTimes, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { PlanVariable, displayValue } from './migration-variables.utils';
import type { VariableValidationState } from './migration-engine-validation.utils';

/**
 * Step 2: Set Variables
 * Allows users to add variables that will be set into process instances' scope during migration.
 */
@Component({
  selector: 'app-migration-variables-step',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    FontAwesomeModule
  ],
  templateUrl: './migration-variables-step.component.html',
  styleUrl: './migration-variables-step.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationVariablesStepComponent {
  private injector = inject(Injector);
  private translateService = inject(TranslateService);
  readonly back = output<void>();
  readonly next = output<void>();
  readonly addVariable = output<void>();
  readonly editVariable = output<number>();
  readonly deleteVariable = output<number>();
  readonly retryValidation = output<void>();
  readonly canProceed = input(true);
  readonly disabledReason = input<string | null>(null);
  readonly variables = input<PlanVariable[]>([]);
  readonly validationStates = input<VariableValidationState[]>([]);
  readonly faPencilAlt = faPencilAlt;
  readonly faTrash = faTrash;
  readonly faSpinner = faSpinner;
  readonly faCheck = faCheck;
  readonly faTimes = faTimes;
  readonly faExclamationCircle = faExclamationCircle;
  readonly openJsonPopoverIndex = signal<number | null>(null);

  private previousVariablesCount = 0;

  constructor() {
    effect(() => {
      const currentVariables = this.variables();
      const currentCount = currentVariables.length;

      if (currentCount > this.previousVariablesCount && this.previousVariablesCount > 0) {
        afterNextRender(() => {
          this.scrollToLastVariable();
        }, { injector: this.injector });
      }

      this.previousVariablesCount = currentCount;
    });
  }

  private scrollToLastVariable(): void {
    const container = document.querySelector('.variables-table-scroll-container');
    if (!container) return;

    const rows = container.querySelectorAll('.variables-table tbody tr');
    const lastRow = rows[rows.length - 1] as HTMLElement;

    if (lastRow) {
      lastRow.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Returns truncated display value for a variable
   */
  getDisplayValue(variable: PlanVariable): string {
    return displayValue(variable);
  }

  /**
   * Returns full value for title attribute (tooltip)
   */
  getFullValue(variable: PlanVariable): string {
    return String(variable.value);
  }

  isStructuredType(type: string): boolean {
    return type === 'Json' || type === 'Object';
  }

  /**
   * Returns title for Object type class badge
   */
  getObjectTypeBadgeTitle(variable: PlanVariable): string {
    const className = variable.valueInfo?.objectTypeName || '';
    const format = variable.valueInfo?.serializationDataFormat;

    if (format) {
      const formatLabel = this.translateService.instant('migration.variables.format');
      return `${className}\n${formatLabel}: ${format}`;
    }

    return className;
  }

  /**
   * Toggles the Json popover for a variable at given index
   */
  toggleJsonPopover(index: number, event: Event): void {
    event.stopPropagation();
    if (this.openJsonPopoverIndex() === index) {
      this.openJsonPopoverIndex.set(null);
    } else {
      this.openJsonPopoverIndex.set(index);
    }
  }

  /**
   * Returns formatted JSON string for display in popover
   */
  getFormattedJson(variable: PlanVariable): string {
    try {
      const parsed = JSON.parse(String(variable.value));
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(variable.value);
    }
  }

  closeJsonPopover(): void {
    this.openJsonPopoverIndex.set(null);
  }


  getValidationState(variable: PlanVariable): VariableValidationState | undefined {
    const states = this.validationStates();
    return states.find(s => s.name === variable.name);
  }

  hasInvalidVariables(): boolean {
    const states = this.validationStates();
    return states.some(s => s.status === 'invalid');
  }


  getInvalidVariables(): Array<{ name: string; messages: string[] }> {
    const states = this.validationStates();
    return states
      .filter(s => s.status === 'invalid')
      .map(s => ({ name: s.name, messages: s.messages }));
  }
}
