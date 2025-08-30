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
package io.orqueio.bpm.qa.upgrade.scenarios720.task;

import static io.orqueio.bpm.qa.upgrade.util.ActivityInstanceAssert.assertThat;
import static io.orqueio.bpm.qa.upgrade.util.ActivityInstanceAssert.describeActivityInstanceTree;

import io.orqueio.bpm.engine.runtime.ActivityInstance;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.qa.upgrade.Origin;
import io.orqueio.bpm.qa.upgrade.ScenarioUnderTest;
import io.orqueio.bpm.qa.upgrade.UpgradeTestRule;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;

/**
 * @author Thorben Lindhauer
 *
 */
@ScenarioUnderTest("ParallelTasksScenario")
@Origin("7.2.0")
public class ParallelTasksScenarioTest {

  @Rule
  public UpgradeTestRule rule = new UpgradeTestRule();

  @Test
  @ScenarioUnderTest("init.plain.1")
  public void testInitPlainActivityInstance() {
    // given
    ProcessInstance instance = rule.processInstance();

    // when
    ActivityInstance activityInstance = rule.getRuntimeService().getActivityInstance(instance.getId());

    // then
    Assert.assertNotNull(activityInstance);
    assertThat(activityInstance).hasStructure(
      describeActivityInstanceTree(instance.getProcessDefinitionId())
        .activity("task1")
        .activity("task2")
      .done());
  }

  @Test
  @ScenarioUnderTest("init.nested.1")
  public void testInitNestedActivityInstance() {
    // given
    ProcessInstance instance = rule.processInstance();

    // when
    ActivityInstance activityInstance = rule.getRuntimeService().getActivityInstance(instance.getId());

    // then
    Assert.assertNotNull(activityInstance);
    assertThat(activityInstance).hasStructure(
      describeActivityInstanceTree(instance.getProcessDefinitionId())
        .beginScope("subProcess")
          .activity("task1")
          .activity("task2")
      .done());
  }
}
