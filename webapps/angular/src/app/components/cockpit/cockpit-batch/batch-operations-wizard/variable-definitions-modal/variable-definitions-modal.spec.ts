import { VariableDefinitionsModalComponent, VariableDef } from './variable-definitions-modal';
import { getVariableInputType } from '../../../../../utils/variable-type.util';

function make(rows: VariableDef[]): VariableDefinitionsModalComponent {
  const inst = Object.create(VariableDefinitionsModalComponent.prototype) as VariableDefinitionsModalComponent;
  (inst as any).rows = rows;
  (inst as any).cdr = { markForCheck: () => {} };
  return inst;
}

function row(name: string, type: string, value: any): VariableDef {
  return { name, type, value };
}

describe('getVariableInputType (shared util)', () => {
  it('maps Integer, Long, Short to "number"', () => {
    expect(getVariableInputType('Integer')).toBe('number');
    expect(getVariableInputType('Long')).toBe('number');
    expect(getVariableInputType('Short')).toBe('number');
  });

  it('maps Double to "number"', () => {
    expect(getVariableInputType('Double')).toBe('number');
  });

  it('maps Boolean to "checkbox"', () => {
    expect(getVariableInputType('Boolean')).toBe('checkbox');
  });

  it('maps Date to "date"', () => {
    expect(getVariableInputType('Date')).toBe('date');
  });

  it('maps String and unknown types to "text"', () => {
    expect(getVariableInputType('String')).toBe('text');
    expect(getVariableInputType('Unknown')).toBe('text');
  });

  it('is case-insensitive', () => {
    expect(getVariableInputType('integer')).toBe('number');
    expect(getVariableInputType('BOOLEAN')).toBe('checkbox');
  });
});

