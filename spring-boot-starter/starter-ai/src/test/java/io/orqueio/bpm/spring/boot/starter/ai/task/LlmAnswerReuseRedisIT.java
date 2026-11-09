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

import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskDeploymentIT.process;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskDeploymentIT.property;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.cache.RedisLlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.RedisLlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.test.TestAiApplication;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * An application with Redis keeps answers in Redis, where every node finds them.
 * Skipped when Docker is not available.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = {TestAiApplication.class, LlmAnswerReuseRedisIT.StubModelConfiguration.class},
    // Re-enables the Redis auto-configuration that the other tests exclude
    properties = {"spring.ai.model.chat=none", "spring.autoconfigure.exclude="})
class LlmAnswerReuseRedisIT {

  @Container
  static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7.4-alpine").withExposedPorts(6379);

  @DynamicPropertySource
  static void redis(DynamicPropertyRegistry registry) {
    registry.add("spring.data.redis.host", REDIS::getHost);
    registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
  }

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private ManagementService managementService;

  @Autowired
  private LlmAnswerStore answerStore;

  @Autowired
  private LlmCallLock callLock;

  @Autowired
  private StringRedisTemplate redis;

  @Autowired
  private CountingChatModel model;

  private Deployment deployment;

  @AfterEach
  void deleteDeployment() {
    if (deployment != null) {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

  @Test
  void shouldKeepAnswersInRedis() {
    assertThat(answerStore).isInstanceOf(RedisLlmAnswerStore.class);
    assertThat(callLock).isInstanceOf(RedisLlmCallLock.class);

    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """.formatted(property("orqueio.llm.prompt", "Classify through Redis")
        + property("orqueio.llm.outputs", "category:string")))).deploy();

    runLlmTask();
    runLlmTask();

    assertThat(model.calls).hasValue(1);
    assertThat(redis.keys(RedisLlmAnswerStore.KEY_PREFIX + "*")).hasSize(1);
    // The lock is released once the call ended
    assertThat(redis.keys(RedisLlmCallLock.KEY_PREFIX + "*")).isEmpty();
  }

  private void runLlmTask() {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    managementService.executeJob(managementService.createJobQuery().processInstanceId(instance.getId()).singleResult().getId());
  }

  static class CountingChatModel implements ChatModel {

    final AtomicInteger calls = new AtomicInteger();

    @Override
    public ChatResponse call(Prompt prompt) {
      calls.incrementAndGet();
      return new ChatResponse(List.of(new Generation(new AssistantMessage("{\"category\":\"Theft\"}"))));
    }
  }

  @TestConfiguration
  static class StubModelConfiguration {

    @Bean
    CountingChatModel countingChatModel() {
      return new CountingChatModel();
    }
  }

}
