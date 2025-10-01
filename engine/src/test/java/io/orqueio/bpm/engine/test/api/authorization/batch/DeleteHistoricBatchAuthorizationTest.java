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
package io.orqueio.bpm.engine.test.api.authorization.batch;

import static io.orqueio.bpm.engine.history.UserOperationLogEntry.CATEGORY_OPERATOR;
import static io.orqueio.bpm.engine.history.UserOperationLogEntry.OPERATION_TYPE_DELETE_HISTORY;
import static io.orqueio.bpm.engine.test.api.authorization.util.AuthorizationScenario.scenario;
import static io.orqueio.bpm.engine.test.api.authorization.util.AuthorizationSpec.grant;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;

import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.authorization.Permissions;
import io.orqueio.bpm.engine.authorization.Resources;
import io.orqueio.bpm.engine.batch.Batch;
import io.orqueio.bpm.engine.history.UserOperationLogEntry;
import io.orqueio.bpm.engine.migration.MigrationPlan;
import io.orqueio.bpm.engine.repository.ProcessDefinition;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.api.authorization.util.AuthorizationScenario;
import io.orqueio.bpm.engine.test.api.authorization.util.AuthorizationTestRule;
import io.orqueio.bpm.engine.test.api.runtime.migration.models.ProcessModels;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameter;
import org.junit.runners.Parameterized.Parameters;

/**
 * @author Thorben Lindhauer
 *
 */
@RunWith(Parameterized.class)
@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_FULL)
public class DeleteHistoricBatchAuthorizationTest {

  public ProcessEngineRule engineRule = new ProvidedProcessEngineRule();
  public AuthorizationTestRule authRule = new AuthorizationTestRule(engineRule);
  public ProcessEngineTestRule testHelper = new ProcessEngineTestRule(engineRule);

  @Rule
  public RuleChain chain = RuleChain.outerRule(engineRule).around(authRule).around(testHelper);

  @Parameter
  public AuthorizationScenario scenario;

  @Parameters(name = "Scenario {index}")
  public static Collection<AuthorizationScenario[]> scenarios() {
    return AuthorizationTestRule.asParameters(
      scenario()
        .withoutAuthorizations()
        .failsDueToRequired(
          grant(Resources.BATCH, "batchId", "userId", Permissions.DELETE_HISTORY)),
      scenario()
        .withAuthorizations(
          grant(Resources.BATCH, "batchId", "userId", Permissions.DELETE_HISTORY))
        .succeeds()
      );
  }

  protected MigrationPlan migrationPlan;
  protected Batch batch;

  @Before
  public void setUp() {
    authRule.createUserAndGroup("userId", "groupId");
  }

  @Before
  public void deployProcessesAndCreateMigrationPlan() {
    ProcessDefinition sourceDefinition = testHelper.deployAndGetDefinition(ProcessModels.ONE_TASK_PROCESS);
    ProcessDefinition targetDefinition = testHelper.deployAndGetDefinition(ProcessModels.ONE_TASK_PROCESS);

    migrationPlan = engineRule
        .getRuntimeService()
        .createMigrationPlan(sourceDefinition.getId(), targetDefinition.getId())
        .build();
  }

  @After
  public void tearDown() {
    authRule.deleteUsersAndGroups();
  }

  @After
  public void deleteBatch() {
    engineRule.getManagementService().deleteBatch(batch.getId(), true);
  }

  @Test
  public void testDeleteBatch() {

    // given
    ProcessInstance processInstance = engineRule.getRuntimeService().startProcessInstanceById(migrationPlan.getSourceProcessDefinitionId());
    batch = engineRule
        .getRuntimeService()
        .newMigration(migrationPlan)
        .processInstanceIds(Arrays.asList(processInstance.getId()))
        .executeAsync();

    // when
    authRule
      .init(scenario)
      .withUser("userId")
      .bindResource("batchId", batch.getId())
      .start();

    engineRule.getHistoryService().deleteHistoricBatch(batch.getId());

    // then
    if (authRule.assertScenario(scenario)) {
      assertEquals(0, engineRule.getHistoryService().createHistoricBatchQuery().count());

      List<UserOperationLogEntry> userOperationLogEntries = engineRule.getHistoryService()
        .createUserOperationLogQuery()
        .operationType(OPERATION_TYPE_DELETE_HISTORY)
        .list();

      assertEquals(1, userOperationLogEntries.size());

      UserOperationLogEntry entry = userOperationLogEntries.get(0);
      assertNull(entry.getProperty());
      assertEquals(CATEGORY_OPERATOR, entry.getCategory());
    }
  }

}
