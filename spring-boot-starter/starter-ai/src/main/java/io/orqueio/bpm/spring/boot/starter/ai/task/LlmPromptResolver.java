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

import java.time.Instant;
import java.util.Date;
import java.util.Set;

import io.orqueio.bpm.engine.delegate.VariableScope;
import io.orqueio.bpm.engine.variable.type.ValueType;
import io.orqueio.bpm.engine.variable.value.TypedValue;

/**
 * Builds the prompt sent to the model from an LLM task's template and the process
 * variables it declares in {@code orqueio.llm.inputs}. No other variable is read.
 */
public class LlmPromptResolver {

  protected static final Set<ValueType> TEXT_TYPES = Set.of(ValueType.STRING, ValueType.BOOLEAN,
      ValueType.SHORT, ValueType.INTEGER, ValueType.LONG, ValueType.DOUBLE, ValueType.NUMBER);

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
    // Not deserialized: objects, JSON and files are rejected without being opened
    TypedValue value = variables.getVariableTyped(name, false);
    // getValue() is only read on primitive types: on an object it would deserialize
    if (value == null || ValueType.NULL.equals(value.getType())
        || (value.getType() != null && value.getType().isPrimitiveValueType() && value.getValue() == null)) {
      throw new LlmTaskException("Variable '" + name + "' used by the prompt is null");
    }
    return toText(name, value);
  }

  protected String toText(String name, TypedValue value) {
    ValueType type = value.getType();
    if (TEXT_TYPES.contains(type)) {
      return value.getValue().toString();
    }
    if (ValueType.DATE.equals(type)) {
      return Instant.ofEpochMilli(((Date) value.getValue()).getTime()).toString();
    }
    throw new LlmTaskException("Variable '" + name + "' has type " + (type != null ? type.getName() : "unknown")
        + ", which cannot be used in a prompt");
  }

}
