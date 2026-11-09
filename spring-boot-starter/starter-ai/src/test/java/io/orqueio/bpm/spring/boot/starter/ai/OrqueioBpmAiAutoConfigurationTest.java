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
package io.orqueio.bpm.spring.boot.starter.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import io.orqueio.bpm.spring.boot.starter.ai.cache.InMemoryLlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.InMemoryLlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.cache.RedisLlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.RedisLlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.property.OrqueioBpmAiProperties;
import io.orqueio.bpm.spring.boot.starter.ai.provider.ChatModelRegistry;
import io.orqueio.bpm.spring.boot.starter.ai.provider.LlmProviderException;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskDelegate;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskProcessEnginePlugin;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.context.annotation.ImportCandidates;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.data.redis.connection.RedisConnectionFactory;

class OrqueioBpmAiAutoConfigurationTest {

  private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
      .withConfiguration(AutoConfigurations.of(OrqueioBpmAiAutoConfiguration.class));

  @Test
  void shouldBeRegisteredAsAutoConfiguration() {
    ImportCandidates candidates = ImportCandidates.load(AutoConfiguration.class, getClass().getClassLoader());

    assertThat(candidates.getCandidates()).contains(OrqueioBpmAiAutoConfiguration.class.getName());
  }

  @Test
  void shouldBeEnabledByDefault() {
    contextRunner.run(context -> {
      assertThat(context).hasSingleBean(OrqueioBpmAiAutoConfiguration.class);
      assertThat(context.getBean(OrqueioBpmAiProperties.class).isEnabled()).isTrue();
    });
  }

  @Test
  void shouldRejectTimeoutBelowOneMillisecond() {
    contextRunner.withPropertyValues(OrqueioBpmAiProperties.PREFIX + ".timeout=0s")
        .run(context -> assertThat(context).hasFailed()
            .getFailure().rootCause().hasMessageContaining(OrqueioBpmAiProperties.PREFIX + ".timeout must be at least 1 millisecond"));
  }

  @Test
  void shouldReuseAnswersInMemoryByDefault() {
    contextRunner.run(context -> {
      assertThat(context).hasSingleBean(InMemoryLlmAnswerStore.class);
      assertThat(context).hasSingleBean(InMemoryLlmCallLock.class);
    });
  }

  @Test
  void shouldNotReuseAnswersWhenCacheIsDisabled() {
    contextRunner.withPropertyValues(OrqueioBpmAiProperties.PREFIX + ".cache.enabled=false")
        .run(context -> {
          assertThat(context).doesNotHaveBean(LlmAnswerStore.class);
          assertThat(context).doesNotHaveBean(LlmCallLock.class);
          assertThat(context).hasSingleBean(LlmTaskDelegate.class);
        });
  }

  @Test
  void shouldReuseAnswersInRedisWhenApplicationHasRedis() {
    contextRunner.withBean(RedisConnectionFactory.class, () -> mock(RedisConnectionFactory.class))
        .run(context -> {
          assertThat(context).hasSingleBean(RedisLlmAnswerStore.class);
          assertThat(context).hasSingleBean(RedisLlmCallLock.class);
        });
  }

  @Test
  void shouldRequireLockToOutliveTimeout() {
    contextRunner.withPropertyValues(OrqueioBpmAiProperties.PREFIX + ".timeout=PT5M",
            OrqueioBpmAiProperties.PREFIX + ".cache.lock-time-to-live=PT5M")
        .run(context -> assertThat(context).hasFailed()
            .getFailure().rootCause().hasMessageContaining(".cache.lock-time-to-live (PT5M) must be longer than"));
  }

  @Test
  void shouldStartWithoutModelProvider() {
    // Hide the providers that the test classpath carries for the ITs
    contextRunner.withClassLoader(new FilteredClassLoader("org.springframework.ai.ollama", "org.springframework.ai.openai"))
        .run(context -> {
          assertThat(context).hasNotFailed();
          assertThat(context).doesNotHaveBean(ChatModel.class);
          assertThat(context).hasSingleBean(OrqueioBpmAiAutoConfiguration.class);
          assertThat(context).hasSingleBean(ChatModelRegistry.class);
          assertThat(context).hasSingleBean(LlmTaskProcessEnginePlugin.class);
        });
  }

  @Test
  void shouldSelectDefaultProviderAmongSeveralModelBeans() {
    ChatModel ollama = mock(OllamaChatModel.class);
    ChatModel openAi = mock(OpenAiChatModel.class);

    contextRunner
        .withBean("ollamaChatModel", ChatModel.class, () -> ollama)
        .withBean("openAiChatModel", ChatModel.class, () -> openAi)
        .withPropertyValues(OrqueioBpmAiProperties.PREFIX + ".default-provider=openai")
        .run(context -> {
          ChatModelRegistry registry = context.getBean(ChatModelRegistry.class);
          assertThat(registry.getDefaultChatModel()).isSameAs(openAi);
          assertThat(registry.getChatModel("ollama")).isSameAs(ollama);
        });
  }

  @Test
  void shouldRequireDefaultProviderAmongSeveralModelBeans() {
    contextRunner
        .withBean("ollamaChatModel", ChatModel.class, () -> mock(OllamaChatModel.class))
        .withBean("openAiChatModel", ChatModel.class, () -> mock(OpenAiChatModel.class))
        .run(context -> assertThatThrownBy(() -> context.getBean(ChatModelRegistry.class).getDefaultChatModel())
            .isInstanceOf(LlmProviderException.class)
            .hasMessageContaining(ChatModelRegistry.DEFAULT_PROVIDER_PROPERTY));
  }

  @Test
  void shouldFailStartupOnUnknownDefaultProvider() {
    contextRunner
        .withPropertyValues(OrqueioBpmAiProperties.PREFIX + ".default-provider=open-ai")
        .run(context -> assertThat(context).hasFailed()
            .getFailure().rootCause().hasMessageContaining("'open-ai'"));
  }

  @Test
  void shouldBeDisabledByProperty() {
    contextRunner
        .withPropertyValues(OrqueioBpmAiProperties.PREFIX + ".enabled=false")
        .run(context -> {
          assertThat(context).hasNotFailed();
          assertThat(context).doesNotHaveBean(OrqueioBpmAiAutoConfiguration.class);
          assertThat(context).doesNotHaveBean(OrqueioBpmAiProperties.class);
          assertThat(context).doesNotHaveBean(ChatModelRegistry.class);
          assertThat(context).doesNotHaveBean(LlmTaskProcessEnginePlugin.class);
        });
  }

}
