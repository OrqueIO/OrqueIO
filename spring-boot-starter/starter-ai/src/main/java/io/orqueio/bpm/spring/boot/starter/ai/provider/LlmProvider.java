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

import java.util.Arrays;
import java.util.Optional;

/**
 * The model providers an LLM task can name. Each maps to the Spring AI
 * {@code ChatModel} implementation and the starter that provides it. Classes are
 * referenced by name so the starter does not depend on any provider.
 */
public enum LlmProvider {

  OPENAI("openai", "org.springframework.ai.openai.OpenAiChatModel", "spring-ai-starter-model-openai"),
  /**
   * Since Spring AI 2.0, models deployed on Azure / Microsoft Foundry are reached
   * through the OpenAI integration, configured with the Azure endpoint. It resolves
   * to the same {@code OpenAiChatModel} as {@link #OPENAI}: which service answers is
   * decided by the {@code spring.ai.openai} configuration, not by the id a task names.
   */
  AZURE_OPENAI("azure-openai", "org.springframework.ai.openai.OpenAiChatModel", "spring-ai-starter-model-openai"),
  ANTHROPIC("anthropic", "org.springframework.ai.anthropic.AnthropicChatModel", "spring-ai-starter-model-anthropic"),
  MISTRAL("mistral", "org.springframework.ai.mistralai.MistralAiChatModel", "spring-ai-starter-model-mistral-ai"),
  OLLAMA("ollama", "org.springframework.ai.ollama.OllamaChatModel", "spring-ai-starter-model-ollama"),
  GEMINI("gemini", "org.springframework.ai.google.genai.GoogleGenAiChatModel", "spring-ai-starter-model-google-genai");

  private final String id;
  private final String chatModelClassName;
  private final String starterArtifactId;

  LlmProvider(String id, String chatModelClassName, String starterArtifactId) {
    this.id = id;
    this.chatModelClassName = chatModelClassName;
    this.starterArtifactId = starterArtifactId;
  }

  public String getId() {
    return id;
  }

  public String getChatModelClassName() {
    return chatModelClassName;
  }

  public String getStarterArtifactId() {
    return starterArtifactId;
  }

  public static Optional<LlmProvider> fromId(String id) {
    if (id == null || id.isBlank()) {
      return Optional.empty();
    }
    return Arrays.stream(values())
        .filter(provider -> provider.id.equalsIgnoreCase(id.trim()))
        .findFirst();
  }

}
