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
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.spring.boot.starter.ai.cache.InMemoryLlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.InMemoryLlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmCallLock;
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
 * Retries of an LLM task on a real engine, with the default in-memory answer store and
 * lock. Each test uses its own prompt, so answers stored by one test do not leak into another.
 */
@SpringBootTest(classes = {TestAiApplication.class, LlmAnswerReuseIT.StubModelConfiguration.class},
    properties = "spring.ai.model.chat=none")
class LlmAnswerReuseIT {

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private ManagementService managementService;

  @Autowired
  private CountingChatModel model;

  @Autowired
  private FailOnce failOnce;

  @Autowired
  private LlmAnswerStore answerStore;

  @Autowired
  private LlmCallLock callLock;

  private Deployment deployment;

  @BeforeEach
  void reset() {
    model.calls.set(0);
    model.answer = null;
    model.delay = null;
    model.failure = null;
    model.failureAfterDelay = null;
    failOnce.failed = false;
  }

  @AfterEach
  void deleteDeployment() {
    if (deployment != null) {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

  @Test
  void shouldUseInMemoryStoreAndLockByDefault() {
    assertThat(answerStore).isInstanceOf(InMemoryLlmAnswerStore.class);
    assertThat(callLock).isInstanceOf(InMemoryLlmCallLock.class);
  }

  @Test
  void shouldReuseAnswerWhenTransactionFailsAfterTheCall() {
    // The step after the LLM task fails once, which rolls back the variables the task wrote
    deploy("Classify after rollback", "category:string", """
        <bpmn:serviceTask id="Task_After" camunda:expression="${failOnce.run()}" />
        """);
    model.answer = "{\"category\":\"Theft\"}";

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    Job job = jobOf(instance);
    assertThatThrownBy(() -> managementService.executeJob(job.getId())).hasMessageContaining("Fails once");
    managementService.executeJob(job.getId());

    assertThat(model.calls).hasValue(1);
    assertThat(runtimeService.getVariable(instance.getId(), "category")).isEqualTo("Theft");
  }

  @Test
  void shouldMakeRetryWaitForCallStillRunningAndReuseItsAnswer() {
    // The client ignores the interrupt: the call keeps running after the task stopped waiting
    deploy("Classify slowly", "category:string", "", property("orqueio.llm.timeout", "PT0.6S"));
    model.answer = "{\"category\":\"Fire\"}";
    model.delay = Duration.ofMillis(900);

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    Job job = jobOf(instance);
    assertThatThrownBy(() -> managementService.executeJob(job.getId()))
        .hasMessage("The model did not answer within PT0.6S");
    managementService.executeJob(job.getId());

    assertThat(model.calls).hasValue(1);
    assertThat(runtimeService.getVariable(instance.getId(), "category")).isEqualTo("Fire");
  }

  @Test
  void shouldFailRetryWhenCallOfSameRequestIsStillRunningAfterTimeout() {
    deploy("Classify very slowly", "category:string", "", property("orqueio.llm.timeout", "PT0.2S"));
    model.answer = "{\"category\":\"Water\"}";
    model.delay = Duration.ofMillis(1500);

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    Job job = jobOf(instance);
    assertThatThrownBy(() -> managementService.executeJob(job.getId())).isInstanceOf(LlmTransientException.class);

    // Retryable: the job is retried later, by when the running call has stored its answer
    assertThatThrownBy(() -> managementService.executeJob(job.getId()))
        .isInstanceOf(LlmTransientException.class)
        .hasMessage("A call of the same request is still running after PT0.2S");
    assertThat(model.calls).hasValue(1);
  }

  @Test
  void shouldKeepRetryWithinTimeoutWhenItWaitedForTheLock() {
    // The running call fails after 1.8 s: the retry gets the lock but no answer, with part of its 1 s left
    deploy("Classify within budget", "category:string", "", property("orqueio.llm.timeout", "PT1S"));
    model.answer = "{\"category\":\"Fire\"}";
    model.delay = Duration.ofMillis(1800);
    model.failureAfterDelay = new IllegalStateException("provider unavailable");

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    Job job = jobOf(instance);
    assertThatThrownBy(() -> managementService.executeJob(job.getId())).hasMessage("The model did not answer within PT1S");
    model.failureAfterDelay = null;

    long start = System.nanoTime();
    assertThatThrownBy(() -> managementService.executeJob(job.getId())).hasMessage("The model did not answer within PT1S");

    // Waiting for the lock and calling the model share the task's timeout
    assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofMillis(1300));
    assertThat(model.calls).hasValue(2);
  }

  @Test
  void shouldNotStoreInvalidAnswer() {
    deploy("Classify with an invalid answer first", "urgency:integer", "");
    model.answer = "{\"urgency\":\"high\"}";

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    Job job = jobOf(instance);
    assertThatThrownBy(() -> managementService.executeJob(job.getId())).isInstanceOf(LlmInvalidAnswerException.class);

    model.answer = "{\"urgency\":3}";
    managementService.setJobRetries(job.getId(), 1);
    managementService.executeJob(job.getId());

    assertThat(model.calls).hasValue(2);
    assertThat(runtimeService.getVariable(instance.getId(), "urgency")).isEqualTo(3L);
  }

  @Test
  void shouldNotReuseAnswerAcrossInstances() {
    // Only a retry of the same job reuses an answer: each instance gets its own call
    deploy("Classify: {{text}}", "category:string", "", property("orqueio.llm.inputs", "text"));
    model.answer = "{\"category\":\"Theft\"}";

    runLlmTask(Map.of("text", "stolen bike"));
    runLlmTask(Map.of("text", "stolen bike"));

    assertThat(model.calls).hasValue(2);
  }

  @Test
  void shouldNotStoreProviderFailure() {
    deploy("Classify after a provider failure", "category:string", "");
    model.failure = new IllegalStateException("provider unavailable");

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess");
    Job job = jobOf(instance);
    assertThatThrownBy(() -> managementService.executeJob(job.getId())).isInstanceOf(LlmTransientException.class);

    model.failure = null;
    model.answer = "{\"category\":\"Theft\"}";
    managementService.executeJob(job.getId());

    assertThat(model.calls).hasValue(2);
    assertThat(runtimeService.getVariable(instance.getId(), "category")).isEqualTo("Theft");
  }

  private void runLlmTask(Map<String, Object> variables) {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess", variables);
    managementService.executeJob(jobOf(instance).getId());
  }

  private Job jobOf(ProcessInstance instance) {
    return managementService.createJobQuery().processInstanceId(instance.getId()).singleResult();
  }

  private void deploy(String prompt, String outputs, String afterTask, String... otherProperties) {
    String properties = property("orqueio.llm.prompt", prompt) + property("orqueio.llm.outputs", outputs)
        + String.join("", otherProperties);
    String bpmn = process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """.formatted(properties)).replace("<bpmn:endEvent id=\"End\" />", "<bpmn:userTask id=\"End\" />");
    if (!afterTask.isEmpty()) {
      bpmn = bpmn.replace("<bpmn:sequenceFlow id=\"Flow_2\" sourceRef=\"Task_Llm\" targetRef=\"End\" />",
          afterTask + """
              <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Llm" targetRef="Task_After" />
              <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_After" targetRef="End" />
              """);
    }
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", bpmn).deploy();
  }

  static class CountingChatModel implements ChatModel {

    final AtomicInteger calls = new AtomicInteger();
    volatile String answer;
    volatile Duration delay;
    volatile RuntimeException failure;
    volatile RuntimeException failureAfterDelay;

    @Override
    public ChatResponse call(Prompt prompt) {
      calls.incrementAndGet();
      if (failure != null) {
        throw failure;
      }
      RuntimeException laterFailure = failureAfterDelay;
      if (delay != null) {
        sleepIgnoringInterrupts(delay);
      }
      if (laterFailure != null) {
        throw laterFailure;
      }
      return new ChatResponse(List.of(new Generation(new AssistantMessage(answer))));
    }

    // Like an HTTP client that does not react to interrupts, but keeps the interrupt flag set
    static void sleepIgnoringInterrupts(Duration duration) {
      long deadline = System.nanoTime() + duration.toNanos();
      boolean interrupted = false;
      while (System.nanoTime() < deadline) {
        try {
          Thread.sleep(Math.max(1, (deadline - System.nanoTime()) / 1_000_000));
        }
        catch (InterruptedException e) {
          interrupted = true;
        }
      }
      if (interrupted) {
        Thread.currentThread().interrupt();
      }
    }
  }

  public static class FailOnce {

    volatile boolean failed;

    public void run() {
      if (!failed) {
        failed = true;
        throw new IllegalStateException("Fails once");
      }
    }
  }

  @TestConfiguration
  static class StubModelConfiguration {

    @Bean
    CountingChatModel countingChatModel() {
      return new CountingChatModel();
    }

    @Bean
    FailOnce failOnce() {
      return new FailOnce();
    }
  }

}
