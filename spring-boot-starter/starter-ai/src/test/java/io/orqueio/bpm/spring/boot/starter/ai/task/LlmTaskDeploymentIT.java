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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.orqueio.bpm.engine.ProcessEngineException;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.impl.RepositoryServiceImpl;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.pvm.process.ActivityImpl;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.engine.repository.ProcessDefinition;
import io.orqueio.bpm.spring.boot.starter.ai.test.TestAiApplication;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Deploys LLM tasks into a real engine. Ollama is the only configured provider
 * (see the test application.properties), so it is also the default.
 */
@SpringBootTest(classes = TestAiApplication.class)
class LlmTaskDeploymentIT {

  static final String LLM_DELEGATE = "${orqueioLlmTask}";
  static final String OUTPUTS = property("orqueio.llm.outputs", "answer:string");

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private ProcessEngineConfigurationImpl processEngineConfiguration;

  private Deployment deployment;

  @AfterEach
  void deleteDeployment() {
    if (deployment != null) {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

  @Test
  void shouldReadConfigurationFromProperties() {
    LlmTaskConfiguration configuration = deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true,
        property("orqueio.llm.provider", "ollama")
            + property("orqueio.llm.model", "qwen2.5:7b")
            + property("orqueio.llm.inputs", " emailBody , customer,,emailBody")
            + property("orqueio.llm.prompt", "Classify: {{emailBody}}") + OUTPUTS));

    assertThat(configuration.getProvider()).isEqualTo("ollama");
    assertThat(configuration.getModel()).isEqualTo("qwen2.5:7b");
    assertThat(configuration.getPrompt()).isEqualTo("Classify: {{emailBody}}");
    assertThat(configuration.getInputs()).containsExactly("emailBody", "customer");
  }

