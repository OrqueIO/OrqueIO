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
package io.orqueio.bpm.engine.impl.persistence.deploy.cache;

import static io.orqueio.bpm.engine.impl.util.EnsureUtil.ensureNotNull;

import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.persistence.AbstractResourceDefinitionManager;
import io.orqueio.bpm.engine.impl.persistence.entity.OrqueioFormDefinitionEntity;

public class OrqueioFormDefinitionCache extends ResourceDefinitionCache<OrqueioFormDefinitionEntity> {

  public OrqueioFormDefinitionCache(CacheFactory factory, int cacheCapacity, CacheDeployer cacheDeployer) {
    super(factory, cacheCapacity, cacheDeployer);
  }

  @Override
  protected AbstractResourceDefinitionManager<OrqueioFormDefinitionEntity> getManager() {
    return Context.getCommandContext().getOrqueioFormDefinitionManager();
  }

  @Override
  protected void checkInvalidDefinitionId(String definitionId) {
    ensureNotNull("Invalid orqueio form definition id", "orqueioFormDefinitionId", definitionId);
  }

  @Override
  protected void checkDefinitionFound(String definitionId, OrqueioFormDefinitionEntity definition) {
    ensureNotNull("no deployed orqueio form definition found with id '" + definitionId + "'", "orqueioFormDefinition", definition);
  }

  @Override
  protected void checkInvalidDefinitionByKey(String definitionKey, OrqueioFormDefinitionEntity definition) {
    ensureNotNull("no deployed orqueio form definition found with key '" + definitionKey + "'", "orqueioFormDefinition", definition);
  }

  @Override
  protected void checkInvalidDefinitionByKeyAndTenantId(String definitionKey, String tenantId, OrqueioFormDefinitionEntity definition) {
    ensureNotNull("no deployed orqueio form definition found with key '" + definitionKey + "' and tenant-id '" + tenantId + "'", "orqueioFormDefinition", definition);
  }

  @Override
  protected void checkInvalidDefinitionByKeyVersionAndTenantId(String definitionKey, Integer definitionVersion, String tenantId, OrqueioFormDefinitionEntity definition) {
    ensureNotNull("no deployed orqueio form definition found with key '" + definitionKey + "', version '" + definitionVersion
        + "' and tenant-id '" + tenantId + "'", "orqueioFormDefinition", definition);
  }

  @Override
  protected void checkInvalidDefinitionByKeyVersionTagAndTenantId(String definitionKey, String definitionVersionTag, String tenantId,
      OrqueioFormDefinitionEntity definition) {
    // version tag is currently not supported for OrqueioFormDefinition
  }

  @Override
  protected void checkInvalidDefinitionByDeploymentAndKey(String deploymentId, String definitionKey, OrqueioFormDefinitionEntity definition) {
    ensureNotNull("no deployed orqueio form definition found with key '" + definitionKey + "' in deployment '" + deploymentId + "'", "orqueioFormDefinition", definition);
  }

  @Override
  protected void checkInvalidDefinitionWasCached(String deploymentId, String definitionId, OrqueioFormDefinitionEntity definition) {
    ensureNotNull("deployment '" + deploymentId + "' didn't put orqueio form definition '" + definitionId + "' in the cache", "cachedProcessDefinition", definition);
  }

}
