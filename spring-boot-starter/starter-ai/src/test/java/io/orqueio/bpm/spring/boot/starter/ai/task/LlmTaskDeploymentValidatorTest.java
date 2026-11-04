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

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.util.List;

import io.orqueio.bpm.engine.ProcessEngineException;
import io.orqueio.bpm.engine.impl.persistence.entity.DeploymentEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.ProcessDefinitionEntity;
import io.orqueio.bpm.engine.impl.pvm.process.ActivityImpl;
import io.orqueio.bpm.spring.boot.starter.ai.provider.ChatModelRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.openai.OpenAiChatModel;

class LlmTaskDeploymentValidatorTest {

  @Test
  void shouldNotCheckProvidersOfReloadedDefinitions() {
    // The provider is gone from the application, but the definition was deployed earlier
    DeploymentEntity deployment = deploymentWithLlmTask(null);
    deployment.setNew(false);

    assertThatCode(() -> validator(List.of()).deploy(deployment)).doesNotThrowAnyException();
  }

  @Test
  void shouldRejectNewDeploymentWhenDefaultIsAmbiguous() {
    DeploymentEntity deployment = deploymentWithLlmTask(null);

    assertThatThrownBy(() -> validator(List.of(mock(OllamaChatModel.class), mock(OpenAiChatModel.class))).deploy(deployment))
        .isInstanceOf(ProcessEngineException.class)
        .hasMessageContaining("LLM task 'Task_Llm' in process 'llmTaskProcess'")
        .hasMessageContaining("camunda.bpm.ai.default-provider");
  }

  @Test
  void shouldAcceptNewDeploymentWhenDefaultProviderIsSet() {
    DeploymentEntity deployment = deploymentWithLlmTask(null);
    ChatModelRegistry registry = new ChatModelRegistry(
        () -> List.of(mock(OllamaChatModel.class), mock(OpenAiChatModel.class)), "openai");

    assertThatCode(() -> new LlmTaskDeploymentValidator(registry).deploy(deployment)).doesNotThrowAnyException();
  }

  @Test
  void shouldCheckLlmTasksInsideSubProcesses() {
    DeploymentEntity deployment = new DeploymentEntity();
    deployment.setNew(true);
    ProcessDefinitionEntity definition = definition();
    ActivityImpl subProcess = definition.createActivity("SubProcess");
    llmTask(subProcess.createActivity("Task_Llm"), "mistral");
    deployment.addDeployedArtifact(definition);

    assertThatThrownBy(() -> validator(List.of(mock(OllamaChatModel.class))).deploy(deployment))
        .isInstanceOf(ProcessEngineException.class)
        .hasMessageContaining("LLM task 'Task_Llm'")
        .hasMessageContaining("'mistral' is not configured");
  }

  private static LlmTaskDeploymentValidator validator(List<ChatModel> models) {
    return new LlmTaskDeploymentValidator(new ChatModelRegistry(() -> models, null));
  }

  private static DeploymentEntity deploymentWithLlmTask(String provider) {
    DeploymentEntity deployment = new DeploymentEntity();
    deployment.setNew(true);
    ProcessDefinitionEntity definition = definition();
    llmTask(definition.createActivity("Task_Llm"), provider);
    deployment.addDeployedArtifact(definition);
    return deployment;
  }

  private static ProcessDefinitionEntity definition() {
    ProcessDefinitionEntity definition = new ProcessDefinitionEntity();
    definition.setKey("llmTaskProcess");
    return definition;
  }

  private static void llmTask(ActivityImpl activity, String provider) {
    activity.getProperties().set(LlmTaskConfiguration.KEY, new LlmTaskConfiguration(provider, null, "Summarize", List.of(), List.of()));
  }

}
