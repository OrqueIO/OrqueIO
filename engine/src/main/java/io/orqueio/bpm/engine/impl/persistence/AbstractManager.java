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
package io.orqueio.bpm.engine.impl.persistence;

import java.util.concurrent.Callable;

import io.orqueio.bpm.engine.authorization.Permission;
import io.orqueio.bpm.engine.authorization.Resource;
import io.orqueio.bpm.engine.impl.AbstractQuery;
import io.orqueio.bpm.engine.impl.cfg.auth.ResourceAuthorizationProvider;
import io.orqueio.bpm.engine.impl.cmmn.entity.repository.CaseDefinitionManager;
import io.orqueio.bpm.engine.impl.cmmn.entity.runtime.CaseExecutionManager;
import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.db.DbEntity;
import io.orqueio.bpm.engine.impl.db.entitymanager.DbEntityManager;
import io.orqueio.bpm.engine.impl.db.sql.DbSqlSession;
import io.orqueio.bpm.engine.impl.dmn.entity.repository.DecisionDefinitionManager;
import io.orqueio.bpm.engine.impl.dmn.entity.repository.DecisionRequirementsDefinitionManager;
import io.orqueio.bpm.engine.impl.form.entity.OrqueioFormDefinitionManager;
import io.orqueio.bpm.engine.impl.history.event.HistoricDecisionInstanceManager;
import io.orqueio.bpm.engine.impl.identity.Authentication;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.interceptor.Session;
import io.orqueio.bpm.engine.impl.persistence.entity.AttachmentManager;
import io.orqueio.bpm.engine.impl.persistence.entity.AuthorizationEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.AuthorizationManager;
import io.orqueio.bpm.engine.impl.persistence.entity.BatchManager;
import io.orqueio.bpm.engine.impl.persistence.entity.ByteArrayManager;
import io.orqueio.bpm.engine.impl.persistence.entity.DeploymentManager;
import io.orqueio.bpm.engine.impl.persistence.entity.EventSubscriptionManager;
import io.orqueio.bpm.engine.impl.persistence.entity.ExecutionManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricActivityInstanceManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricBatchManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricCaseActivityInstanceManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricCaseInstanceManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricDetailManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricExternalTaskLogManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricIdentityLinkLogManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricIncidentManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricJobLogManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricProcessInstanceManager;
import io.orqueio.bpm.engine.impl.persistence.entity.ReportManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricTaskInstanceManager;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricVariableInstanceManager;
import io.orqueio.bpm.engine.impl.persistence.entity.IdentityInfoManager;
import io.orqueio.bpm.engine.impl.persistence.entity.IdentityLinkManager;
import io.orqueio.bpm.engine.impl.persistence.entity.JobDefinitionManager;
import io.orqueio.bpm.engine.impl.persistence.entity.JobManager;
import io.orqueio.bpm.engine.impl.persistence.entity.ProcessDefinitionManager;
import io.orqueio.bpm.engine.impl.persistence.entity.ResourceManager;
import io.orqueio.bpm.engine.impl.persistence.entity.TaskManager;
import io.orqueio.bpm.engine.impl.persistence.entity.TaskReportManager;
import io.orqueio.bpm.engine.impl.persistence.entity.TenantManager;
import io.orqueio.bpm.engine.impl.persistence.entity.UserOperationLogManager;
import io.orqueio.bpm.engine.impl.persistence.entity.VariableInstanceManager;



/**
 * @author Tom Baeyens
 */
public abstract class AbstractManager implements Session {

  public void insert(DbEntity dbEntity) {
    getDbEntityManager().insert(dbEntity);
  }

  public void delete(DbEntity dbEntity) {
    getDbEntityManager().delete(dbEntity);
  }

  protected DbEntityManager getDbEntityManager() {
    return getSession(DbEntityManager.class);
  }

  protected DbSqlSession getDbSqlSession() {
    return getSession(DbSqlSession.class);
  }

  protected <T> T getSession(Class<T> sessionClass) {
    return Context.getCommandContext().getSession(sessionClass);
  }

  protected DeploymentManager getDeploymentManager() {
    return getSession(DeploymentManager.class);
  }

  protected ResourceManager getResourceManager() {
    return getSession(ResourceManager.class);
  }

  protected ByteArrayManager getByteArrayManager() {
    return getSession(ByteArrayManager.class);
  }

  protected ProcessDefinitionManager getProcessDefinitionManager() {
    return getSession(ProcessDefinitionManager.class);
  }

  protected CaseDefinitionManager getCaseDefinitionManager() {
    return getSession(CaseDefinitionManager.class);
  }

  protected DecisionDefinitionManager getDecisionDefinitionManager() {
    return getSession(DecisionDefinitionManager.class);
  }

  protected DecisionRequirementsDefinitionManager getDecisionRequirementsDefinitionManager() {
    return getSession(DecisionRequirementsDefinitionManager.class);
  }

  protected OrqueioFormDefinitionManager getOrqueioFormDefinitionManager() {
    return getSession(OrqueioFormDefinitionManager.class);
  }

  protected HistoricDecisionInstanceManager getHistoricDecisionInstanceManager() {
    return getSession(HistoricDecisionInstanceManager.class);
  }

  protected CaseExecutionManager getCaseInstanceManager() {
    return getSession(CaseExecutionManager.class);
  }

  protected CaseExecutionManager getCaseExecutionManager() {
    return getSession(CaseExecutionManager.class);
  }

  protected ExecutionManager getProcessInstanceManager() {
    return getSession(ExecutionManager.class);
  }

  protected TaskManager getTaskManager() {
    return getSession(TaskManager.class);
  }

