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

import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmOutputField.Type.NUMBER;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmOutputField.Type.STRING;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.spring.boot.starter.ai.provider.ChatModelRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class LlmTaskAuditorTest {

  private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-09T14:02:11Z"), ZoneOffset.UTC);

  private final ChatModel ollama = mock(OllamaChatModel.class);
  private final ChatModelRegistry registry = new ChatModelRegistry(() -> List.of(ollama), null);
  private final LlmTaskConfiguration configuration = new LlmTaskConfiguration(null, null, "Classify: {{text}}",
      List.of("text"), List.of(new LlmOutputField("category", STRING)));

  @Test
  void shouldNameProviderByIdAndFallBackToRequestedModel() {
    when(ollama.getOptions()).thenReturn(OllamaChatOptions.builder().model("qwen2.5:7b").build());
    // A response without metadata, as some providers return
    ChatResponse response = new ChatResponse(List.of(new Generation(new AssistantMessage("{}"))));

    JsonNode audit = record(new LlmTaskAuditor(registry, false, CLOCK), prompt(null), LlmModelAnswer.called("{}", response));

    assertThat(audit.get("provider").asString()).isEqualTo("ollama");
    assertThat(audit.get("model").asString()).isEqualTo("qwen2.5:7b");
    assertThat(audit.get("recordedAt").asString()).isEqualTo("2026-11-09T14:02:11Z");
    assertThat(audit.get("latencyMs").asLong()).isEqualTo(3200);
    // No usage reported: unknown, not free
    assertThat(audit.get("inputTokens").isNull()).isTrue();
    assertThat(audit.get("outputTokens").isNull()).isTrue();
  }

  @Test
  void shouldRecordProviderIdAsSupportedProvidersSpellIt() {
    ChatModelRegistry withDefault = new ChatModelRegistry(() -> List.of(ollama), "AZURE-OpenAI");

    assertThat(withDefault.providerIdOf(null, ollama)).isEqualTo("azure-openai");
    assertThat(registry.providerIdOf("Ollama", ollama)).isEqualTo("ollama");
    assertThat(registry.providerIdOf(null, ollama)).isEqualTo("ollama");
  }

  @Test
  void shouldShortenContentToFitTheVariableColumn() {
    String longPrompt = "Classify: " + "\"stolen\" bike ".repeat(400);
    String longAnswer = "{\"category\":\"" + "Theft ".repeat(500) + "\"}";

    DelegateExecution execution = mock(DelegateExecution.class);
    when(execution.getCurrentActivityId()).thenReturn("Task_Llm");
    new LlmTaskAuditor(registry, true, CLOCK).record(execution, configuration, ollama, prompt(null), longPrompt,
        LlmModelAnswer.reused(longAnswer), Duration.ofMillis(3200), LlmTaskAuditor.Outcome.VALID);

    ArgumentCaptor<Object> value = ArgumentCaptor.forClass(Object.class);
    verify(execution).setVariable(eq("orqueioLlm_Task_Llm"), value.capture());
    String record = (String) value.getValue();
    assertThat(record).hasSizeLessThanOrEqualTo(LlmTaskAuditor.MAX_RECORD_LENGTH);
    JsonNode audit = JsonMapper.builder().build().readTree(record);
    assertThat(audit.get("truncated").asBoolean()).isTrue();
    assertThat(audit.get("prompt").asString()).startsWith("Classify: \"stolen\" bike");
    assertThat(audit.get("outcome").asString()).isEqualTo("VALID");
  }

  @Test
  void shouldPreferModelNamedOnTask() {
    JsonNode audit = record(new LlmTaskAuditor(registry, false, CLOCK), prompt("llama3.2"),
        LlmModelAnswer.reused("{\"category\":\"Theft\"}"));

    assertThat(audit.get("model").asString()).isEqualTo("llama3.2");
  }

  @Test
  void shouldRecordPromptAndAnswerOnlyWhenAsked() {
    LlmModelAnswer answer = LlmModelAnswer.reused("{\"category\":\"Theft\"}");

    JsonNode withContent = record(new LlmTaskAuditor(registry, true, CLOCK), prompt(null), answer);

    assertThat(withContent.get("prompt").asString()).isEqualTo("Classify: my bike was stolen");
    assertThat(withContent.get("answer").asString()).isEqualTo("{\"category\":\"Theft\"}");
  }

  @Test
  void shouldChangePromptVersionWithTemplateOrOutputs() {
    LlmTaskAuditor auditor = new LlmTaskAuditor(registry, false, CLOCK);
    String version = auditor.promptVersion(configuration);

    assertThat(auditor.promptVersion(new LlmTaskConfiguration("ollama", "other-model", "Classify: {{text}}",
        List.of("text"), List.of(new LlmOutputField("category", STRING))))).isEqualTo(version);
    assertThat(auditor.promptVersion(new LlmTaskConfiguration(null, null, "Classify this: {{text}}",
        List.of("text"), List.of(new LlmOutputField("category", STRING))))).isNotEqualTo(version);
    assertThat(auditor.promptVersion(new LlmTaskConfiguration(null, null, "Classify: {{text}}",
        List.of("text"), List.of(new LlmOutputField("label", STRING))))).isNotEqualTo(version);
    assertThat(version).hasSize(64);
  }

  @Test
  void shouldChangePromptVersionWithAllowedValuesOrBounds() {
    LlmTaskAuditor auditor = new LlmTaskAuditor(registry, false, CLOCK);
    String free = auditor.promptVersion(withOutputs(new LlmOutputField("category", STRING)));
    String listed = auditor.promptVersion(withOutputs(
        new LlmOutputField("category", STRING, List.of("Theft", "Fire"), null, null)));
    String bounded = auditor.promptVersion(withOutputs(
        new LlmOutputField("category", NUMBER, List.of(), BigDecimal.ZERO, new BigDecimal("10"))));

    assertThat(listed).isNotEqualTo(free);
    assertThat(auditor.promptVersion(withOutputs(new LlmOutputField("category", STRING, List.of("Theft", "Water"), null, null))))
        .isNotEqualTo(listed);
    assertThat(auditor.promptVersion(withOutputs(new LlmOutputField("category", NUMBER, List.of(), BigDecimal.ZERO, null))))
        .isNotEqualTo(bounded);
    // Unconstrained outputs keep the version they had before constraints existed
    assertThat(new LlmOutputField("category", STRING).declaration()).isEqualTo("category:string");
    assertThat(new LlmOutputField("category", NUMBER, List.of(), null, new BigDecimal("10")).declaration())
        .isEqualTo("category:number[..10]");
  }

  private LlmTaskConfiguration withOutputs(LlmOutputField output) {
    return new LlmTaskConfiguration(null, null, "Classify: {{text}}", List.of("text"), List.of(output));
  }

  private JsonNode record(LlmTaskAuditor auditor, Prompt prompt, LlmModelAnswer answer) {
    DelegateExecution execution = mock(DelegateExecution.class);
    when(execution.getCurrentActivityId()).thenReturn("Task_Llm");

    auditor.record(execution, configuration, ollama, prompt, "Classify: my bike was stolen", answer,
        Duration.ofMillis(3200), LlmTaskAuditor.Outcome.VALID);

    ArgumentCaptor<Object> value = ArgumentCaptor.forClass(Object.class);
    verify(execution).setVariable(eq("orqueioLlm_Task_Llm"), value.capture());
    return JsonMapper.builder().build().readTree((String) value.getValue());
  }

  private static Prompt prompt(String model) {
    List<org.springframework.ai.chat.messages.Message> messages = List.of(new UserMessage("Classify: my bike was stolen"));
    return model == null ? new Prompt(messages) : new Prompt(messages, ChatOptions.builder().model(model).build());
  }

}
