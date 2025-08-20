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
package io.orqueio.bpm.qa.upgrade;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.qa.upgrade.gson.ProcessInstanceModificationScenario;
import io.orqueio.bpm.qa.upgrade.gson.TaskFilterPropertiesScenario;
import io.orqueio.bpm.qa.upgrade.gson.TaskFilterScenario;
import io.orqueio.bpm.qa.upgrade.gson.TaskFilterVariablesScenario;
import io.orqueio.bpm.qa.upgrade.gson.TimerChangeJobDefinitionScenario;
import io.orqueio.bpm.qa.upgrade.gson.TimerChangeProcessDefinitionScenario;
import io.orqueio.bpm.qa.upgrade.gson.batch.DeleteHistoricDecisionsBatchScenario;
import io.orqueio.bpm.qa.upgrade.gson.batch.DeleteHistoricProcessInstancesBatchScenario;
import io.orqueio.bpm.qa.upgrade.gson.batch.DeleteProcessInstancesBatchScenario;
import io.orqueio.bpm.qa.upgrade.gson.batch.MigrationBatchScenario;
import io.orqueio.bpm.qa.upgrade.gson.batch.ModificationBatchScenario;
import io.orqueio.bpm.qa.upgrade.gson.batch.RestartProcessInstanceBatchScenario;
import io.orqueio.bpm.qa.upgrade.gson.batch.SetExternalTaskRetriesBatchScenario;
import io.orqueio.bpm.qa.upgrade.gson.batch.SetJobRetriesBatchScenario;
import io.orqueio.bpm.qa.upgrade.gson.batch.UpdateProcessInstanceSuspendStateBatchScenario;
import io.orqueio.bpm.qa.upgrade.timestamp.DeploymentDeployTimeScenario;
import io.orqueio.bpm.qa.upgrade.timestamp.EventSubscriptionCreateTimeScenario;
import io.orqueio.bpm.qa.upgrade.timestamp.ExternalTaskLockExpTimeScenario;
import io.orqueio.bpm.qa.upgrade.timestamp.IncidentTimestampScenario;
import io.orqueio.bpm.qa.upgrade.timestamp.JobTimestampsScenario;
import io.orqueio.bpm.qa.upgrade.timestamp.MeterLogTimestampScenario;
import io.orqueio.bpm.qa.upgrade.timestamp.TaskCreateTimeScenario;
import io.orqueio.bpm.qa.upgrade.timestamp.UserLockExpTimeScenario;
import io.orqueio.bpm.qa.upgrade.useroperationlog.CreateStandaloneTaskDeleteScenario;
import io.orqueio.bpm.qa.upgrade.useroperationlog.CreateStandaloneTaskScenario;
import io.orqueio.bpm.qa.upgrade.useroperationlog.SetAssigneeProcessInstanceTaskScenario;
import io.orqueio.bpm.qa.upgrade.useroperationlog.SuspendProcessDefinitionDeleteScenario;
import io.orqueio.bpm.qa.upgrade.useroperationlog.annotation.AuthorizationCheckProcessDefinitionScenario;
import io.orqueio.bpm.qa.upgrade.useroperationlog.annotation.NoAuthorizationCheckScenario;

/**
 * @author Tassilo Weidner
 */
public class TestFixture {

  public static final String ENGINE_VERSION = "7.10.0";

  public TestFixture(ProcessEngine processEngine) {
  }

  public static void main(String[] args) {
    ProcessEngineConfigurationImpl processEngineConfiguration = (ProcessEngineConfigurationImpl) ProcessEngineConfiguration
      .createProcessEngineConfigurationFromResource("camunda.cfg.xml");
    ProcessEngine processEngine = processEngineConfiguration.buildProcessEngine();

    // register test scenarios
    ScenarioRunner runner = new ScenarioRunner(processEngine, ENGINE_VERSION);

    runner.setupScenarios(DeleteHistoricDecisionsBatchScenario.class);
    runner.setupScenarios(DeleteHistoricProcessInstancesBatchScenario.class);
    runner.setupScenarios(DeleteProcessInstancesBatchScenario.class);
    runner.setupScenarios(SetExternalTaskRetriesBatchScenario.class);
    runner.setupScenarios(SetJobRetriesBatchScenario.class);
    runner.setupScenarios(UpdateProcessInstanceSuspendStateBatchScenario.class);
    runner.setupScenarios(RestartProcessInstanceBatchScenario.class);
    runner.setupScenarios(TimerChangeProcessDefinitionScenario.class);
    runner.setupScenarios(TimerChangeJobDefinitionScenario.class);
    runner.setupScenarios(ModificationBatchScenario.class);
    runner.setupScenarios(ProcessInstanceModificationScenario.class);
    runner.setupScenarios(MigrationBatchScenario.class);
    runner.setupScenarios(TaskFilterScenario.class);
    runner.setupScenarios(TaskFilterVariablesScenario.class);
    runner.setupScenarios(TaskFilterPropertiesScenario.class);
    runner.setupScenarios(DeploymentDeployTimeScenario.class);
    runner.setupScenarios(JobTimestampsScenario.class);
    runner.setupScenarios(IncidentTimestampScenario.class);
    runner.setupScenarios(TaskCreateTimeScenario.class);
    runner.setupScenarios(ExternalTaskLockExpTimeScenario.class);
    runner.setupScenarios(EventSubscriptionCreateTimeScenario.class);
    runner.setupScenarios(MeterLogTimestampScenario.class);
    runner.setupScenarios(UserLockExpTimeScenario.class);
    runner.setupScenarios(CreateStandaloneTaskScenario.class);
    runner.setupScenarios(SetAssigneeProcessInstanceTaskScenario.class);
    runner.setupScenarios(CreateStandaloneTaskDeleteScenario.class);
    runner.setupScenarios(SuspendProcessDefinitionDeleteScenario.class);
    runner.setupScenarios(AuthorizationCheckProcessDefinitionScenario.class);
    runner.setupScenarios(NoAuthorizationCheckScenario.class);

    processEngine.close();
  }
}
