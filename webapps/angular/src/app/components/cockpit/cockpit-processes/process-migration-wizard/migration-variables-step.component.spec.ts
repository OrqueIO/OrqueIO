import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { MigrationVariablesStepComponent } from './migration-variables-step.component';
import { TranslateService } from '../../../../i18n/translate.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { initTestEnvironment } from '../../../../testing/test-utils';
import { signal } from '@angular/core';

describe('MigrationVariablesStepComponent - Screen 1: Empty State', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: MigrationVariablesStepComponent;
  let fixture: ComponentFixture<MigrationVariablesStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MigrationVariablesStepComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TranslateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MigrationVariablesStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display description text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const description = compiled.querySelector('.info-text');
    expect(description).toBeTruthy();
    expect(description?.textContent?.trim()).toBe('migration.variablesDescription');
  });

  it('should display Add Variable button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button.btn-primary');
    expect(button).toBeTruthy();
    expect(button?.textContent?.trim()).toBe('+ migration.addVariable');
  });

  it('should emit addVariable event when Add Variable button is clicked', () => {
    let emitted = false;
    component.addVariable.subscribe(() => { emitted = true; });

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button.btn-primary') as HTMLButtonElement;
    button?.click();

    expect(emitted).toBe(true);
  });

  it('should display Back button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const backButton = compiled.querySelector('.footer-left button.btn-secondary');
    expect(backButton).toBeTruthy();
    expect(backButton?.textContent?.trim()).toBe('← migration.back');
  });

  it('should emit back event when Back button is clicked', () => {
    let emitted = false;
    component.back.subscribe(() => { emitted = true; });

    const compiled = fixture.nativeElement as HTMLElement;
    const backButton = compiled.querySelector('.footer-left button.btn-secondary') as HTMLButtonElement;
    backButton?.click();

    expect(emitted).toBe(true);
  });

  it('should display Select Instances button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nextButton = compiled.querySelector('.footer-right button.btn-primary');
    expect(nextButton).toBeTruthy();
    expect(nextButton?.textContent?.trim()).toBe('migration.selectInstances →');
  });

  it('should emit next event when Select Instances button is clicked', () => {
    let emitted = false;
    component.next.subscribe(() => { emitted = true; });

    const compiled = fixture.nativeElement as HTMLElement;
    const nextButton = compiled.querySelector('.footer-right button.btn-primary') as HTMLButtonElement;
    nextButton?.click();

    expect(emitted).toBe(true);
  });

  it('should have Select Instances button enabled by default (zero variables = valid state)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nextButton = compiled.querySelector('.footer-right button.btn-primary') as HTMLButtonElement;
    expect(nextButton?.disabled).toBe(false);
  });

  it('should disable Select Instances button when canProceed is false', () => {
    fixture.componentRef.setInput('canProceed', false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const nextButton = compiled.querySelector('.footer-right button.btn-primary') as HTMLButtonElement;
    expect(nextButton?.disabled).toBe(true);
  });

  it('should have proper aria-label on Add Variable button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button.btn-primary') as HTMLButtonElement;
    expect(button?.getAttribute('aria-label')).toBe('migration.addVariable');
  });

  it('should have proper aria-label on Back button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const backButton = compiled.querySelector('.footer-left button.btn-secondary') as HTMLButtonElement;
    expect(backButton?.getAttribute('aria-label')).toBe('migration.backButton');
  });

  it('should have proper aria-label on Select Instances button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nextButton = compiled.querySelector('.footer-right button.btn-primary') as HTMLButtonElement;
    expect(nextButton?.getAttribute('aria-label')).toBe('migration.selectInstancesButton');
  });
});