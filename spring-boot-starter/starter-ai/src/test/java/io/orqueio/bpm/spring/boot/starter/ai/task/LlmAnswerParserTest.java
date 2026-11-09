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

import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmOutputField.Type.BOOLEAN;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmOutputField.Type.INTEGER;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmOutputField.Type.NUMBER;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmOutputField.Type.STRING;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;

import java.util.List;

import org.junit.jupiter.api.Test;

class LlmAnswerParserTest {

  private static final List<LlmOutputField> OUTPUTS = List.of(
      new LlmOutputField("category", STRING),
      new LlmOutputField("urgency", INTEGER),
      new LlmOutputField("score", NUMBER),
      new LlmOutputField("complete", BOOLEAN));

  private final LlmAnswerParser parser = new LlmAnswerParser();

  @Test
  void shouldKeepOnlyDeclaredFields() {
    String stored = parser.declaredFields("""
        ```json
        {"category": "Theft", "urgency": 3.0, "score": 0.5, "complete": true, "reasoning": "a long explanation"}
        ```""", OUTPUTS);

    assertThat(stored).isEqualTo("{\"category\":\"Theft\",\"urgency\":3,\"score\":0.5,\"complete\":true}");
    // What is stored reads back to the same values
    assertThat(parser.parse(stored, OUTPUTS)).containsExactly(
        entry("category", "Theft"), entry("urgency", 3L), entry("score", 0.5), entry("complete", true));
  }

  @Test
  void shouldReadDeclaredFieldsAndIgnoreOthers() {
    assertThat(parser.parse("{\"category\":\"Theft\",\"urgency\":3,\"score\":0.75,\"complete\":true,\"note\":\"x\"}", OUTPUTS))
        .containsExactly(
            entry("category", "Theft"),
            entry("urgency", 3L),
            entry("score", 0.75),
            entry("complete", true));
  }

  @Test
  void shouldAcceptAnswerInsideMarkdownCodeFence() {
    String answer = "```json\n{\"category\":\"Fire\",\"urgency\":1,\"score\":1,\"complete\":false}\n```";

    assertThat(parser.parse(answer, OUTPUTS)).containsEntry("category", "Fire").containsEntry("score", 1.0);
  }

  @Test
  void shouldAcceptIntegerWrittenAsWholeDecimal() {
    assertThat(parser.parse("{\"urgency\":3.0}", List.of(new LlmOutputField("urgency", INTEGER))))
        .containsEntry("urgency", 3L);
  }

  @Test
  void shouldRejectFractionForInteger() {
    assertThatThrownBy(() -> parser.parse("{\"urgency\":2.5}", List.of(new LlmOutputField("urgency", INTEGER))))
        .isInstanceOf(LlmTaskException.class)
        .hasMessage("Field 'urgency' of the model's answer is not a valid integer");
  }

  @Test
  void shouldRejectWrongType() {
    assertThatThrownBy(() -> parser.parse("{\"category\":42}", List.of(new LlmOutputField("category", STRING))))
        .hasMessage("Field 'category' of the model's answer is not a valid string");
    assertThatThrownBy(() -> parser.parse("{\"complete\":\"yes\"}", List.of(new LlmOutputField("complete", BOOLEAN))))
        .hasMessage("Field 'complete' of the model's answer is not a valid boolean");
  }

  @Test
  void shouldRejectMissingOrNullField() {
    assertThatThrownBy(() -> parser.parse("{\"category\":\"Theft\"}", OUTPUTS))
        .hasMessage("The model's answer has no value for field 'urgency'");
    assertThatThrownBy(() -> parser.parse("{\"category\":null}", List.of(new LlmOutputField("category", STRING))))
        .hasMessage("The model's answer has no value for field 'category'");
  }

  @Test
  void shouldRejectAnswerThatIsNotAJsonObject() {
    assertThatThrownBy(() -> parser.parse("The category is Theft.", OUTPUTS))
        .hasMessage("The model's answer is not valid JSON");
    assertThatThrownBy(() -> parser.parse("[1, 2]", OUTPUTS))
        .hasMessage("The model's answer is not a JSON object");
    assertThatThrownBy(() -> parser.parse("  ", OUTPUTS))
        .hasMessage("The model returned an empty answer");
  }

  @Test
  void shouldNotRepeatTheAnswerInErrors() {
    assertThatThrownBy(() -> parser.parse("{\"category\":\"Ada Lovelace, IBAN FR76...\", \"urgency\":\"high\"}",
        List.of(new LlmOutputField("category", STRING), new LlmOutputField("urgency", INTEGER))))
        .message().doesNotContain("Ada").doesNotContain("FR76").doesNotContain("high");
  }

  @Test
  void shouldRejectStringLongerThanTheEngineStores() {
    String tooLong = "a".repeat(LlmOutputField.MAX_STRING_LENGTH + 1);

    assertThat(parser.parse("{\"s\":\"" + "a".repeat(LlmOutputField.MAX_STRING_LENGTH) + "\"}",
        List.of(new LlmOutputField("s", STRING)))).containsKey("s");
    assertThatThrownBy(() -> parser.parse("{\"s\":\"" + tooLong + "\"}", List.of(new LlmOutputField("s", STRING))))
        .hasMessage("Field 's' of the model's answer is not a valid string");
  }

  @Test
  void shouldRejectInfiniteNumber() {
    assertThatThrownBy(() -> parser.parse("{\"score\":1e400}", List.of(new LlmOutputField("score", NUMBER))))
        .hasMessage("Field 'score' of the model's answer is not a valid number");
  }

  @Test
  void shouldRejectDuplicateKeys() {
    assertThatThrownBy(() -> parser.parse("{\"category\":\"A\",\"category\":\"B\"}",
        List.of(new LlmOutputField("category", STRING))))
        .hasMessage("The model's answer is not valid JSON");
  }

  @Test
  void shouldRejectOneLineCodeFence() {
    // Only a fence opening the answer on its own line is removed; the instructions ask for no Markdown
    assertThatThrownBy(() -> parser.parse("```{\"category\":\"A\"}```", List.of(new LlmOutputField("category", STRING))))
        .hasMessage("The model's answer is not valid JSON");
  }

  @Test
  void shouldDescribeFieldsInInstructions() {
    assertThat(parser.formatInstructions(OUTPUTS))
        .contains("single JSON object")
        .contains("\"category\" (string), \"urgency\" (integer), \"score\" (number), \"complete\" (boolean)");
  }

}
