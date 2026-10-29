import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { MigrationVariableModalComponent } from './migration-variable-modal.component';
import { TranslateService } from '../../../../i18n/translate.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { initTestEnvironment } from '../../../../testing/test-utils';
import { PlanVariable } from './migration-variables.utils';

describe('MigrationVariableModalComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: MigrationVariableModalComponent;
  let fixture: ComponentFixture<MigrationVariableModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MigrationVariableModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TranslateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MigrationVariableModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty draft in add mode', () => {
    component.editingVariable = null;
    component.ngOnInit();

    expect(component.draft).toEqual({
      name: '',
      type: 'String',
      value: ''
    });
  });

  it('should pre-fill draft when editing existing variable', () => {
    const existing: PlanVariable = { name: 'myVar', type: 'Integer', value: 42 };
    component.editingVariable = existing;
    component.ngOnInit();

    expect(component.draft).toEqual({
      name: 'myVar',
      type: 'Integer',
      value: '42'
    });
  });

  it('should display all 8 variable types in select', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const options = compiled.querySelectorAll('#variableType option');

    expect(options.length).toBe(8);
    expect(options[0].textContent).toBe('String');
    expect(options[1].textContent).toBe('Integer');
    expect(options[2].textContent).toBe('Long');
    expect(options[3].textContent).toBe('Short');
    expect(options[4].textContent).toBe('Double');
    expect(options[5].textContent).toBe('Boolean');
    expect(options[6].textContent).toBe('Date');
    expect(options[7].textContent).toBe('Json');
  });

  it('should emit save event with valid variable', () => {
    component.draft = { name: 'myVar', type: 'String', value: 'hello' };
    component.existingVariables = [];

    let emittedVariable: PlanVariable | null = null;
    component.save.subscribe((planVariable: PlanVariable) => {
      emittedVariable = planVariable;
    });

    component.onSave();

    expect(emittedVariable).toEqual({
      name: 'myVar',
      type: 'String',
      value: 'hello'
    });
  });

  it('should not emit save when validation fails', () => {
    component.draft = { name: '', type: 'String', value: 'hello' };
    component.existingVariables = [];

    let emitted = false;
    component.save.subscribe(() => {
      emitted = true;
    });

    component.onSave();

    expect(emitted).toBe(false);
    expect(component.fieldErrors).toEqual({ name: 'migration.variables.errorNameRequired' });
  });

  it('should detect duplicate name and show error', () => {
    component.draft = { name: 'existingVar', type: 'String', value: 'hello' };
    component.existingVariables = [
      { name: 'existingVar', type: 'String', value: 'test' }
    ];
    component.editingVariable = null;

    component.onSave();

    expect(component.fieldErrors).toEqual({ name: 'migration.variables.errorNameDuplicate' });
  });

  it('should allow saving with same name when editing', () => {
    const existing: PlanVariable = { name: 'myVar', type: 'String', value: 'oldValue' };
    component.draft = { name: 'myVar', type: 'String', value: 'newValue' };
    component.existingVariables = [existing];
    component.editingVariable = existing;

    let emittedVariable: PlanVariable | null = null;
    component.save.subscribe((planVariable: PlanVariable) => {
      emittedVariable = planVariable;
    });

    component.onSave();

    expect(emittedVariable?.name).toBe('myVar');
    expect(emittedVariable?.value).toBe('newValue');
  });

  it('should emit closeModal when Close button is clicked', () => {
    let emitted = false;
    component.closeModal.subscribe(() => {
      emitted = true;
    });

    component.onClose();

    expect(emitted).toBe(true);
  });

  it('should emit closeModal when backdrop is clicked', () => {
    let emitted = false;
    component.closeModal.subscribe(() => {
      emitted = true;
    });

    const mockEvent = {
      target: { classList: { contains: (cls: string) => cls === 'modal-backdrop' } }
    } as any;

    component.onOverlayClick(mockEvent);

    expect(emitted).toBe(true);
  });

  it('should not close when clicking inside modal dialog', () => {
    let closed = false;
    component.closeModal.subscribe(() => {
      closed = true;
    });

    const mockEvent = {
      target: { classList: { contains: (cls: string) => cls === 'modal-dialog' } }
    } as any;

    component.onOverlayClick(mockEvent);
    expect(closed).toBe(false);
  });

  it('should emit closeModal on Escape key', () => {
    let emitted = false;
    component.closeModal.subscribe(() => {
      emitted = true;
    });

    component.onEscape();

    expect(emitted).toBe(true);
  });

  it('should show "Add Variable to Migration Plan" title in add mode', () => {
    component.editingVariable = null;
    fixture.detectChanges();

    expect(component.modalTitle).toBe('migration.variables.addVariableTitle');
  });

  it('should show "Edit Variable" title in edit mode', () => {
    component.editingVariable = { name: 'myVar', type: 'String', value: 'test' };
    fixture.detectChanges();

    expect(component.modalTitle).toBe('migration.variables.editVariableTitle');
  });

  it('should show "Add" button label in add mode', () => {
    component.editingVariable = null;
    expect(component.saveButtonLabel).toBe('migration.variables.add');
  });

  it('should show "Save" button label in edit mode', () => {
    component.editingVariable = { name: 'myVar', type: 'String', value: 'test' };
    expect(component.saveButtonLabel).toBe('migration.variables.save');
  });

  it('should validate Integer value', () => {
    component.draft = { name: 'count', type: 'Integer', value: 'not-a-number' };
    component.existingVariables = [];

    component.onSave();

    expect(component.fieldErrors).toEqual({ value: 'migration.variables.errorIntegerInvalid' });
  });

  it('should validate Boolean value', () => {
    component.draft = { name: 'flag', type: 'Boolean', value: 'maybe' };
    component.existingVariables = [];

    component.onSave();

    expect(component.fieldErrors).toEqual({ value: 'migration.variables.errorBooleanInvalid' });
  });

  it('should validate JSON for Json type', () => {
    component.draft = { name: 'data', type: 'Json', value: '{"valid": "json"}' };
    component.existingVariables = [];

    let emittedVariable: PlanVariable | null = null;
    component.save.subscribe((planVariable: PlanVariable) => {
      emittedVariable = planVariable;
    });

    component.onSave();

    // Should succeed with valid JSON
    expect(component.fieldErrors).toBeNull();
    expect(emittedVariable).toBeTruthy();
    expect(emittedVariable?.type).toBe('Json');
    expect(emittedVariable?.value).toBe('{"valid": "json"}');
  });

  it('should show error message for invalid name', () => {
    component.draft = { name: '', type: 'String', value: 'hello' };
    component.onSave();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errorMsg = compiled.querySelector('#variableName-error');
    expect(errorMsg).toBeTruthy();
    expect(errorMsg?.textContent).toContain('migration.variables.errorNameRequired');
  });

  it('should show error message for invalid value', () => {
    component.draft = { name: 'count', type: 'Integer', value: 'abc' };
    component.onSave();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errorMsg = compiled.querySelector('#variableValue-error');
    expect(errorMsg).toBeTruthy();
    expect(errorMsg?.textContent).toContain('migration.variables.errorIntegerInvalid');
  });

  it('should apply is-invalid class to input when validation fails', () => {
    component.draft = { name: '', type: 'String', value: 'hello' };
    component.onSave();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const nameInput = compiled.querySelector('#variableName') as HTMLInputElement;
    expect(nameInput.classList.contains('is-invalid')).toBe(true);
  });

  it('should set aria-invalid attribute on invalid field', () => {
    component.draft = { name: '', type: 'String', value: 'hello' };
    component.onSave();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const nameInput = compiled.querySelector('#variableName') as HTMLInputElement;
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
  });

  it('should set aria-describedby on invalid field', () => {
    component.draft = { name: '', type: 'String', value: 'hello' };
    component.onSave();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const nameInput = compiled.querySelector('#variableName') as HTMLInputElement;
    expect(nameInput.getAttribute('aria-describedby')).toBe('variableName-error');
  });

  it('should clear value error when type changes', () => {
    component.fieldErrors = { value: 'migration.variables.errorIntegerInvalid' };
    component.onTypeChange('String');
    fixture.detectChanges();

    expect(component.fieldErrors).toBeNull();
  });

  it('should convert Integer value to number when saving', () => {
    component.draft = { name: 'count', type: 'Integer', value: '42' };
    component.existingVariables = [];

    let emittedVariable: PlanVariable | null = null;
    component.save.subscribe((planVariable: PlanVariable) => {
      emittedVariable = planVariable;
    });

    component.onSave();

    expect(emittedVariable?.value).toBe(42);
    expect(typeof emittedVariable?.value).toBe('number');
  });

  it('should convert Boolean "true" to boolean when saving', () => {
    component.draft = { name: 'flag', type: 'Boolean', value: 'true' };
    component.existingVariables = [];

    let emittedVariable: PlanVariable | null = null;
    component.save.subscribe((planVariable: PlanVariable) => {
      emittedVariable = planVariable;
    });

    component.onSave();

    expect(emittedVariable?.value).toBe(true);
    expect(typeof emittedVariable?.value).toBe('boolean');
  });

  it('should convert Boolean "false" to boolean when saving', () => {
    component.draft = { name: 'flag', type: 'Boolean', value: 'false' };
    component.existingVariables = [];

    let emittedVariable: PlanVariable | null = null;
    component.save.subscribe((planVariable: PlanVariable) => {
      emittedVariable = planVariable;
    });

    component.onSave();

    expect(emittedVariable?.value).toBe(false);
    expect(typeof emittedVariable?.value).toBe('boolean');
  });
});
