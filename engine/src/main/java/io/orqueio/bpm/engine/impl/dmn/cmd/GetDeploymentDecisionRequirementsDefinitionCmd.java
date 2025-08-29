/*
 * Copyright TOADDLATERCCS and/or licensed to TOADDLATERCCS
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. TOADDLATERCCS this file to you under the Apache License,
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
package io.orqueio.bpm.engine.impl.dmn.cmd;

import static io.orqueio.bpm.engine.impl.util.EnsureUtil.ensureNotNull;

import java.io.Serializable;

import io.orqueio.bpm.engine.impl.cfg.CommandChecker;
import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.dmn.entity.repository.DecisionRequirementsDefinitionEntity;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.persistence.deploy.cache.DeploymentCache;
import io.orqueio.bpm.engine.repository.DecisionRequirementsDefinition;

/**
 * Gives access to a deployed decision requirements definition instance.
 */
public class GetDeploymentDecisionRequirementsDefinitionCmd implements Command<DecisionRequirementsDefinition>, Serializable {

  private static final long serialVersionUID = 1L;
  protected String decisionRequirementsDefinitionId;

  public GetDeploymentDecisionRequirementsDefinitionCmd(String decisionRequirementsDefinitionId) {
    this.decisionRequirementsDefinitionId = decisionRequirementsDefinitionId;
  }

  public DecisionRequirementsDefinition execute(CommandContext commandContext) {
    ensureNotNull("decisionRequirementsDefinitionId", decisionRequirementsDefinitionId);
    DeploymentCache deploymentCache = Context.getProcessEngineConfiguration().getDeploymentCache();
    DecisionRequirementsDefinitionEntity decisionRequirementsDefinition = deploymentCache.findDeployedDecisionRequirementsDefinitionById(decisionRequirementsDefinitionId);

    for(CommandChecker checker : commandContext.getProcessEngineConfiguration().getCommandCheckers()) {
      checker.checkReadDecisionRequirementsDefinition(decisionRequirementsDefinition);
    }

    return decisionRequirementsDefinition;
  }

}
