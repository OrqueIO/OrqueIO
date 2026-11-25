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
package io.orqueio.bpm.spring.boot.starter.ai.testing;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * One case of an LLM task evaluation: the process variables it starts with, and either the
 * output fields the LLM task must write, or that its answer must be refused (the task throws
 * its BPMN error), for example for a prompt injection pushed out of the allowed values.
 *
 * <p>In a JSON file, a list of:
 * <pre>{@code
 * { "name": "theft",
 *   "variables": { "claimText": "My bike was stolen, it was worth 2400 euros." },
 *   "expected": { "claimAmount": 2400, "incidentType": "Theft" } }
 * { "name": "out of bounds", "variables": { ... }, "expectInvalidAnswer": true }
 * }</pre>
 *
 * @param name names the case in the report
 * @param variables the variables the process starts with
 * @param expected the output fields the task must write, compared one by one; fields left out
 *                 are not checked
 * @param expectInvalidAnswer whether the answer must be refused instead
 */
public record LlmEvaluationCase(String name, Map<String, Object> variables, Map<String, Object> expected,
                                boolean expectInvalidAnswer) {

  public LlmEvaluationCase {
    Objects.requireNonNull(name, "name");
    variables = Collections.unmodifiableMap(variables != null ? new LinkedHashMap<>(variables) : new LinkedHashMap<>());
    expected = Collections.unmodifiableMap(expected != null ? new LinkedHashMap<>(expected) : new LinkedHashMap<>());
    if (expectInvalidAnswer == !expected.isEmpty()) {
      throw new IllegalArgumentException("Evaluation case '" + name
          + "' must give either the expected output fields or expectInvalidAnswer, not both or neither");
    }
  }

  /**
   * @return a case whose answer must write these output fields
   */
  public static LlmEvaluationCase expecting(String name, Map<String, Object> variables, Map<String, Object> expected) {
    return new LlmEvaluationCase(name, variables, expected, false);
  }

  /**
   * @return a case whose answer must be refused
   */
  public static LlmEvaluationCase expectingInvalidAnswer(String name, Map<String, Object> variables) {
    return new LlmEvaluationCase(name, variables, Map.of(), true);
  }

}
