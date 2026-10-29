import { Component, ChangeDetectionStrategy, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

/**
 * Step 2: Set Variables
 * Allows users to add variables that will be set into process instances' scope during migration.
 */
@Component({
  selector: 'app-migration-variables-step',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe
  ],
  templateUrl: './migration-variables-step.component.html',
  styleUrl: './migration-variables-step.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationVariablesStepComponent {
  readonly back = output<void>();
  readonly next = output<void>();
  readonly addVariable = output<void>();
  readonly canProceed = input(true);
}
