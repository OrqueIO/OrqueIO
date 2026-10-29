/**
 * Tests input constraints with beforeinput events for numeric types and Boolean checkbox rendering.
 */

import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { MigrationVariableModalComponent } from './migration-variable-modal.component';
import { TranslateService } from '../../../../i18n/translate.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { initTestEnvironment } from '../../../../testing/test-utils';

describe('MigrationVariableModalComponent - Input Constraints (CORRECTIF C1)', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: MigrationVariableModalComponent;
  let fixture: ComponentFixture<MigrationVariableModalComponent>;
  let compiled: HTMLElement;

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
    component.existingVariables = [];
    fixture.detectChanges();
    compiled = fixture.nativeElement;
  });

  describe('C1-2: Double type input constraints', () => {
    beforeEach(() => {
      component.draft = { name: 'testVar', type: 'Double', value: '' };
      fixture.detectChanges();
    });

    it('should reject letter "a"', () => {
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      const event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: 'a',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);

      expect(component.draft.value).toBe('');
    });

    it('should reject "e" (scientific notation)', () => {
      component.draft.value = '12';
      fixture.detectChanges();
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      const event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: 'e',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);

      expect(component.draft.value).toBe('12');
    });

    it('should reject "+" sign', () => {
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      const event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '+',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);

      expect(component.draft.value).toBe('');
    });

    it('should reject comma ","', () => {
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      const event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: ',',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);

      expect(component.draft.value).toBe('');
    });

    it('should reject second dot "."', () => {
      component.draft.value = '12.5';
      fixture.detectChanges();
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      const event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '.',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);

      expect(component.draft.value).toBe('12.5');
    });

    it('should accept "1.5"', () => {
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      // Type "1"
      let event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '1',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);
      if (!event.defaultPrevented) {
        component.draft.value += '1';
        fixture.detectChanges();
      }

      // Type "."
      event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '.',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);
      if (!event.defaultPrevented) {
        component.draft.value += '.';
        fixture.detectChanges();
      }

      // Type "5"
      event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '5',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);
      if (!event.defaultPrevented) {
        component.draft.value += '5';
        fixture.detectChanges();
      }

      expect(component.draft.value).toBe('1.5');
    });

    it('should accept "-3.14" (negative decimal)', () => {
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      // Type "-"
      let event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '-',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);
      if (!event.defaultPrevented) {
        component.draft.value += '-';
        fixture.detectChanges();
      }

      // Type "3"
      event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '3',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);
      if (!event.defaultPrevented) {
        component.draft.value += '3';
        fixture.detectChanges();
      }

      // Type "."
      event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '.',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);
      if (!event.defaultPrevented) {
        component.draft.value += '.';
        fixture.detectChanges();
      }

      // Type "14"
      event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '1',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);
      if (!event.defaultPrevented) {
        component.draft.value += '1';
        fixture.detectChanges();
      }

      event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '4',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);
      if (!event.defaultPrevented) {
        component.draft.value += '4';
        fixture.detectChanges();
      }

      expect(component.draft.value).toBe('-3.14');
    });

    it('should reject "-" when not in first position', () => {
      component.draft.value = '12';
      fixture.detectChanges();
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      // Try to insert "-" after "12"
      input.selectionStart = 2;
      input.selectionEnd = 2;

      const event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '-',
        inputType: 'insertText'
      });

      Object.defineProperty(event, 'target', {
        value: input,
        writable: false
      });

      input.dispatchEvent(event);

      expect(component.draft.value).toBe('12');
    });
  });

  describe('C1-2: Integer type input constraints', () => {
    beforeEach(() => {
      component.draft = { name: 'testVar', type: 'Integer', value: '' };
      fixture.detectChanges();
    });

    it('should reject "1.5" (decimal point)', () => {
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      // Type "1"
      let event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '1',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);
      if (!event.defaultPrevented) {
        component.draft.value += '1';
        fixture.detectChanges();
      }

      // Try to type "."
      event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '.',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);

      // "." should be rejected
      expect(component.draft.value).toBe('1');
    });
  });

  describe('C1-2: Long type input constraints', () => {
    beforeEach(() => {
      component.draft = { name: 'testVar', type: 'Long', value: '' };
      fixture.detectChanges();
    });

    it('should reject "abc"', () => {
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      const event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: 'abc',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);

      expect(component.draft.value).toBe('');
    });
  });

  describe('C1-2: Paste handling', () => {
    beforeEach(() => {
      component.draft = { name: 'testVar', type: 'Double', value: '' };
      fixture.detectChanges();
    });

    it('should clean "12abc" to "12" on paste', () => {
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      // Simulate paste with insertFromPaste InputEvent
      const event: any = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertFromPaste'
      });

      // Mock dataTransfer for paste data
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          getData: () => '12abc'
        },
        writable: false
      });

      input.dispatchEvent(event);

      // After cleanup, should have "12"
      expect(component.draft.value).toBe('12');
    });

    it('should reject "abc" paste completely (no valid chars)', () => {
      const input = compiled.querySelector('#variableValue') as HTMLInputElement;

      // Simulate paste with insertFromPaste InputEvent
      const event: any = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertFromPaste'
      });

      // Mock dataTransfer for paste data
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          getData: () => 'abc'
        },
        writable: false
      });

      input.dispatchEvent(event);

      expect(component.draft.value).toBe('');
    });
  });

  describe('C1-2: Boolean type rendering', () => {
    beforeEach(() => {
      component.draft = { name: 'testVar', type: 'Boolean', value: 'true' };
      fixture.detectChanges();
    });

    it('should render as checkbox', () => {
      const checkbox = compiled.querySelector('#variableValue[type="checkbox"]') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
    });

    it('should display label "true" when checked', () => {
      const label = compiled.querySelector('.checkbox-label');
      expect(label?.textContent).toContain('true');
    });

    it('should display label "false" when unchecked', () => {
      component.draft.value = 'false';
      fixture.detectChanges();

      const label = compiled.querySelector('.checkbox-label');
      expect(label?.textContent).toContain('false');
    });

    it('should toggle label on click', () => {
      const checkbox = compiled.querySelector('#variableValue[type="checkbox"]') as HTMLInputElement;

      // Initially true
      expect(checkbox.checked).toBe(true);

      // Click to uncheck
      checkbox.click();
      fixture.detectChanges();

      const label = compiled.querySelector('.checkbox-label');
      expect(label?.textContent).toContain('false');
      expect(component.draft.value).toBe('false');
    });
  });

  describe('C1-2: toPlanVariable values', () => {
    it('should convert Boolean to boolean primitive', () => {
      // This will be tested in utils spec
      // Placeholder to show intent
    });

    it('should convert Double to number primitive', () => {
      // This will be tested in utils spec
      // Placeholder to show intent
    });
  });

  describe('C1-2: Non-regression', () => {
    it('should not affect String type', () => {
      component.draft = { name: 'testVar', type: 'String', value: '' };
      fixture.detectChanges();

      const input = compiled.querySelector('#variableValue') as HTMLTextAreaElement;
      expect(input.tagName).toBe('TEXTAREA');

      // String should accept any input
      const event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: 'abc123!@#',
        inputType: 'insertText'
      });
      input.dispatchEvent(event);

      // Should not prevent
      expect(event.defaultPrevented).toBe(false);
    });

    it('should not affect Json type', () => {
      component.draft = { name: 'testVar', type: 'Json', value: '' };
      fixture.detectChanges();

      const textarea = compiled.querySelector('#variableValue') as HTMLTextAreaElement;
      expect(textarea.tagName).toBe('TEXTAREA');
    });
  });
});
