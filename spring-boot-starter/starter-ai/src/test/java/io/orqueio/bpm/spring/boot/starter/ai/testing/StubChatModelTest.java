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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;

import io.orqueio.bpm.spring.boot.starter.ai.provider.LlmProvider;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmFailureClassifier;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskException;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmTransientException;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;

class StubChatModelTest {

  private final StubChatModel model = new StubChatModel();

  @Test
  void shouldAnswerEveryCallWithTheDefaultAnswer() {
    model.answer("{\"category\":\"Theft\"}");

    assertThat(textOf(model.call(prompt("Classify", "a")))).isEqualTo("{\"category\":\"Theft\"}");
    assertThat(textOf(model.call(prompt("Classify", "b")))).isEqualTo("{\"category\":\"Theft\"}");
  }

  @Test
  void shouldGiveAnswersInTurnAndRepeatTheLast() {
    model.answer("first", "second");

    assertThat(List.of(textOf(model.call(prompt("x", "1"))), textOf(model.call(prompt("x", "2"))),
        textOf(model.call(prompt("x", "3"))))).containsExactly("first", "second", "second");
  }

  @Test
  void shouldTellTasksApartByAPhraseOfTheirPrompt() {
    model.answer("default")
        .when("Extract the facts").answer("facts")
        .when("Classify the email").answer("category");

    assertThat(textOf(model.call(prompt("Classify the email below", "...")))).isEqualTo("category");
    assertThat(textOf(model.call(prompt("Extract the facts of the claim", "...")))).isEqualTo("facts");
    assertThat(textOf(model.call(prompt("Summarize", "...")))).isEqualTo("default");
  }

  @Test
  void shouldMatchThePhraseInTheDataSentToo() {
    model.when("stolen").answer("Theft");

    assertThat(textOf(model.call(prompt("Classify", "{\"claimText\":\"My bike was stolen\"}")))).isEqualTo("Theft");
  }

  @Test
  void shouldFailAsAProviderWould() {
    model.fail(StubChatModel.providerError(429));

    assertThatThrownBy(() -> model.call(prompt("x", "y"))).hasMessageStartingWith("429 - ");
  }

  @Test
  void shouldRespondWithFailuresAndAnswersInTurn() {
    model.when("Classify").respond(StubChatModel.providerError(503), "{\"category\":\"Theft\"}");

    assertThatThrownBy(() -> model.call(prompt("Classify", "y")));
    assertThat(textOf(model.call(prompt("Classify", "y")))).isEqualTo("{\"category\":\"Theft\"}");
  }

  @Test
  void shouldRejectAResponseThatIsNeitherAnAnswerNorAFailure() {
    assertThatThrownBy(() -> model.respond(42)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldGiveProviderErrorsTheLlmTaskClassifiesByStatus() {
    LlmFailureClassifier classifier = new LlmFailureClassifier();

    assertThat(classifier.classify(StubChatModel.providerError(429))).isInstanceOf(LlmTransientException.class)
        .hasMessageContaining("HTTP 429");
    assertThat(classifier.classify(StubChatModel.providerError(503))).isInstanceOf(LlmTransientException.class);
    assertThat(classifier.classify(StubChatModel.providerError(401)))
        .isInstanceOf(LlmTaskException.class).isNotInstanceOf(LlmTransientException.class)
        .hasMessageContaining("HTTP 401");
  }

  @Test
  void shouldSayWhenItHasNoAnswerForAPrompt() {
    model.when("Classify").answer("x");

    assertThatThrownBy(() -> model.call(prompt("Summarize the claim", "...")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("no answer for this prompt")
        .hasMessageContaining("Summarize the claim");
  }

  @Test
  void shouldKeepThePromptsReceived() {
    model.answer("x");

    model.call(prompt("Classify", "first"));
    model.call(prompt("Classify", "second"));

    assertThat(model.calls()).isEqualTo(2);
    assertThat(model.prompts()).extracting(p -> p.getUserMessage().getText()).containsExactly("first", "second");
    assertThat(model.lastPromptText()).contains("Classify").contains("second");
  }

  @Test
  void shouldReportUsageAndModelAsAProviderDoes() {
    model.answer("x").reportUsage(312, 100).reportModel("claude-sonnet-5-5");

    ChatResponse response = model.call(prompt("x", "y"));

    assertThat(response.getMetadata().getModel()).isEqualTo("claude-sonnet-5-5");
    assertThat(response.getMetadata().getUsage().getPromptTokens()).isEqualTo(312);
    assertThat(response.getMetadata().getUsage().getCompletionTokens()).isEqualTo(100);
    assertThat(model.getOptions().getModel()).isEqualTo("claude-sonnet-5-5");
  }

  @Test
  void shouldReportNoUsageUnlessAsked() {
    ChatResponse response = model.answer("x").call(prompt("x", "y"));

    assertThat(response.getMetadata().getModel()).isEqualTo(StubChatModel.DEFAULT_MODEL);
    assertThat(response.getMetadata().getUsage().getTotalTokens()).isZero();
  }

  @Test
  void shouldRunTheActionOnEachCallBeforeAnswering() {
    List<String> seen = new ArrayList<>();
    model.answer("x").onCall(p -> seen.add(p.getUserMessage().getText()));

    model.call(prompt("x", "data"));

    assertThat(seen).containsExactly("data");
  }

  @Test
  void shouldStandInForEveryProviderUnlessLimited() {
    assertThat(LlmProvider.values()).allMatch(model::standsFor);
    assertThat(model.providerId()).isEqualTo(StubChatModel.PROVIDER_ID);

    model.standingFor(LlmProvider.OPENAI);

    assertThat(model.standsFor(LlmProvider.OPENAI)).isTrue();
    assertThat(model.standsFor(LlmProvider.ANTHROPIC)).isFalse();
  }

  @Test
  void shouldKeepTheAnswerChosenWhenTheCallStarted() {
    StubChatModel slow = new StubChatModel().answer("first", "second");
    // While the first call waits, the test prepares other answers
    slow.onCall(prompt -> slow.answer("changed meanwhile"));

    assertThat(textOf(slow.call(prompt("x", "1")))).isEqualTo("first");
  }

  @Test
  void shouldForgetEverythingOnReset() {
    List<String> seen = new ArrayList<>();
    model.answer("x").when("Classify").answer("y").reportUsage(1, 2).reportModel("m")
        .standingFor(LlmProvider.OPENAI).onCall(p -> seen.add("called"));
    model.call(prompt("Classify", "z"));

    model.reset();

    assertThat(model.calls()).isZero();
    assertThatThrownBy(() -> model.call(prompt("Classify", "z"))).isInstanceOf(IllegalStateException.class);
    ChatResponse response = model.answer("again").call(prompt("Classify", "z"));
    assertThat(response.getMetadata().getModel()).isEqualTo(StubChatModel.DEFAULT_MODEL);
    assertThat(response.getMetadata().getUsage().getTotalTokens()).isZero();
    assertThat(model.standsFor(LlmProvider.ANTHROPIC)).isTrue();
    assertThat(seen).containsExactly("called");
  }

  private static Prompt prompt(String instructions, String data) {
    return new Prompt(List.of(new SystemMessage(instructions), new UserMessage(data)));
  }

  private static String textOf(ChatResponse response) {
    return response.getResult().getOutput().getText();
  }

}
