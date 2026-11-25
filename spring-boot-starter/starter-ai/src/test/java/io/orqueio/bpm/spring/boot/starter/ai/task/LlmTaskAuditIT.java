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

import java.time.Instant;
import java.util.List;
import java.util.Map;

import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.TaskService;
import io.orqueio.bpm.engine.history.HistoricVariableUpdate;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.spring.boot.starter.ai.test.TestAiApplication;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * The audit variable each LLM task execution writes, on a real engine with full history.
 */
@SpringBootTest(classes = {TestAiApplication.class, LlmTaskAuditIT.StubModelConfiguration.class},
    properties = {"spring.ai.model.chat=none", "camunda.bpm.history-level=full"})
class LlmTaskAuditIT {

  private static final String AUDIT = "orqueioLlm_Task_Llm";
  private static final String PROMPT = "Classify: {{text}}";

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private ManagementService managementService;

  @Autowired
  private HistoryService historyService;

  @Autowired
  private TaskService taskService;

  @Autowired
  private ReportingChatModel model;

  @Autowired
  private LlmAnswerReuseIT.FailOnce failOnce;

  private final JsonMapper json = JsonMapper.builder().build();
  private Deployment deployment;

  @BeforeEach
  void reset() {
    model.answer = "{\"category\":\"Theft\"}";
    failOnce.failed = false;
  }

