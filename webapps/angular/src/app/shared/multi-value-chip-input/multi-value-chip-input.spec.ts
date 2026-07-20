import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MultiValueChipInputComponent } from './multi-value-chip-input';
import { initTestEnvironment } from '../../testing/test-utils';

describe('MultiValueChipInputComponent', () => {
  let component: MultiValueChipInputComponent;
  let fixture: ComponentFixture<MultiValueChipInputComponent>;

  beforeAll(() => { initTestEnvironment(); });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiValueChipInputComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MultiValueChipInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── 1. Enter key adds chip and clears input ──────────────────────────────

  it('should add a chip on Enter and clear the input', () => {
    component.currentInput = 'abc';
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const spy = vi.spyOn(event, 'preventDefault');
    component.onKeydown(event);
    expect(spy).toHaveBeenCalled();
    expect(component.values).toEqual(['abc']);
    expect(component.currentInput).toBe('');
  });

  it('should not add an empty value on Enter — emits emptyEnter instead', () => {
    let count = 0;
    component.emptyEnter.subscribe(() => count++);
    component.currentInput = '   ';
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.values).toEqual([]);
    expect(count).toBe(1);
  });

  // ── emptyEnter output ─────────────────────────────────────────────────────

  it('should emit emptyEnter when Enter is pressed on empty input', () => {
    let count = 0;
    component.emptyEnter.subscribe(() => count++);
    component.currentInput = '';
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(count).toBe(1);
    expect(component.values).toEqual([]);
  });

  it('should emit emptyEnter after adding a chip via Enter (so a single press confirms)', () => {
    let count = 0;
    component.emptyEnter.subscribe(() => count++);
    component.currentInput = 'abc';
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.values).toEqual(['abc']);
    expect(count).toBe(1);
  });

  // ── 2. Comma key adds chip, comma does not appear in chip or input ───────

  it('should add a chip on comma and clear the input without a trailing comma', () => {
    component.currentInput = 'val1';
    const event = new KeyboardEvent('keydown', { key: ',' });
    const spy = vi.spyOn(event, 'preventDefault');
    component.onKeydown(event);
    expect(spy).toHaveBeenCalled();
    expect(component.values).toEqual(['val1']);
    expect(component.currentInput).toBe('');
  });

  // ── 3. Blur adds pending input without requiring Enter ───────────────────

  it('should add a chip on blur even without pressing Enter', () => {
    component.currentInput = 'blur-val';
    component.onBlur();
    expect(component.values).toEqual(['blur-val']);
    expect(component.currentInput).toBe('');
  });

  it('should do nothing on blur when input is empty', () => {
    component.currentInput = '';
    component.onBlur();
    expect(component.values).toEqual([]);
  });

  // ── 4. Paste splits on comma and newline ─────────────────────────────────

  it('should split pasted comma-separated text into distinct chips', () => {
    const pasteEvent = {
      preventDefault: vi.fn(),
      clipboardData: { getData: vi.fn().mockReturnValue('a, b, c') }
    } as any as ClipboardEvent;
    component.onPaste(pasteEvent);
    expect(component.values).toEqual(['a', 'b', 'c']);
    expect(component.currentInput).toBe('');
  });

  it('should split pasted newline-separated text into distinct chips', () => {
    const pasteEvent = {
      preventDefault: vi.fn(),
      clipboardData: { getData: vi.fn().mockReturnValue('x\ny\nz') }
    } as any as ClipboardEvent;
    component.onPaste(pasteEvent);
    expect(component.values).toEqual(['x', 'y', 'z']);
  });

  it('should filter out blank parts from pasted text', () => {
    const pasteEvent = {
      preventDefault: vi.fn(),
      clipboardData: { getData: vi.fn().mockReturnValue('v1,,v2,  ') }
    } as any as ClipboardEvent;
    component.onPaste(pasteEvent);
    expect(component.values).toEqual(['v1', 'v2']);
  });

  // ── 5. Deduplication on paste ─────────────────────────────────────────────

  it('should not add a duplicate when pasting a value already in values', () => {
    component.values = ['existing'];
    const pasteEvent = {
      preventDefault: vi.fn(),
      clipboardData: { getData: vi.fn().mockReturnValue('existing, new') }
    } as any as ClipboardEvent;
    component.onPaste(pasteEvent);
    expect(component.values).toEqual(['existing', 'new']);
    expect(component.values.filter(v => v === 'existing').length).toBe(1);
  });

  // ── 6. Remove chip ────────────────────────────────────────────────────────

  it('should remove only the targeted chip and keep the others', () => {
    component.values = ['a', 'b', 'c'];
    component.removeValue(1);
    expect(component.values).toEqual(['a', 'c']);
  });

  it('should remove the first chip correctly', () => {
    component.values = ['first', 'second'];
    component.removeValue(0);
    expect(component.values).toEqual(['second']);
  });

  // ── Deduplication on Enter ─────────────────────────────────────────────

  it('should not add a duplicate value via Enter', () => {
    component.values = ['dup'];
    component.currentInput = 'dup';
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.values).toEqual(['dup']);
  });

  it('should not add a duplicate value via blur', () => {
    component.values = ['dup'];
    component.currentInput = 'dup';
    component.onBlur();
    expect(component.values).toEqual(['dup']);
  });

  // ── valuesChange emission ──────────────────────────────────────────────

  it('should emit valuesChange after adding a value via Enter', () => {
    const emitted: string[][] = [];
    component.valuesChange.subscribe(v => emitted.push(v));
    component.currentInput = 'x';
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(['x']);
  });

  it('should emit valuesChange after adding a value via blur', () => {
    const emitted: string[][] = [];
    component.valuesChange.subscribe(v => emitted.push(v));
    component.currentInput = 'y';
    component.onBlur();
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(['y']);
  });

  it('should emit valuesChange after removing a chip', () => {
    component.values = ['a', 'b'];
    const emitted: string[][] = [];
    component.valuesChange.subscribe(v => emitted.push(v));
    component.removeValue(0);
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(['b']);
  });

  it('should NOT emit valuesChange when blur fires on an empty input', () => {
    const emitted: string[][] = [];
    component.valuesChange.subscribe(v => emitted.push(v));
    component.currentInput = '';
    component.onBlur();
    expect(emitted.length).toBe(0);
  });

  // ── Multiple values accumulation ─────────────────────────────────────────

  it('should accumulate 3 values via onKeydown Enter and clear input after each', () => {
    component.currentInput = '100';
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.values).toEqual(['100']);
    expect(component.currentInput).toBe('');

    component.currentInput = '200';
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.values).toEqual(['100', '200']);

    component.currentInput = '300';
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.values).toEqual(['100', '200', '300']);
    expect(component.currentInput).toBe('');
  });
});
