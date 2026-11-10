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

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.TaskService;
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
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.ai.retry.TransientAiException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/**
 * Runs LLM tasks end to end on a real engine. The only model is a stub that records
 * the prompts it receives and returns a prepared answer; no network is used.
 */
@SpringBootTest(classes = {TestAiApplication.class, LlmTaskDelegateIT.StubModelConfiguration.class},
    // Answer reuse has its own test: here every attempt must call the model
    properties = {"spring.ai.model.chat=none", "camunda.bpm.ai.cache.enabled=false"})
class LlmTaskDelegateIT {

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private ManagementService managementService;

  @Autowired
  private TaskService taskService;

  @Autowired
  private StubChatModel model;

  private Deployment deployment;

  @BeforeEach
  void reset() {
    model.prompts.clear();
    model.failure = null;
    model.delay = null;
    model.interrupted = false;
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
  void shouldRequestModelNamedOnTaskWithProviderOptions() {
    deploy(property("orqueio.llm.model", "qwen2.5:7b")
        + property("orqueio.llm.prompt", "Summarize")
        + property("orqueio.llm.outputs", "summary:string"));
    model.answer = "{\"summary\":\"ok\"}";

    startAndRunLlmTask(Map.of());

    // Providers cast prompt options to their own class: it must be kept, with its other settings
    ChatOptions options = model.prompts.get(0).getOptions();
    assertThat(options).isInstanceOf(OllamaChatOptions.class);
    assertThat(options.getModel()).isEqualTo("qwen2.5:7b");
    assertThat(options.getTemperature()).isEqualTo(0.0);
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
        .hasMessage("Field 'urgency' of the model's answer is not a valid integer");
    assertThat(runtimeService.getVariables(instance.getId())).doesNotContainKeys("category", "urgency");
  }

  @Test
  void shouldRaiseIncidentAtOnceWhenProviderRejectsRequest() {
    deploy(property("orqueio.llm.prompt", "Summarize") + property("orqueio.llm.outputs", "summary:string"));
    model.failure = new NonTransientAiException("HTTP 401 - invalid api key for prompt 'Summarize: IBAN FR76'");

    Job job = startAndFailLlmTask();

    // No retry left: the incident is raised on the first failure, and the model is called once
    assertThat(job.getRetries()).isZero();
    assertThat(job.getExceptionMessage()).isEqualTo("The model provider rejected the request (HTTP 401)");
    assertThat(managementService.getJobExceptionStacktrace(job.getId())).doesNotContain("FR76");
    assertThat(runtimeService.createIncidentQuery().configuration(job.getId()).count()).isEqualTo(1);
    assertThat(model.prompts).hasSize(1);
  }

  @Test
  void shouldRaiseIncidentAtOnceWithCustomRetryCycle() {
    deploy(property("orqueio.llm.prompt", "Summarize") + property("orqueio.llm.outputs", "summary:string"), "",
        "<camunda:failedJobRetryTimeCycle>R5/PT1H</camunda:failedJobRetryTimeCycle>");
    model.failure = new NonTransientAiException("HTTP 400 - bad request");

    Job job = startAndFailLlmTask();

    assertThat(job.getRetries()).isZero();
    // Runs at once when an operator sets retries again, not an hour later
    assertThat(job.getDuedate()).isNull();
  }

  @Test
  void shouldRetryWithCustomRetryCycle() {
    deploy(property("orqueio.llm.prompt", "Summarize") + property("orqueio.llm.outputs", "summary:string"), "",
        "<camunda:failedJobRetryTimeCycle>R5/PT1H</camunda:failedJobRetryTimeCycle>");
    model.failure = new TransientAiException("HTTP 503 - overloaded");

    Job job = startAndFailLlmTask();

    assertThat(job.getRetries()).isEqualTo(4);
    assertThat(job.getDuedate()).isNotNull();
  }

  @Test
  void shouldRetryWhenProviderFailsTemporarily() {
    deploy(property("orqueio.llm.prompt", "Summarize") + property("orqueio.llm.outputs", "summary:string"));
    model.failure = new TransientAiException("HTTP 503 - overloaded");

    Job job = startAndFailLlmTask();

    assertThat(job.getRetries()).isEqualTo(2);
    assertThat(job.getExceptionMessage()).isEqualTo("The model call failed (HTTP 503)");
    assertThat(runtimeService.createIncidentQuery().count()).isZero();
  }

  @Test
  void shouldRetryWhenModelDoesNotAnswerInTime() {
    deploy(property("orqueio.llm.prompt", "Summarize") + property("orqueio.llm.outputs", "summary:string")
        + property("orqueio.llm.timeout", "PT0.2S"));
    model.answer = "{\"summary\":\"too late\"}";
    model.delay = Duration.ofSeconds(5);

    long start = System.nanoTime();
    Job job = startAndFailLlmTask();

    assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(3));
    assertThat(job.getRetries()).isEqualTo(2);
    assertThat(job.getExceptionMessage()).isEqualTo("The model did not answer within PT0.2S");
    assertThat(runtimeService.createProcessInstanceQuery().singleResult()).isNotNull();
    // The abandoned call is interrupted
    long deadline = System.nanoTime() + Duration.ofSeconds(3).toNanos();
    while (!model.interrupted && System.nanoTime() < deadline) {
      Thread.onSpinWait();
    }
    assertThat(model.interrupted).isTrue();
  }

