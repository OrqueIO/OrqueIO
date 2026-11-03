/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.orqueio.bpm.spring.boot.starter.ai.task;

import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskConfiguration.DELEGATE_EXPRESSION;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskConfiguration.KNOWN_PROPERTIES;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskConfiguration.MODEL_PROPERTY;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskConfiguration.PROMPT_PROPERTY;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskConfiguration.PROPERTY_PREFIX;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskConfiguration.PROVIDER_PROPERTY;

import java.util.Map;
import java.util.TreeSet;

import io.orqueio.bpm.engine.BpmnParseException;
import io.orqueio.bpm.engine.impl.bpmn.behavior.MultiInstanceActivityBehavior;
import io.orqueio.bpm.engine.impl.bpmn.parser.AbstractBpmnParseListener;
import io.orqueio.bpm.engine.impl.bpmn.parser.BpmnParse;
import io.orqueio.bpm.engine.impl.bpmn.parser.BpmnParseUtil;
import io.orqueio.bpm.engine.impl.pvm.process.ActivityImpl;
import io.orqueio.bpm.engine.impl.pvm.process.ScopeImpl;
import io.orqueio.bpm.engine.impl.util.xml.Element;

/**
 * Reads and validates the configuration of LLM tasks when a process is parsed, so a
 * misconfigured task fails the deployment rather than a process instance.
 * <p>
 * Only checks that depend on the BPMN XML alone run here: the engine parses a
 * definition again when it reloads it from its cache. Providers depend on the
 * application's configuration and are checked by {@link LlmTaskDeploymentValidator}.
 */
public class LlmTaskParseListener extends AbstractBpmnParseListener {

  @Override
  public void parseServiceTask(Element serviceTaskElement, ScopeImpl scope, ActivityImpl activity) {
    Map<String, String> properties = BpmnParseUtil.parseOrqueioExtensionProperties(serviceTaskElement);

    if (!isLlmDelegate(serviceTaskElement)) {
      if (hasLlmProperties(properties)) {
        throw error(activity, "has " + PROPERTY_PREFIX + "* properties but is not an LLM task; set "
            + "camunda:delegateExpression to " + DELEGATE_EXPRESSION, serviceTaskElement);
      }
      return;
    }

    Map<String, String> llmProperties = properties != null ? properties : Map.of();
    validateKnownProperties(llmProperties, activity, serviceTaskElement);

    String prompt = llmProperties.get(PROMPT_PROPERTY);
    if (prompt == null || prompt.isBlank()) {
      throw error(activity, "requires a " + PROMPT_PROPERTY + " property", serviceTaskElement);
    }
    if (isMultiInstance(activity)) {
      throw error(activity, "is multi-instance, which LLM tasks do not support yet", serviceTaskElement);
    }
    if (!activity.isAsyncBefore()) {
      throw error(activity, "requires camunda:asyncBefore=\"true\": the model call must not run inside "
          + "the transaction that reaches the task", serviceTaskElement);
    }

    activity.getProperties().set(LlmTaskConfiguration.KEY, new LlmTaskConfiguration(
        trimToNull(llmProperties.get(PROVIDER_PROPERTY)), trimToNull(llmProperties.get(MODEL_PROPERTY)), prompt));
  }

  // Other elements also accept camunda:delegateExpression; only service tasks can be LLM tasks

  @Override
  public void parseSendTask(Element sendTaskElement, ScopeImpl scope, ActivityImpl activity) {
    rejectLlmConfiguration(sendTaskElement, activity);
  }

  @Override
  public void parseBusinessRuleTask(Element businessRuleTaskElement, ScopeImpl scope, ActivityImpl activity) {
    rejectLlmConfiguration(businessRuleTaskElement, activity);
  }

  @Override
  public void parseIntermediateThrowEvent(Element intermediateEventElement, ScopeImpl scope, ActivityImpl activity) {
    rejectLlmConfiguration(intermediateEventElement.element(BpmnParse.MESSAGE_EVENT_DEFINITION), activity);
  }

  @Override
  public void parseEndEvent(Element endEventElement, ScopeImpl scope, ActivityImpl activity) {
    rejectLlmConfiguration(endEventElement.element(BpmnParse.MESSAGE_EVENT_DEFINITION), activity);
  }

  protected void rejectLlmConfiguration(Element element, ActivityImpl activity) {
    if (element != null && (isLlmDelegate(element) || hasLlmProperties(BpmnParseUtil.parseOrqueioExtensionProperties(element)))) {
      throw error(activity, "is not a service task; only service tasks can be LLM tasks", element);
    }
  }

  protected void validateKnownProperties(Map<String, String> properties, ActivityImpl activity, Element element) {
    TreeSet<String> unknown = new TreeSet<>();
    for (String name : properties.keySet()) {
      if (name != null && name.startsWith(PROPERTY_PREFIX) && !KNOWN_PROPERTIES.contains(name)) {
        unknown.add(name);
      }
    }
    if (!unknown.isEmpty()) {
      throw error(activity, "has unknown properties " + unknown + "; supported: " + new TreeSet<>(KNOWN_PROPERTIES), element);
    }
  }

  protected boolean isLlmDelegate(Element element) {
    String delegateExpression = element.attributeNS(BpmnParse.ORQUEIO_BPMN_EXTENSIONS_NS,
        BpmnParse.PROPERTYNAME_DELEGATE_EXPRESSION);
    return delegateExpression != null && DELEGATE_EXPRESSION.equals(delegateExpression.trim());
  }

  protected boolean hasLlmProperties(Map<String, String> properties) {
    return properties != null
        && properties.keySet().stream().anyMatch(name -> name != null && name.startsWith(PROPERTY_PREFIX));
  }

  protected boolean isMultiInstance(ActivityImpl activity) {
    ActivityImpl flowScope = activity.getParentFlowScopeActivity();
    return flowScope != null && flowScope.getActivityBehavior() instanceof MultiInstanceActivityBehavior;
  }

  protected BpmnParseException error(ActivityImpl activity, String problem, Element element) {
    return new BpmnParseException("LLM task '" + activity.getId() + "' " + problem, element);
  }

  protected static String trimToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

}