  protected TaskReportManager getTaskReportManager() {
    return getSession(TaskReportManager.class);
  }

  protected IdentityLinkManager getIdentityLinkManager() {
    return getSession(IdentityLinkManager.class);
  }

  protected VariableInstanceManager getVariableInstanceManager() {
    return getSession(VariableInstanceManager.class);
  }

  protected HistoricProcessInstanceManager getHistoricProcessInstanceManager() {
    return getSession(HistoricProcessInstanceManager.class);
  }

  protected HistoricCaseInstanceManager getHistoricCaseInstanceManager() {
    return getSession(HistoricCaseInstanceManager.class);
  }

  protected HistoricDetailManager getHistoricDetailManager() {
    return getSession(HistoricDetailManager.class);
  }

  protected HistoricVariableInstanceManager getHistoricVariableInstanceManager() {
    return getSession(HistoricVariableInstanceManager.class);
  }

  protected HistoricActivityInstanceManager getHistoricActivityInstanceManager() {
    return getSession(HistoricActivityInstanceManager.class);
  }

  protected HistoricCaseActivityInstanceManager getHistoricCaseActivityInstanceManager() {
    return getSession(HistoricCaseActivityInstanceManager.class);
  }

  protected HistoricTaskInstanceManager getHistoricTaskInstanceManager() {
    return getSession(HistoricTaskInstanceManager.class);
  }

  protected HistoricIncidentManager getHistoricIncidentManager() {
    return getSession(HistoricIncidentManager.class);
  }

  protected HistoricIdentityLinkLogManager getHistoricIdentityLinkManager() {
    return getSession(HistoricIdentityLinkLogManager.class);
  }

  protected HistoricJobLogManager getHistoricJobLogManager() {
    return getSession(HistoricJobLogManager.class);
  }

  protected HistoricExternalTaskLogManager getHistoricExternalTaskLogManager() {
    return getSession(HistoricExternalTaskLogManager.class);
  }

  protected JobManager getJobManager() {
    return getSession(JobManager.class);
  }

  protected JobDefinitionManager getJobDefinitionManager() {
    return getSession(JobDefinitionManager.class);
  }

  protected UserOperationLogManager getUserOperationLogManager() {
    return getSession(UserOperationLogManager.class);
  }

  protected EventSubscriptionManager getEventSubscriptionManager() {
    return getSession(EventSubscriptionManager.class);
  }

  protected IdentityInfoManager getIdentityInfoManager() {
    return getSession(IdentityInfoManager.class);
  }

  protected AttachmentManager getAttachmentManager() {
    return getSession(AttachmentManager.class);
  }

  protected ReportManager getHistoricReportManager() {
    return getSession(ReportManager.class);
  }

  protected BatchManager getBatchManager() {
    return getSession(BatchManager.class);
  }

  protected HistoricBatchManager getHistoricBatchManager() {
    return getSession(HistoricBatchManager.class);
  }

  protected TenantManager getTenantManager() {
    return getSession(TenantManager.class);
  }

  public void close() {
  }

  public void flush() {
  }

  // authorizations ///////////////////////////////////////

  protected CommandContext getCommandContext() {
    return Context.getCommandContext();
  }

  protected AuthorizationManager getAuthorizationManager() {
    return getSession(AuthorizationManager.class);
  }

  protected void configureQuery(AbstractQuery<?,?> query, Resource resource) {
    getAuthorizationManager().configureQuery(query, resource);
  }

  protected void checkAuthorization(Permission permission, Resource resource, String resourceId) {
    getAuthorizationManager().checkAuthorization(permission, resource, resourceId);
  }

  public boolean isAuthorizationEnabled() {
    return Context.getProcessEngineConfiguration().isAuthorizationEnabled();
  }

  protected Authentication getCurrentAuthentication() {
    return Context.getCommandContext().getAuthentication();
  }

  protected ResourceAuthorizationProvider getResourceAuthorizationProvider() {
    return Context.getProcessEngineConfiguration()
        .getResourceAuthorizationProvider();
  }

  protected void deleteAuthorizations(Resource resource, String resourceId) {
    getAuthorizationManager().deleteAuthorizationsByResourceId(resource, resourceId);
  }

  protected void deleteAuthorizationsForUser(Resource resource, String resourceId, String userId) {
    getAuthorizationManager().deleteAuthorizationsByResourceIdAndUserId(resource, resourceId, userId);
  }

  protected void deleteAuthorizationsForGroup(Resource resource, String resourceId, String groupId) {
    getAuthorizationManager().deleteAuthorizationsByResourceIdAndGroupId(resource, resourceId, groupId);
  }

  public void saveDefaultAuthorizations(final AuthorizationEntity[] authorizations) {
    if(authorizations != null && authorizations.length > 0) {
      Context.getCommandContext().runWithoutAuthorization(new Callable<Void>() {
        public Void call() {
          AuthorizationManager authorizationManager = getAuthorizationManager();
          for (AuthorizationEntity authorization : authorizations) {

            if(authorization.getId() == null) {
              authorizationManager.insert(authorization);
            } else {
              authorizationManager.update(authorization);
            }

          }
          return null;
        }
      });
    }
  }

  public void deleteDefaultAuthorizations(final AuthorizationEntity[] authorizations) {
    if(authorizations != null && authorizations.length > 0) {
      Context.getCommandContext().runWithoutAuthorization(new Callable<Void>() {
        public Void call() {
          AuthorizationManager authorizationManager = getAuthorizationManager();
          for (AuthorizationEntity authorization : authorizations) {
            authorizationManager.delete(authorization);
          }
          return null;
        }
      });
    }
  }

}
