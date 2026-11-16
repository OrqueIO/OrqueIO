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

import java.util.List;
import java.util.Map;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.observation.DefaultMeterObservationHandler;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.repository.Deployment;
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

/**
 * The metrics of LLM tasks on a real engine, with Micrometer registries set up as Actuator does.
 */
@SpringBootTest(classes = {TestAiApplication.class, LlmTaskMetricsIT.MetricsConfiguration.class},
    properties = "spring.ai.model.chat=none")
class LlmTaskMetricsIT {

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private ManagementService managementService;

  @Autowired
  private MeterRegistry meterRegistry;

  @Autowired
  private ObservingChatModel model;

  @Autowired
  private LlmAnswerReuseIT.FailOnce failOnce;

  private Deployment deployment;

  @BeforeEach
  void reset() {
    meterRegistry.clear();
    model.answer = "{\"category\":\"Theft\"}";
    model.observationDuringCall = null;
    failOnce.failed = false;
  }

  @AfterEach
  void deleteDeployment() {
    if (deployment != null) {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

  @Test
  void shouldTagTokensAndExecutionsWithTheProcess() {
    deploy("", "");

    runLlmTask("stolen bike");

    assertThat(tokens("input")).isEqualTo(312);
    assertThat(tokens("output")).isEqualTo(100);
    Timer executions = meterRegistry.find(LlmTaskMetrics.OBSERVATION)
        .tag(LlmTaskMetrics.PROCESS_DEFINITION_KEY, "llmTaskProcess")
        .tag(LlmTaskMetrics.ACTIVITY_ID, "Task_Llm")
        .tag(LlmTaskMetrics.TENANT_ID, "none")
        .tag(LlmTaskMetrics.OUTCOME, "valid")
        .tag(LlmTaskMetrics.REUSED, "false")
        .timer();
    assertThat(executions).isNotNull();
    assertThat(executions.count()).isEqualTo(1);
  }

  @Test
  void shouldCountTokensOfAFailedAttemptButNotOfItsReusedAnswer() {
    // The LLM task succeeds, then the next task fails: the job and its audit are rolled back
    deploy("<bpmn:serviceTask id=\"Task_After\" camunda:expression=\"${failOnce.run()}\" />", "Task_After");
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess", Map.of("text", "stolen bike"));
    String jobId = managementService.createJobQuery().processInstanceId(instance.getId()).singleResult().getId();

    assertThatThrownBy(() -> managementService.executeJob(jobId)).hasMessageContaining("Fails once");
    managementService.executeJob(jobId);

    // The failed attempt's tokens were paid and are counted; the retry reused its answer for free
    assertThat(tokens("input")).isEqualTo(312);
    assertThat(executionCount("valid", "false")).isEqualTo(1);
    assertThat(executionCount("valid", "true")).isEqualTo(1);
  }

  @Test
  void shouldCountTokensOfAnInvalidAnswer() {
    deploy("", "");
    model.answer = "not json";

    assertThatThrownBy(() -> runLlmTask("stolen bike")).isInstanceOf(LlmInvalidAnswerException.class);

    assertThat(tokens("output")).isEqualTo(100);
    assertThat(executionCount("invalid_answer", "false")).isEqualTo(1);
  }

  @Test
  void shouldMakeTheTaskObservationTheParentOfTheModelCall() {
    deploy("", "");

    runLlmTask("stolen bike");

    // The model runs on its own thread: Spring AI's chat observation would start under this one
    Observation current = model.observationDuringCall;
    assertThat(current).isNotNull();
    assertThat(current.getContextView().getName()).isEqualTo(LlmTaskMetrics.OBSERVATION);
    assertThat(current.getContextView().getLowCardinalityKeyValue(LlmTaskMetrics.ACTIVITY_ID).getValue())
        .isEqualTo("Task_Llm");
  }

  private double tokens(String type) {
    return meterRegistry.find(LlmTaskMetrics.TOKENS)
        .tag(LlmTaskMetrics.PROCESS_DEFINITION_KEY, "llmTaskProcess")
        .tag(LlmTaskMetrics.ACTIVITY_ID, "Task_Llm")
        .tag(LlmTaskMetrics.TENANT_ID, "none")
        .tag(LlmTaskMetrics.TOKEN_TYPE, type)
        .counters().stream().mapToDouble(counter -> counter.count()).sum();
  }

  private long executionCount(String outcome, String reused) {
    return meterRegistry.find(LlmTaskMetrics.OBSERVATION)
        .tag(LlmTaskMetrics.OUTCOME, outcome)
        .tag(LlmTaskMetrics.REUSED, reused)
        .timers().stream().mapToLong(Timer::count).sum();
  }

  private void deploy(String afterTask, String afterTaskId) {
    String properties = property("orqueio.llm.inputs", "text") + property("orqueio.llm.prompt", "Classify: {{text}}")
        + property("orqueio.llm.outputs", "category:string");
    String bpmn = process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """.formatted(properties)).replace("<bpmn:endEvent id=\"End\" />", "<bpmn:userTask id=\"End\" />");
    if (!afterTask.isEmpty()) {
      bpmn = bpmn.replace("<bpmn:sequenceFlow id=\"Flow_2\" sourceRef=\"Task_Llm\" targetRef=\"End\" />",
          afterTask + "<bpmn:sequenceFlow id=\"Flow_2\" sourceRef=\"Task_Llm\" targetRef=\"" + afterTaskId + "\" />"
              + "<bpmn:sequenceFlow id=\"Flow_3\" sourceRef=\"" + afterTaskId + "\" targetRef=\"End\" />");
    }
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", bpmn).deploy();
  }

  private void runLlmTask(String text) {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess", Map.of("text", text));
    managementService.executeJob(managementService.createJobQuery().processInstanceId(instance.getId()).singleResult().getId());
  }

  // Reports token usage, as real providers do, and the observation current during the call
  static class ObservingChatModel implements ChatModel {

    private final ObservationRegistry observationRegistry;
    volatile String answer;
    volatile Observation observationDuringCall;

    ObservingChatModel(ObservationRegistry observationRegistry) {
      this.observationRegistry = observationRegistry;
    }

    @Override
    public ChatResponse call(Prompt prompt) {
      observationDuringCall = observationRegistry.getCurrentObservation();
      ChatResponseMetadata metadata = ChatResponseMetadata.builder().usage(new DefaultUsage(312, 100)).build();
      return new ChatResponse(List.of(new Generation(new AssistantMessage(answer))), metadata);
    }
  }

  @TestConfiguration
  static class MetricsConfiguration {

    @Bean
    MeterRegistry meterRegistry() {
      return new SimpleMeterRegistry();
    }

    // As Actuator sets it up: each observation is also a timer
    @Bean
    ObservationRegistry observationRegistry(MeterRegistry meterRegistry) {
      ObservationRegistry registry = ObservationRegistry.create();
      registry.observationConfig().observationHandler(new DefaultMeterObservationHandler(meterRegistry));
      return registry;
    }

    @Bean
    ObservingChatModel observingChatModel(ObservationRegistry observationRegistry) {
      return new ObservingChatModel(observationRegistry);
    }

    @Bean
    LlmAnswerReuseIT.FailOnce failOnce() {
      return new LlmAnswerReuseIT.FailOnce();
    }
  }

}
