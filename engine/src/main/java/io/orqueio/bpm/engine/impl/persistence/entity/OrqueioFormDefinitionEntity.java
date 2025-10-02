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
package io.orqueio.bpm.engine.impl.persistence.entity;

import java.io.Serializable;
import io.orqueio.bpm.engine.impl.db.DbEntity;
import io.orqueio.bpm.engine.impl.db.HasDbRevision;
import io.orqueio.bpm.engine.impl.repository.ResourceDefinitionEntity;
import io.orqueio.bpm.engine.repository.OrqueioFormDefinition;

public class OrqueioFormDefinitionEntity implements OrqueioFormDefinition,
    ResourceDefinitionEntity<OrqueioFormDefinitionEntity>, DbEntity, HasDbRevision, Serializable {

  private static final long serialVersionUID = 1L;

  protected String id;
  protected int revision = 1;
  protected String key;
  protected int version;
  protected String deploymentId;
  protected String resourceName;
  protected String tenantId;


  public OrqueioFormDefinitionEntity(String key, String deploymentId, String resourceName, String tenantId) {
    this.key = key;
    this.deploymentId = deploymentId;
    this.resourceName = resourceName;
    this.tenantId = tenantId;
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public int getRevision() {
    return revision;
  }

  public void setRevision(int revision) {
    this.revision = revision;
  }

  public int getRevisionNext() {
    return revision + 1;
  }

  public String getKey() {
    return key;
  }

  public void setKey(String key) {
    this.key = key;
  }

  public int getVersion() {
    return version;
  }

  public void setVersion(int version) {
    this.version = version;
  }

  public String getDeploymentId() {
    return deploymentId;
  }

  public void setDeploymentId(String deploymentId) {
    this.deploymentId = deploymentId;
  }

  public String getResourceName() {
    return resourceName;
  }

  public void setResourceName(String resourceName) {
    this.resourceName = resourceName;
  }

  public String getTenantId() {
    return tenantId;
  }

  public void setTenantId(String tenantId) {
    this.tenantId = tenantId;
  }

  @Override
  public String getCategory() {
    throw new UnsupportedOperationException();
  }

  @Override
  public OrqueioFormDefinitionEntity getPreviousDefinition() {
    throw new UnsupportedOperationException();
  }

  @Override
  public void setCategory(String category) {
    throw new UnsupportedOperationException();
  }

  @Override
  public String getDiagramResourceName() {
    throw new UnsupportedOperationException("deployment of diagrams not supported for Orqueio Forms");
  }

  @Override
  public void setDiagramResourceName(String diagramResourceName) {
    throw new UnsupportedOperationException("deployment of diagrams not supported for Orqueio Forms");
  }

  @Override
  public Integer getHistoryTimeToLive() {
    throw new UnsupportedOperationException("history time to live not supported for Orqueio Forms");
  }

  @Override
  public void setHistoryTimeToLive(Integer historyTimeToLive) {
    throw new UnsupportedOperationException("history time to live not supported for Orqueio Forms");
  }

  @Override
  public Object getPersistentState() {
    // properties of this entity are immutable
    return OrqueioFormDefinitionEntity.class;
  }

  @Override
  public void updateModifiableFieldsFromEntity(OrqueioFormDefinitionEntity updatingDefinition) {
    throw new UnsupportedOperationException("properties of Orqueio Form Definitions are immutable");
  }

  @Override
  public String getName() {
    throw new UnsupportedOperationException("name property not supported for Orqueio Forms");
  }

  @Override
  public void setName(String name) {
    throw new UnsupportedOperationException("name property not supported for Orqueio Forms");
  }

}
