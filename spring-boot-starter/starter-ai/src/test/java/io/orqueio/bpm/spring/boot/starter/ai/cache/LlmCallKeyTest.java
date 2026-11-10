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
package io.orqueio.bpm.spring.boot.starter.ai.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.ai.openai.OpenAiChatModel;

class LlmCallKeyTest {

  private final ChatModel ollama = mock(OllamaChatModel.class);

  @Test
  void shouldGiveSameKeyForSameRequestOfSameJob() {
    assertThat(LlmCallKey.of("job-1", ollama, prompt("Classify: stolen bike", "qwen")))
        .isEqualTo(LlmCallKey.of("job-1", ollama, prompt("Classify: stolen bike", "qwen")));
  }

  @Test
  void shouldNotContainPromptInClear() {
    String key = LlmCallKey.of("job-1", ollama, prompt("IBAN FR76 1234", null));

    assertThat(key).hasSize(64).matches("[0-9a-f]+").doesNotContain("FR76");
  }

  @Test
  void shouldDifferWhenAnythingSentDiffers() {
    String key = LlmCallKey.of("job-1", ollama, prompt("Classify: stolen bike", "qwen"));

    // Another job, for example another process instance with the same input, does not reuse the answer
    assertThat(LlmCallKey.of("job-2", ollama, prompt("Classify: stolen bike", "qwen"))).isNotEqualTo(key);
    assertThat(LlmCallKey.of("job-1", mock(OpenAiChatModel.class), prompt("Classify: stolen bike", "qwen"))).isNotEqualTo(key);
    assertThat(LlmCallKey.of("job-1", ollama, prompt("Classify: stolen bike", "llama"))).isNotEqualTo(key);
    assertThat(LlmCallKey.of("job-1", ollama, prompt("Classify: stolen car", "qwen"))).isNotEqualTo(key);
  }

  @Test
  void shouldUseProviderModelWhenTaskNamesNone() {
    ChatModel withQwen = mock(OllamaChatModel.class);
    when(withQwen.getOptions()).thenReturn(OllamaChatOptions.builder().model("qwen").build());
    ChatModel withLlama = mock(OllamaChatModel.class);
    when(withLlama.getOptions()).thenReturn(OllamaChatOptions.builder().model("llama").build());

    assertThat(LlmCallKey.of(null, withQwen, prompt("Summarize", null)))
        .isNotEqualTo(LlmCallKey.of(null, withLlama, prompt("Summarize", null)));
  }

  @Test
  void shouldNotMixUpMessageBoundaries() {
    Prompt first = new Prompt(List.of(new SystemMessage("ab"), new UserMessage("c")));
    Prompt second = new Prompt(List.of(new SystemMessage("a"), new UserMessage("bc")));

    assertThat(LlmCallKey.of(null, ollama, first)).isNotEqualTo(LlmCallKey.of(null, ollama, second));
  }

  private static Prompt prompt(String user, String model) {
    List<org.springframework.ai.chat.messages.Message> messages =
        List.of(new SystemMessage("Answer with a JSON object"), new UserMessage(user));
    return model == null ? new Prompt(messages) : new Prompt(messages, ChatOptions.builder().model(model).build());
  }

}