  @Test
  void shouldHaveNoInputsWhenNoneDeclared() {
    assertThat(deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true, property("orqueio.llm.prompt", "Summarize") + OUTPUTS))
        .getInputs()).isEmpty();
  }

  @Test
  void shouldRejectUndeclaredPlaceholder() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.inputs", "emailBody")
                + property("orqueio.llm.prompt", "From {{customer}}: {{emailBody}} {{iban}}")),
        "LLM task 'Task_Llm' uses variables [customer, iban] in its prompt that are not declared in orqueio.llm.inputs");
  }

  @Test
  void shouldRejectMalformedPlaceholder() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.inputs", "customer") + property("orqueio.llm.prompt", "Hello {{customer.name}}")),
        "LLM task 'Task_Llm' has a malformed placeholder {{customer.name}} at position 6 in orqueio.llm.prompt");
  }

  @Test
  void shouldRejectInvalidInputName() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.inputs", "email-body") + property("orqueio.llm.prompt", "Summarize")),
        "LLM task 'Task_Llm' has an invalid variable name 'email-body' in orqueio.llm.inputs");
  }

  @Test
  void shouldKeepLineBreaksOfMultiLinePrompt() {
    LlmTaskConfiguration configuration = deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true,
        property("orqueio.llm.prompt", "First line&#10;Second line") + OUTPUTS));

    assertThat(configuration.getPrompt()).isEqualTo("First line\nSecond line");
  }

  @Test
  void shouldDeployWithoutProviderOrModelWhenDefaultResolves() {
    LlmTaskConfiguration configuration = deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true,
        property("orqueio.llm.prompt", "Summarize") + OUTPUTS));

    // Resolved from application configuration when the task runs
    assertThat(configuration.getProvider()).isNull();
    assertThat(configuration.getModel()).isNull();
  }

  @Test
  void shouldReloadDefinitionFromCache() {
    deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true, property("orqueio.llm.prompt", "Summarize") + OUTPUTS));
    processEngineConfiguration.getDeploymentCache().discardProcessDefinitionCache();

    assertThat(getConfiguration().getPrompt()).isEqualTo("Summarize");
  }

  @Test
  void shouldReadOutputs() {
    LlmTaskConfiguration configuration = deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true,
        property("orqueio.llm.prompt", "Classify")
            + property("orqueio.llm.outputs", " category:string, urgency : integer,score:number,complete:boolean ")));

    assertThat(configuration.getOutputs()).containsExactly(
        new LlmOutputField("category", LlmOutputField.Type.STRING),
        new LlmOutputField("urgency", LlmOutputField.Type.INTEGER),
        new LlmOutputField("score", LlmOutputField.Type.NUMBER),
        new LlmOutputField("complete", LlmOutputField.Type.BOOLEAN));
  }

  @Test
  void shouldRejectMissingOutputs() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true, property("orqueio.llm.prompt", "Classify")),
        "LLM task 'Task_Llm' requires a orqueio.llm.outputs property");
  }

  @Test
  void shouldRejectMalformedOutput() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", "category")),
        "LLM task 'Task_Llm' has an invalid output 'category' in orqueio.llm.outputs; expected name:type");
  }

  @Test
  void shouldRejectUnsupportedOutputType() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", "tags:array")),
        "LLM task 'Task_Llm' has an unsupported output type 'array' for 'tags'");
  }

  @Test
  void shouldRejectDuplicateOutput() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", "a:string, a:integer")),
        "LLM task 'Task_Llm' declares output 'a' twice");
  }

  @Test
  void shouldRejectMissingPrompt() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true, property("orqueio.llm.provider", "ollama")),
        "LLM task 'Task_Llm' requires a orqueio.llm.prompt property");
  }

  @Test
  void shouldRejectTaskWithoutAsyncBefore() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, false, property("orqueio.llm.prompt", "Summarize")),
        "LLM task 'Task_Llm' requires camunda:asyncBefore=\"true\"");
  }

  @Test
  void shouldRejectUnknownProvider() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.provider", "foo") + property("orqueio.llm.prompt", "Summarize") + OUTPUTS),
        "LLM task 'Task_Llm' in process 'llmTaskProcess': Unknown LLM provider 'foo'");
  }

  @Test
  void shouldRejectProviderThatIsNotConfigured() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.provider", "anthropic") + property("orqueio.llm.prompt", "Summarize") + OUTPUTS),
        "LLM task 'Task_Llm' in process 'llmTaskProcess': LLM provider 'anthropic' is not configured. "
            + "Add the spring-ai-starter-model-anthropic dependency");
  }

  @Test
  void shouldRejectUnknownProperty() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.modle", "qwen2.5:7b") + property("orqueio.llm.prompt", "Summarize")),
        "LLM task 'Task_Llm' has unknown properties [orqueio.llm.modle]");
  }

  @Test
  void shouldRejectLlmPropertiesOnOtherServiceTask() {
    assertDeploymentFails(serviceTask("${otherDelegate}", true, property("orqueio.llm.prompt", "Summarize")),
        "LLM task 'Task_Llm' has orqueio.llm.* properties but is not an LLM task");
  }

  @Test
  void shouldRejectMultiInstanceTask() {
    assertDeploymentFails(process("""
            <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
              <bpmn:extensionElements>
                <camunda:properties>%s</camunda:properties>
              </bpmn:extensionElements>
              <bpmn:multiInstanceLoopCharacteristics camunda:collection="${items}" camunda:elementVariable="item" />
            </bpmn:serviceTask>
            """.formatted(property("orqueio.llm.prompt", "Summarize"))),
        "LLM task 'Task_Llm' is multi-instance");
  }

  @Test
  void shouldRejectLlmDelegateOnSendTask() {
    assertDeploymentFails(process("""
            <bpmn:sendTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true" />
            """),
        "LLM task 'Task_Llm' is not a service task");
  }

  @Test
  void shouldNotAffectOtherServiceTasks() {
    LlmTaskConfiguration configuration = deployAndGetConfiguration(serviceTask("${otherDelegate}", false,
        property("team", "claims")));

    assertThat(configuration).isNull();
  }

  private LlmTaskConfiguration deployAndGetConfiguration(String bpmn) {
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", bpmn).deploy();
    return getConfiguration();
  }

  private LlmTaskConfiguration getConfiguration() {
    ProcessDefinition definition = repositoryService.createProcessDefinitionQuery()
        .deploymentId(deployment.getId())
        .singleResult();
    ActivityImpl activity = (ActivityImpl) ((RepositoryServiceImpl) repositoryService)
        .getDeployedProcessDefinition(definition.getId())
        .findActivity("Task_Llm");
    return LlmTaskConfiguration.of(activity);
  }

  private void assertDeploymentFails(String bpmn, String expectedMessage) {
    assertThatThrownBy(() -> deployment = repositoryService.createDeployment().addString("llm-task.bpmn", bpmn).deploy())
        .isInstanceOf(ProcessEngineException.class)
        .hasMessageContaining(expectedMessage);
    assertThat(repositoryService.createProcessDefinitionQuery().processDefinitionKey("llmTaskProcess").count()).isZero();
  }

  static String property(String name, String value) {
    return "<camunda:property name=\"" + name + "\" value=\"" + value + "\" />";
  }

  static String serviceTask(String delegateExpression, boolean asyncBefore, String properties) {
    return process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="%s" camunda:asyncBefore="%s">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """.formatted(delegateExpression, asyncBefore, properties));
  }

  static String process(String task) {
    return """
        <?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                          xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                          targetNamespace="http://orqueio.io/test">
          <bpmn:process id="llmTaskProcess" isExecutable="true" camunda:historyTimeToLive="P1D">
            <bpmn:startEvent id="Start" />
            <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Task_Llm" />
            %s
            <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Llm" targetRef="End" />
            <bpmn:endEvent id="End" />
          </bpmn:process>
        </bpmn:definitions>
        """.formatted(task);
  }

}
