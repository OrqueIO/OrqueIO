import { VariableDefinitionsModalComponent, VariableDef, VarSuggestion } from './variable-definitions-modal';
import { getVariableInputType } from '../../../../../utils/variable-type.util';

function make(rows: VariableDef[]): VariableDefinitionsModalComponent {
  const inst = Object.create(VariableDefinitionsModalComponent.prototype) as VariableDefinitionsModalComponent;
  (inst as any).rows = rows;
  (inst as any).rowValueConflicts = rows.map(() => false);
  (inst as any).cdr = { markForCheck: () => {} };
  (inst as any).targetInstanceIds = null;
  (inst as any).initialVariables = [];
  (inst as any).queryFilter = null;
  (inst as any).allSuggestions = [];
  (inst as any).scopeLoad = null;
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

  describe('getNameCautionWarning — informational hint for any character outside [a-zA-Z0-9_]', () => {
    it('returns true for a name containing a dash', () => {
      expect(make([]).getNameCautionWarning('my-var')).toBe(true);
    });

    it('returns true for names with spaces, quotes, or parentheses', () => {
      expect(make([]).getNameCautionWarning('my var')).toBe(true);
      expect(make([]).getNameCautionWarning('"quoted"')).toBe(true);
      expect(make([]).getNameCautionWarning('foo(bar)')).toBe(true);
    });

    it('returns false for a name with only letters, digits, and underscores', () => {
      expect(make([]).getNameCautionWarning('myVar_123')).toBe(false);
      expect(make([]).getNameCautionWarning('camelCase')).toBe(false);
      expect(make([]).getNameCautionWarning('_private')).toBe(false);
    });

    it('does not affect canApply — Apply stays enabled even when the caution is shown', () => {
      const inst = make([row('my-var', 'String', 'hello')]);
      expect(inst.getNameCautionWarning('my-var')).toBe(true);
      expect(inst.canApply).toBe(true);
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

  describe('getNameDuplicateWarning', () => {
    it('returns null when name is unique across all rows', () => {
      const inst = make([row('amount', 'Integer', '100'), row('label', 'String', 'hello')]);
      expect(inst.getNameDuplicateWarning('amount', 0)).toBeNull();
      expect(inst.getNameDuplicateWarning('label', 1)).toBeNull();
    });

    it('returns the name when another row has the same name', () => {
      const inst = make([row('amount', 'Integer', '100'), row('amount', 'Integer', '200')]);
      expect(inst.getNameDuplicateWarning('amount', 1)).toBe('amount');
    });

    it('does not flag a row against itself', () => {
      const inst = make([row('amount', 'Integer', '100')]);
      expect(inst.getNameDuplicateWarning('amount', 0)).toBeNull();
    });

    it('returns null for empty name', () => {
      const inst = make([row('amount', 'Integer', '100'), row('', 'String', '')]);
      expect(inst.getNameDuplicateWarning('', 1)).toBeNull();
    });

    it('returns null for whitespace-only name', () => {
      const inst = make([row('amount', 'Integer', '100'), row('  ', 'String', '')]);
      expect(inst.getNameDuplicateWarning('  ', 1)).toBeNull();
    });

    it('is case-sensitive — "amount" and "Amount" are distinct, no warning', () => {
      const inst = make([row('amount', 'Integer', '100'), row('Amount', 'Integer', '200')]);
      expect(inst.getNameDuplicateWarning('Amount', 1)).toBeNull();
    });

    it('trims whitespace when comparing — "amount " matches "amount"', () => {
      const inst = make([row('amount', 'Integer', '100'), row('amount ', 'Integer', '200')]);
      expect(inst.getNameDuplicateWarning('amount ', 1)).toBe('amount');
    });

    it('warning does not block apply — canApply is true even when duplicate name exists', () => {
      const inst = make([row('amount', 'Integer', '100'), row('amount', 'Integer', '200')]);
      expect(inst.getNameDuplicateWarning('amount', 1)).not.toBeNull();
      expect(inst.canApply).toBe(true);
    });
  });

  describe('getDefaultValue', () => {
    it('returns false for Boolean', () => {
      expect(make([]).getDefaultValue('Boolean')).toBe(false);
    });

    it('returns "" for String, Integer, Long, Short, Double, Date', () => {
      const inst = make([]);
      for (const t of ['String', 'Integer', 'Long', 'Short', 'Double', 'Date']) {
        expect(inst.getDefaultValue(t)).toBe('');
      }
    });
  });

  describe('onTypeChange', () => {
    it('Double → Boolean: value becomes false, not the old Double value', () => {
      const inst = make([row('x', 'Double', '20.5')]);
      inst.onTypeChange(0, 'Boolean');
      expect(inst.rows[0].type).toBe('Boolean');
      expect(inst.rows[0].value).toBe(false);
    });

    it('Boolean → Integer: value becomes "" (user must fill in a number)', () => {
      const inst = make([row('x', 'Boolean', true)]);
      inst.onTypeChange(0, 'Integer');
      expect(inst.rows[0].type).toBe('Integer');
      expect(inst.rows[0].value).toBe('');
    });

    it('Integer → String: value becomes ""', () => {
      const inst = make([row('x', 'Integer', '42')]);
      inst.onTypeChange(0, 'String');
      expect(inst.rows[0].type).toBe('String');
      expect(inst.rows[0].value).toBe('');
    });

    it('Double → Date: value becomes ""', () => {
      const inst = make([row('x', 'Double', '3.14')]);
      inst.onTypeChange(0, 'Date');
      expect(inst.rows[0].type).toBe('Date');
      expect(inst.rows[0].value).toBe('');
    });

    it('String → Long: value becomes ""', () => {
      const inst = make([row('x', 'String', 'hello')]);
      inst.onTypeChange(0, 'Long');
      expect(inst.rows[0].type).toBe('Long');
      expect(inst.rows[0].value).toBe('');
    });

    it('does not affect other rows when changing one row type', () => {
      const inst = make([row('a', 'String', 'hello'), row('b', 'Double', '20.5')]);
      inst.onTypeChange(1, 'Boolean');
      expect(inst.rows[0].value).toBe('hello');
      expect(inst.rows[1].value).toBe(false);
    });

    it('canApply is true after Double → Boolean (false is a valid boolean value)', () => {
      const inst = make([row('x', 'Double', '20.5')]);
      inst.onTypeChange(0, 'Boolean');
      expect(inst.canApply).toBe(true);
    });

    it('canApply is false after Double → Integer (empty value blocks apply)', () => {
      const inst = make([row('x', 'Double', '3.14')]);
      inst.onTypeChange(0, 'Integer');
      expect(inst.canApply).toBe(false);
    });

    it('produces a new rows array (immutable update — OnPush safe)', () => {
      const inst = make([row('x', 'String', 'v')]);
      const before = inst.rows;
      inst.onTypeChange(0, 'Boolean');
      expect(inst.rows).not.toBe(before);
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

  describe('onFieldEnter — Enter in a field blurs without applying', () => {
    function fakeFieldEvent() {
      const state = { blurred: false, stopped: false, prevented: false };
      const ev = {
        target: { blur: () => { state.blurred = true; } },
        stopPropagation: () => { state.stopped = true; },
        preventDefault: () => { state.prevented = true; },
      } as unknown as Event;
      return { ev, state };
    }

    it('blurs the focused element', () => {
      const inst = make([row('a', 'String', 'v')]);
      const { ev, state } = fakeFieldEvent();
      inst.onFieldEnter(ev);
      expect(state.blurred).toBe(true);
    });

    it('stops propagation so onModalEnter does not fire', () => {
      const inst = make([row('a', 'String', 'v')]);
      const { ev, state } = fakeFieldEvent();
      inst.onFieldEnter(ev);
      expect(state.stopped).toBe(true);
    });

    it('prevents default to block native browser behaviors (checkbox toggle, form submit)', () => {
      const inst = make([row('a', 'String', 'v')]);
      const { ev, state } = fakeFieldEvent();
      inst.onFieldEnter(ev);
      expect(state.prevented).toBe(true);
    });

    it('does NOT emit apply — modal stays open after field blur', () => {
      const inst = make([row('a', 'String', 'v')]);
      const emitted: VariableDef[][] = [];
      (inst as any).apply = { emit: (v: VariableDef[]) => emitted.push(v) };
      const { ev } = fakeFieldEvent();
      inst.onFieldEnter(ev);
      expect(emitted).toHaveLength(0);
    });
  });

  describe('variable name autocomplete', () => {
    const SUGGESTIONS: VarSuggestion[] = [
      { name: 'amount', type: 'Integer', value: 42, valuesConflict: false },
      { name: 'label', type: 'String', value: 'hello', valuesConflict: false },
      { name: 'status', type: 'String', value: null, valuesConflict: true },
    ];

    function makeWithSuggestions(suggestions: VarSuggestion[]): VariableDefinitionsModalComponent {
      const inst = make([row('', 'String', '')]);
      (inst as any).allSuggestions = suggestions;
      return inst;
    }

    function mockService(inst: VariableDefinitionsModalComponent, results: VarSuggestion[] = []) {
      (inst as any).processInstanceService = {
        loadDistinctVariableSuggestions: (_ids: string[]) => ({
          subscribe: (fn: (v: VarSuggestion[]) => void) => {
            fn(results);
            return { unsubscribe: () => {} };
          }
        }),
        queryProcessInstances: () => ({
          subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; }
        })
      };
    }

    describe('getFilteredSuggestions', () => {
      it('returns all suggestions when name is empty — clicking the field shows the full list', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        expect(inst.getFilteredSuggestions('')).toHaveLength(3);
      });

      it('filters case-insensitively by contains match when user types', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        const result = inst.getFilteredSuggestions('AM');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('amount');
      });

      it('returns multiple matches when several names contain the query', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        // 'u' appears in 'amount' and 'status' but not 'label'
        expect(inst.getFilteredSuggestions('u')).toHaveLength(2);
      });

      it('returns empty array when nothing matches — no error, no suggestions shown', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        expect(inst.getFilteredSuggestions('xyz')).toHaveLength(0);
      });
    });

    describe('getHighlightParts', () => {
      it('returns a single non-bold part when query is empty', () => {
        expect(make([]).getHighlightParts('amount', '')).toEqual([{ text: 'amount', bold: false }]);
      });

      it('bolds matched portion in the middle', () => {
        expect(make([]).getHighlightParts('amount', 'ount')).toEqual([
          { text: 'am', bold: false },
          { text: 'ount', bold: true },
        ]);
      });

      it('bolds matched portion at the beginning', () => {
        expect(make([]).getHighlightParts('amount', 'am')).toEqual([
          { text: 'am', bold: true },
          { text: 'ount', bold: false },
        ]);
      });

      it('bolds matched portion at the end', () => {
        expect(make([]).getHighlightParts('amount', 'unt')).toEqual([
          { text: 'amo', bold: false },
          { text: 'unt', bold: true },
        ]);
      });

      it('returns single non-bold part when no match', () => {
        expect(make([]).getHighlightParts('amount', 'xyz')).toEqual([{ text: 'amount', bold: false }]);
      });

      it('match is case-insensitive — bold segment uses original casing', () => {
        const parts = make([]).getHighlightParts('Amount', 'am');
        expect(parts[0]).toEqual({ text: 'Am', bold: true });
        expect(parts[1]).toEqual({ text: 'ount', bold: false });
      });
    });

    describe('onNameFocus', () => {
      it('sets activeSuggestionRow to the focused row index (non-regression: first open)', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        inst.onNameFocus(0);
        expect(inst.activeSuggestionRow).toBe(0);
      });

      it('reopens the dropdown when called again after a suggestion was selected (simulates re-click while already focused)', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        // First selection: pick 'amount'
        inst.onNameFocus(0);
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: false });
        expect(inst.activeSuggestionRow).toBeNull(); // dropdown closed after selection
        // Re-click on the name field (already focused — only (click) fires, not (focus))
        inst.onNameFocus(0);
        expect(inst.activeSuggestionRow).toBe(0); // dropdown visible again
      });

      it('second suggestion selection fully replaces Name/Type/Value from the first — no residue', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        // First selection
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: false });
        // Re-open and pick a different suggestion
        inst.onNameFocus(0);
        inst.onSuggestionClick(0, { name: 'label', type: 'String', value: 'hello', valuesConflict: false });
        expect(inst.rows[0].name).toBe('label');
        expect(inst.rows[0].type).toBe('String');
        expect(inst.rows[0].value).toBe('hello');
      });

      it('reopens dropdown automatically when user types after a selection (simulates (input) event binding)', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: false });
        expect(inst.activeSuggestionRow).toBeNull();
        // User edits the name field: [(ngModel)] updates the name, then (input) fires onNameInput(i, value)
        inst.rows[0].name = 'am';
        inst.onNameInput(0, 'am');
        expect(inst.activeSuggestionRow).toBe(0);
        // allSuggestions is SUGGESTIONS, 'am' client-filters to 'amount'
        expect(inst.getFilteredSuggestions('am').length).toBeGreaterThan(0);
      });

      it('keeps activeSuggestionRow set and filtered list empty when typed text matches nothing in allSuggestions', () => {
        const inst = make([row('', 'String', '')]);
        // allSuggestions is [] by default — nothing to match
        inst.onNameFocus(0);
        inst.rows[0].name = 'xyz_nomatch';
        inst.onNameInput(0, 'xyz_nomatch');
        expect(inst.activeSuggestionRow).toBe(0);
        expect(inst.getFilteredSuggestions('xyz_nomatch')).toHaveLength(0);
      });

      it('non-regression: first-open flow (focus → type → see suggestions → select) still works end-to-end', () => {
        // Scope already loaded (makeWithSuggestions sets allSuggestions = SUGGESTIONS)
        const inst = makeWithSuggestions(SUGGESTIONS);
        // Focus on field
        inst.onNameFocus(0);
        expect(inst.activeSuggestionRow).toBe(0);
        // allSuggestions already loaded — full list visible on empty field
        expect((inst as any).allSuggestions.length).toBe(SUGGESTIONS.length);
        // User types — local filter applied
        inst.rows[0].name = 'a';
        inst.onNameInput(0, 'a');
        expect(inst.activeSuggestionRow).toBe(0);
        expect(inst.getFilteredSuggestions('a').length).toBeGreaterThan(0);
        // Selection
        inst.onSuggestionClick(0, SUGGESTIONS[0]);
        expect(inst.rows[0].name).toBe(SUGGESTIONS[0].name);
        expect(inst.activeSuggestionRow).toBeNull();
      });
    });

    describe('onNameBlur', () => {
      it('hides the dropdown by setting activeSuggestionRow to null', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        inst.onNameFocus(0);
        inst.onNameBlur();
        expect(inst.activeSuggestionRow).toBeNull();
      });
    });

    describe('onSuggestionClick', () => {
      it('fills both name and type from the clicked suggestion', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: false });
        expect(inst.rows[0].name).toBe('amount');
        expect(inst.rows[0].type).toBe('Integer');
      });

      it('pre-fills value from the suggestion when all instances agree (valuesConflict: false)', () => {
        const inst = make([row('x', 'String', 'hello')]);
        (inst as any).rowValueConflicts = [false];
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: false });
        expect(inst.rows[0].value).toBe('42'); // number coerced to string for Integer text input
      });

      it('leaves value at default when instances have conflicting values (valuesConflict: true)', () => {
        const inst = make([row('x', 'String', 'hello')]);
        (inst as any).rowValueConflicts = [false];
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: true });
        expect(inst.rows[0].value).toBe(''); // default for Integer
      });

      it('uses default value for Boolean when values conflict', () => {
        const inst = make([row('x', 'String', 'hello')]);
        (inst as any).rowValueConflicts = [false];
        inst.onSuggestionClick(0, { name: 'flag', type: 'Boolean', value: true, valuesConflict: true });
        expect(inst.rows[0].value).toBe(false);
      });

      it('pre-fills Boolean value when all instances agree', () => {
        const inst = make([row('x', 'String', 'hello')]);
        (inst as any).rowValueConflicts = [false];
        inst.onSuggestionClick(0, { name: 'flag', type: 'Boolean', value: true, valuesConflict: false });
        expect(inst.rows[0].value).toBe(true);
      });

      it('still pre-fills type from the suggestion regardless of conflict (non-regression)', () => {
        const inst = make([row('x', 'String', 'hello')]);
        (inst as any).rowValueConflicts = [false];
        inst.onSuggestionClick(0, { name: 'active', type: 'Boolean', value: false, valuesConflict: true });
        expect(inst.rows[0].type).toBe('Boolean');
      });

      it('sets hasValueConflict when values differ across instances', () => {
        const inst = make([row('x', 'String', 'hello')]);
        (inst as any).rowValueConflicts = [false];
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: true });
        expect(inst.hasValueConflict(0)).toBe(true);
      });

      it('clears hasValueConflict when user subsequently edits the value', () => {
        const inst = make([row('x', 'String', 'hello')]);
        (inst as any).rowValueConflicts = [false];
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: true });
        expect(inst.hasValueConflict(0)).toBe(true);
        inst.onValueChange(0);
        expect(inst.hasValueConflict(0)).toBe(false);
      });

      it('does not set hasValueConflict when all instances agree on the same value', () => {
        const inst = make([row('x', 'String', 'hello')]);
        (inst as any).rowValueConflicts = [false];
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: false });
        expect(inst.hasValueConflict(0)).toBe(false);
      });

      it('closes the dropdown after selection', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        inst.onNameFocus(0);
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: false });
        expect(inst.activeSuggestionRow).toBeNull();
      });

      it('does not affect other rows', () => {
        const inst = make([row('x', 'String', 'hello'), row('', 'String', '')]);
        (inst as any).rowValueConflicts = [false, false];
        inst.onSuggestionClick(1, { name: 'label', type: 'String', value: 'hello', valuesConflict: false });
        expect(inst.rows[0].name).toBe('x');
        expect(inst.rows[0].value).toBe('hello');
        expect(inst.rows[1].name).toBe('label');
      });

      it('produces a new rows array (immutable update — OnPush safe)', () => {
        const inst = makeWithSuggestions(SUGGESTIONS);
        (inst as any).rowValueConflicts = [false];
        const before = inst.rows;
        inst.onSuggestionClick(0, { name: 'amount', type: 'Integer', value: 42, valuesConflict: false });
        expect(inst.rows).not.toBe(before);
      });
    });

    describe('disabled suggestions — whitelist logic (only String/Integer/Long/Short/Double/Boolean/Date enabled)', () => {
      it('Object suggestion is visible in filtered list — not hidden', () => {
        const inst = makeWithSuggestions([
          { name: 'myObj', type: 'Object', value: null, valuesConflict: false }
        ]);
        expect(inst.getFilteredSuggestions('')).toHaveLength(1);
        expect(inst.getFilteredSuggestions('')[0].type).toBe('Object');
      });

      it('File suggestion is visible in filtered list — not hidden', () => {
        const inst = makeWithSuggestions([
          { name: 'myFile', type: 'File', value: null, valuesConflict: false }
        ]);
        expect(inst.getFilteredSuggestions('')).toHaveLength(1);
        expect(inst.getFilteredSuggestions('')[0].type).toBe('File');
      });

      it('isUnsupportedSuggestionType returns true for Object, File, Bytes and any unknown type', () => {
        const inst = make([row('', 'String', '')]);
        expect(inst.isUnsupportedSuggestionType('Object')).toBe(true);
        expect(inst.isUnsupportedSuggestionType('File')).toBe(true);
        expect(inst.isUnsupportedSuggestionType('Bytes')).toBe(true);
        expect(inst.isUnsupportedSuggestionType('CustomType')).toBe(true);
      });

      it('isUnsupportedSuggestionType returns false for all supported types', () => {
        const inst = make([row('', 'String', '')]);
        for (const t of ['String', 'Integer', 'Long', 'Short', 'Double', 'Boolean', 'Date']) {
          expect(inst.isUnsupportedSuggestionType(t)).toBe(false);
        }
      });

      it('clicking an Object suggestion does not pre-fill name or type', () => {
        const inst = make([row('', 'String', '')]);
        inst.onSuggestionClick(0, { name: 'myObj', type: 'Object', value: { key: 'val' }, valuesConflict: false });
        expect(inst.rows[0].name).toBe('');
        expect(inst.rows[0].type).toBe('String');
      });

      it('clicking a File suggestion does not pre-fill name or type', () => {
        const inst = make([row('', 'String', '')]);
        inst.onSuggestionClick(0, { name: 'myFile', type: 'File', value: null, valuesConflict: false });
        expect(inst.rows[0].name).toBe('');
        expect(inst.rows[0].type).toBe('String');
      });

      it('clicking an Object suggestion leaves the dropdown open (activeSuggestionRow unchanged)', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).activeSuggestionRow = 0;
        inst.onSuggestionClick(0, { name: 'myObj', type: 'Object', value: null, valuesConflict: false });
        expect(inst.activeSuggestionRow).toBe(0);
      });

      it('Bytes suggestion is visible in filtered list — not hidden', () => {
        const inst = makeWithSuggestions([
          { name: 'myBytes', type: 'Bytes', value: null, valuesConflict: false }
        ]);
        expect(inst.getFilteredSuggestions('').length).toBe(1);
        expect(inst.getFilteredSuggestions('')[0].type).toBe('Bytes');
      });

      it('clicking a Bytes suggestion does not pre-fill name or type', () => {
        const inst = make([row('', 'String', '')]);
        inst.onSuggestionClick(0, { name: 'myBytes', type: 'Bytes', value: null, valuesConflict: false });
        expect(inst.rows[0].name).toBe('');
        expect(inst.rows[0].type).toBe('String');
      });

      it('clicking a Bytes suggestion leaves the dropdown open (activeSuggestionRow unchanged)', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).activeSuggestionRow = 0;
        inst.onSuggestionClick(0, { name: 'myBytes', type: 'Bytes', value: null, valuesConflict: false });
        expect(inst.activeSuggestionRow).toBe(0);
      });

      it('CustomType suggestion is visible in filtered list — not hidden', () => {
        const inst = makeWithSuggestions([
          { name: 'myCustom', type: 'CustomType', value: null, valuesConflict: false }
        ]);
        expect(inst.getFilteredSuggestions('').length).toBe(1);
        expect(inst.getFilteredSuggestions('')[0].type).toBe('CustomType');
      });

      it('clicking a CustomType suggestion does not pre-fill name or type (whitelist guards unknown types)', () => {
        const inst = make([row('', 'String', '')]);
        inst.onSuggestionClick(0, { name: 'myCustom', type: 'CustomType', value: null, valuesConflict: false });
        expect(inst.rows[0].name).toBe('');
        expect(inst.rows[0].type).toBe('String');
      });

      it('non-regression: clicking a String suggestion still pre-fills name, type and value', () => {
        const inst = make([row('', 'String', '')]);
        inst.onSuggestionClick(0, { name: 'label', type: 'String', value: 'hello', valuesConflict: false });
        expect(inst.rows[0].name).toBe('label');
        expect(inst.rows[0].type).toBe('String');
        expect(inst.rows[0].value).toBe('hello');
      });
    });

    describe('scope-based loading (one request per scope change, local filtering on keystrokes)', () => {
      function makeSvc(capturedIds?: string[], results: VarSuggestion[] = []) {
        return {
          loadDistinctVariableSuggestions: (ids: string[]) => {
            if (capturedIds) capturedIds.splice(0, capturedIds.length, ...ids);
            return { subscribe: (fn: Function) => { fn(results); return { unsubscribe: () => {} }; } };
          },
          queryProcessInstances: () => ({
            subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; }
          })
        };
      }

      it('scope loads on init — mode Instances: calls loadDistinctVariableSuggestions with the IDs', () => {
        const inst = make([row('', 'String', '')]);
        const capturedIds: string[] = [];
        (inst as any).targetInstanceIds = ['inst1', 'inst2'];
        (inst as any).queryFilter = null;
        (inst as any).processInstanceService = makeSvc(capturedIds);
        (inst as any).loadScope();
        expect(capturedIds).toEqual(['inst1', 'inst2']);
      });

      it('scope loads on init — mode Global (both null): calls loadDistinctVariableSuggestions with []', () => {
        const inst = make([row('', 'String', '')]);
        const capturedIds: string[] = ['sentinel'];
        (inst as any).targetInstanceIds = null;
        (inst as any).queryFilter = null;
        (inst as any).processInstanceService = makeSvc(capturedIds);
        (inst as any).loadScope();
        expect(capturedIds).toEqual([]);
      });

      it('scope does NOT load when targetInstanceIds is [] (mode Instances, nothing selected)', () => {
        const inst = make([row('', 'String', '')]);
        let called = false;
        (inst as any).targetInstanceIds = [];
        (inst as any).processInstanceService = {
          loadDistinctVariableSuggestions: () => { called = true; return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } }; }
        };
        (inst as any).loadScope();
        expect(called).toBe(false);
      });

      it('scope loads on init — mode Query with criteria: resolves IDs then calls loadDistinctVariableSuggestions', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).targetInstanceIds = null;
        (inst as any).queryFilter = { unfinished: true };
        const capturedIds: string[] = [];
        (inst as any).processInstanceService = {
          queryProcessInstances: () => ({
            subscribe: (fn: Function) => { fn([{ id: 'inst-a' }, { id: 'inst-b' }]); return { unsubscribe: () => {} }; }
          }),
          loadDistinctVariableSuggestions: (ids: string[]) => {
            capturedIds.push(...ids);
            return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } };
          }
        };
        (inst as any).loadScope();
        expect(capturedIds).toEqual(['inst-a', 'inst-b']);
      });

      it('typing multiple characters triggers zero additional HTTP requests (local filtering only)', () => {
        const fakeResults: VarSuggestion[] = [
          { name: 'amount', type: 'Integer', value: undefined, valuesConflict: false },
          { name: 'label', type: 'String', value: undefined, valuesConflict: false }
        ];
        const inst = makeWithSuggestions(fakeResults);
        let httpCallCount = 0;
        (inst as any).processInstanceService = {
          loadDistinctVariableSuggestions: () => { httpCallCount++; return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } }; }
        };
        // Simulate typing 5 characters — no HTTP call expected
        inst.onNameInput(0, 'a');
        inst.onNameInput(0, 'am');
        inst.onNameInput(0, 'amo');
        inst.onNameInput(0, 'amou');
        inst.onNameInput(0, 'amoun');
        expect(httpCallCount).toBe(0);
        // Filtering is done locally from allSuggestions
        expect(inst.getFilteredSuggestions('amoun')).toHaveLength(1);
        expect(inst.getFilteredSuggestions('amoun')[0].name).toBe('amount');
      });

      it('focus triggers no HTTP request', () => {
        const inst = make([row('amount', 'String', '')]);
        let called = false;
        (inst as any).targetInstanceIds = ['inst1'];
        (inst as any).processInstanceService = {
          loadDistinctVariableSuggestions: () => { called = true; return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } }; }
        };
        inst.onNameFocus(0);
        expect(called).toBe(false);
      });

      it('scope reloads when targetInstanceIds changes — allSuggestions refreshed', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).targetInstanceIds = ['inst1'];
        (inst as any).queryFilter = null;
        let capturedIds: string[] = [];
        (inst as any).processInstanceService = makeSvc(capturedIds,
          [{ name: 'newVar', type: 'String', value: undefined, valuesConflict: false }]
        );
        // Simulate ngOnChanges triggering loadScope with new IDs
        (inst as any).targetInstanceIds = ['inst2', 'inst3'];
        (inst as any).allSuggestions = [];
        (inst as any).loadScope();
        expect(capturedIds).toEqual(['inst2', 'inst3']);
        expect((inst as any).allSuggestions[0].name).toBe('newVar');
      });

      it('mode Query: empty queryFilter result leaves allSuggestions empty without calling loadDistinctVariableSuggestions', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).targetInstanceIds = null;
        (inst as any).queryFilter = { processInstanceBusinessKeyLike: 'NOMATCH' };
        let loadCalled = false;
        (inst as any).processInstanceService = {
          queryProcessInstances: () => ({
            subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; }
          }),
          loadDistinctVariableSuggestions: () => {
            loadCalled = true;
            return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } };
          }
        };
        (inst as any).loadScope();
        expect(loadCalled).toBe(false);
        expect((inst as any).allSuggestions).toEqual([]);
      });

      it('mode Global: allSuggestions populated from loadDistinctVariableSuggestions result', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).targetInstanceIds = null;
        (inst as any).queryFilter = null;
        const fakeResults: VarSuggestion[] = [
          { name: 'amount', type: 'Double', value: undefined, valuesConflict: false },
          { name: 'status', type: 'String', value: undefined, valuesConflict: false }
        ];
        (inst as any).processInstanceService = {
          loadDistinctVariableSuggestions: (_ids: string[]) => ({
            subscribe: (fn: Function) => { fn(fakeResults); return { unsubscribe: () => {} }; }
          })
        };
        (inst as any).loadScope();
        expect((inst as any).allSuggestions).toEqual(fakeResults);
      });

      it('ngOnChanges with same-content array reference does NOT trigger a new scope load (prevents getter-driven infinite loop)', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).targetInstanceIds = ['inst1', 'inst2'];
        let loadCount = 0;
        (inst as any).processInstanceService = {
          loadDistinctVariableSuggestions: () => {
            loadCount++;
            return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } };
          }
        };

        // Simulate what Angular does when the parent getter returns [...selectedIds] each CD cycle:
        // same content, new reference — isFirstChange false (already initialized)
        inst.ngOnChanges({
          targetInstanceIds: {
            previousValue: ['inst1', 'inst2'],
            currentValue: ['inst1', 'inst2'], // different reference, same content
            firstChange: false,
            isFirstChange: () => false
          }
        } as any);

        expect(loadCount).toBe(0); // no new request fired
      });

      it('ngOnChanges with actually different IDs triggers a scope reload', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).targetInstanceIds = ['inst1'];
        let loadCount = 0;
        (inst as any).processInstanceService = {
          loadDistinctVariableSuggestions: () => {
            loadCount++;
            return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } };
          }
        };

        inst.ngOnChanges({
          targetInstanceIds: {
            previousValue: ['inst1'],
            currentValue: ['inst1', 'inst2'],
            firstChange: false,
            isFirstChange: () => false
          }
        } as any);

        expect(loadCount).toBe(1);
      });

      it('ngOnChanges with same-content queryFilter object does NOT trigger a reload', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).targetInstanceIds = null;
        (inst as any).queryFilter = { unfinished: true };
        let loadCount = 0;
        (inst as any).processInstanceService = {
          loadDistinctVariableSuggestions: () => {
            loadCount++;
            return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } };
          },
          queryProcessInstances: () => ({ subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } })
        };

        // Same content, new object reference (as buildHistoricQueryForBatch() would do each cycle)
        inst.ngOnChanges({
          queryFilter: {
            previousValue: { unfinished: true },
            currentValue: { unfinished: true }, // different reference, same content
            firstChange: false,
            isFirstChange: () => false
          }
        } as any);

        expect(loadCount).toBe(0);
      });

      it('mode Instances uses IDs directly — queryProcessInstances is never called', () => {
        const inst = make([row('', 'String', '')]);
        (inst as any).targetInstanceIds = ['inst-1', 'inst-2'];
        (inst as any).queryFilter = { unfinished: true };
        let queryCalled = false;
        const capturedIds: string[] = [];
        (inst as any).processInstanceService = {
          queryProcessInstances: () => {
            queryCalled = true;
            return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } };
          },
          loadDistinctVariableSuggestions: (ids: string[]) => {
            capturedIds.push(...ids);
            return { subscribe: (fn: Function) => { fn([]); return { unsubscribe: () => {} }; } };
          }
        };
        (inst as any).loadScope();
        expect(queryCalled).toBe(false);
        expect(capturedIds).toEqual(['inst-1', 'inst-2']);
      });
    });

    describe('isInstancesModeWithNoSelection — hint guard getter', () => {
      it('returns false when targetInstanceIds is null (mode Query)', () => {
        const inst = make([]);
        (inst as any).targetInstanceIds = null;
        expect(inst.isInstancesModeWithNoSelection).toBe(false);
      });

      it('returns true when targetInstanceIds is [] (mode Instances, nothing selected)', () => {
        const inst = make([]);
        (inst as any).targetInstanceIds = [];
        expect(inst.isInstancesModeWithNoSelection).toBe(true);
      });

      it('returns false when targetInstanceIds has IDs (mode Instances, with selection)', () => {
        const inst = make([]);
        (inst as any).targetInstanceIds = ['inst1', 'inst2'];
        expect(inst.isInstancesModeWithNoSelection).toBe(false);
      });
    });
  });

  describe('onModalEnter — Enter on the dialog div applies when valid', () => {
    function makeWithApply(rows: VariableDef[]) {
      const inst = make(rows);
      const emitted: VariableDef[][] = [];
      (inst as any).apply = { emit: (v: VariableDef[]) => emitted.push(v) };
      const dialogNative = {};
      (inst as any).dialogEl = { nativeElement: dialogNative };
      return { inst, emitted, dialogNative };
    }

    it('valid state + target is dialog → applies (same function as Apply button)', () => {
      const { inst, emitted, dialogNative } = makeWithApply([row('myVar', 'String', 'hello')]);
      inst.onModalEnter({ target: dialogNative } as unknown as KeyboardEvent);
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual([row('myVar', 'String', 'hello')]);
    });

    it('empty name (canApply=false) + target is dialog → does nothing, modal stays open', () => {
      const { inst, emitted, dialogNative } = makeWithApply([row('', 'String', '')]);
      inst.onModalEnter({ target: dialogNative } as unknown as KeyboardEvent);
      expect(emitted).toHaveLength(0);
    });

    it('event target is a field input (not the dialog) → ignored even if valid', () => {
      const { inst, emitted } = makeWithApply([row('myVar', 'String', 'hello')]);
      const fieldInput = { tagName: 'INPUT' };
      inst.onModalEnter({ target: fieldInput } as unknown as KeyboardEvent);
      expect(emitted).toHaveLength(0);
    });

    it('multiple rows with one unnamed → emits only named+valid rows', () => {
      const { inst, emitted, dialogNative } = makeWithApply([
        row('a', 'String', 'alpha'),
        row('b', 'Integer', '42'),
        row('', 'String', ''),
      ]);
      inst.onModalEnter({ target: dialogNative } as unknown as KeyboardEvent);
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual([row('a', 'String', 'alpha'), row('b', 'Integer', '42')]);
    });

    it('invalid integer value (canApply=false) + target is dialog → does nothing', () => {
      const { inst, emitted, dialogNative } = makeWithApply([row('myInt', 'Integer', 'abc')]);
      inst.onModalEnter({ target: dialogNative } as unknown as KeyboardEvent);
      expect(emitted).toHaveLength(0);
    });
  });

  describe('keyboard navigation in suggestions dropdown', () => {
    const KBD_SUGGESTIONS: VarSuggestion[] = [
      { name: 'amount', type: 'Integer', value: 42, valuesConflict: false },
      { name: 'data', type: 'Object', value: null, valuesConflict: false },
      { name: 'label', type: 'String', value: 'foo', valuesConflict: false },
    ];

    function makeKbd(name = ''): VariableDefinitionsModalComponent {
      const inst = make([row(name, 'String', '')]);
      (inst as any).activeSuggestionRow = 0;
      (inst as any).allSuggestions = KBD_SUGGESTIONS;
      (inst as any).dialogEl = { nativeElement: { focus: () => {} } };
      return inst;
    }

    function fakeKey(k: string): KeyboardEvent {
      return {
        key: k,
        preventDefault: () => {},
        stopPropagation: () => {},
        target: { blur: () => {} },
      } as unknown as KeyboardEvent;
    }

    it('ArrowDown from null highlights the first enabled suggestion (skips disabled)', () => {
      const inst = makeKbd();
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      expect(inst.keyboardHighlightIndex).toBe(0);
    });

    it('ArrowDown twice skips the disabled Object suggestion and lands on the next enabled one', () => {
      const inst = makeKbd();
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      expect(inst.keyboardHighlightIndex).toBe(2);
    });

    it('ArrowDown on last enabled suggestion does not move (no wrap)', () => {
      const inst = makeKbd();
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      expect(inst.keyboardHighlightIndex).toBe(2);
    });

    it('ArrowUp from second enabled goes back to first enabled', () => {
      const inst = makeKbd();
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      inst.onNameKeydown(0, fakeKey('ArrowUp'));
      expect(inst.keyboardHighlightIndex).toBe(0);
    });

    it('ArrowUp on first enabled suggestion does not move (no wrap)', () => {
      const inst = makeKbd();
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      inst.onNameKeydown(0, fakeKey('ArrowUp'));
      expect(inst.keyboardHighlightIndex).toBe(0);
    });

    it('Enter on highlighted suggestion fills Name / Type / Value as onSuggestionClick would', () => {
      const inst = makeKbd();
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      inst.onNameKeydown(0, fakeKey('Enter'));
      expect(inst.rows[0].name).toBe('label');
      expect(inst.rows[0].type).toBe('String');
      expect(inst.rows[0].value).toBe('foo');
      expect(inst.keyboardHighlightIndex).toBeNull();
      expect(inst.activeSuggestionRow).toBeNull();
    });

    it('Enter with no highlight does not select a suggestion — name field stays unchanged', () => {
      const inst = makeKbd('am');
      inst.onNameKeydown(0, fakeKey('Enter'));
      expect(inst.rows[0].name).toBe('am');
    });

    it('Escape closes the dropdown without changing the typed text', () => {
      const inst = makeKbd('am');
      inst.onNameKeydown(0, fakeKey('Escape'));
      expect(inst.activeSuggestionRow).toBeNull();
      expect(inst.keyboardHighlightIndex).toBeNull();
      expect(inst.rows[0].name).toBe('am');
    });

    it('typing after ArrowDown resets the highlight index', () => {
      const inst = makeKbd();
      inst.onNameKeydown(0, fakeKey('ArrowDown'));
      expect(inst.keyboardHighlightIndex).toBe(0);
      inst.onNameInput(0, 'lab');
      expect(inst.keyboardHighlightIndex).toBeNull();
    });
  });

  describe('edit mode — row deletion (chip deletion bug)', () => {
    function makeEditMode(initialVars: VariableDef[]): VariableDefinitionsModalComponent {
      const inst = make(initialVars.map(v => ({ ...v })));
      (inst as any).initialVariables = initialVars;
      return inst;
    }

    it('canApply is true after deleting the only row in edit mode', () => {
      const inst = makeEditMode([row('amount', 'Integer', '100')]);
      inst.removeRow(0);
      expect(inst.canApply).toBe(true);
    });

    it('onApply emits [] after deleting the only row — wizard must remove the chip', () => {
      const inst = makeEditMode([row('amount', 'Integer', '100')]);
      const emitted: VariableDef[][] = [];
      (inst as any).apply = { emit: (v: VariableDef[]) => emitted.push(v) };
      inst.removeRow(0);
      inst.onApply();
      expect(emitted[0]).toEqual([]);
    });

    it('deletes one of two rows — Apply emits only the surviving variable', () => {
      const inst = makeEditMode([row('amount', 'Integer', '100'), row('label', 'String', 'foo')]);
      const emitted: VariableDef[][] = [];
      (inst as any).apply = { emit: (v: VariableDef[]) => emitted.push(v) };
      inst.removeRow(0);
      expect(inst.canApply).toBe(true);
      inst.onApply();
      expect(emitted[0]).toEqual([row('label', 'String', 'foo')]);
    });

    it('deletes one row and modifies another — Apply applies both changes', () => {
      const inst = makeEditMode([row('amount', 'Integer', '100'), row('label', 'String', 'foo')]);
      const emitted: VariableDef[][] = [];
      (inst as any).apply = { emit: (v: VariableDef[]) => emitted.push(v) };
      inst.removeRow(0);
      inst.rows[0].value = 'bar';
      inst.onApply();
      expect(emitted[0]).toEqual([row('label', 'String', 'bar')]);
    });

    it('non-regression: renaming a variable in edit mode applies the new name', () => {
      const inst = makeEditMode([row('amount', 'Integer', '100')]);
      const emitted: VariableDef[][] = [];
      (inst as any).apply = { emit: (v: VariableDef[]) => emitted.push(v) };
      inst.rows[0].name = 'total';
      expect(inst.canApply).toBe(true);
      inst.onApply();
      expect(emitted[0]).toEqual([row('total', 'Integer', '100')]);
    });

    it('non-regression: canApply remains false for fresh modal with empty rows (no initialVariables)', () => {
      const inst = make([row('', 'String', '')]);
      expect(inst.canApply).toBe(false);
    });
  });

});
