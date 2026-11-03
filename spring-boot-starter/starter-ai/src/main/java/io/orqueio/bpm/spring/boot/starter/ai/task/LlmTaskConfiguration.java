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

import java.util.List;
import java.util.Set;

import io.orqueio.bpm.engine.impl.core.model.PropertyKey;
import io.orqueio.bpm.engine.impl.pvm.process.ActivityImpl;

/**
 * Configuration of an LLM task, read from the {@code camunda:properties} of its
 * service task when the process is deployed.
 */
public final class LlmTaskConfiguration {

  /**
   * The {@code camunda:delegateExpression} that marks a service task as an LLM task.
   */
  public static final String DELEGATE_EXPRESSION = "${orqueioLlmTask}";

  public static final String PROPERTY_PREFIX = "orqueio.llm.";
  public static final String PROVIDER_PROPERTY = PROPERTY_PREFIX + "provider";
  public static final String MODEL_PROPERTY = PROPERTY_PREFIX + "model";
  public static final String PROMPT_PROPERTY = PROPERTY_PREFIX + "prompt";
  public static final String INPUTS_PROPERTY = PROPERTY_PREFIX + "inputs";
  public static final String OUTPUTS_PROPERTY = PROPERTY_PREFIX + "outputs";

  static final Set<String> KNOWN_PROPERTIES =
      Set.of(PROVIDER_PROPERTY, MODEL_PROPERTY, PROMPT_PROPERTY, INPUTS_PROPERTY, OUTPUTS_PROPERTY);

  static final PropertyKey<LlmTaskConfiguration> KEY = new PropertyKey<>("orqueioLlmTaskConfiguration");

  private final String provider;
  private final String model;
  private final String prompt;
  private final List<String> inputs;
  private final List<LlmOutputField> outputs;

  LlmTaskConfiguration(String provider, String model, String prompt, List<String> inputs, List<LlmOutputField> outputs) {
    this.provider = provider;
    this.model = model;
    this.prompt = prompt;
    this.inputs = List.copyOf(inputs);
    this.outputs = List.copyOf(outputs);
  }

  /**
   * @return the configuration of the given activity, or {@code null} if it is not an LLM task
   */
  public static LlmTaskConfiguration of(ActivityImpl activity) {
    return activity.getProperties().get(KEY);
  }

  /**
   * @return the provider id, or {@code null} to use the default provider
   */
  public String getProvider() {
    return provider;
  }

  /**
   * @return the model name, or {@code null} to use the model configured for the provider
   */
  public String getModel() {
    return model;
  }

  /**
   * @return the prompt template, with placeholders as written in the BPMN
   */
  public String getPrompt() {
    return prompt;
  }

  /**
   * @return the variables the task may send to the model, in declaration order; empty if none
   */
  public List<String> getInputs() {
    return inputs;
  }

  /**
   * @return the fields the model must return, in declaration order
   */
  public List<LlmOutputField> getOutputs() {
    return outputs;
  }

  @Override
  public String toString() {
    return "LlmTaskConfiguration[provider=" + provider + ", model=" + model + ", inputs=" + inputs + ", outputs=" + outputs + "]";
  }

}
