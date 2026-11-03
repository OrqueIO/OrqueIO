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

import java.util.Arrays;
import java.util.Optional;

import tools.jackson.databind.JsonNode;

/**
 * A field the model must return, written to the process variable of the same name.
 */
public record LlmOutputField(String name, Type type) {

  public enum Type {

    STRING("string"),
    INTEGER("integer"),
    NUMBER("number"),
    BOOLEAN("boolean");

    private final String id;

    Type(String id) {
      this.id = id;
    }

    public String getId() {
      return id;
    }

    public static Optional<Type> fromId(String id) {
      return Arrays.stream(values()).filter(type -> type.id.equals(id)).findFirst();
    }

    /**
     * @return the value as a process variable value, or {@code null} if the node does not have this type
     */
    Object convert(JsonNode node) {
      return switch (this) {
        case STRING -> node.isString() ? node.stringValue() : null;
        // Models sometimes write integers as 3.0; a fraction is still rejected
        case INTEGER -> node.isNumber() && isIntegral(node) ? node.longValue() : null;
        case NUMBER -> node.isNumber() ? node.doubleValue() : null;
        case BOOLEAN -> node.isBoolean() ? node.booleanValue() : null;
      };
    }

    private static boolean isIntegral(JsonNode node) {
      if (node.isIntegralNumber()) {
        return node.canConvertToLong();
      }
      double value = node.doubleValue();
      return value == Math.rint(value) && !Double.isInfinite(value)
          && value >= Long.MIN_VALUE && value <= Long.MAX_VALUE;
    }
  }

}
