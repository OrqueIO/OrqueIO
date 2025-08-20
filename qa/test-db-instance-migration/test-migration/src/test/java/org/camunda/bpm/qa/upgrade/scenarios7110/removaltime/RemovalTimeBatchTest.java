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
package io.orqueio.bpm.qa.upgrade.scenarios7110.removaltime;

import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.batch.Batch;
import io.orqueio.bpm.engine.history.HistoricProcessInstance;
import io.orqueio.bpm.engine.history.HistoricProcessInstanceQuery;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

import java.util.Date;
import java.util.List;

import static org.hamcrest.core.IsNull.notNullValue;
import static org.hamcrest.core.IsNull.nullValue;
import static org.junit.Assert.assertThat;

/**
 * @author Tassilo Weidner
 */
public class RemovalTimeBatchTest {

  @Rule
  public ProcessEngineRule engineRule = new ProcessEngineRule("camunda.cfg.xml");

  protected HistoryService historyService;

  @Before
  public void assignService() {
    historyService = engineRule.getHistoryService();
  }

  @Test
  public void shouldSetRemovalTimeForRootProcessInstanceOnly() {
    // given
    HistoricProcessInstanceQuery query = historyService.createHistoricProcessInstanceQuery()
      .processInstanceBusinessKey("rootProcessInstance");

    HistoricProcessInstance historicRootProcessInstance = query.singleResult();

    HistoricProcessInstance historicChildProcessInstance = historyService.createHistoricProcessInstanceQuery()
      .superProcessInstanceId(historicRootProcessInstance.getId())
      .singleResult();

    // assume
    assertThat(historicRootProcessInstance.getRemovalTime(), nullValue());
    assertThat(historicChildProcessInstance.getRemovalTime(), nullValue());

    // when
    syncExec(
      historyService.setRemovalTimeToHistoricProcessInstances()
        .absoluteRemovalTime(new Date())
        .byQuery(query)
        .hierarchical()
        .executeAsync()
    );

    historicRootProcessInstance = query.singleResult();

    historicChildProcessInstance = historyService.createHistoricProcessInstanceQuery()
      .superProcessInstanceId(historicRootProcessInstance.getId())
      .singleResult();

    // then
    assertThat(historicRootProcessInstance.getRemovalTime(), notNullValue());
    assertThat(historicChildProcessInstance.getRemovalTime(), nullValue());
  }

  // helper ////////////////////////////////////////////////////////////////////////////////////////////////////////////

  protected void syncExec(Batch batch) {
    String seedJobDefinitionId = batch.getSeedJobDefinitionId();

    String jobId = engineRule.getManagementService().createJobQuery()
      .jobDefinitionId(seedJobDefinitionId)
      .singleResult()
      .getId();

    engineRule.getManagementService().executeJob(jobId);

    String batchJobDefinitionId = batch.getBatchJobDefinitionId();

    List<Job> jobs = engineRule.getManagementService().createJobQuery()
      .jobDefinitionId(batchJobDefinitionId)
      .list();

    for (Job job : jobs) {
      engineRule.getManagementService().executeJob(job.getId());
    }

    String monitorJobDefinitionId = batch.getMonitorJobDefinitionId();

    jobId = engineRule.getManagementService().createJobQuery()
      .jobDefinitionId(monitorJobDefinitionId)
      .singleResult()
      .getId();

    engineRule.getManagementService().executeJob(jobId);
  }

}
