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

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Date;
import java.util.List;
import java.util.Map;

import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.engine.delegate.JavaDelegate;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.variable.Variables;
import io.orqueio.bpm.spring.boot.starter.ai.test.TestAiApplication;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/**
 * Resolves prompts against the variables of real process instances, as the LLM task
 * delegate will: a probe service task runs the resolver inside the execution.
 */
@SpringBootTest(classes = {TestAiApplication.class, LlmPromptResolverIT.ProbeConfiguration.class},
    // Only to store a serialized object for the test; the resolver never deserializes it
    properties = "camunda.bpm.generic-properties.properties.java-serialization-format-enabled=true")
class LlmPromptResolverIT {

  private static final String PROCESS = """
      <?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                        xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                        targetNamespace="http://orqueio.io/test">
        <bpmn:process id="promptProbe" isExecutable="true" camunda:historyTimeToLive="P1D">
          <bpmn:startEvent id="Start" />
          <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Probe" />
          <bpmn:serviceTask id="Probe" camunda:delegateExpression="${promptProbeDelegate}" />
          <bpmn:sequenceFlow id="Flow_2" sourceRef="Probe" targetRef="Wait" />
          <bpmn:userTask id="Wait" />
        </bpmn:process>
      </bpmn:definitions>
      """;

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private PromptProbe probe;

  private Deployment deployment;

  @BeforeEach
  void deploy() {
    deployment = repositoryService.createDeployment().addString("probe.bpmn", PROCESS).deploy();
  }

  @AfterEach
  void deleteDeployment() {
    repositoryService.deleteDeployment(deployment.getId(), true);
  }

  @Test
  void shouldResolveStoredProcessVariables() {
    probe.configuration = task("{{customer}} claims {{amount}} EUR on {{sent}}, urgent: {{urgent}}",
        "customer", "amount", "sent", "urgent");

    Map<String, Object> result = run(Variables.createVariables()
        .putValue("customer", "Ada")
        .putValue("amount", 8500L)
        .putValue("sent", new Date(0))
        .putValue("urgent", true));

    assertThat(result.get("resolved")).isEqualTo("{\"customer\":\"Ada\",\"amount\":8500,\"sent\":\"1970-01-01T00:00:00Z\",\"urgent\":true}");
  }

  @Test
  void shouldRejectStoredObjectWithoutDeserializingIt() {
    probe.configuration = task("{{claim}}", "claim");

    // The class does not exist: deserializing would fail with an engine error
    Map<String, Object> result = run(Variables.createVariables().putValueTyped("claim",
        Variables.serializedObjectValue("rO0ABQ==")
            .serializationDataFormat(Variables.SerializationDataFormats.JAVA)
            .objectTypeName("com.example.MissingClaim")
            .create()));

    assertThat(result.get("error")).isEqualTo("Variable 'claim' has type object, which cannot be used in a prompt");
  }

  @Test
  void shouldRejectDeclaredVariableThatIsNotSet() {
    probe.configuration = task("{{emailBody}}", "emailBody");

    Map<String, Object> result = run(Variables.createVariables().putValue("other", "x"));

    assertThat(result.get("error")).isEqualTo("Variable 'emailBody' used by the prompt is not set");
  }

  private Map<String, Object> run(Map<String, Object> variables) {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("promptProbe", variables);
    return runtimeService.getVariables(instance.getId(), List.of("resolved", "error"));
  }

  private static LlmTaskConfiguration task(String prompt, String... inputs) {
    return new LlmTaskConfiguration(null, null, prompt, List.of(inputs), List.of());
  }

  static class PromptProbe implements JavaDelegate {

    private final LlmPromptResolver resolver = new LlmPromptResolver();
    LlmTaskConfiguration configuration;

    @Override
    public void execute(DelegateExecution execution) {
      try {
        execution.setVariable("resolved", resolver.build(configuration, execution).data());
      }
      catch (LlmTaskException e) {
        execution.setVariable("error", e.getMessage());
      }
    }
  }

  @TestConfiguration
  static class ProbeConfiguration {

    @Bean
    PromptProbe promptProbeDelegate() {
      return new PromptProbe();
    }
  }

}
