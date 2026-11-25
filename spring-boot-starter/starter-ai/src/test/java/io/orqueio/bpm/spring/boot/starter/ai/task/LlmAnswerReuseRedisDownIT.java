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

import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.RedisLlmAnswerStore;
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

/**
 * Answer reuse saves calls but must never fail the task: with the application's Redis
 * unreachable, the LLM task still calls the model and completes.
 */
@SpringBootTest(classes = {TestAiApplication.class, LlmAnswerReuseRedisDownIT.StubModelConfiguration.class},
    properties = {"spring.ai.model.chat=none", "spring.autoconfigure.exclude=",
        // Nothing listens on this port
        "spring.data.redis.port=1", "spring.data.redis.connect-timeout=200ms", "spring.data.redis.timeout=200ms"})
class LlmAnswerReuseRedisDownIT {

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private ManagementService managementService;

  @Autowired
  private LlmAnswerStore answerStore;

  private Deployment deployment;

  @AfterEach
  void deleteDeployment() {
    if (deployment != null) {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

  @Test
  void shouldCallModelWhenRedisIsUnreachable() {
    assertThat(answerStore).isInstanceOf(RedisLlmAnswerStore.class);
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """.formatted(property("orqueio.llm.prompt", "Classify without Redis") + property("orqueio.llm.outputs", "category:string")))
        .replace("<bpmn:endEvent id=\"End\" />", "<bpmn:userTask id=\"End\" />")).deploy();

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    managementService.executeJob(managementService.createJobQuery().processInstanceId(instance.getId()).singleResult().getId());

    assertThat(runtimeService.getVariable(instance.getId(), "category")).isEqualTo("Theft");
  }

  @TestConfiguration
  static class StubModelConfiguration {

    @Bean
    ChatModel stubChatModel() {
      return new ChatModel() {
        @Override
        public ChatResponse call(Prompt prompt) {
          return new ChatResponse(List.of(new Generation(new AssistantMessage("{\"category\":\"Theft\"}"))));
        }
      };
    }
  }

}