describe('VariableDefinitionsModalComponent', () => {

  describe('getInputType', () => {
    it('returns "checkbox" for Boolean — triggers checkbox in template, not a text/select field', () => {
      expect(make([]).getInputType('Boolean')).toBe('checkbox');
    });

    it('returns "number" for Integer, Long, Short, Double', () => {
      const inst = make([]);
      expect(inst.getInputType('Integer')).toBe('number');
      expect(inst.getInputType('Long')).toBe('number');
      expect(inst.getInputType('Short')).toBe('number');
      expect(inst.getInputType('Double')).toBe('number');
    });

    it('returns "date" for Date', () => {
      expect(make([]).getInputType('Date')).toBe('date');
    });

    it('returns "text" for String', () => {
      expect(make([]).getInputType('String')).toBe('text');
    });
  });

  describe('Boolean type — checkbox (same as StartProcessModalComponent)', () => {
    it('getInputType returns "checkbox" — template renders checkbox + label, not a text input', () => {
      expect(make([]).getInputType('Boolean')).toBe('checkbox');
    });

    it('checkbox value is a real boolean when toggled via [(ngModel)] — no string coercion needed', () => {
      const inst = make([row('active', 'Boolean', true)]);
      expect(inst.rows[0].value).toBe(true);
      expect(inst.rows[0].value ? 'true' : 'false').toBe('true');
    });

    it('unchecked state: value is false, label reads "false"', () => {
      const inst = make([row('active', 'Boolean', false)]);
      expect(inst.rows[0].value ? 'true' : 'false').toBe('false');
    });

    it('initial rows start with value "" — checkbox shows unchecked (falsy)', () => {
      const inst = make([row('active', 'Boolean', '')]);
      expect(!!inst.rows[0].value).toBe(false);
    });
  });

  describe('variable name format', () => {
    it('does not block names with hyphens', () => {
      expect(make([row('my-var', 'String', 'val')]).canApply).toBe(true);
    });

    it('does not block names with spaces', () => {
      expect(make([row('my var', 'String', 'val')]).canApply).toBe(true);
    });

    it('does not block names with mixed special characters', () => {
      expect(make([row('var.name_1-x', 'String', '')]).canApply).toBe(true);
    });
  });

  describe('canApply', () => {
    it('is false when all rows have an empty name', () => {
      expect(make([row('', 'String', 'val')]).canApply).toBe(false);
    });

    it('is true when at least one row has a non-empty name', () => {
      expect(make([row('x', 'String', '')]).canApply).toBe(true);
    });

    it('is false when a named Integer row has an invalid value', () => {
      expect(make([row('x', 'Integer', 'not-a-number')]).canApply).toBe(false);
      expect(make([row('x', 'Integer', '5e3')]).canApply).toBe(false);
    });

    it('is true for Double/Date/String regardless of value — browser native handling only', () => {
      expect(make([row('x', 'Double', '')]).canApply).toBe(true);
      expect(make([row('x', 'Date', '')]).canApply).toBe(true);
      expect(make([row('x', 'String', '')]).canApply).toBe(true);
    });

    it('is true with a mix of named and unnamed rows', () => {
      expect(make([
        row('x', 'String', 'ok'),
        row('', 'Integer', ''),
      ]).canApply).toBe(true);
    });
  });

  describe('integer type validation', () => {
    describe('scientific notation rejection', () => {
      it('rejects "5e3" for Integer — scientific notation is not a valid integer input', () => {
        const inst = make([row('x', 'Integer', '5e3')]);
        expect(inst.isValueValid(inst.rows[0])).toBe(false);
        expect(inst.getValueError(inst.rows[0])).toBe('cockpit.batchOps.setVariables.errorInvalidInteger');
      });

      it('rejects "5e3" for Long', () => {
        const inst = make([row('x', 'Long', '5e3')]);
        expect(inst.isValueValid(inst.rows[0])).toBe(false);
        expect(inst.getValueError(inst.rows[0])).toBe('cockpit.batchOps.setVariables.errorInvalidInteger');
      });

      it('rejects "5e3" for Short', () => {
        const inst = make([row('x', 'Short', '5e3')]);
        expect(inst.isValueValid(inst.rows[0])).toBe(false);
        expect(inst.getValueError(inst.rows[0])).toBe('cockpit.batchOps.setVariables.errorInvalidInteger');
      });
    });

    describe('valid negative integers', () => {
      it('accepts "-5" for Integer — leading minus is correct', () => {
        expect(make([]).isValueValid(row('x', 'Integer', '-5'))).toBe(true);
      });

      it('accepts "-5" for Long', () => {
        expect(make([]).isValueValid(row('x', 'Long', '-5'))).toBe(true);
      });

      it('accepts "-5" for Short', () => {
        expect(make([]).isValueValid(row('x', 'Short', '-5'))).toBe(true);
      });
    });

    describe('invalid minus placement', () => {
      it('rejects "5-3" — minus not in first position', () => {
        const inst = make([row('x', 'Integer', '5-3')]);
        expect(inst.isValueValid(inst.rows[0])).toBe(false);
        expect(inst.getValueError(inst.rows[0])).toBe('cockpit.batchOps.setVariables.errorInvalidInteger');
      });

      it('rejects "5-" — trailing minus', () => {
        expect(make([]).isValueValid(row('x', 'Integer', '5-'))).toBe(false);
      });

      it('rejects "--5" — double minus', () => {
        expect(make([]).isValueValid(row('x', 'Integer', '--5'))).toBe(false);
      });
    });

    describe('other invalid inputs', () => {
      it('rejects empty string', () => {
        expect(make([]).isValueValid(row('x', 'Integer', ''))).toBe(false);
      });

      it('rejects decimal "3.14"', () => {
        expect(make([]).isValueValid(row('x', 'Integer', '3.14'))).toBe(false);
      });

      it('rejects plain text "abc"', () => {
        expect(make([]).isValueValid(row('x', 'Integer', 'abc'))).toBe(false);
      });
    });

    describe('valid positive integers', () => {
      it('accepts "42"', () => {
        expect(make([]).isValueValid(row('x', 'Integer', '42'))).toBe(true);
      });

      it('accepts "0"', () => {
        expect(make([]).isValueValid(row('x', 'Integer', '0'))).toBe(true);
      });

      it('accepts large value "9999999999" for Long', () => {
        expect(make([]).isValueValid(row('x', 'Long', '9999999999'))).toBe(true);
      });
    });

    describe('non-regression: StartProcessModalComponent unaffected', () => {
      it('getVariableInputType("Integer") still returns "number" — StartProcessModal uses this unchanged', () => {
        const inst = make([]);
        expect(inst.getInputType('Integer')).toBe('number');
        expect(inst.isIntegerType('Integer')).toBe(true);
      });
    });

    describe('getValueError for unnamed rows', () => {
      it('returns null for an unnamed integer row even if value is invalid', () => {
        expect(make([]).getValueError(row('', 'Integer', '5e3'))).toBeNull();
      });
    });
  });

  describe('onIntegerKeydown', () => {
    function fakeKey(key: string, selectionStart = 0): KeyboardEvent & { defaultPrevented: boolean } {
      let prevented = false;
      return {
        key,
        target: { selectionStart },
        preventDefault: () => { prevented = true; },
        get defaultPrevented() { return prevented; },
      } as any;
    }

    describe('allows digits 0–9', () => {
      it.each(['0', '1', '5', '9'])('allows "%s"', (key) => {
        const inst = make([]);
        const evt = fakeKey(key);
        inst.onIntegerKeydown(evt as any, '');
        expect(evt.defaultPrevented).toBe(false);
      });
    });

    describe('allows explicit control keys', () => {
      it.each(['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'])(
        'allows "%s"', (key) => {
          const inst = make([]);
          const evt = fakeKey(key);
          inst.onIntegerKeydown(evt as any, '');
          expect(evt.defaultPrevented).toBe(false);
        });
    });

    describe('allows leading minus', () => {
      it('allows "-" at position 0 in empty field', () => {
        const inst = make([]);
        const evt = fakeKey('-', 0);
        inst.onIntegerKeydown(evt as any, '');
        expect(evt.defaultPrevented).toBe(false);
      });

      it('allows "-" at position 0 when currentValue has no "-"', () => {
        const inst = make([]);
        const evt = fakeKey('-', 0);
        inst.onIntegerKeydown(evt as any, '123');
        expect(evt.defaultPrevented).toBe(false);
      });
    });

    describe('blocks minus in invalid positions or when "-" already present', () => {
      it('blocks "-" at position > 0', () => {
        const inst = make([]);
        const evt = fakeKey('-', 1);
        inst.onIntegerKeydown(evt as any, '123');
        expect(evt.defaultPrevented).toBe(true);
      });

      it('blocks "-" at position 0 when currentValue already contains "-"', () => {
        const inst = make([]);
        const evt = fakeKey('-', 0);
        inst.onIntegerKeydown(evt as any, '-123');
        expect(evt.defaultPrevented).toBe(true);
      });
    });

    describe('blocks all invalid single characters', () => {
      it.each(['e', 'E', 'a', 'z', 'A', 'Z', '.', '+', ' ', '@', '!', ','])(
        'blocks "%s"', (key) => {
          const inst = make([]);
          const evt = fakeKey(key, 1);
          inst.onIntegerKeydown(evt as any, '5');
          expect(evt.defaultPrevented).toBe(true);
        });
    });
  });

  describe('onIntegerPaste', () => {
    function fakePaste(text: string, inputValue = '', selStart = 0, selEnd?: number) {
      const end = selEnd ?? inputValue.length;
      let dispatched = false;
      const inputEl = {
        value: inputValue,
        selectionStart: selStart,
        selectionEnd: end,
        dispatchEvent: () => { dispatched = true; },
      };
      const event = {
        preventDefault: () => {},
        clipboardData: { getData: () => text },
        target: inputEl,
      } as any as ClipboardEvent;
      return { event, inputEl, wasDispatched: () => dispatched };
    }

    it('pastes "5e3abc" into empty field — keeps leading valid prefix "5"', () => {
      const { event, inputEl } = fakePaste('5e3abc');
      make([]).onIntegerPaste(event);
      expect(inputEl.value).toBe('5');
    });

    it('pastes valid integer "42" — keeps it intact', () => {
      const { event, inputEl } = fakePaste('42');
      make([]).onIntegerPaste(event);
      expect(inputEl.value).toBe('42');
    });

    it('pastes "-99" — keeps negative integer', () => {
      const { event, inputEl } = fakePaste('-99');
      make([]).onIntegerPaste(event);
      expect(inputEl.value).toBe('-99');
    });

    it('pastes "3.14" — keeps only the leading integer "3"', () => {
      const { event, inputEl } = fakePaste('3.14');
      make([]).onIntegerPaste(event);
      expect(inputEl.value).toBe('3');
    });

    it('pastes "abc" (no leading digits) — value becomes ""', () => {
      const { event, inputEl } = fakePaste('abc', '');
      make([]).onIntegerPaste(event);
      expect(inputEl.value).toBe('');
    });

    it('pastes "5" after existing "-" (cursor at end) — produces "-5"', () => {
      const { event, inputEl } = fakePaste('5', '-', 1, 1);
      make([]).onIntegerPaste(event);
      expect(inputEl.value).toBe('-5');
    });

    it('dispatches synthetic input event so Angular (input) binding can sync', () => {
      const { event, wasDispatched } = fakePaste('7');
      make([]).onIntegerPaste(event);
      expect(wasDispatched()).toBe(true);
    });
  });

  describe('addRow', () => {
    it('appends a new empty String row', () => {
      const inst = make([row('x', 'Integer', '1')]);
      inst.addRow();
      expect(inst.rows).toHaveLength(2);
      expect(inst.rows[1]).toEqual({ name: '', type: 'String', value: '' });
    });
  });

  describe('removeRow', () => {
    it('removes the row at the given index', () => {
      const inst = make([row('a', 'String', ''), row('b', 'String', '')]);
      inst.removeRow(0);
      expect(inst.rows).toHaveLength(1);
      expect(inst.rows[0].name).toBe('b');
    });

    it('resets to a single empty row when the last row is removed', () => {
      const inst = make([row('x', 'String', 'val')]);
      inst.removeRow(0);
      expect(inst.rows).toHaveLength(1);
      expect(inst.rows[0]).toEqual({ name: '', type: 'String', value: '' });
    });
  });

  describe('onApply', () => {
    it('emits only rows with non-empty names', () => {
      const inst = make([
        row('x', 'String', 'hello'),
        row('', 'Integer', '42'),
        row('y', 'Boolean', true),
      ]);

      const emitted: VariableDef[][] = [];
      (inst as any).apply = { emit: (v: VariableDef[]) => emitted.push(v) };
      inst.onApply();
      expect(emitted[0]).toHaveLength(2);
      expect(emitted[0][0].name).toBe('x');
      expect(emitted[0][1].name).toBe('y');
    });
  });

});
