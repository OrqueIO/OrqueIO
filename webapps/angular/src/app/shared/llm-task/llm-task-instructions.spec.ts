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

import { llmTaskInstructions } from './llm-task-instructions';

const definitions = (body: string, prefix = 'camunda') => `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:${ prefix }="http://camunda.org/schema/1.0/bpmn" id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="true">${ body }</bpmn:process>
</bpmn:definitions>`;

describe('llmTaskInstructions', () => {

  it('should read the prompt each LLM task holds as an input parameter, with its line breaks', () => {
    const instructions = llmTaskInstructions(definitions(`
      <bpmn:serviceTask id="Task_Extract" camunda:delegateExpression="\${orqueioLlmTask}">
        <bpmn:extensionElements>
          <camunda:inputOutput>
            <camunda:inputParameter name="orqueio.llm.prompt">Extract the facts.
Claim: {{claimText}}</camunda:inputParameter>
          </camunda:inputOutput>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
      <bpmn:serviceTask id="Task_Other" camunda:delegateExpression="\${other}">
        <bpmn:extensionElements>
          <camunda:inputOutput>
            <camunda:inputParameter name="amount">12</camunda:inputParameter>
          </camunda:inputOutput>
        </bpmn:extensionElements>
      </bpmn:serviceTask>`));

    expect([...instructions.entries()]).toEqual([['Task_Extract', 'Extract the facts.\nClaim: {{claimText}}']]);
  });

  it('should read the prompt older LLM tasks held as a property', () => {
    const instructions = llmTaskInstructions(definitions(`
      <bpmn:serviceTask id="Task_Old">
        <bpmn:extensionElements>
          <camunda:properties>
            <camunda:property name="orqueio.llm.prompt" value="Classify {{emailText}}" />
          </camunda:properties>
        </bpmn:extensionElements>
      </bpmn:serviceTask>`));

    expect(instructions.get('Task_Old')).toBe('Classify {{emailText}}');
  });

  it('should read the prompt whatever prefix the diagram binds to the Camunda namespace', () => {
    const instructions = llmTaskInstructions(definitions(`
      <bpmn:serviceTask id="Task_Extract">
        <bpmn:extensionElements>
          <cam:inputOutput>
            <cam:inputParameter name="orqueio.llm.prompt">Extract {{claimText}}</cam:inputParameter>
          </cam:inputOutput>
        </bpmn:extensionElements>
      </bpmn:serviceTask>`, 'cam'));

    expect(instructions.get('Task_Extract')).toBe('Extract {{claimText}}');
  });

  it('should give nothing for a missing, broken or empty definition', () => {
    expect(llmTaskInstructions(null).size).toBe(0);
    expect(llmTaskInstructions('<not xml').size).toBe(0);
    expect(llmTaskInstructions(definitions('')).size).toBe(0);
  });
});
