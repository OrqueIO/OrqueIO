import { describe, it, expect } from 'vitest';
import { extractMessageNames, buildMessageNodeMap } from './message-names.utils';

function makeEl(
  type: string,
  opts: {
    messageName?: string;
    parentType?: string;
    parentTriggeredByEvent?: boolean;
    messageOnReceiveTask?: boolean;
  } = {}
): any {
  const bo: any = {};

  if (type === 'bpmn:ReceiveTask' && opts.messageName) {
    bo.messageRef = { name: opts.messageName };
  }

  if ((type === 'bpmn:IntermediateCatchEvent' || type === 'bpmn:BoundaryEvent' || type === 'bpmn:StartEvent') && opts.messageName) {
    bo.eventDefinitions = [{ $type: 'bpmn:MessageEventDefinition', messageRef: { name: opts.messageName } }];
  }

  const parent = opts.parentType
    ? { type: opts.parentType, businessObject: { triggeredByEvent: opts.parentTriggeredByEvent ?? false } }
    : undefined;

  return { id: `el-${Math.random()}`, type, businessObject: bo, parent };
}

describe('extractMessageNames', () => {
  it('extracts from IntermediateCatchEvent with message definition', () => {
    const result = extractMessageNames([makeEl('bpmn:IntermediateCatchEvent', { messageName: 'OrderReceived' })]);
    expect(result).toContain('OrderReceived');
  });

  it('extracts from ReceiveTask with messageRef', () => {
    const result = extractMessageNames([makeEl('bpmn:ReceiveTask', { messageName: 'PaymentConfirmed' })]);
    expect(result).toContain('PaymentConfirmed');
  });

  it('extracts from BoundaryEvent with message definition', () => {
    const result = extractMessageNames([makeEl('bpmn:BoundaryEvent', { messageName: 'Timeout' })]);
    expect(result).toContain('Timeout');
  });

  it('extracts from StartEvent inside event subprocess', () => {
    const result = extractMessageNames([
      makeEl('bpmn:StartEvent', { messageName: 'ErrorMsg', parentType: 'bpmn:SubProcess', parentTriggeredByEvent: true })
    ]);
    expect(result).toContain('ErrorMsg');
  });

  it('does NOT extract from process-level StartEvent', () => {
    const result = extractMessageNames([
      makeEl('bpmn:StartEvent', { messageName: 'Start', parentType: 'bpmn:Process' })
    ]);
    expect(result).not.toContain('Start');
  });

  it('does NOT extract from StartEvent inside non-event subprocess', () => {
    const result = extractMessageNames([
      makeEl('bpmn:StartEvent', { messageName: 'Start', parentType: 'bpmn:SubProcess', parentTriggeredByEvent: false })
    ]);
    expect(result).not.toContain('Start');
  });

  it('excludes EL expressions using ${...}', () => {
    const result = extractMessageNames([makeEl('bpmn:ReceiveTask', { messageName: '${msgName}' })]);
    expect(result).not.toContain('${msgName}');
  });

  it('excludes EL expressions using #{...}', () => {
    const result = extractMessageNames([makeEl('bpmn:IntermediateCatchEvent', { messageName: '#{msg}' })]);
    expect(result).not.toContain('#{msg}');
  });

  it('deduplicates names across elements', () => {
    const result = extractMessageNames([
      makeEl('bpmn:ReceiveTask', { messageName: 'OrderMsg' }),
      makeEl('bpmn:IntermediateCatchEvent', { messageName: 'OrderMsg' })
    ]);
    expect(result.filter(n => n === 'OrderMsg').length).toBe(1);
  });

  it('returns empty array for unrelated element types', () => {
    const result = extractMessageNames([{ type: 'bpmn:Task', businessObject: {} }]);
    expect(result).toHaveLength(0);
  });

  it('skips elements without businessObject', () => {
    const result = extractMessageNames([{ type: 'bpmn:IntermediateCatchEvent' }]);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(extractMessageNames([])).toHaveLength(0);
  });
});

describe('buildMessageNodeMap', () => {
  it('maps element id to message name', () => {
    const el = makeEl('bpmn:ReceiveTask', { messageName: 'MyMessage' });
    const map = buildMessageNodeMap([el]);
    expect(map.get(el.id)).toBe('MyMessage');
  });

  it('excludes EL expressions', () => {
    const el = makeEl('bpmn:IntermediateCatchEvent', { messageName: '${dynamic}' });
    const map = buildMessageNodeMap([el]);
    expect(map.has(el.id)).toBe(false);
  });

  it('includes multiple elements with different message names', () => {
    const el1 = makeEl('bpmn:ReceiveTask', { messageName: 'Msg1' });
    const el2 = makeEl('bpmn:BoundaryEvent', { messageName: 'Msg2' });
    const map = buildMessageNodeMap([el1, el2]);
    expect(map.size).toBe(2);
    expect(map.get(el1.id)).toBe('Msg1');
    expect(map.get(el2.id)).toBe('Msg2');
  });

  it('returns empty map for empty input', () => {
    expect(buildMessageNodeMap([]).size).toBe(0);
  });
});
