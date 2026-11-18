/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** The name under which an LLM task holds its prompt, as an input parameter or a property. */
export const LLM_PROMPT_NAME = 'orqueio.llm.prompt';

const CAMUNDA_NAMESPACE = 'http://camunda.org/schema/1.0/bpmn';

/**
 * The instructions of each LLM task of a process definition, by activity id: the prompt as
 * written in the modeler. The record of an LLM task call holds only the data sent with
 * them; the instructions are the same for every call of a definition version.
 *
 * Read from the camunda:inputParameter named orqueio.llm.prompt, or from the
 * camunda:property of that name that older LLM tasks used.
 */
export function llmTaskInstructions(bpmnXml: string | null | undefined): Map<string, string> {
  const instructions = new Map<string, string>();
  if (!bpmnXml) {
    return instructions;
  }

  let document: Document;
  try {
    document = new DOMParser().parseFromString(bpmnXml, 'application/xml');
  } catch {
    return instructions;
  }
  if (document.getElementsByTagName('parsererror').length) {
    return instructions;
  }

  const camunda = (localName: string) => Array.from(document.getElementsByTagNameNS(CAMUNDA_NAMESPACE, localName));

  for (const parameter of camunda('inputParameter')) {
    if (parameter.getAttribute('name') === LLM_PROMPT_NAME) {
      remember(instructions, parameter, parameter.textContent ?? '');
    }
  }
  for (const property of camunda('property')) {
    if (property.getAttribute('name') === LLM_PROMPT_NAME) {
      remember(instructions, property, property.getAttribute('value') ?? '');
    }
  }
  return instructions;
}

// The prompt belongs to the nearest enclosing element with an id: the task
function remember(instructions: Map<string, string>, node: Element, text: string): void {
  let element: Element | null = node.parentElement;
  while (element && !element.getAttribute('id')) {
    element = element.parentElement;
  }
  const id = element?.getAttribute('id');
  if (id && text.trim() && !instructions.has(id)) {
    instructions.set(id, text);
  }
}
