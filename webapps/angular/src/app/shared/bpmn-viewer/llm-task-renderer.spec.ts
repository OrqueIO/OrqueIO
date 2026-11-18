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

// @ts-ignore - bpmn-moddle doesn't have types
import BpmnModdle from 'bpmn-moddle';
import { isLlmTask, LlmTaskRenderer, BUBBLE_PATH, SPARK_PATH } from './llm-task-renderer';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:serviceTask id="Task_Llm" name="Triage the claim" camunda:delegateExpression="\${orqueioLlmTask}" />
    <bpmn:serviceTask id="Task_Template" camunda:modelerTemplate="io.orqueio.llm.LlmTask" />
    <bpmn:serviceTask id="Task_Other" camunda:delegateExpression="\${otherDelegate}" />
    <bpmn:userTask id="Task_User" camunda:delegateExpression="\${orqueioLlmTask}" />
  </bpmn:process>
</bpmn:definitions>`;

async function elements(): Promise<Record<string, any>> {
  // As in the viewer: no Camunda moddle extension, so Camunda attributes stay in $attrs
  const { rootElement } = await new BpmnModdle().fromXML(XML);
  const byId: Record<string, any> = {};
  for (const flowElement of rootElement.rootElements[0].flowElements) {
    byId[flowElement.id] = { id: flowElement.id, type: flowElement.$type, businessObject: flowElement };
  }
  return byId;
}

// tiny-svg sets presentation attributes such as stroke as style properties
const strokeOf = (path: Element) => path.getAttribute('stroke') || (path as SVGElement).style.getPropertyValue('stroke');

describe('LLM task renderer', () => {

  describe('isLlmTask', () => {
    it('should recognise a service task run by the LLM task delegate', async () => {
      expect(isLlmTask((await elements())['Task_Llm'])).toBe(true);
    });

    it('should recognise a service task created from the LLM task template', async () => {
      expect(isLlmTask((await elements())['Task_Template'])).toBe(true);
    });

    it('should not recognise other service tasks or other task types', async () => {
      const byId = await elements();
      expect(isLlmTask(byId['Task_Other'])).toBe(false);
      expect(isLlmTask(byId['Task_User'])).toBe(false);
    });

    it('should not recognise a label or a missing element', async () => {
      const llm = (await elements())['Task_Llm'];
      expect(isLlmTask({ ...llm, labelTarget: llm })).toBe(false);
      expect(isLlmTask(null)).toBe(false);
    });

    it('should read Camunda attributes when the Camunda moddle extension is loaded', () => {
      const businessObject = {
        get: (name: string) => name === 'camunda:delegateExpression' ? '${orqueioLlmTask}' : undefined
      };
      expect(isLlmTask({ type: 'bpmn:ServiceTask', businessObject })).toBe(true);
    });
  });

  describe('drawShape', () => {
    function renderer() {
      const eventBus = { on: vi.fn() };
      const bpmnRenderer = {
        handlers: { 'bpmn:Task': vi.fn().mockReturnValue('task-shape') },
        getShapePath: vi.fn().mockReturnValue('M0 0')
      };
      return { bpmnRenderer, renderer: new LlmTaskRenderer(eventBus, bpmnRenderer, { defaultStrokeColor: '#123456' }) };
    }

    const element = (stroke?: string) => ({
      id: 'Task_Llm',
      type: 'bpmn:ServiceTask',
      businessObject: { $attrs: { 'camunda:delegateExpression': '${orqueioLlmTask}' } },
      di: { get: (name: string) => name === 'color:border-color' ? stroke : undefined }
    });

    it('should draw a plain task with the LLM icon instead of the service task gears', () => {
      const { renderer: llmRenderer, bpmnRenderer } = renderer();
      const parent = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const shape = element();

      expect(llmRenderer.canRender(shape)).toBe(true);
      expect(llmRenderer.drawShape(parent, shape)).toBe('task-shape');
      expect(bpmnRenderer.handlers['bpmn:Task']).toHaveBeenCalledWith(parent, shape, {});

      const icon = parent.querySelector('[data-orqueio-llm-task]')!;
      expect(icon).not.toBeNull();
      const paths = Array.from(icon.querySelectorAll('path')).map(path => path.getAttribute('d'));
      expect(paths).toEqual([BUBBLE_PATH, SPARK_PATH]);
      expect(strokeOf(icon.querySelector('path')!)).toBe('#123456');
    });

    it('should draw the icon in the colour of the task', () => {
      const { renderer: llmRenderer } = renderer();
      const parent = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      llmRenderer.drawShape(parent, element('#ff0000'));

      expect(strokeOf(parent.querySelector('[data-orqueio-llm-task] path')!)).toBe('#ff0000');
    });

    it('should keep the task outline for selection and connections', () => {
      const { renderer: llmRenderer, bpmnRenderer } = renderer();
      const shape = element();

      expect(llmRenderer.getShapePath(shape)).toBe('M0 0');
      expect(bpmnRenderer.getShapePath).toHaveBeenCalledWith(shape);
    });
  });
});
