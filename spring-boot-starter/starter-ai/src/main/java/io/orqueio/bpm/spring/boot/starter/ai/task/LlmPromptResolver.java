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

import java.time.temporal.TemporalAccessor;
import java.util.Date;

import io.orqueio.bpm.engine.delegate.VariableScope;

/**
 * Builds the prompt sent to the model from an LLM task's template and the process
 * variables it declares in {@code orqueio.llm.inputs}. No other variable is read.
 */
public class LlmPromptResolver {

  public String resolve(LlmTaskConfiguration configuration, VariableScope variables) {
    return PromptTemplate.resolve(configuration.getPrompt(), name -> valueOf(name, configuration, variables));
  }

  protected String valueOf(String name, LlmTaskConfiguration configuration, VariableScope variables) {
    // Checked at deployment as well; kept so a variable can never be read without being declared
    if (!configuration.getInputs().contains(name)) {
      throw new LlmTaskException("Placeholder {{" + name + "}} is not declared in "
          + LlmTaskConfiguration.INPUTS_PROPERTY);
    }
    if (!variables.hasVariable(name)) {
      throw new LlmTaskException("Variable '" + name + "' used by the prompt is not set");
    }
    Object value = variables.getVariable(name);
    if (value == null) {
      throw new LlmTaskException("Variable '" + name + "' used by the prompt is null");
    }
    return toText(name, value);
  }

  protected String toText(String name, Object value) {
    if (value instanceof CharSequence || value instanceof Number || value instanceof Boolean
        || value instanceof Character || value instanceof Enum<?> || value instanceof TemporalAccessor) {
      return value.toString();
    }
    if (value instanceof Date date) {
      return date.toInstant().toString();
    }
    throw new LlmTaskException("Variable '" + name + "' has type " + value.getClass().getName()
        + ", which cannot be used in a prompt");
  }

}
