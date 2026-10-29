import { Component, ChangeDetectionStrategy, output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';
import { PlanVariable, displayValue } from './migration-variables.utils';

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
  readonly editVariable = output<number>(); // emits index
  readonly deleteVariable = output<number>(); // emits index
  readonly canProceed = input(true);
  readonly variables = input<PlanVariable[]>([]);

  // Icons
  readonly faPencilAlt = faPencilAlt;
  readonly faTrash = faTrash;

  // Popover state: tracks which variable index has open popover (null if none)
  readonly openPopoverIndex = signal<number | null>(null);

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
    if (this.openPopoverIndex() === index) {
      this.openPopoverIndex.set(null);
    } else {
      this.openPopoverIndex.set(index);
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

  /**
   * Closes the popover
   */
  closePopover(): void {
    this.openPopoverIndex.set(null);
  }
}
