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

import java.time.Duration;

import io.orqueio.bpm.spring.boot.starter.OrqueioBpmAutoConfiguration;
import io.orqueio.bpm.spring.boot.starter.ai.cache.InMemoryLlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.InMemoryLlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.cache.RedisLlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.RedisLlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.property.OrqueioBpmAiProperties;
import io.orqueio.bpm.spring.boot.starter.ai.provider.ChatModelRegistry;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmAnswerParser;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmFailureClassifier;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmPromptResolver;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskDelegate;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskProcessEnginePlugin;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Entry point of the AI integration. Does not require a model provider: an
 * application without a Spring AI provider starter still starts.
 */
@Configuration
@AutoConfigureAfter(value = OrqueioBpmAutoConfiguration.class,
    name = "org.springframework.boot.data.redis.autoconfigure.DataRedisAutoConfiguration")
@ConditionalOnProperty(prefix = OrqueioBpmAiProperties.PREFIX, name = "enabled", matchIfMissing = true)
@EnableConfigurationProperties(OrqueioBpmAiProperties.class)
public class OrqueioBpmAiAutoConfiguration {

  @Bean
  @ConditionalOnMissingBean
  public ChatModelRegistry chatModelRegistry(ObjectProvider<ChatModel> chatModels, OrqueioBpmAiProperties properties) {
    return new ChatModelRegistry(() -> chatModels.orderedStream().toList(), properties.getDefaultProvider());
  }

  @Bean
  @ConditionalOnMissingBean
  public LlmTaskProcessEnginePlugin llmTaskProcessEnginePlugin(ChatModelRegistry chatModelRegistry) {
    return new LlmTaskProcessEnginePlugin(chatModelRegistry);
  }

  @Bean(LlmTaskDelegate.BEAN_NAME)
  @ConditionalOnMissingBean(name = LlmTaskDelegate.BEAN_NAME)
  public LlmTaskDelegate orqueioLlmTask(ChatModelRegistry chatModelRegistry, OrqueioBpmAiProperties properties,
                                        ObjectProvider<LlmAnswerStore> answerStore, ObjectProvider<LlmCallLock> callLock) {
    Duration timeout = properties.getTimeout();
    if (timeout == null || timeout.toMillis() < 1) {
      throw new IllegalStateException(OrqueioBpmAiProperties.PREFIX + ".timeout must be at least 1 millisecond, was " + timeout);
    }
    return new LlmTaskDelegate(chatModelRegistry, new LlmPromptResolver(), new LlmAnswerParser(),
        new LlmFailureClassifier(), timeout, answerStore.getIfAvailable(), callLock.getIfAvailable());
  }

  /**
   * Answer reuse in memory. Member classes are processed first, so the Redis beans win when Redis is present.
   */
  @Configuration
  @ConditionalOnProperty(prefix = OrqueioBpmAiProperties.PREFIX + ".cache", name = "enabled", matchIfMissing = true)
  static class AnswerReuseConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public LlmAnswerStore llmAnswerStore(OrqueioBpmAiProperties properties) {
      return new InMemoryLlmAnswerStore(validTimeToLive(properties));
    }

    @Bean
    @ConditionalOnMissingBean
    public LlmCallLock llmCallLock(OrqueioBpmAiProperties properties) {
      return new InMemoryLlmCallLock(validLockTimeToLive(properties));
    }

    /**
     * Answer reuse shared by every node, when the application has Redis.
     */
    @Configuration
    @ConditionalOnClass(StringRedisTemplate.class)
    @ConditionalOnBean(RedisConnectionFactory.class)
    @ConditionalOnProperty(prefix = OrqueioBpmAiProperties.PREFIX + ".cache.redis", name = "enabled", matchIfMissing = true)
    static class RedisAnswerReuseConfiguration {

      @Bean
      @ConditionalOnMissingBean
      public LlmAnswerStore llmAnswerStore(RedisConnectionFactory connectionFactory, OrqueioBpmAiProperties properties) {
        return new RedisLlmAnswerStore(new StringRedisTemplate(connectionFactory), validTimeToLive(properties));
      }

      @Bean
      @ConditionalOnMissingBean
      public LlmCallLock llmCallLock(RedisConnectionFactory connectionFactory, OrqueioBpmAiProperties properties) {
        return new RedisLlmCallLock(new StringRedisTemplate(connectionFactory), validLockTimeToLive(properties));
      }
    }
  }

  static Duration validTimeToLive(OrqueioBpmAiProperties properties) {
    Duration timeToLive = properties.getCache().getTimeToLive();
    if (timeToLive == null || timeToLive.toMillis() < 1) {
      throw new IllegalStateException(OrqueioBpmAiProperties.PREFIX + ".cache.time-to-live must be at least 1 millisecond, was " + timeToLive);
    }
    return timeToLive;
  }

  static Duration validLockTimeToLive(OrqueioBpmAiProperties properties) {
    Duration lockTimeToLive = properties.getCache().getLockTimeToLive();
    if (lockTimeToLive == null || lockTimeToLive.isNegative()) {
      throw new IllegalStateException(OrqueioBpmAiProperties.PREFIX + ".cache.lock-time-to-live must not be negative, was " + lockTimeToLive);
    }
    return lockTimeToLive;
  }

}
