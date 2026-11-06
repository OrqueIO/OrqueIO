import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { BatchWizardStepperComponent } from './batch-wizard-stepper';
import { TranslateService } from '../../../../i18n/translate.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('BatchWizardStepperComponent - CSS Classes', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: BatchWizardStepperComponent;
  let fixture: ComponentFixture<BatchWizardStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchWizardStepperComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TranslateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchWizardStepperComponent);
    component = fixture.componentInstance;
    component.steps = [
      { number: 1, labelKey: 'step1' },
      { number: 2, labelKey: 'step2' },
      { number: 3, labelKey: 'step3' }
    ];
    component.currentStep = 2;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply step--done class to completed steps', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const steps = compiled.querySelectorAll('.step');

    expect(steps.length).toBe(3);
    expect(steps[0].classList.contains('step--done')).toBe(true);
    expect(steps[1].classList.contains('step--active')).toBe(true);
    expect(steps[2].classList.contains('step--done')).toBe(false);
    expect(steps[2].classList.contains('step--active')).toBe(false);
  });

  it('should apply step--active class only to current step', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const steps = compiled.querySelectorAll('.step');

    expect(steps[0].classList.contains('step--active')).toBe(false);
    expect(steps[1].classList.contains('step--active')).toBe(true);
    expect(steps[2].classList.contains('step--active')).toBe(false);
  });

  it('should not apply step--done or step--active to future steps', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const steps = compiled.querySelectorAll('.step');

    expect(steps[2].classList.contains('step--done')).toBe(false);
    expect(steps[2].classList.contains('step--active')).toBe(false);
  });

  it('should show checkmark icon for completed steps', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const completedStepCircle = compiled.querySelector('.step--done .step__circle');

    expect(completedStepCircle).toBeTruthy();
    const icon = completedStepCircle?.querySelector('fa-icon');
    expect(icon).toBeTruthy();
  });

  it('should show number for active step', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const activeStepCircle = compiled.querySelector('.step--active .step__circle');

    expect(activeStepCircle).toBeTruthy();
    expect(activeStepCircle?.textContent?.trim()).toBe('2');
  });

  it('should show number for future steps', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const steps = compiled.querySelectorAll('.step');
    const futureStepCircle = steps[2].querySelector('.step__circle');

    expect(futureStepCircle).toBeTruthy();
    expect(futureStepCircle?.textContent?.trim()).toBe('3');
  });

  it('should apply step-connector--done class to connectors before current step', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const connectors = compiled.querySelectorAll('.step-connector');

    expect(connectors.length).toBe(2);
    expect(connectors[0].classList.contains('step-connector--done')).toBe(true);
    expect(connectors[1].classList.contains('step-connector--done')).toBe(false);
  });
});