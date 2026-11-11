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

import java.time.Duration;
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

  /**
   * The fields the model returns, each written to the process variable of the same name:
   * comma-separated entries, each of them one of
   * <ul>
   *   <li>{@code name:type}, the type being {@code string}, {@code integer}, {@code number} or {@code boolean};</li>
   *   <li>{@code name:A|B|C}, a string that must be exactly one of the listed values, which cannot
   *       contain {@code ,} {@code :} or {@code |};</li>
   *   <li>{@code name:number[min..max]} or {@code name:integer[min..max]}, inclusive bounds, either of which
   *       may be left out ({@code [0..]}, {@code [..100]}), with at most 18 digits before and after the decimal point.</li>
   * </ul>
   * For example {@code incidentType:Theft|Fire|Water|Other, claimAmount:number[0..50000], summary:string}.
   */
  public static final String OUTPUTS_PROPERTY = PROPERTY_PREFIX + "outputs";
  public static final String TIMEOUT_PROPERTY = PROPERTY_PREFIX + "timeout";
  public static final String ERROR_CODE_PROPERTY = PROPERTY_PREFIX + "errorCode";

  static final Set<String> KNOWN_PROPERTIES = Set.of(PROVIDER_PROPERTY, MODEL_PROPERTY, PROMPT_PROPERTY,
      INPUTS_PROPERTY, OUTPUTS_PROPERTY, TIMEOUT_PROPERTY, ERROR_CODE_PROPERTY);

  static final PropertyKey<LlmTaskConfiguration> KEY = new PropertyKey<>("orqueioLlmTaskConfiguration");

  private final String provider;
  private final String model;
  private final String prompt;
  private final List<String> inputs;
  private final List<LlmOutputField> outputs;
  private final Duration timeout;
  private final String errorCode;

  LlmTaskConfiguration(String provider, String model, String prompt, List<String> inputs, List<LlmOutputField> outputs) {
    this(provider, model, prompt, inputs, outputs, null, null);
  }

  LlmTaskConfiguration(String provider, String model, String prompt, List<String> inputs, List<LlmOutputField> outputs,
                       Duration timeout, String errorCode) {
    this.provider = provider;
    this.model = model;
    this.prompt = prompt;
    this.inputs = List.copyOf(inputs);
    this.outputs = List.copyOf(outputs);
    this.timeout = timeout;
    this.errorCode = errorCode;
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

  /**
   * @return how long the task waits for the model, or {@code null} to use the application default
   */
  public Duration getTimeout() {
    return timeout;
  }

  /**
   * @return the BPMN error code thrown when the answer is invalid, or {@code null} to raise an incident
   */
  public String getErrorCode() {
    return errorCode;
  }

  @Override
  public String toString() {
    return "LlmTaskConfiguration[provider=" + provider + ", model=" + model + ", inputs=" + inputs + ", outputs=" + outputs
        + ", timeout=" + timeout + ", errorCode=" + errorCode + "]";
  }

}
