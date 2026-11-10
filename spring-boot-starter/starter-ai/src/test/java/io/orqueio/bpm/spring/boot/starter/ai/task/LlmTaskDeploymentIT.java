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

import java.time.Duration;

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
            + property("orqueio.llm.inputs", " emailBody , customer ")
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
  void shouldRejectEmptyInputEntry() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.inputs", "emailBody,,customer") + property("orqueio.llm.prompt", "Summarize") + OUTPUTS),
        "LLM task 'Task_Llm' has an empty entry in orqueio.llm.inputs");
  }

  @Test
  void shouldRejectBlankMiddleAndLeadingInputEntries() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.inputs", "emailBody, ,customer") + property("orqueio.llm.prompt", "Summarize") + OUTPUTS),
        "LLM task 'Task_Llm' has an empty entry in orqueio.llm.inputs");
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.inputs", ",emailBody") + property("orqueio.llm.prompt", "Summarize") + OUTPUTS),
        "LLM task 'Task_Llm' has an empty entry in orqueio.llm.inputs");
  }

  @Test
  void shouldHaveNoInputsWhenPropertyIsBlank() {
    // A template may write the optional field with an empty value
    assertThat(deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true,
        property("orqueio.llm.inputs", " ") + property("orqueio.llm.prompt", "Summarize") + OUTPUTS))
        .getInputs()).isEmpty();
  }

  @Test
  void shouldRejectTrailingCommaInInputs() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.inputs", "emailBody,") + property("orqueio.llm.prompt", "Summarize") + OUTPUTS),
        "LLM task 'Task_Llm' has an empty entry in orqueio.llm.inputs");
  }

  @Test
  void shouldRejectDuplicateInput() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.inputs", "emailBody, emailBody") + property("orqueio.llm.prompt", "Summarize") + OUTPUTS),
        "LLM task 'Task_Llm' declares input 'emailBody' twice in orqueio.llm.inputs");
  }

  @Test
  void shouldReadPromptFromInputParameter() {
    // As the modeler's template writes it: the text between tags keeps the line breaks typed
    LlmTaskConfiguration configuration = deployAndGetConfiguration(promptParameterTask(
        property("orqueio.llm.inputs", "claimText") + OUTPUTS,
        "<camunda:inputParameter name=\"orqueio.llm.prompt\">Extract the facts.\nRules:\n- amount in euros\n\nClaim: {{claimText}}</camunda:inputParameter>"));

    assertThat(configuration.getPrompt()).isEqualTo("Extract the facts.\nRules:\n- amount in euros\n\nClaim: {{claimText}}");
    assertThat(configuration.getInputs()).containsExactly("claimText");
  }

  @Test
  void shouldKeepWindowsLineBreaksOfPromptParameter() {
    // A carriage return written as a character reference survives XML parsing; a raw one becomes \n
    LlmTaskConfiguration configuration = deployAndGetConfiguration(promptParameterTask(OUTPUTS,
        "<camunda:inputParameter name=\"orqueio.llm.prompt\">First line&#13;&#10;Second line\r\nThird line</camunda:inputParameter>"));

    assertThat(configuration.getPrompt()).isEqualTo("First line\r\nSecond line\nThird line");
  }

  @Test
  void shouldGiveSameConfigurationForPropertyAndParameterPrompt() {
    // Same prompt either way: the answer reuse key and the audit's prompt version do not change
    LlmTaskConfiguration fromProperty = deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true,
        property("orqueio.llm.prompt", "Line one&#10;Line two") + OUTPUTS));
    repositoryService.deleteDeployment(deployment.getId(), true);

    LlmTaskConfiguration fromParameter = deployAndGetConfiguration(promptParameterTask(OUTPUTS,
        "<camunda:inputParameter name=\"orqueio.llm.prompt\">Line one\nLine two</camunda:inputParameter>"));

    assertThat(fromParameter.getPrompt()).isEqualTo(fromProperty.getPrompt());
  }

  @Test
  void shouldRemovePromptParameterFromInputMappingAndKeepOthers() {
    deployAndGetConfiguration(promptParameterTask(OUTPUTS,
        "<camunda:inputParameter name=\"orqueio.llm.prompt\">Summarize</camunda:inputParameter>"
            + "<camunda:inputParameter name=\"customerTier\">gold</camunda:inputParameter>"));

    assertThat(getActivity().getIoMapping().getInputParameters())
        .extracting(parameter -> parameter.getName())
        .containsExactly("customerTier");
  }

  @Test
  void shouldDropInputMappingLeftEmpty() {
    deployAndGetConfiguration(promptParameterTask(OUTPUTS,
        "<camunda:inputParameter name=\"orqueio.llm.prompt\">Summarize</camunda:inputParameter>"));

    assertThat(getActivity().getIoMapping()).isNull();
    // Runs as with the property form: no extra scope execution
    assertThat(getActivity().isScope()).isFalse();
  }

  @Test
  void shouldKeepScopeWhenBoundaryEventNeedsIt() {
    deployAndGetConfiguration(promptParameterTask(OUTPUTS,
        "<camunda:inputParameter name=\"orqueio.llm.prompt\">Summarize</camunda:inputParameter>")
        .replace("</bpmn:serviceTask>", """
            </bpmn:serviceTask>
            <bpmn:boundaryEvent id="Timeout" attachedToRef="Task_Llm">
              <bpmn:timerEventDefinition><bpmn:timeDuration>PT1H</bpmn:timeDuration></bpmn:timerEventDefinition>
            </bpmn:boundaryEvent>
            """));

    assertThat(getActivity().isScope()).isTrue();
  }

  @Test
  void shouldKeepOutputParametersOfLlmTask() {
    deployAndGetConfiguration(promptParameterTask(OUTPUTS,
        "<camunda:inputParameter name=\"orqueio.llm.prompt\">Summarize</camunda:inputParameter>"
            + "<camunda:outputParameter name=\"summary\">${answer}</camunda:outputParameter>"));

    assertThat(getActivity().getIoMapping().getInputParameters()).isEmpty();
    assertThat(getActivity().getIoMapping().getOutputParameters()).hasSize(1);
  }

  @Test
  void shouldRemovePromptParameterAgainWhenReloadingFromCache() {
    deployAndGetConfiguration(promptParameterTask(OUTPUTS,
        "<camunda:inputParameter name=\"orqueio.llm.prompt\">Line one\nLine two</camunda:inputParameter>"));
    processEngineConfiguration.getDeploymentCache().discardProcessDefinitionCache();

    assertThat(getConfiguration().getPrompt()).isEqualTo("Line one\nLine two");
    assertThat(getActivity().getIoMapping()).isNull();
    assertThat(getActivity().isScope()).isFalse();
  }

  @Test
  void shouldGiveSamePromptWhateverTheFormAndSurroundingSpaces() {
    LlmTaskConfiguration fromProperty = deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true,
        property("orqueio.llm.prompt", "  Summarize  ") + OUTPUTS));
    repositoryService.deleteDeployment(deployment.getId(), true);

    LlmTaskConfiguration fromParameter = deployAndGetConfiguration(promptParameterTask(OUTPUTS,
        "<camunda:inputParameter name=\"orqueio.llm.prompt\">\n      Summarize\n    </camunda:inputParameter>"));

    assertThat(fromProperty.getPrompt()).isEqualTo("Summarize").isEqualTo(fromParameter.getPrompt());
  }

  @Test
  void shouldRejectPromptDeclaredAsPropertyAndParameter() {
    assertDeploymentFails(promptParameterTask(property("orqueio.llm.prompt", "Summarize") + OUTPUTS,
            "<camunda:inputParameter name=\"orqueio.llm.prompt\">Summarize</camunda:inputParameter>"),
        "LLM task 'Task_Llm' declares orqueio.llm.prompt both as a property and as an input parameter");
  }

  @Test
  void shouldRejectPromptParameterDeclaredTwice() {
    assertDeploymentFails(promptParameterTask(OUTPUTS,
            "<camunda:inputParameter name=\"orqueio.llm.prompt\">One</camunda:inputParameter>"
                + "<camunda:inputParameter name=\"orqueio.llm.prompt\">Two</camunda:inputParameter>"),
        "LLM task 'Task_Llm' declares the orqueio.llm.prompt input parameter twice");
  }

  @Test
  void shouldRejectPromptParameterThatIsNotPlainText() {
    assertDeploymentFails(promptParameterTask(OUTPUTS,
            "<camunda:inputParameter name=\"orqueio.llm.prompt\"><camunda:list><camunda:value>a</camunda:value></camunda:list></camunda:inputParameter>"),
        "LLM task 'Task_Llm' has a orqueio.llm.prompt input parameter that is not plain text");
  }

  @Test
  void shouldRejectExpressionInPromptParameter() {
    assertDeploymentFails(promptParameterTask(property("orqueio.llm.inputs", "claimText") + OUTPUTS,
            "<camunda:inputParameter name=\"orqueio.llm.prompt\">Claim: ${claimText}</camunda:inputParameter>"),
        "LLM task 'Task_Llm' has ${ or #{ in its orqueio.llm.prompt input parameter");
    assertDeploymentFails(promptParameterTask(property("orqueio.llm.inputs", "amount") + OUTPUTS,
            "<camunda:inputParameter name=\"orqueio.llm.prompt\">Price: ${{amount}}, total #{x}</camunda:inputParameter>"),
        "even before a {{name}} placeholder; write the prompt without them, or as a orqueio.llm.prompt property");
  }

  @Test
  void shouldRejectBlankPromptParameter() {
    assertDeploymentFails(promptParameterTask(OUTPUTS,
            "<camunda:inputParameter name=\"orqueio.llm.prompt\">  </camunda:inputParameter>"),
        "LLM task 'Task_Llm' requires a orqueio.llm.prompt property or input parameter");
  }

  @Test
  void shouldCheckPlaceholdersOfPromptParameter() {
    assertDeploymentFails(promptParameterTask(property("orqueio.llm.inputs", "claimText") + OUTPUTS,
            "<camunda:inputParameter name=\"orqueio.llm.prompt\">From {{iban}}</camunda:inputParameter>"),
        "LLM task 'Task_Llm' uses variables [iban] in its prompt that are not declared in orqueio.llm.inputs");
  }

  @Test
  void shouldLeavePromptParameterOfOtherServiceTasksAlone() {
    // On a task that is not an LLM task, it is an ordinary input parameter
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", process("""
        <bpmn:serviceTask id="Task_Llm" camunda:expression="${true}">
          <bpmn:extensionElements>
            <camunda:inputOutput>
              <camunda:inputParameter name="orqueio.llm.prompt">Hello</camunda:inputParameter>
            </camunda:inputOutput>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """)).deploy();

    assertThat(getActivity().getIoMapping().getInputParameters()).hasSize(1);
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
  void shouldReadTimeoutAndErrorCode() {
    LlmTaskConfiguration configuration = deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true,
        property("orqueio.llm.prompt", "Summarize") + OUTPUTS
            + property("orqueio.llm.timeout", " PT30S ") + property("orqueio.llm.errorCode", " LLM_INVALID_ANSWER ")));

    assertThat(configuration.getTimeout()).isEqualTo(Duration.ofSeconds(30));
    assertThat(configuration.getErrorCode()).isEqualTo("LLM_INVALID_ANSWER");
  }

  @Test
  void shouldLeaveTimeoutAndErrorCodeUnsetWhenNotDeclared() {
    LlmTaskConfiguration configuration = deployAndGetConfiguration(serviceTask(LLM_DELEGATE, true,
        property("orqueio.llm.prompt", "Summarize") + OUTPUTS));

    assertThat(configuration.getTimeout()).isNull();
    assertThat(configuration.getErrorCode()).isNull();
  }

  @Test
  void shouldRejectInvalidTimeout() {
    for (String timeout : new String[] {"30s", "PT0S", "-PT5S", "PT0.0001S", "P2D", "PT9999999999999H"}) {
      assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
              property("orqueio.llm.prompt", "Summarize") + OUTPUTS + property("orqueio.llm.timeout", timeout)),
          "LLM task 'Task_Llm' has an invalid orqueio.llm.timeout '" + timeout + "'; expected an ISO-8601 duration between 1 millisecond and 24 hours");
    }
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
  void shouldRejectOutputThatIsAlsoAnInput() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.inputs", "emailBody") + property("orqueio.llm.prompt", "Fix {{emailBody}}")
                + property("orqueio.llm.outputs", "emailBody:string")),
        "LLM task 'Task_Llm' declares 'emailBody' both as input and output");
  }

  @Test
  void shouldRejectOutputUsedByTheEngine() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.prompt", "Count") + property("orqueio.llm.outputs", "loopCounter:integer")),
        "LLM task 'Task_Llm' cannot write output 'loopCounter': the engine uses this variable");
  }

  @Test
  void shouldRejectOutputThatWouldOverwriteTheAudit() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", "orqueioLlm_Task_Llm:string")),
        "LLM task 'Task_Llm' cannot write output 'orqueioLlm_Task_Llm': names starting with orqueioLlm_ are kept");
  }

  @Test
  void shouldRejectOtherImplementationLeftOnTheTask() {
    // For example the modeler's template applied to an external task keeps camunda:type and camunda:topic
    for (String attribute : new String[] {"camunda:type=\"external\" camunda:topic=\"llm\"",
        "camunda:class=\"com.example.Delegate\"", "camunda:expression=\"${true}\""}) {
      String name = attribute.substring("camunda:".length(), attribute.indexOf('='));
      assertDeploymentFails(serviceTask(LLM_DELEGATE, true, property("orqueio.llm.prompt", "Summarize") + OUTPUTS)
              .replace("camunda:asyncBefore=", attribute + " camunda:asyncBefore="),
          "LLM task 'Task_Llm' also sets camunda:" + name + ", which the engine would run instead of the LLM task");
    }
  }

  @Test
  void shouldRejectConnectorOnTheTask() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true, property("orqueio.llm.prompt", "Summarize") + OUTPUTS)
            .replace("<bpmn:extensionElements>",
                "<bpmn:extensionElements><camunda:connector><camunda:connectorId>http-connector</camunda:connectorId></camunda:connector>"),
        "LLM task 'Task_Llm' also declares a camunda:connector");
  }

  @Test
  void shouldRejectMissingOutputs() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true, property("orqueio.llm.prompt", "Classify")),
        "LLM task 'Task_Llm' requires a orqueio.llm.outputs property");
  }

  @Test
  void shouldRejectBlankOutputsProperty() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", " ")),
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
  void shouldRejectEmptyOutputEntry() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", "a:string,,b:integer")),
        "LLM task 'Task_Llm' has an empty entry in orqueio.llm.outputs");
  }

  @Test
  void shouldRejectTrailingCommaInOutputs() {
    assertDeploymentFails(serviceTask(LLM_DELEGATE, true,
            property("orqueio.llm.prompt", "Classify") + property("orqueio.llm.outputs", "a:string, ")),
        "LLM task 'Task_Llm' has an empty entry in orqueio.llm.outputs");
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

  private ActivityImpl getActivity() {
    ProcessDefinition definition = repositoryService.createProcessDefinitionQuery()
        .deploymentId(deployment.getId())
        .singleResult();
    return (ActivityImpl) ((RepositoryServiceImpl) repositoryService)
        .getDeployedProcessDefinition(definition.getId())
        .findActivity("Task_Llm");
  }

  static String promptParameterTask(String properties, String inputParameters) {
    return process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
            <camunda:inputOutput>%s</camunda:inputOutput>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """.formatted(properties, inputParameters));
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
