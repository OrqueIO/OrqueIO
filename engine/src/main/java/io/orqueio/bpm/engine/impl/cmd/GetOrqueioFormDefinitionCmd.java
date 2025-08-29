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
package io.orqueio.bpm.engine.impl.cmd;

import io.orqueio.bpm.engine.BadUserRequestException;
import io.orqueio.bpm.engine.form.OrqueioFormRef;
import io.orqueio.bpm.engine.impl.form.entity.OrqueioFormDefinitionManager;
import io.orqueio.bpm.engine.impl.form.handler.DefaultFormHandler;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.persistence.entity.OrqueioFormDefinitionEntity;
import io.orqueio.bpm.engine.repository.OrqueioFormDefinition;

public class GetOrqueioFormDefinitionCmd implements Command<OrqueioFormDefinition> {

  protected OrqueioFormRef orqueioFormRef;
  protected String deploymentId;

  public GetOrqueioFormDefinitionCmd(OrqueioFormRef orqueioFormRef, String deploymentId) {
    this.orqueioFormRef = orqueioFormRef;
    this.deploymentId = deploymentId;
  }

  @Override
  public OrqueioFormDefinition execute(CommandContext commandContext) {
    String binding = orqueioFormRef.getBinding();
    String key = orqueioFormRef.getKey();
    OrqueioFormDefinitionEntity definition = null;
    OrqueioFormDefinitionManager manager = commandContext.getOrqueioFormDefinitionManager();
    if (binding.equals(DefaultFormHandler.FORM_REF_BINDING_DEPLOYMENT)) {
      definition = manager.findDefinitionByDeploymentAndKey(deploymentId, key);
    } else if (binding.equals(DefaultFormHandler.FORM_REF_BINDING_LATEST)) {
      definition = manager.findLatestDefinitionByKey(key);
    } else if (binding.equals(DefaultFormHandler.FORM_REF_BINDING_VERSION)) {
      definition = manager.findDefinitionByKeyVersionAndTenantId(key, orqueioFormRef.getVersion(), null);
    } else {
      throw new BadUserRequestException("Unsupported binding type for orqueioFormRef. Expected to be one of "
          + DefaultFormHandler.ALLOWED_FORM_REF_BINDINGS + " but was:" + binding);
    }

    return definition;
  }

}
