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

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import tools.jackson.databind.JsonNode;

/**
 * A field the model must return, written to the process variable of the same name.
 * <p>
 * The author can constrain its value: a string field to a list of allowed values
 * ({@code incidentType:Theft|Fire|Water|Other}), a number or integer field to
 * inclusive bounds ({@code claimAmount:number[0..50000]}, either bound optional).
 * Whatever the model was led to write, a value outside them is never written.
 *
 * @param allowedValues the values a string field may take, empty when any string is allowed
 * @param min the smallest value a number or integer field may take, {@code null} for no minimum
 * @param max the largest value a number or integer field may take, {@code null} for no maximum
 */
public record LlmOutputField(String name, Type type, List<String> allowedValues, BigDecimal min, BigDecimal max) {

  /**
   * Longest string the engine stores in a string variable on every supported
   * database (the TEXT_ column is 4000 characters).
   */
  public static final int MAX_STRING_LENGTH = 4000;

  public LlmOutputField {
    allowedValues = allowedValues == null ? List.of() : List.copyOf(allowedValues);
    // A field has allowed values or bounds, never both: the error message tells which one the answer broke
    if (!allowedValues.isEmpty() && (type != Type.STRING || min != null || max != null)) {
      throw new IllegalArgumentException("Only a string output can list allowed values, and without bounds: " + name);
    }
    if ((min != null || max != null) && type != Type.NUMBER && type != Type.INTEGER) {
      throw new IllegalArgumentException("Only a number or integer output can have bounds: " + name);
    }
  }

  /**
   * A field without constraint: any value of its type is accepted.
   */
  public LlmOutputField(String name, Type type) {
    this(name, type, List.of(), null, null);
  }

  /**
   * @return whether the value, already converted to this field's type, respects its allowed values and bounds
   */
  public boolean allows(Object value) {
    if (!allowedValues.isEmpty() && !allowedValues.contains(value)) {
      return false;
    }
    if (min == null && max == null) {
      return true;
    }
    BigDecimal number = value instanceof Long longValue ? BigDecimal.valueOf(longValue)
        : value instanceof Double doubleValue ? BigDecimal.valueOf(doubleValue) : null;
    return number != null && (min == null || number.compareTo(min) >= 0) && (max == null || number.compareTo(max) <= 0);
  }

  /**
   * @return the field as the model must return it, with its constraints, for example
   *         {@code "claimAmount" (number, from 0 to 50000)}
   */
  public String describe() {
    String description = "\"" + name + "\" (" + type.getId();
    if (!allowedValues.isEmpty()) {
      description += ", exactly one of " + allowedValues.stream().map(LlmOutputField::quote).collect(Collectors.joining(", "));
    }
    else if (min != null && max != null) {
      description += ", from " + min.toPlainString() + " to " + max.toPlainString();
    }
    else if (min != null) {
      description += ", at least " + min.toPlainString();
    }
    else if (max != null) {
      description += ", at most " + max.toPlainString();
    }
    return description + ")";
  }

  /**
   * @return the field in the syntax of {@code orqueio.llm.outputs}, written the same way however the author spaced it
   */
  public String declaration() {
    if (!allowedValues.isEmpty()) {
      return name + ":" + String.join("|", allowedValues);
    }
    if (min != null || max != null) {
      return name + ":" + type.getId() + "[" + (min != null ? min.toPlainString() : "") + ".."
          + (max != null ? max.toPlainString() : "") + "]";
    }
    return name + ":" + type.getId();
  }

  private static String quote(String value) {
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }

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
     * @return the value as a process variable value, or {@code null} if the node does not have this
     *         type or cannot be stored (a string over {@link #MAX_STRING_LENGTH}, an infinite number)
     */
    Object convert(JsonNode node) {
      return switch (this) {
        case STRING -> node.isString() && node.stringValue().length() <= MAX_STRING_LENGTH ? node.stringValue() : null;
        // Models sometimes write integers as 3.0; a fraction is still rejected
        case INTEGER -> node.isNumber() && isIntegral(node) ? node.longValue() : null;
        case NUMBER -> node.isNumber() && Double.isFinite(node.doubleValue()) ? node.doubleValue() : null;
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
