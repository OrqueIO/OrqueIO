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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.spring.boot.starter.ai.test.TestAiApplication;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
 * Runs LLM tasks end to end on a real engine. The only model is a stub that records
 * the prompts it receives and returns a prepared answer; no network is used.
 */
@SpringBootTest(classes = {TestAiApplication.class, LlmTaskDelegateIT.StubModelConfiguration.class},
    properties = "spring.ai.model.chat=none")
class LlmTaskDelegateIT {

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private ManagementService managementService;

  @Autowired
  private StubChatModel model;

  private Deployment deployment;

  @BeforeEach
  void reset() {
    model.prompts.clear();
  }

  @AfterEach
  void deleteDeployment() {
    if (deployment != null) {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

  @Test
  void shouldCallModelAndWriteOutputs() {
    deploy(property("orqueio.llm.inputs", "emailBody")
        + property("orqueio.llm.prompt", "Classify: {{emailBody}}")
        + property("orqueio.llm.outputs", "category:string, urgency:integer"));
    model.answer = "{\"category\":\"Theft\",\"urgency\":3}";

    ProcessInstance instance = startAndRunLlmTask(Map.of("emailBody", "My laptop was stolen", "iban", "FR76..."));

    assertThat(runtimeService.getVariables(instance.getId()))
        .containsEntry("category", "Theft")
        .containsEntry("urgency", 3L);
    assertThat(model.prompts).hasSize(1);
    Prompt prompt = model.prompts.get(0);
    assertThat(prompt.getSystemMessage().getText()).contains("\"category\" (string), \"urgency\" (integer)");
    assertThat(prompt.getUserMessage().getText()).isEqualTo("Classify: My laptop was stolen");
    assertThat(prompt.getInstructions()).hasSize(2);
    assertThat(prompt.toString()).doesNotContain("FR76");
  }

  @Test
  void shouldRequestModelNamedOnTask() {
    deploy(property("orqueio.llm.model", "qwen2.5:7b")
        + property("orqueio.llm.prompt", "Summarize")
        + property("orqueio.llm.outputs", "summary:string"));
    model.answer = "{\"summary\":\"ok\"}";

    startAndRunLlmTask(Map.of());

    assertThat(model.prompts.get(0).getOptions().getModel()).isEqualTo("qwen2.5:7b");
  }

  @Test
  void shouldLeaveModelToProviderConfigurationWhenNotNamed() {
    deploy(property("orqueio.llm.prompt", "Summarize") + property("orqueio.llm.outputs", "summary:string"));
    model.answer = "{\"summary\":\"ok\"}";

    startAndRunLlmTask(Map.of());

    Prompt prompt = model.prompts.get(0);
    assertThat(prompt.getOptions() == null || prompt.getOptions().getModel() == null).isTrue();
  }

  @Test
  void shouldFailTaskAndWriteNothingOnInvalidAnswer() {
    deploy(property("orqueio.llm.prompt", "Classify")
        + property("orqueio.llm.outputs", "category:string, urgency:integer"));
    model.answer = "{\"category\":\"Theft\",\"urgency\":\"high\"}";

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    Job job = managementService.createJobQuery().processInstanceId(instance.getId()).singleResult();

    assertThatThrownBy(() -> managementService.executeJob(job.getId()))
        .isInstanceOf(LlmTaskException.class)
        .hasMessage("Field 'urgency' of the model's answer is not of type integer");
    assertThat(runtimeService.getVariables(instance.getId())).doesNotContainKeys("category", "urgency");
  }

  private void deploy(String properties) {
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """.formatted(properties)).replace("<bpmn:endEvent id=\"End\" />", "<bpmn:userTask id=\"End\" />"))
        .deploy();
  }

  private ProcessInstance startAndRunLlmTask(Map<String, Object> variables) {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess", variables);
    Job job = managementService.createJobQuery().processInstanceId(instance.getId()).singleResult();
    managementService.executeJob(job.getId());
    return instance;
  }

  static class StubChatModel implements ChatModel {

    final List<Prompt> prompts = new ArrayList<>();
    String answer;

    @Override
    public ChatResponse call(Prompt prompt) {
      prompts.add(prompt);
      return new ChatResponse(List.of(new Generation(new AssistantMessage(answer))));
    }
  }

  @TestConfiguration
  static class StubModelConfiguration {

    @Bean
    StubChatModel stubChatModel() {
      return new StubChatModel();
    }
  }

}
