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
package io.orqueio.bpm.spring.boot.starter.ai.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.openai.OpenAiChatModel;

class ChatModelRegistryTest {

  private final ChatModel ollama = mock(OllamaChatModel.class);
  private final ChatModel openAi = mock(OpenAiChatModel.class);

  @Test
  void shouldResolveRequestedProvider() {
    ChatModelRegistry registry = registry(null, ollama, openAi);

    assertThat(registry.getChatModel("ollama")).isSameAs(ollama);
    assertThat(registry.getChatModel("openai")).isSameAs(openAi);
  }

  @Test
  void shouldIgnoreCaseOfProviderId() {
    assertThat(registry(null, ollama).getChatModel(" Ollama ")).isSameAs(ollama);
  }

  @Test
  void shouldResolveAzureOpenAiToOpenAiModel() {
    assertThat(registry(null, ollama, openAi).getChatModel("azure-openai")).isSameAs(openAi);
  }

  @Test
  void shouldRejectUnknownProvider() {
    assertThatThrownBy(() -> registry(null, ollama).getChatModel("foo"))
        .isInstanceOf(LlmProviderException.class)
        .hasMessageContaining("'foo'")
        .hasMessageContaining("openai, azure-openai, anthropic, mistral, ollama, gemini");
  }

  @Test
  void shouldNameStarterOfUnconfiguredProvider() {
    assertThatThrownBy(() -> registry(null, ollama).getChatModel("anthropic"))
        .isInstanceOf(LlmProviderException.class)
        .hasMessageContaining("'anthropic' is not configured")
        .hasMessageContaining("spring-ai-starter-model-anthropic");
  }

  @Test
  void shouldUseOnlyModelAsDefault() {
    ChatModelRegistry registry = registry(null, ollama);

    assertThat(registry.getChatModel(null)).isSameAs(ollama);
    assertThat(registry.getChatModel("")).isSameAs(ollama);
  }

  @Test
  void shouldUseDefaultProviderAmongSeveralModels() {
    assertThat(registry("openai", ollama, openAi).getDefaultChatModel()).isSameAs(openAi);
  }

  @Test
  void shouldRejectDefaultProviderThatIsNotConfigured() {
    assertThatThrownBy(() -> registry("mistral", ollama).getDefaultChatModel())
        .isInstanceOf(LlmProviderException.class)
        .hasMessageContaining("'mistral' is not configured");
  }

  @Test
  void shouldRequireDefaultProviderWhenSeveralModels() {
    assertThatThrownBy(() -> registry(null, ollama, openAi).getDefaultChatModel())
        .isInstanceOf(LlmProviderException.class)
        .hasMessageContaining("camunda.bpm.ai.default-provider");
  }

  @Test
  void shouldRejectUnknownDefaultProviderAtCreation() {
    assertThatThrownBy(() -> registry("open-ai", ollama))
        .isInstanceOf(LlmProviderException.class)
        .hasMessageContaining("'open-ai'")
        .hasMessageContaining("camunda.bpm.ai.default-provider");
  }

  @Test
  void shouldRejectSeveralModelsOfOneProvider() {
    ChatModel otherOllama = mock(OllamaChatModel.class);

    assertThatThrownBy(() -> registry(null, ollama, otherOllama).getChatModel("ollama"))
        .isInstanceOf(LlmProviderException.class)
        .hasMessageContaining("Several org.springframework.ai.ollama.OllamaChatModel beans");
  }

  @Test
  void shouldNotResolveNullOrBlankId() {
    assertThat(LlmProvider.fromId(null)).isEmpty();
    assertThat(LlmProvider.fromId(" ")).isEmpty();
  }

  @Test
  void shouldFailWhenNoModelIsConfigured() {
    assertThatThrownBy(() -> registry(null).getDefaultChatModel())
        .isInstanceOf(LlmProviderException.class)
        .hasMessageContaining("No LLM provider is configured");
  }

  private static ChatModelRegistry registry(String defaultProvider, ChatModel... models) {
    return new ChatModelRegistry(() -> List.of(models), defaultProvider);
  }

}
