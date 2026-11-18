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

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
// @ts-ignore - bpmn-js doesn't have types
import { getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';
import { append as svgAppend, attr as svgAttr, create as svgCreate } from 'tiny-svg';

/** The delegate expression of the OrqueIO LLM task, as set by its modeler template. */
export const LLM_TASK_DELEGATE_EXPRESSION = '${orqueioLlmTask}';

/** The id of the modeler template of the LLM task. */
export const LLM_TASK_TEMPLATE_ID = 'io.orqueio.llm.LlmTask';

// A speech bubble with a spark, the same icon as in the modeler
export const BUBBLE_PATH = 'M4 5h16v11H9l-5 4z';
export const SPARK_PATH = 'M12 7.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z';

const HIGH_PRIORITY = 1500;

const CAMUNDA_NAMESPACE = 'http://camunda.org/schema/1.0/bpmn';

/** The prefixes the diagram binds to the Camunda namespace, usually just "camunda". */
function camundaPrefixes(businessObject: any): string[] {
  const prefixes = new Set<string>(['camunda']);

  for (let parent = businessObject; parent; parent = parent.$parent) {
    for (const [key, value] of Object.entries(parent.$attrs || {})) {
      if (key.startsWith('xmlns:') && value === CAMUNDA_NAMESPACE) {
        prefixes.add(key.substring('xmlns:'.length));
      }
    }
  }
  return [...prefixes];
}

function camundaAttribute(businessObject: any, name: string): unknown {
  if (!businessObject) {
    return undefined;
  }

  // The viewer has no Camunda moddle extension, so Camunda attributes stay in $attrs,
  // under the prefix the diagram declares for the Camunda namespace
  for (const prefix of camundaPrefixes(businessObject)) {
    const value = businessObject.$attrs?.[`${ prefix }:${ name }`];
    if (value !== undefined) {
      return value;
    }
  }
  return businessObject.get?.(`camunda:${ name }`);
}

/**
 * Whether a diagram element is an OrqueIO LLM task: a service task run by the LLM task
 * delegate, or created from its modeler template. Recognised as in the modeler.
 */
export function isLlmTask(element: any): boolean {
  if (!element || element.labelTarget || element.type !== 'bpmn:ServiceTask') {
    return false;
  }

  const businessObject = element.businessObject;

  return camundaAttribute(businessObject, 'delegateExpression') === LLM_TASK_DELEGATE_EXPRESSION
    || camundaAttribute(businessObject, 'modelerTemplate') === LLM_TASK_TEMPLATE_ID;
}

/**
 * Draws LLM tasks as a plain task with the LLM icon, instead of the service task gears.
 */
export class LlmTaskRenderer extends BaseRenderer {

  static $inject = ['eventBus', 'bpmnRenderer', 'config.bpmnRenderer'];

  private bpmnRenderer: any;
  private defaultStrokeColor: string | undefined;

  constructor(eventBus: any, bpmnRenderer: any, config: any) {
    super(eventBus, HIGH_PRIORITY);

    this.bpmnRenderer = bpmnRenderer;
    this.defaultStrokeColor = config?.defaultStrokeColor;
  }

  override canRender(element: any): boolean {
    return isLlmTask(element);
  }

  override drawShape(parentGfx: SVGElement, element: any, attrs: any = {}): SVGElement {
    const task = this.bpmnRenderer.handlers['bpmn:Task'](parentGfx, element, attrs);
    const stroke = getStrokeColor(element, this.defaultStrokeColor, attrs.stroke);

    const icon = svgCreate('g', { class: 'orqueio-llm-task-icon', transform: 'translate(6, 4)' });

    svgAppend(icon, svgCreate('path', {
      d: BUBBLE_PATH,
      fill: 'none',
      stroke,
      'stroke-width': 1.5,
      'stroke-linejoin': 'round'
    }));

    svgAppend(icon, svgCreate('path', {
      d: SPARK_PATH,
      fill: stroke,
      stroke,
      'stroke-width': 0.8,
      'stroke-linejoin': 'round'
    }));

    svgAttr(icon, { 'data-orqueio-llm-task': 'true' });
    svgAppend(parentGfx, icon);

    return task;
  }

  override getShapePath(element: any): string {
    return this.bpmnRenderer.getShapePath(element);
  }
}

/** The bpmn-js module that draws LLM tasks. */
export const llmTaskRendererModule = {
  __init__: ['llmTaskRenderer'],
  llmTaskRenderer: ['type', LlmTaskRenderer]
};
