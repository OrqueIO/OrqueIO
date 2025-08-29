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
package io.orqueio.bpm.engine.test.jobexecutor;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.commons.testing.ProcessEngineLoggingRule;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

public class ReducedJobExceptionLoggingTest {

  protected ProvidedProcessEngineRule engineRule = new ProvidedProcessEngineRule();
  public ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);
  public ProcessEngineLoggingRule loggingRule = new ProcessEngineLoggingRule().watch("io.orqueio.bpm.engine.jobexecutor", Level.DEBUG);

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(engineRule).around(testRule).around(loggingRule);

  private RuntimeService runtimeService;
  private ManagementService managementService;
  private ProcessEngineConfigurationImpl processEngineConfiguration;

  @Before
  public void init() {
    runtimeService = engineRule.getRuntimeService();
    processEngineConfiguration = engineRule.getProcessEngineConfiguration();
    managementService = engineRule.getProcessEngine().getManagementService();
  }

  @After
  public void tearDown() {
    processEngineConfiguration.setEnableReducedJobExceptionLogging(false);
    List<Job> jobs = managementService.createJobQuery().processDefinitionKey("failingProcess").list();
    for (Job job : jobs) {
      managementService.deleteJob(job.getId());
    }
  }

  @Test
  @Deployment(resources = { "io/orqueio/bpm/engine/test/api/mgmt/IncidentTest.testShouldCreateOneIncident.bpmn" })
  public void shouldLogAllFailingJobExceptions() {
    // given
    processEngineConfiguration.setEnableReducedJobExceptionLogging(false);

    // when
    runtimeService.startProcessInstanceByKey("failingProcess");
    processEngineConfiguration.getJobExecutor().start();
    testRule.waitForJobExecutorToProcessAllJobs();
    processEngineConfiguration.getJobExecutor().shutdown();

    List<ILoggingEvent> filteredLogList = loggingRule.getFilteredLog("Exception while executing job");

    // then
    assertThat(filteredLogList.size()).isEqualTo(3);
  }

  @Test
  @Deployment(resources = { "io/orqueio/bpm/engine/test/api/mgmt/IncidentTest.testShouldCreateOneIncident.bpmn" })
  public void shouldLogOnlyOneFailingJobException() {
    // given
    processEngineConfiguration.setEnableReducedJobExceptionLogging(true);

    // when
    runtimeService.startProcessInstanceByKey("failingProcess");
    processEngineConfiguration.getJobExecutor().start();
    testRule.waitForJobExecutorToProcessAllJobs();
    processEngineConfiguration.getJobExecutor().shutdown();

    List<ILoggingEvent> filteredLogList = loggingRule.getFilteredLog("Exception while executing job");

    // then
    assertThat(filteredLogList.size()).isEqualTo(1);
  }
}
