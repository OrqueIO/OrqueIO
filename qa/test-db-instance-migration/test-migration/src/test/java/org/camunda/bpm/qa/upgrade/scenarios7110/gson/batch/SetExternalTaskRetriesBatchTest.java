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
package io.orqueio.bpm.qa.upgrade.scenarios7110.gson.batch;

import io.orqueio.bpm.engine.batch.Batch;
import io.orqueio.bpm.engine.externaltask.ExternalTask;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.qa.upgrade.Origin;
import io.orqueio.bpm.qa.upgrade.ScenarioUnderTest;
import org.junit.Rule;
import org.junit.Test;

import java.util.List;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;

/**
 * @author Tassilo Weidner
 */
@ScenarioUnderTest("SetExternalTaskRetriesScenario")
@Origin("7.11.0")
public class SetExternalTaskRetriesBatchTest {

  @Rule
  public ProcessEngineRule engineRule = new ProcessEngineRule("camunda.cfg.xml");

  @ScenarioUnderTest("initSetExternalTaskRetriesBatch.1")
  @Test
  public void testSetExternalTaskRetriesBatch() {
    List<ExternalTask> externalTasks = engineRule.getExternalTaskService()
      .createExternalTaskQuery()
      .topicName("topic710")
      .list();

    // assume
    assertThat(externalTasks.size(), is(10));

    Batch batch = engineRule.getManagementService().createBatchQuery()
      .type(Batch.TYPE_SET_EXTERNAL_TASK_RETRIES)
      .singleResult();

    String jobId = engineRule.getManagementService().createJobQuery()
      .jobDefinitionId(batch.getSeedJobDefinitionId())
      .singleResult()
      .getId();

    engineRule.getManagementService().executeJob(jobId);

    List<Job> jobs = engineRule.getManagementService().createJobQuery()
      .jobDefinitionId(batch.getBatchJobDefinitionId())
      .list();

    // when
    for (Job job : jobs) {
      engineRule.getManagementService().executeJob(job.getId());
    }

    externalTasks = engineRule.getExternalTaskService()
      .createExternalTaskQuery()
      .topicName("topic710")
      .list();

    // then
    assertThat(externalTasks.size(), is(10));

    for (ExternalTask externalTask : externalTasks) {
      assertThat(externalTask.getRetries(), is(22));
    }
  }

}