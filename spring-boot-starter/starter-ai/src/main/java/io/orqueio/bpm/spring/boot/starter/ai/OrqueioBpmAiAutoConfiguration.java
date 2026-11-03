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

import io.orqueio.bpm.spring.boot.starter.OrqueioBpmAutoConfiguration;
import io.orqueio.bpm.spring.boot.starter.ai.property.OrqueioBpmAiProperties;
import io.orqueio.bpm.spring.boot.starter.ai.provider.ChatModelRegistry;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskProcessEnginePlugin;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Entry point of the AI integration. Does not require a model provider: an
 * application without a Spring AI provider starter still starts.
 */
@Configuration
@AutoConfigureAfter(OrqueioBpmAutoConfiguration.class)
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

}
