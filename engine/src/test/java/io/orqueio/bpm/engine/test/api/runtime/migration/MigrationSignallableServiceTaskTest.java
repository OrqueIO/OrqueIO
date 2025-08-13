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
package io.orqueio.bpm.engine.test.api.runtime.migration;

import static io.orqueio.bpm.engine.test.util.MigratingProcessInstanceValidationReportAssert.assertThat;

import io.orqueio.bpm.engine.impl.pvm.PvmTransition;
import io.orqueio.bpm.engine.impl.pvm.delegate.ActivityExecution;
import io.orqueio.bpm.engine.impl.pvm.delegate.SignallableActivityBehavior;
import io.orqueio.bpm.engine.migration.MigratingProcessInstanceValidationException;
import io.orqueio.bpm.engine.migration.MigrationPlan;
import io.orqueio.bpm.engine.repository.ProcessDefinition;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.api.runtime.migration.models.ProcessModels;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

/**
 * @author Thorben Lindhauer
 *
 */
public class MigrationSignallableServiceTaskTest {

  protected ProcessEngineRule rule = new ProvidedProcessEngineRule();
  protected MigrationTestRule testHelper = new MigrationTestRule(rule);

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(rule).around(testHelper);

  @Test
  public void testCannotMigrateActivityInstance() {
    // given
    BpmnModelInstance model = ProcessModels.newModel()
      .startEvent()
      .serviceTask("serviceTask")
      .camundaClass(SignallableServiceTaskDelegate.class.getName())
      .endEvent()
      .done();

    ProcessDefinition sourceProcessDefinition = testHelper.deployAndGetDefinition(model);
    ProcessDefinition targetProcessDefinition = testHelper.deployAndGetDefinition(model);

    MigrationPlan migrationPlan = rule.getRuntimeService()
      .createMigrationPlan(sourceProcessDefinition.getId(), targetProcessDefinition.getId())
      .mapActivities("serviceTask", "serviceTask")
      .build();

    // when
    try {
      testHelper.createProcessInstanceAndMigrate(migrationPlan);
      Assert.fail("should fail");
    }
    catch (MigratingProcessInstanceValidationException e) {
      // then
      assertThat(e.getValidationReport())
        .hasActivityInstanceFailures("serviceTask",
          "The type of the source activity is not supported for activity instance migration"
        );
    }
  }

  @Test
  public void testCannotMigrateAsyncActivityInstance() {
    // given
    BpmnModelInstance model = ProcessModels.newModel()
      .startEvent()
      .serviceTask("serviceTask")
      .camundaAsyncBefore()
      .camundaClass(SignallableServiceTaskDelegate.class.getName())
      .endEvent()
      .done();

    ProcessDefinition sourceProcessDefinition = testHelper.deployAndGetDefinition(model);
    ProcessDefinition targetProcessDefinition = testHelper.deployAndGetDefinition(model);

    MigrationPlan migrationPlan = rule.getRuntimeService()
      .createMigrationPlan(sourceProcessDefinition.getId(), targetProcessDefinition.getId())
      .mapActivities("serviceTask", "serviceTask")
      .build();

    String processInstanceId = rule.getRuntimeService().startProcessInstanceById(sourceProcessDefinition.getId()).getId();
    testHelper.executeAvailableJobs();

    // when
    try {
      rule.getRuntimeService().newMigration(migrationPlan)
        .processInstanceIds(processInstanceId)
        .execute();

      Assert.fail("should fail");
    }
    catch (MigratingProcessInstanceValidationException e) {
      // then
      assertThat(e.getValidationReport())
        .hasActivityInstanceFailures("serviceTask",
          "The type of the source activity is not supported for activity instance migration"
        );
    }
  }

  public static class SignallableServiceTaskDelegate implements SignallableActivityBehavior {

    @Override
    public void execute(ActivityExecution execution) throws Exception {

    }

    @Override
    public void signal(ActivityExecution execution, String signalEvent, Object signalData) throws Exception {
      PvmTransition transition = execution.getActivity().getOutgoingTransitions().get(0);
      execution.leaveActivityViaTransition(transition);
    }

  }
}
