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
package io.orqueio.bpm.engine.test.api.history;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.apache.commons.lang3.time.DateUtils;
import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.history.HistoricDecisionInstance;
import io.orqueio.bpm.engine.history.HistoricProcessInstance;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.persistence.entity.JobEntity;
import io.orqueio.bpm.engine.impl.util.ClockUtil;
import io.orqueio.bpm.engine.repository.DecisionDefinition;
import io.orqueio.bpm.engine.repository.ProcessDefinition;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.util.ProcessEngineBootstrapRule;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.engine.variable.Variables;
import org.junit.After;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_ACTIVITY)
public class BulkHistoryDeleteCmmnDisabledTest {

  @ClassRule
  public static ProcessEngineBootstrapRule bootstrapRule = new ProcessEngineBootstrapRule(configuration ->
      configuration.setCmmnEnabled(false));

  protected ProvidedProcessEngineRule engineRule = new ProvidedProcessEngineRule(bootstrapRule);
  public ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(engineRule).around(testRule);

  private RuntimeService runtimeService;
  private HistoryService historyService;

  @Before
  public void createProcessEngine() {
    runtimeService = engineRule.getRuntimeService();
    historyService = engineRule.getHistoryService();
  }

  @After
  public void clearDatabase() {
    engineRule.getProcessEngineConfiguration().getCommandExecutorTxRequired().execute(new Command<Void>() {
      public Void execute(CommandContext commandContext) {

        List<Job> jobs = engineRule.getManagementService().createJobQuery().list();
        if (jobs.size() > 0) {
          assertEquals(1, jobs.size());
          String jobId = jobs.get(0).getId();
          commandContext.getJobManager().deleteJob((JobEntity) jobs.get(0));
          commandContext.getHistoricJobLogManager().deleteHistoricJobLogByJobId(jobId);
        }

        commandContext.getMeterLogManager().deleteAll();

        return null;
      }
    });

    List<HistoricProcessInstance> historicProcessInstances = historyService.createHistoricProcessInstanceQuery().list();
    for (HistoricProcessInstance historicProcessInstance : historicProcessInstances) {
      historyService.deleteHistoricProcessInstance(historicProcessInstance.getId());
    }

    List<HistoricDecisionInstance> historicDecisionInstances = historyService.createHistoricDecisionInstanceQuery().list();
    for (HistoricDecisionInstance historicDecisionInstance : historicDecisionInstances) {
      historyService.deleteHistoricDecisionInstanceByInstanceId(historicDecisionInstance.getId());
    }

  }

  @Test
  @Deployment(resources = { "io/orqueio/bpm/engine/test/api/oneTaskProcess.bpmn20.xml", "io/orqueio/bpm/engine/test/api/dmn/Example.dmn" })
  public void historyCleanUpWithDisabledCmmn() {
    // given
    prepareHistoricProcesses(5);
    prepareHistoricDecisions(5);

    ClockUtil.setCurrentTime(new Date());
    // when
    String jobId = historyService.cleanUpHistoryAsync(true).getId();

    engineRule.getManagementService().executeJob(jobId);

    // then
    assertEquals(0, historyService.createHistoricProcessInstanceQuery().count());
    assertEquals(0, historyService.createHistoricDecisionInstanceQuery().count());
  }

  private void prepareHistoricProcesses(int instanceCount) {
    Date oldCurrentTime = ClockUtil.getCurrentTime();
    List<String> processInstanceIds = new ArrayList<>();
    ClockUtil.setCurrentTime(DateUtils.addDays(new Date(), -6));
    for (int i = 0; i < instanceCount; i++) {
      ProcessInstance processInstance = runtimeService.startProcessInstanceByKey("oneTaskProcess");
      processInstanceIds.add(processInstance.getId());
    }
    List<ProcessDefinition> processDefinitions = engineRule.getRepositoryService().createProcessDefinitionQuery().list();
    assertEquals(1, processDefinitions.size());
    engineRule.getRepositoryService().updateProcessDefinitionHistoryTimeToLive(processDefinitions.get(0).getId(), 5);

    runtimeService.deleteProcessInstances(processInstanceIds, null, true, true);
    ClockUtil.setCurrentTime(oldCurrentTime);
  }

  private void prepareHistoricDecisions(int instanceCount) {
    Date oldCurrentTime = ClockUtil.getCurrentTime();
    List<DecisionDefinition> decisionDefinitions = engineRule.getRepositoryService().createDecisionDefinitionQuery().decisionDefinitionKey("decision").list();
    assertEquals(1, decisionDefinitions.size());
    engineRule.getRepositoryService().updateDecisionDefinitionHistoryTimeToLive(decisionDefinitions.get(0).getId(), 5);

    ClockUtil.setCurrentTime(DateUtils.addDays(new Date(), -6));
    for (int i = 0; i < instanceCount; i++) {
      engineRule.getDecisionService().evaluateDecisionByKey("decision").variables(Variables.createVariables().putValue("status", "silver").putValue("sum", 723))
          .evaluate();
    }
    ClockUtil.setCurrentTime(oldCurrentTime);
  }
}