  @Test
  void shouldRaiseIncidentAtOnceOnInvalidAnswerWithoutErrorCode() {
    deploy(property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", "urgency:integer"));
    model.answer = "{\"urgency\":\"high\"}";

    Job job = startAndFailLlmTask();

    assertThat(job.getRetries()).isZero();
    assertThat(job.getExceptionMessage()).isEqualTo("Field 'urgency' of the model's answer is not a valid integer");
  }

  @Test
  void shouldThrowBpmnErrorOnInvalidAnswerWithErrorCode() {
    deploy(property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", "category:string, urgency:integer")
        + property("orqueio.llm.errorCode", "LLM_INVALID_ANSWER"), """
        <bpmn:boundaryEvent id="Catch_Invalid" attachedToRef="Task_Llm">
          <bpmn:errorEventDefinition errorRef="Error_Invalid" camunda:errorMessageVariable="llmError" />
        </bpmn:boundaryEvent>
        <bpmn:sequenceFlow id="Flow_Invalid" sourceRef="Catch_Invalid" targetRef="Review" />
        <bpmn:userTask id="Review" />
        """);
    model.answer = "{\"category\":\"Theft\",\"urgency\":\"high\"}";

    ProcessInstance instance = startAndRunLlmTask(Map.of());

    assertThat(taskService.createTaskQuery().processInstanceId(instance.getId()).singleResult().getTaskDefinitionKey())
        .isEqualTo("Review");
    assertThat(runtimeService.getVariables(instance.getId()))
        .doesNotContainKeys("category", "urgency")
        .containsEntry("llmError", "Field 'urgency' of the model's answer is not a valid integer");
  }

  @Test
  void shouldRaiseIncidentWhenNothingCatchesTheErrorCode() {
    // Otherwise the engine would end the execution silently
    deploy(property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", "urgency:integer")
        + property("orqueio.llm.errorCode", "LLM_INVALID_ANSWER"));
    model.answer = "{\"urgency\":\"high\"}";

    Job job = startAndFailLlmTask();

    assertThat(job.getRetries()).isZero();
    assertThat(job.getExceptionMessage()).isEqualTo("Field 'urgency' of the model's answer is not a valid integer");
  }

  private void deploy(String properties) {
    deploy(properties, "");
  }

  private void deploy(String properties, String otherElements) {
    deploy(properties, otherElements, "");
  }

  private void deploy(String properties, String otherElements, String otherExtensions) {
    String bpmn = process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
            %s
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        %s
        """.formatted(properties, otherExtensions, otherElements)).replace("<bpmn:endEvent id=\"End\" />", "<bpmn:userTask id=\"End\" />");
    if (!otherElements.isEmpty()) {
      bpmn = bpmn.replace("<bpmn:process ", "<bpmn:error id=\"Error_Invalid\" errorCode=\"LLM_INVALID_ANSWER\" />\n<bpmn:process ");
    }
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", bpmn).deploy();
  }

  private Job startAndFailLlmTask() {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    Job job = managementService.createJobQuery().processInstanceId(instance.getId()).singleResult();
    assertThatThrownBy(() -> managementService.executeJob(job.getId())).isInstanceOf(LlmTaskException.class);
    return managementService.createJobQuery().jobId(job.getId()).singleResult();
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
    RuntimeException failure;
    Duration delay;
    volatile boolean interrupted;

    // Like a configured provider: its own options class, with settings from application configuration
    @Override
    public ChatOptions getOptions() {
      return OllamaChatOptions.builder().model("default-model").temperature(0.0).build();
    }

    @Override
    public ChatResponse call(Prompt prompt) {
      prompts.add(prompt);
      if (failure != null) {
        throw failure;
      }
      if (delay != null) {
        try {
          Thread.sleep(delay);
        }
        catch (InterruptedException e) {
          interrupted = true;
          Thread.currentThread().interrupt();
        }
      }
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
