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
package io.orqueio.bpm.engine.test.api.history;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;

import org.apache.commons.lang3.time.DateUtils;
import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.metrics.Meter;
import io.orqueio.bpm.engine.impl.persistence.entity.JobEntity;
import io.orqueio.bpm.engine.impl.util.ClockUtil;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.util.ProcessEngineBootstrapRule;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import org.junit.After;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

/**
 * @author Svetlana Dorokhova
 *
 */
@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_ACTIVITY)
public class HistoryCleanupDmnDisabledTest {

  @ClassRule
  public static ProcessEngineBootstrapRule bootstrapRule = new ProcessEngineBootstrapRule(configuration ->
      configuration.setDmnEnabled(false));
  protected ProvidedProcessEngineRule engineRule = new ProvidedProcessEngineRule(bootstrapRule);
  protected ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(engineRule).around(testRule);

  private RuntimeService runtimeService;
  private HistoryService historyService;
  private ProcessEngineConfigurationImpl processEngineConfiguration;
  private ManagementService managementService;

  @Before
  public void createProcessEngine() {
    runtimeService = engineRule.getRuntimeService();
    historyService = engineRule.getHistoryService();
    managementService = engineRule.getManagementService();
    processEngineConfiguration = engineRule.getProcessEngineConfiguration();

  }

  @After
  public void clearDatabase(){
    engineRule.getProcessEngineConfiguration().getCommandExecutorTxRequired().execute(new Command<Void>() {
      public Void execute(CommandContext commandContext) {

        List<Job> jobs = engineRule.getManagementService().createJobQuery().list();
        if (jobs.size() > 0) {
          assertEquals(1, jobs.size());
          String jobId = jobs.get(0).getId();
          commandContext.getJobManager().deleteJob((JobEntity) jobs.get(0));
          commandContext.getHistoricJobLogManager().deleteHistoricJobLogByJobId(jobId);
        }

        return null;
      }
    });

    clearMetrics();

  }

  protected void clearMetrics() {
    Collection<Meter> meters = processEngineConfiguration.getMetricsRegistry().getDbMeters().values();
    for (Meter meter : meters) {
      meter.getAndClear();
    }
    managementService.deleteMetrics(null);
  }

  @Test
  @Deployment(resources = {
      "io/orqueio/bpm/engine/test/api/oneTaskProcess.bpmn20.xml"})
  public void historyCleanupWithDisabledDmn() {

    prepareHistoricProcesses("oneTaskProcess");

    ClockUtil.setCurrentTime(new Date());
    //when
    String jobId = historyService.cleanUpHistoryAsync(true).getId();

    engineRule.getManagementService().executeJob(jobId);

    //then
    assertEquals(0, historyService.createHistoricProcessInstanceQuery().processDefinitionKey("oneTaskProcess").count());
  }

  private void prepareHistoricProcesses(String businessKey) {
    Date oldCurrentTime = ClockUtil.getCurrentTime();
    ClockUtil.setCurrentTime(DateUtils.addDays(new Date(), -6));

    List<String> processInstanceIds = new ArrayList<>();

    for (int i = 0; i < 5; i++) {
      ProcessInstance processInstance = runtimeService.startProcessInstanceByKey(businessKey);
      processInstanceIds.add(processInstance.getId());
    }
    runtimeService.deleteProcessInstances(processInstanceIds, null, true, true);

    ClockUtil.setCurrentTime(oldCurrentTime);

  }

}
