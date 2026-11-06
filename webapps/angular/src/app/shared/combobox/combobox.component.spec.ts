import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComboboxComponent } from './combobox.component';
import { initTestEnvironment } from '../../testing/test-utils';

describe('ComboboxComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: ComboboxComponent;
  let fixture: ComponentFixture<ComboboxComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComboboxComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ComboboxComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
  });

  it('should display all 3 options in correct order when opened', () => {
    const options = ['application/json', 'application/xml', 'application/x-java-serialized-object'];
    component.options = options;
    component.value = '';
    component.ngOnInit();
    fixture.detectChanges();

    component.onInputFocus();
    fixture.detectChanges();

    const listItems = compiled.querySelectorAll('.combobox-option');
    expect(listItems.length).toBe(3);
    expect(listItems[0].textContent?.trim()).toBe('application/json');
    expect(listItems[1].textContent?.trim()).toBe('application/xml');
    expect(listItems[2].textContent?.trim()).toBe('application/x-java-serialized-object');
  });

  it('should update value when option is clicked', () => {
    const options = ['application/json', 'application/xml', 'application/x-java-serialized-object'];
    component.options = options;
    component.value = '';
    component.ngOnInit();
    fixture.detectChanges();

    let emittedValue: string | undefined;
    component.valueChange.subscribe(v => { emittedValue = v; });

    component.onInputFocus();
    fixture.detectChanges();

    component.onOptionClick('application/xml');
    fixture.detectChanges();

    expect(component.value).toBe('application/xml');
    expect(emittedValue).toBe('application/xml');
  });

  it('should navigate options with ArrowDown, ArrowUp, and select with Enter', () => {
    const options = ['application/json', 'application/xml', 'application/x-java-serialized-object'];
    component.options = options;
    component.value = '';
    component.ngOnInit();
    fixture.detectChanges();

    const input = compiled.querySelector('.combobox-input') as HTMLInputElement;
    let emittedValue: string | undefined;
    component.valueChange.subscribe(v => { emittedValue = v; });

    const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onKeyDown(arrowDownEvent);
    fixture.detectChanges();

    expect(component.isOpen).toBe(true);
    expect(component.activeIndex).toBe(0);

    component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(component.activeIndex).toBe(1);

    component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(component.activeIndex).toBe(0);

    component.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(component.value).toBe('application/json');
    expect(emittedValue).toBe('application/json');
  });

  it('should have correct ARIA attributes', () => {
    const options = ['application/json', 'application/xml', 'application/x-java-serialized-object'];
    component.options = options;
    component.value = 'application/xml';
    component.inputId = 'test-combobox';
    component.ngOnInit();
    fixture.detectChanges();

    const input = compiled.querySelector('.combobox-input') as HTMLInputElement;

    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('none');

    expect(input.getAttribute('aria-expanded')).toBe('false');

    component.onInputFocus();
    fixture.detectChanges();

    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe('test-combobox-listbox');

    expect(component.activeIndex).toBe(1);
    expect(input.getAttribute('aria-activedescendant')).toBe('test-combobox-option-1');

    const listbox = compiled.querySelector('.combobox-listbox') as HTMLElement;
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(listbox.getAttribute('id')).toBe('test-combobox-listbox');

    const listItems = compiled.querySelectorAll('.combobox-option');
    expect(listItems[0].getAttribute('role')).toBe('option');
    expect(listItems[1].getAttribute('role')).toBe('option');
    expect(listItems[2].getAttribute('role')).toBe('option');

    expect(listItems[1].getAttribute('aria-selected')).toBe('true');
    expect(listItems[0].getAttribute('aria-selected')).toBe('false');
    expect(listItems[2].getAttribute('aria-selected')).toBe('false');
  });

  it('should close listbox on Escape without propagating event', () => {
    const options = ['application/json'];
    component.options = options;
    component.ngOnInit();
    fixture.detectChanges();

    component.isOpen = true;
    fixture.detectChanges();

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    const stopPropSpy = vi.spyOn(escapeEvent, 'stopPropagation');

    component.onKeyDown(escapeEvent);
    fixture.detectChanges();

    expect(component.isOpen).toBe(false);
    expect(stopPropSpy).toHaveBeenCalled();
  });

  it('should allow free text input', () => {
    const options = ['application/json', 'application/xml', 'application/x-java-serialized-object'];
    component.options = options;
    component.value = '';
    component.ngOnInit();
    fixture.detectChanges();

    let emittedValue: string | undefined;
    component.valueChange.subscribe(v => { emittedValue = v; });

    component.value = 'application/protobuf';
    component.onInputChange('application/protobuf');
    fixture.detectChanges();

    expect(component.value).toBe('application/protobuf');
    expect(emittedValue).toBe('application/protobuf');
  });
});
