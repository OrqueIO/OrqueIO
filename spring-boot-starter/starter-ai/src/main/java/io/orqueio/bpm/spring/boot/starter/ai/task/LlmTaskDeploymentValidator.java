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

import java.util.List;

import io.orqueio.bpm.engine.ProcessEngineException;
import io.orqueio.bpm.engine.impl.persistence.deploy.Deployer;
import io.orqueio.bpm.engine.impl.persistence.entity.DeploymentEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.ProcessDefinitionEntity;
import io.orqueio.bpm.engine.impl.pvm.process.ActivityImpl;
import io.orqueio.bpm.engine.impl.pvm.process.ScopeImpl;
import io.orqueio.bpm.spring.boot.starter.ai.provider.ChatModelRegistry;
import io.orqueio.bpm.spring.boot.starter.ai.provider.LlmProviderException;

/**
 * Checks, for new deployments only, that the provider of every LLM task resolves to
 * a configured model. Skipping definitions the engine reloads from its cache keeps
 * a later configuration change from blocking processes that are already deployed.
 */
public class LlmTaskDeploymentValidator implements Deployer {

  private final ChatModelRegistry chatModelRegistry;

  public LlmTaskDeploymentValidator(ChatModelRegistry chatModelRegistry) {
    this.chatModelRegistry = chatModelRegistry;
  }

  @Override
  public void deploy(DeploymentEntity deployment) {
    if (!deployment.isNew()) {
      return;
    }
    List<ProcessDefinitionEntity> definitions = deployment.getDeployedArtifacts(ProcessDefinitionEntity.class);
    if (definitions != null) {
      for (ProcessDefinitionEntity definition : definitions) {
        validateActivities(definition, definition);
      }
    }
  }

  protected void validateActivities(ScopeImpl scope, ProcessDefinitionEntity definition) {
    for (ActivityImpl activity : scope.getActivities()) {
      LlmTaskConfiguration configuration = LlmTaskConfiguration.of(activity);
      if (configuration != null) {
        validateProvider(configuration, activity, definition);
      }
      validateActivities(activity, definition);
    }
  }

  protected void validateProvider(LlmTaskConfiguration configuration, ActivityImpl activity, ProcessDefinitionEntity definition) {
    try {
      if (configuration.getProvider() == null) {
        chatModelRegistry.getDefaultChatModel();
      }
      else {
        chatModelRegistry.getChatModel(configuration.getProvider());
      }
    }
    catch (LlmProviderException e) {
      throw new ProcessEngineException("LLM task '" + activity.getId() + "' in process '" + definition.getKey()
          + "': " + e.getMessage(), e);
    }
  }

}
