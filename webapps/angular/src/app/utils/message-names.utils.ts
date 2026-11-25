function getMessageName(el: any): string | null {
  const bo = el.businessObject;
  if (!bo) return null;

  if (el.type === 'bpmn:IntermediateCatchEvent' || el.type === 'bpmn:BoundaryEvent') {
    const def = bo.eventDefinitions?.[0];
    if (def?.$type === 'bpmn:MessageEventDefinition') return def.messageRef?.name ?? null;
  }

  if (el.type === 'bpmn:ReceiveTask') return bo.messageRef?.name ?? null;

  if (el.type === 'bpmn:StartEvent') {
    const parent = el.parent;
    if (parent?.type === 'bpmn:SubProcess' && parent.businessObject?.triggeredByEvent) {
      const def = bo.eventDefinitions?.[0];
      if (def?.$type === 'bpmn:MessageEventDefinition') return def.messageRef?.name ?? null;
    }
  }

  return null;
}

function isValidName(name: string | null): name is string {
  return name !== null && !name.includes('${') && !name.includes('#{');
}

export function extractMessageNames(elements: any[]): string[] {
  const seen = new Set<string>();
  for (const el of elements) {
    const name = getMessageName(el);
    if (isValidName(name)) seen.add(name);
  }
  return [...seen];
}

export function buildMessageNodeMap(elements: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const el of elements) {
    const name = getMessageName(el);
    if (isValidName(name)) map.set(el.id, name);
  }
  return map;
}
