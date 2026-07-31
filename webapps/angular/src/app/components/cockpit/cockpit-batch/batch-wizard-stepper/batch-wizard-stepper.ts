import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

export interface WizardStep {
  number: number;
  labelKey: string;
}

@Component({
  selector: 'app-batch-wizard-stepper',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './batch-wizard-stepper.html',
  styleUrl: './batch-wizard-stepper.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchWizardStepperComponent {
  @Input() steps: WizardStep[] = [];
  @Input() currentStep = 1;

  faCheck = faCheck;
}
