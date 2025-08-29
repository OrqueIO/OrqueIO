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
package io.orqueio.bpm.engine.impl;

import java.util.Map;

import io.orqueio.bpm.engine.AuthorizationService;
import io.orqueio.bpm.engine.CaseService;
import io.orqueio.bpm.engine.DecisionService;
import io.orqueio.bpm.engine.ExternalTaskService;
import io.orqueio.bpm.engine.FilterService;
import io.orqueio.bpm.engine.FormService;
import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.OptimisticLockingException;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.ProcessEngines;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.TaskService;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.cfg.TransactionContextFactory;
import io.orqueio.bpm.engine.impl.el.ExpressionManager;
import io.orqueio.bpm.engine.impl.history.HistoryLevel;
import io.orqueio.bpm.engine.impl.history.event.SimpleIpBasedProvider;
import io.orqueio.bpm.engine.impl.interceptor.CommandExecutor;
import io.orqueio.bpm.engine.impl.interceptor.SessionFactory;
import io.orqueio.bpm.engine.impl.jobexecutor.JobExecutor;
import io.orqueio.bpm.engine.impl.metrics.reporter.DbMetricsReporter;
import io.orqueio.bpm.engine.impl.util.CompositeCondition;

/**
 * @author Tom Baeyens
 */
public class ProcessEngineImpl implements ProcessEngine {

  /** external task conditions used to signal long polling in rest API */
  public static final CompositeCondition EXT_TASK_CONDITIONS = new CompositeCondition();

  private final static ProcessEngineLogger LOG = ProcessEngineLogger.INSTANCE;

  protected String name;

  protected RepositoryService repositoryService;
  protected RuntimeService runtimeService;
  protected HistoryService historicDataService;
  protected IdentityService identityService;
  protected TaskService taskService;
  protected FormService formService;
  protected ManagementService managementService;
  protected AuthorizationService authorizationService;
  protected CaseService caseService;
  protected FilterService filterService;
  protected ExternalTaskService externalTaskService;
  protected DecisionService decisionService;

  protected String databaseSchemaUpdate;
  protected JobExecutor jobExecutor;
  protected CommandExecutor commandExecutor;
  protected CommandExecutor commandExecutorSchemaOperations;
  protected Map<Class<?>, SessionFactory> sessionFactories;
  protected ExpressionManager expressionManager;
  protected HistoryLevel historyLevel;
  protected TransactionContextFactory transactionContextFactory;
  protected ProcessEngineConfigurationImpl processEngineConfiguration;

  public ProcessEngineImpl(ProcessEngineConfigurationImpl processEngineConfiguration) {

    this.processEngineConfiguration = processEngineConfiguration;
    this.name = processEngineConfiguration.getProcessEngineName();

    this.repositoryService = processEngineConfiguration.getRepositoryService();
    this.runtimeService = processEngineConfiguration.getRuntimeService();
    this.historicDataService = processEngineConfiguration.getHistoryService();
    this.identityService = processEngineConfiguration.getIdentityService();
    this.taskService = processEngineConfiguration.getTaskService();
    this.formService = processEngineConfiguration.getFormService();
    this.managementService = processEngineConfiguration.getManagementService();
    this.authorizationService = processEngineConfiguration.getAuthorizationService();
    this.caseService = processEngineConfiguration.getCaseService();
    this.filterService = processEngineConfiguration.getFilterService();
    this.externalTaskService = processEngineConfiguration.getExternalTaskService();
    this.decisionService = processEngineConfiguration.getDecisionService();

    this.databaseSchemaUpdate = processEngineConfiguration.getDatabaseSchemaUpdate();
    this.jobExecutor = processEngineConfiguration.getJobExecutor();
    this.commandExecutor = processEngineConfiguration.getCommandExecutorTxRequired();
    commandExecutorSchemaOperations = processEngineConfiguration.getCommandExecutorSchemaOperations();
    this.sessionFactories = processEngineConfiguration.getSessionFactories();
    this.historyLevel = processEngineConfiguration.getHistoryLevel();
    this.transactionContextFactory = processEngineConfiguration.getTransactionContextFactory();

    executeSchemaOperations();

    if (name == null) {
      LOG.processEngineCreated(ProcessEngines.NAME_DEFAULT);
    } else {
      LOG.processEngineCreated(name);
    }

    ProcessEngines.registerProcessEngine(this);

    if ((jobExecutor != null)) {
      // register process engine with Job Executor
      jobExecutor.registerProcessEngine(this);
    }

    if (processEngineConfiguration.isMetricsEnabled()) {
      String reporterId;
      // only use a deprecated, custom MetricsReporterIdProvider,
      // if no static hostname AND custom HostnameProvider are set.
      // See ProcessEngineConfigurationImpl#initHostname()
      if (processEngineConfiguration.getMetricsReporterIdProvider() != null
          && processEngineConfiguration.getHostnameProvider() instanceof SimpleIpBasedProvider) {
        reporterId = processEngineConfiguration.getMetricsReporterIdProvider().provideId(this);
      } else {
        reporterId = processEngineConfiguration.getHostname();
      }

      DbMetricsReporter dbMetricsReporter = processEngineConfiguration.getDbMetricsReporter();
      dbMetricsReporter.setReporterId(reporterId);

      if(processEngineConfiguration.isDbMetricsReporterActivate()) {
        dbMetricsReporter.start();
      }
    }
  }

  protected void executeSchemaOperations() {
    commandExecutorSchemaOperations.execute(processEngineConfiguration.getSchemaOperationsCommand());
    commandExecutorSchemaOperations.execute(processEngineConfiguration.getHistoryLevelCommand());

    try {
      commandExecutorSchemaOperations.execute(processEngineConfiguration.getProcessEngineBootstrapCommand());
    } catch (OptimisticLockingException ole) {
      // if an OLE occurred during the process engine bootstrap, we suppress it
      // since all the data has already been persisted by a previous process engine bootstrap
      LOG.historyCleanupJobReconfigurationFailure(ole);
    }
  }

  @Override
  public void close() {

    ProcessEngines.unregister(this);

    if(processEngineConfiguration.isMetricsEnabled()) {
      processEngineConfiguration.getDbMetricsReporter().stop();
    }

    if ((jobExecutor != null)) {
      // unregister process engine with Job Executor
      jobExecutor.unregisterProcessEngine(this);
    }

    commandExecutorSchemaOperations.execute(new SchemaOperationProcessEngineClose());

    processEngineConfiguration.close();

    LOG.processEngineClosed(name);
  }

  @Override
  public String getName() {
    return name;
  }

  @Override
  public ProcessEngineConfigurationImpl getProcessEngineConfiguration() {
    return processEngineConfiguration;
  }

  @Override
  public IdentityService getIdentityService() {
    return identityService;
  }

  @Override
  public ManagementService getManagementService() {
    return managementService;
  }

  @Override
  public TaskService getTaskService() {
    return taskService;
  }

  @Override
  public HistoryService getHistoryService() {
    return historicDataService;
  }

  @Override
  public RuntimeService getRuntimeService() {
    return runtimeService;
  }

  @Override
  public RepositoryService getRepositoryService() {
    return repositoryService;
  }

  @Override
  public FormService getFormService() {
    return formService;
  }

  @Override
  public AuthorizationService getAuthorizationService() {
    return authorizationService;
  }

  @Override
  public CaseService getCaseService() {
    return caseService;
  }

  @Override
  public FilterService getFilterService() {
    return filterService;
  }

  @Override
  public ExternalTaskService getExternalTaskService() {
    return externalTaskService;
  }

  @Override
  public DecisionService getDecisionService() {
    return decisionService;
  }

}
