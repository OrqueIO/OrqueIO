import { Component, ChangeDetectionStrategy, output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
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
  readonly openErrorPopoverIndex = signal<number | null>(null);

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

  /**
   * Checks if value is a structured type (Json)
   */
  isStructuredType(type: string): boolean {
    return type === 'Json';
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


  toggleErrorPopover(index: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.openErrorPopoverIndex() === index) {
      this.openErrorPopoverIndex.set(null);
    } else {
      this.openErrorPopoverIndex.set(index);
    }
  }

  closeErrorPopover(): void {
    this.openErrorPopoverIndex.set(null);
  }

  onErrorPopoverKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeErrorPopover();
      const iconBtn = document.querySelector(`button[data-error-icon="${index}"]`) as HTMLButtonElement;
      if (iconBtn) {
        iconBtn.focus();
      }
    }
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
