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
package io.orqueio.bpm.engine.impl.form.entity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import io.orqueio.bpm.engine.impl.ProcessEngineLogger;
import io.orqueio.bpm.engine.impl.db.EnginePersistenceLogger;
import io.orqueio.bpm.engine.impl.db.ListQueryParameterObject;
import io.orqueio.bpm.engine.impl.persistence.AbstractManager;
import io.orqueio.bpm.engine.impl.persistence.AbstractResourceDefinitionManager;
import io.orqueio.bpm.engine.impl.persistence.entity.OrqueioFormDefinitionEntity;

public class OrqueioFormDefinitionManager extends AbstractManager
    implements AbstractResourceDefinitionManager<OrqueioFormDefinitionEntity> {

  protected static final EnginePersistenceLogger LOG = ProcessEngineLogger.PERSISTENCE_LOGGER;

  @Override
  public OrqueioFormDefinitionEntity findLatestDefinitionByKey(String key) {
    @SuppressWarnings("unchecked")
    List<OrqueioFormDefinitionEntity> orqueioFormDefinitions = getDbEntityManager()
        .selectList("selectLatestOrqueioFormDefinitionByKey", configureParameterizedQuery(key));

    if (orqueioFormDefinitions.isEmpty()) {
      return null;

    } else if (orqueioFormDefinitions.size() == 1) {
      return orqueioFormDefinitions.iterator().next();

    } else {
      throw LOG.multipleTenantsForOrqueioFormDefinitionKeyException(key);
    }
  }

  @Override
  public OrqueioFormDefinitionEntity findLatestDefinitionById(String id) {
    return getDbEntityManager().selectById(OrqueioFormDefinitionEntity.class, id);
  }

  @Override
  public OrqueioFormDefinitionEntity findLatestDefinitionByKeyAndTenantId(String definitionKey, String tenantId) {
    Map<String, String> parameters = new HashMap<>();
    parameters.put("orqueioFormDefinitionKey", definitionKey);
    parameters.put("tenantId", tenantId);

    if (tenantId == null) {
      return (OrqueioFormDefinitionEntity) getDbEntityManager()
          .selectOne("selectLatestOrqueioFormDefinitionByKeyWithoutTenantId", parameters);
    } else {
      return (OrqueioFormDefinitionEntity) getDbEntityManager()
          .selectOne("selectLatestOrqueioDefinitionByKeyAndTenantId", parameters);
    }
  }

  @Override
  public OrqueioFormDefinitionEntity findDefinitionByKeyVersionAndTenantId(String definitionKey,
      Integer definitionVersion, String tenantId) {

    Map<String, Object> parameters = new HashMap<>();
    parameters.put("orqueioFormDefinitionVersion", definitionVersion);
    parameters.put("orqueioFormDefinitionKey", definitionKey);
    parameters.put("tenantId", tenantId);
    if (tenantId == null) {
      return (OrqueioFormDefinitionEntity) getDbEntityManager()
          .selectOne("selectOrqueioFormDefinitionByKeyVersionWithoutTenantId", parameters);
    } else {
      return (OrqueioFormDefinitionEntity) getDbEntityManager()
          .selectOne("selectOrqueioFormDefinitionByKeyVersionAndTenantId", parameters);
    }
  }

  @Override
  public OrqueioFormDefinitionEntity findDefinitionByDeploymentAndKey(String deploymentId, String definitionKey) {
    Map<String, Object> parameters = new HashMap<>();
    parameters.put("deploymentId", deploymentId);
    parameters.put("orqueioFormDefinitionKey", definitionKey);
    return (OrqueioFormDefinitionEntity) getDbEntityManager().selectOne("selectOrqueioFormDefinitionByDeploymentAndKey",
        parameters);
  }

  @SuppressWarnings("unchecked")
  public List<OrqueioFormDefinitionEntity> findDefinitionsByDeploymentId(String deploymentId) {
    return getDbEntityManager().selectList("selectOrqueioFormDefinitionByDeploymentId", deploymentId);
  }

  @Override
  public OrqueioFormDefinitionEntity getCachedResourceDefinitionEntity(String definitionId) {
    return getDbEntityManager().getCachedEntity(OrqueioFormDefinitionEntity.class, definitionId);
  }

  @Override
  public OrqueioFormDefinitionEntity findDefinitionByKeyVersionTagAndTenantId(String definitionKey,
      String definitionVersionTag, String tenantId) {
    throw new UnsupportedOperationException(
        "Currently finding Orqueio Form definition by version tag and tenant is not implemented.");
  }

  public void deleteOrqueioFormDefinitionsByDeploymentId(String deploymentId) {
    getDbEntityManager().delete(OrqueioFormDefinitionEntity.class, "deleteOrqueioFormDefinitionsByDeploymentId",
        deploymentId);
  }

  protected ListQueryParameterObject configureParameterizedQuery(Object parameter) {
    return getTenantManager().configureQuery(parameter);
  }

}