  @AfterEach
  void deleteDeployment() {
    if (deployment != null) {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

  @Test
  void shouldRecordWhatTheCallUsedAndCost() {
    deploy("", "");

    ProcessInstance instance = runLlmTask("my bike was stolen");

    JsonNode audit = auditOf(instance);
    assertThat(audit.get("provider").asString()).isEqualTo(ReportingChatModel.class.getName());
    assertThat(audit.get("model").asString()).isEqualTo("qwen2.5:7b-reported");
    // The author's prompt, the library's wording around the data, and the declared outputs
    assertThat(audit.get("promptVersion").asString()).isEqualTo(LlmTaskAuditor.sha256(PROMPT
        + "\n" + LlmPromptResolver.DATA_RULE + "\n" + LlmPromptResolver.DATA_REMINDER + "\n" + LlmPrompt.DATA_LABEL
        + "\ncategory:string"));
    assertThat(audit.get("inputTokens").asInt()).isEqualTo(312);
    assertThat(audit.get("outputTokens").asInt()).isEqualTo(100);
    assertThat(audit.get("latencyMs").asLong()).isGreaterThanOrEqualTo(0);
    assertThat(audit.get("fromCache").asBoolean()).isFalse();
    assertThat(audit.get("outcome").asString()).isEqualTo("VALID");
    assertThat(Instant.parse(audit.get("recordedAt").asString())).isBeforeOrEqualTo(Instant.now());
  }

  @Test
  void shouldNotRecordPromptOrAnswerByDefault() {
    deploy("", "");

    ProcessInstance instance = runLlmTask("IBAN FR76 1234");

    JsonNode audit = auditOf(instance);
    assertThat(audit.has("prompt")).isFalse();
    assertThat(audit.has("answer")).isFalse();
    assertThat(audit.toString()).doesNotContain("FR76").doesNotContain("Theft");
  }

  @Test
  void shouldRecordReusedAnswerAsFree() {
    // The step after the task fails once: the retry reuses the stored answer
    deploy("<bpmn:serviceTask id=\"Task_After\" camunda:expression=\"${failOnce.run()}\" />", "Task_After");

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess", Map.of("text", "flooded kitchen"));
    Job job = managementService.createJobQuery().processInstanceId(instance.getId()).singleResult();
    assertThatThrownBy(() -> managementService.executeJob(job.getId())).hasMessageContaining("Fails once");
    managementService.executeJob(job.getId());

    JsonNode audit = auditOf(instance);
    assertThat(audit.get("fromCache").asBoolean()).isTrue();
    assertThat(audit.get("inputTokens").asInt()).isZero();
    assertThat(audit.get("outputTokens").asInt()).isZero();
  }

  @Test
  void shouldRecordBpmnError() {
    model.answer = "{\"category\":42}";
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:boundaryEvent id="Catch_Invalid" attachedToRef="Task_Llm">
          <bpmn:errorEventDefinition errorRef="Error_Invalid" />
        </bpmn:boundaryEvent>
        <bpmn:sequenceFlow id="Flow_Invalid" sourceRef="Catch_Invalid" targetRef="Review" />
        <bpmn:userTask id="Review" />
        """.formatted(properties() + property("orqueio.llm.errorCode", "LLM_INVALID_ANSWER")))
        .replace("<bpmn:endEvent id=\"End\" />", "<bpmn:userTask id=\"End\" />")
        .replace("<bpmn:process ", "<bpmn:error id=\"Error_Invalid\" errorCode=\"LLM_INVALID_ANSWER\" />\n<bpmn:process "))
        .deploy();

    ProcessInstance instance = runLlmTask("smoke in the attic");

    assertThat(auditOf(instance).get("outcome").asString()).isEqualTo("BPMN_ERROR");
  }

  @Test
  void shouldKeepEveryExecutionInHistory() {
    // The task runs twice in a loop; each record is a separate update in the history
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", """
        <?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                          xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                          targetNamespace="http://orqueio.io/test">
          <bpmn:process id="llmTaskProcess" isExecutable="true" camunda:historyTimeToLive="P1D">
            <bpmn:startEvent id="Start" />
            <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Task_Llm" />
            <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
              <bpmn:extensionElements>
                <camunda:properties>%s</camunda:properties>
              </bpmn:extensionElements>
            </bpmn:serviceTask>
            <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Llm" targetRef="Review" />
            <bpmn:userTask id="Review" />
            <bpmn:sequenceFlow id="Flow_3" sourceRef="Review" targetRef="Gateway" />
            <bpmn:exclusiveGateway id="Gateway" default="Flow_Again" />
            <bpmn:sequenceFlow id="Flow_Again" sourceRef="Gateway" targetRef="Task_Llm" />
            <bpmn:sequenceFlow id="Flow_Done" sourceRef="Gateway" targetRef="End">
              <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${done}</bpmn:conditionExpression>
            </bpmn:sequenceFlow>
            <bpmn:endEvent id="End" />
          </bpmn:process>
        </bpmn:definitions>
        """.formatted(properties())).deploy();

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess", Map.of("text", "stolen car"));
    executeLlmJob(instance);
    taskService.complete(taskService.createTaskQuery().processInstanceId(instance.getId()).singleResult().getId(),
        Map.of("done", false));
    executeLlmJob(instance);

    List<HistoricVariableUpdate> records = historyService.createHistoricDetailQuery()
        .processInstanceId(instance.getId()).variableUpdates().list().stream()
        .map(HistoricVariableUpdate.class::cast)
        .filter(update -> update.getVariableName().equals(AUDIT))
        .toList();
    assertThat(records).hasSize(2);
  }

  private String properties() {
    return property("orqueio.llm.inputs", "text") + property("orqueio.llm.prompt", PROMPT)
        + property("orqueio.llm.outputs", "category:string");
  }

  private void deploy(String afterTask, String afterTaskId) {
    String bpmn = process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """.formatted(properties())).replace("<bpmn:endEvent id=\"End\" />", "<bpmn:userTask id=\"End\" />");
    if (!afterTask.isEmpty()) {
      bpmn = bpmn.replace("<bpmn:sequenceFlow id=\"Flow_2\" sourceRef=\"Task_Llm\" targetRef=\"End\" />",
          afterTask + "<bpmn:sequenceFlow id=\"Flow_2\" sourceRef=\"Task_Llm\" targetRef=\"" + afterTaskId + "\" />"
              + "<bpmn:sequenceFlow id=\"Flow_3\" sourceRef=\"" + afterTaskId + "\" targetRef=\"End\" />");
    }
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", bpmn).deploy();
  }

  private ProcessInstance runLlmTask(String text) {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess", Map.of("text", text));
    executeLlmJob(instance);
    return instance;
  }

  private void executeLlmJob(ProcessInstance instance) {
    managementService.executeJob(managementService.createJobQuery().processInstanceId(instance.getId()).singleResult().getId());
  }

  private JsonNode auditOf(ProcessInstance instance) {
    Object value = runtimeService.getVariable(instance.getId(), AUDIT);
    assertThat(value).isInstanceOf(String.class);
    return json.readTree((String) value);
  }

  // Reports a model and token usage, as real providers do
  static class ReportingChatModel implements ChatModel {

    volatile String answer;

    @Override
    public ChatResponse call(Prompt prompt) {
      ChatResponseMetadata metadata = ChatResponseMetadata.builder()
          .model("qwen2.5:7b-reported")
          .usage(new DefaultUsage(312, 100))
          .build();
      return new ChatResponse(List.of(new Generation(new AssistantMessage(answer))), metadata);
    }
  }

  @TestConfiguration
  static class StubModelConfiguration {

    @Bean
    ReportingChatModel reportingChatModel() {
      return new ReportingChatModel();
    }

    @Bean
    LlmAnswerReuseIT.FailOnce failOnce() {
      return new LlmAnswerReuseIT.FailOnce();
    }
  }

}
