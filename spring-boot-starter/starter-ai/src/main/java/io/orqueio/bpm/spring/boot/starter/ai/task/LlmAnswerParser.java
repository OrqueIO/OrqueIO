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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import tools.jackson.core.JacksonException;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Turns the model's answer into process variable values. Every declared field is
 * checked before any value is returned, so a bad answer writes nothing. Error
 * messages name fields and types but never repeat the answer, which may contain
 * personal data.
 */
public class LlmAnswerParser {

  // A key given twice makes the answer ambiguous: rejected rather than last one wins
  private final JsonMapper jsonMapper = JsonMapper.builder()
      .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
      .build();

  /**
   * @return the instructions telling the model how to answer
   */
  public String formatInstructions(List<LlmOutputField> outputs) {
    String fields = outputs.stream()
        .map(field -> "\"" + field.name() + "\" (" + field.type().getId() + ")")
        .collect(Collectors.joining(", "));
    return "Answer with a single JSON object and nothing else: no explanation, no Markdown. "
        + "The object must contain these fields: " + fields + ".";
  }

  /**
   * @return the value of each declared field, in declaration order
   * @throws LlmInvalidAnswerException if the answer is not a JSON object with every field of the right type
   */
  public Map<String, Object> parse(String answer, List<LlmOutputField> outputs) {
    if (answer == null || answer.isBlank()) {
      throw new LlmInvalidAnswerException("The model returned an empty answer");
    }
    JsonNode root;
    try {
      root = jsonMapper.readTree(stripCodeFence(answer.trim()));
    }
    catch (JacksonException e) {
      throw new LlmInvalidAnswerException("The model's answer is not valid JSON");
    }
    if (root == null || !root.isObject()) {
      throw new LlmInvalidAnswerException("The model's answer is not a JSON object");
    }

    Map<String, Object> values = new LinkedHashMap<>();
    for (LlmOutputField field : outputs) {
      JsonNode node = root.get(field.name());
      if (node == null || node.isNull()) {
        throw new LlmInvalidAnswerException("The model's answer has no value for field '" + field.name() + "'");
      }
      Object value = field.type().convert(node);
      if (value == null) {
        throw new LlmInvalidAnswerException("Field '" + field.name() + "' of the model's answer is not a valid "
            + field.type().getId());
      }
      values.put(field.name(), value);
    }
    return values;
  }

  protected String stripCodeFence(String answer) {
    if (!answer.startsWith("```")) {
      return answer;
    }
    int firstLineEnd = answer.indexOf('\n');
    int closing = answer.lastIndexOf("```");
    if (firstLineEnd < 0 || closing <= firstLineEnd) {
      return answer;
    }
    return answer.substring(firstLineEnd + 1, closing).trim();
  }

}
