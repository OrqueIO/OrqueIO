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
import java.util.List;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import io.orqueio.bpm.spring.boot.starter.ai.property.OrqueioBpmAiProperties;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.aop.support.AopUtils;
import org.springframework.util.ClassUtils;

/**
 * Resolves a provider id to the {@link ChatModel} the application has configured.
 * Applications add the Spring AI starter of each provider they use; this registry
 * only looks up what is present.
 */
public class ChatModelRegistry {

  public static final String DEFAULT_PROVIDER_PROPERTY = OrqueioBpmAiProperties.PREFIX + ".default-provider";

  private final Supplier<List<ChatModel>> chatModels;
  private final String defaultProvider;

  /**
   * @param chatModels supplies the configured models; read on each lookup so that
   *                   creation order between auto-configurations does not matter
   * @param defaultProvider provider id used when a task names none, may be {@code null}
   */
  public ChatModelRegistry(Supplier<List<ChatModel>> chatModels, String defaultProvider) {
    // A mistyped id fails at startup; whether its model is configured is checked on use
    if (defaultProvider != null && !defaultProvider.isBlank() && LlmProvider.fromId(defaultProvider).isEmpty()) {
      throw new LlmProviderException("Unknown LLM provider '" + defaultProvider + "' in "
          + DEFAULT_PROVIDER_PROPERTY + ". Supported providers: " + supportedIds());
    }
    this.chatModels = chatModels;
    this.defaultProvider = defaultProvider;
  }

  /**
   * @param providerId a provider id such as {@code openai} or {@code ollama};
   *                   {@code null} or blank selects the default provider
   */
  public ChatModel getChatModel(String providerId) {
    if (providerId == null || providerId.isBlank()) {
      return getDefaultChatModel();
    }
    LlmProvider provider = LlmProvider.fromId(providerId).orElseThrow(() -> new LlmProviderException(
        "Unknown LLM provider '" + providerId + "'. Supported providers: " + supportedIds()));
    return getConfiguredChatModel(provider);
  }

  public ChatModel getConfiguredChatModel(LlmProvider provider) {
    List<ChatModel> matches = chatModels.get().stream()
        .filter(model -> isInstance(model, provider))
        .toList();
    if (matches.isEmpty()) {
      throw new LlmProviderException("LLM provider '" + provider.getId() + "' is not configured. Add the "
          + provider.getStarterArtifactId() + " dependency and its spring.ai configuration.");
    }
    if (matches.size() > 1) {
      throw new LlmProviderException("Several " + provider.getChatModelClassName()
          + " beans are configured for LLM provider '" + provider.getId() + "'; define a single one.");
    }
    return matches.get(0);
  }

  /**
   * The model used when a task names no provider: the configured default
   * provider, or the only configured model.
   */
  public ChatModel getDefaultChatModel() {
    if (defaultProvider != null && !defaultProvider.isBlank()) {
      return getChatModel(defaultProvider);
    }
    List<ChatModel> models = chatModels.get();
    if (models.size() == 1) {
      return models.get(0);
    }
    if (models.isEmpty()) {
      throw new LlmProviderException(
          "No LLM provider is configured. Add the Spring AI starter of a supported provider: " + supportedIds());
    }
    throw new LlmProviderException("Several LLM providers are configured; set "
        + DEFAULT_PROVIDER_PROPERTY + " to one of: " + supportedIds());
  }

  /**
   * @return the id of the provider a task resolves to: the one it names, else the configured default,
   *         else the provider the model belongs to; ids are written as {@link LlmProvider} spells them
   */
  public String providerIdOf(String taskProvider, ChatModel model) {
    String named = taskProvider != null && !taskProvider.isBlank() ? taskProvider : defaultProvider;
    if (named != null && !named.isBlank()) {
      return LlmProvider.fromId(named).map(LlmProvider::getId).orElse(named.trim());
    }
    return providerIdOf(model);
  }

  /**
   * @return the id of the provider the model belongs to, or its class name if it is not a supported provider
   */
  public String providerIdOf(ChatModel model) {
    return Arrays.stream(LlmProvider.values())
        .filter(provider -> isInstance(model, provider))
        .map(LlmProvider::getId)
        .findFirst()
        .orElse(AopUtils.getTargetClass(model).getName());
  }

  protected boolean isInstance(ChatModel model, LlmProvider provider) {
    Class<?> modelClass = AopUtils.getTargetClass(model);
    try {
      Class<?> providerClass = ClassUtils.forName(provider.getChatModelClassName(), modelClass.getClassLoader());
      return providerClass.isAssignableFrom(modelClass);
    }
    catch (ClassNotFoundException | LinkageError e) {
      // The provider's starter is not on the classpath
      return false;
    }
  }

  protected static String supportedIds() {
    return Arrays.stream(LlmProvider.values())
        .map(LlmProvider::getId)
        .collect(Collectors.joining(", "));
  }

}
