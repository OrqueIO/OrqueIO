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

import java.math.BigDecimal;
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

  // Claim triage: the type of incident and the amount claimed
  private static final List<LlmOutputField> CLAIM = List.of(
      new LlmOutputField("incidentType", STRING, List.of("Theft", "Fire", "Water", "Other"), null, null),
      new LlmOutputField("claimAmount", NUMBER, List.of(), new BigDecimal("0"), new BigDecimal("50000")));

  // Support ticket: a sentiment and a priority from 1 to 5
  private static final List<LlmOutputField> TICKET = List.of(
      new LlmOutputField("sentiment", STRING, List.of("positive", "neutral", "negative"), null, null),
      new LlmOutputField("priority", INTEGER, List.of(), new BigDecimal("1"), new BigDecimal("5")));

  @Test
  void shouldAcceptValuesWithinConstraints() {
    assertThat(parser.parse("{\"incidentType\":\"Theft\",\"claimAmount\":2400}", CLAIM))
        .containsExactly(entry("incidentType", "Theft"), entry("claimAmount", 2400.0));
    assertThat(parser.parse("{\"sentiment\":\"negative\",\"priority\":4}", TICKET))
        .containsExactly(entry("sentiment", "negative"), entry("priority", 4L));
  }

  @Test
  void shouldAcceptBoundsThemselves() {
    assertThat(parser.parse("{\"incidentType\":\"Other\",\"claimAmount\":0}", CLAIM)).containsEntry("claimAmount", 0.0);
    assertThat(parser.parse("{\"incidentType\":\"Other\",\"claimAmount\":50000.0}", CLAIM)).containsEntry("claimAmount", 50000.0);
    assertThat(parser.parse("{\"sentiment\":\"neutral\",\"priority\":1}", TICKET)).containsEntry("priority", 1L);
    assertThat(parser.parse("{\"sentiment\":\"neutral\",\"priority\":5}", TICKET)).containsEntry("priority", 5L);
  }

  @Test
  void shouldRejectValueNotAllowedWithoutRepeatingIt() {
    // The injection measured in #315: a stolen bike reported as a fire
    assertThatThrownBy(() -> parser.parse("{\"incidentType\":\"Arson by the neighbour\",\"claimAmount\":2400}", CLAIM))
        .isInstanceOf(LlmInvalidAnswerException.class)
        .hasMessage("Field 'incidentType' of the model's answer is not one of the allowed values");
  }

  @Test
  void shouldCompareAllowedValuesExactly() {
    assertThatThrownBy(() -> parser.parse("{\"sentiment\":\"Negative\",\"priority\":3}", TICKET))
        .hasMessage("Field 'sentiment' of the model's answer is not one of the allowed values");
    assertThatThrownBy(() -> parser.parse("{\"sentiment\":\" negative\",\"priority\":3}", TICKET))
        .hasMessage("Field 'sentiment' of the model's answer is not one of the allowed values");
  }

  @Test
  void shouldRejectNumberOutsideBoundsWithoutRepeatingIt() {
    assertThatThrownBy(() -> parser.parse("{\"incidentType\":\"Fire\",\"claimAmount\":99999}", CLAIM))
        .isInstanceOf(LlmInvalidAnswerException.class)
        .hasMessage("Field 'claimAmount' of the model's answer is outside the allowed range");
    assertThatThrownBy(() -> parser.parse("{\"incidentType\":\"Fire\",\"claimAmount\":-0.01}", CLAIM))
        .hasMessage("Field 'claimAmount' of the model's answer is outside the allowed range");
    assertThatThrownBy(() -> parser.parse("{\"sentiment\":\"neutral\",\"priority\":6}", TICKET))
        .hasMessage("Field 'priority' of the model's answer is outside the allowed range");
    assertThatThrownBy(() -> parser.parse("{\"sentiment\":\"neutral\",\"priority\":0}", TICKET))
        .hasMessage("Field 'priority' of the model's answer is outside the allowed range");
  }

  @Test
  void shouldCheckEveryFieldBeforeReturningAny() {
    // A valid first field does not get through when a later one is out of range
    assertThatThrownBy(() -> parser.parse("{\"incidentType\":\"Theft\",\"claimAmount\":1e9}", CLAIM))
        .hasMessage("Field 'claimAmount' of the model's answer is outside the allowed range");
  }

  @Test
  void shouldApplyOneSidedBounds() {
    // Invoice approval: an amount with a maximum only; a credit score with a minimum only
    List<LlmOutputField> invoice = List.of(new LlmOutputField("amount", NUMBER, List.of(), null, new BigDecimal("10000")));
    List<LlmOutputField> credit = List.of(new LlmOutputField("score", INTEGER, List.of(), new BigDecimal("-100"), null));

    assertThat(parser.parse("{\"amount\":-5}", invoice)).containsEntry("amount", -5.0);
    assertThatThrownBy(() -> parser.parse("{\"amount\":10000.5}", invoice))
        .hasMessage("Field 'amount' of the model's answer is outside the allowed range");
    assertThat(parser.parse("{\"score\":-100}", credit)).containsEntry("score", -100L);
    assertThat(parser.parse("{\"score\":9223372036854775807}", credit)).containsEntry("score", Long.MAX_VALUE);
    assertThatThrownBy(() -> parser.parse("{\"score\":-101}", credit))
        .hasMessage("Field 'score' of the model's answer is outside the allowed range");
  }

  @Test
  void shouldCompareDecimalBoundsWithoutRoundingErrors() {
    // A probability: 0.3 must be accepted with a maximum of 0.3, although 0.1 + 0.2 is not 0.3 in binary
    List<LlmOutputField> risk = List.of(new LlmOutputField("probability", NUMBER, List.of(), new BigDecimal("0.1"), new BigDecimal("0.3")));

    assertThat(parser.parse("{\"probability\":0.3}", risk)).containsEntry("probability", 0.3);
    assertThat(parser.parse("{\"probability\":0.1}", risk)).containsEntry("probability", 0.1);
    assertThatThrownBy(() -> parser.parse("{\"probability\":0.30000000000000004}", risk))
        .hasMessage("Field 'probability' of the model's answer is outside the allowed range");
  }

  @Test
  void shouldTellTheModelTheAllowedValuesAndBounds() {
    assertThat(parser.formatInstructions(CLAIM)).contains(
        "\"incidentType\" (string, exactly one of \"Theft\", \"Fire\", \"Water\", \"Other\"), "
            + "\"claimAmount\" (number, from 0 to 50000)");
    assertThat(parser.formatInstructions(List.of(
        new LlmOutputField("amount", NUMBER, List.of(), null, new BigDecimal("10000")),
        new LlmOutputField("score", INTEGER, List.of(), new BigDecimal("-100"), null),
        new LlmOutputField("label", STRING, List.of("say \"yes\"", "no"), null, null))))
        .contains("\"amount\" (number, at most 10000), \"score\" (integer, at least -100), "
            + "\"label\" (string, exactly one of \"say \\\"yes\\\"\", \"no\")");
  }

}
