import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from '@angular/core';
import { CorrelateMessageModalComponent } from './correlate-message-modal';

function make(): CorrelateMessageModalComponent {
  const inst = Object.create(CorrelateMessageModalComponent.prototype) as CorrelateMessageModalComponent;
  (inst as any).cdr = { markForCheck: vi.fn() };
  (inst as any).confirm = new EventEmitter<string | null>();
  (inst as any).cancel = new EventEmitter<void>();
  inst.inputValue = '';
  inst.showDropdown = false;
  inst.suggestions = [];
  return inst;
}

describe('CorrelateMessageModalComponent', () => {
  let component: CorrelateMessageModalComponent;

  beforeEach(() => {
    component = make();
  });

  it('initializes inputValue from messageName input', () => {
    component.messageName = 'TestMessage';
    expect(component.inputValue).toBe('TestMessage');
  });

  it('initializes empty when messageName is null', () => {
    component.messageName = null;
    expect(component.inputValue).toBe('');
  });

  it('emits null on confirm when input is empty', () => {
    const spy = vi.fn();
    component.confirm.subscribe(spy);
    component.inputValue = '';
    component.onConfirm();
    expect(spy).toHaveBeenCalledWith(null);
  });

  it('emits trimmed messageName on confirm', () => {
    const spy = vi.fn();
    component.confirm.subscribe(spy);
    component.inputValue = '  MyMessage  ';
    component.onConfirm();
    expect(spy).toHaveBeenCalledWith('MyMessage');
  });

  it('emits null on confirm when input is whitespace only', () => {
    const spy = vi.fn();
    component.confirm.subscribe(spy);
    component.inputValue = '   ';
    component.onConfirm();
    expect(spy).toHaveBeenCalledWith(null);
  });

  it('emits on cancel', () => {
    const spy = vi.fn();
    component.cancel.subscribe(spy);
    component.onCancel();
    expect(spy).toHaveBeenCalled();
  });

  it('filteredSuggestions returns all when inputValue is empty', () => {
    component.suggestions = ['A', 'B', 'C'];
    component.inputValue = '';
    expect(component.filteredSuggestions).toEqual(['A', 'B', 'C']);
  });

  it('filteredSuggestions filters by inputValue (case-insensitive)', () => {
    component.suggestions = ['OrderMsg', 'PaymentMsg', 'CancelMsg'];
    component.inputValue = 'ord';
    expect(component.filteredSuggestions).toEqual(['OrderMsg']);
  });

  it('filteredSuggestions returns all when inputValue is whitespace only', () => {
    component.suggestions = ['A', 'B'];
    component.inputValue = '   ';
    expect(component.filteredSuggestions).toEqual(['A', 'B']);
  });

  it('selectSuggestion sets inputValue and hides dropdown', () => {
    component.showDropdown = true;
    component.selectSuggestion('MyMsg');
    expect(component.inputValue).toBe('MyMsg');
    expect(component.showDropdown).toBe(false);
  });

  it('onBackdropClick calls cancel when clicking backdrop', () => {
    const spy = vi.fn();
    component.cancel.subscribe(spy);
    const fakeTarget = document.createElement('div');
    fakeTarget.classList.add('modal-backdrop');
    component.onBackdropClick({ target: fakeTarget } as unknown as MouseEvent);
    expect(spy).toHaveBeenCalled();
  });

  it('onBackdropClick does not cancel when clicking inside modal', () => {
    const spy = vi.fn();
    component.cancel.subscribe(spy);
    const fakeTarget = document.createElement('div');
    fakeTarget.classList.add('modal-container');
    component.onBackdropClick({ target: fakeTarget } as unknown as MouseEvent);
    expect(spy).not.toHaveBeenCalled();
  });
});
