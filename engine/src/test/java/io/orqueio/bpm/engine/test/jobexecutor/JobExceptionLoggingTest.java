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
import io.orqueio.bpm.engine.impl.jobexecutor.JobExecutor;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.model.bpmn.Bpmn;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.commons.testing.ProcessEngineLoggingRule;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

public class JobExceptionLoggingTest {

  private static final String JOBEXECUTOR_LOGGER = "io.orqueio.bpm.engine.jobexecutor";
  private static final String CONTEXT_LOGGER = "io.orqueio.bpm.engine.context";

  public ProcessEngineRule engineRule = new ProvidedProcessEngineRule();
  public ProcessEngineLoggingRule loggingRule = new ProcessEngineLoggingRule().watch(CONTEXT_LOGGER, JOBEXECUTOR_LOGGER).level(Level.DEBUG);
  public ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);
  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(engineRule).around(testRule).around(loggingRule);

  private RuntimeService runtimeService;
  private ManagementService managementService;
  private ProcessEngineConfigurationImpl processEngineConfiguration;

  @Before
  public void init() {
    runtimeService = engineRule.getProcessEngine().getRuntimeService();
    managementService = engineRule.getProcessEngine().getManagementService();
    processEngineConfiguration = engineRule.getProcessEngineConfiguration();

    processEngineConfiguration.setDefaultNumberOfRetries(1);
  }

  @After
  public void tearDown() {
    processEngineConfiguration.setDefaultNumberOfRetries(3);
    processEngineConfiguration.setEnableCmdExceptionLogging(true);
    List<Job> jobs = managementService.createJobQuery().list();
    for (Job job : jobs) {
      managementService.deleteJob(job.getId());
    }
  }

  @Test
  @Deployment(resources = "io/orqueio/bpm/engine/test/jobexecutor/delegateThrowsException.bpmn20.xml")
  public void shouldLogFailingJobOnlyOnceReducedLogging() {
    // given a job that always throws an Exception
    processEngineConfiguration.setEnableCmdExceptionLogging(false);
    runtimeService.startProcessInstanceByKey("testProcess");

    // when executing the job and wait
    JobExecutor jobExecutor = processEngineConfiguration.getJobExecutor();
    jobExecutor.start();
    testRule.waitForJobExecutorToProcessAllJobs();
    jobExecutor.shutdown();

    List<ILoggingEvent> jobLog = loggingRule.getFilteredLog(JOBEXECUTOR_LOGGER, "Exception while executing job");
    List<ILoggingEvent> ctxLog = loggingRule.getFilteredLog(CONTEXT_LOGGER, "Exception while closing command context");

    // then
    assertThat(jobLog.size()).isEqualTo(1);
    assertThat(ctxLog.size()).isEqualTo(0);
  }

  @Test
  @Deployment(resources = "io/orqueio/bpm/engine/test/jobexecutor/delegateThrowsException.bpmn20.xml")
  public void shouldLogFailingJobTwiceDefaultLogging() {
    // given a job that always throws an Exception
    processEngineConfiguration.setEnableCmdExceptionLogging(true);
    runtimeService.startProcessInstanceByKey("testProcess");
    
    // when executing the job and wait
    JobExecutor jobExecutor = processEngineConfiguration.getJobExecutor();
    jobExecutor.start();
    testRule.waitForJobExecutorToProcessAllJobs();
    jobExecutor.shutdown();

    List<ILoggingEvent> jobLog = loggingRule.getFilteredLog(JOBEXECUTOR_LOGGER, "Exception while executing job");
    List<ILoggingEvent> ctxLog = loggingRule.getFilteredLog(CONTEXT_LOGGER, "Exception while closing command context");
    
    // then
    assertThat(jobLog.size()).isEqualTo(1);
    assertThat(ctxLog.size()).isEqualTo(1);
  }

  @Test
  public void shouldNotLogExceptionWhenApiCallReducedLogging() {
    // given
    processEngineConfiguration.setEnableCmdExceptionLogging(false);
    BpmnModelInstance modelInstance = Bpmn.createExecutableProcess("failingDelegate")
        .startEvent()
        .serviceTask()
          .orqueioClass("io.orqueio.bpm.engine.test.jobexecutor.FailingDelegate")
          .orqueioAsyncBefore()
        .done();
    testRule.deploy(modelInstance);

    runtimeService.startProcessInstanceByKey("failingDelegate");
    Job job = managementService.createJobQuery().singleResult();

    // when
    RuntimeException expectedException = null;
    try {
      managementService.executeJob(job.getId());
    } catch (RuntimeException e) {
      expectedException = e;
    }
    List<ILoggingEvent> jobLog = loggingRule.getFilteredLog(JOBEXECUTOR_LOGGER, "Exception while executing job");
    List<ILoggingEvent> ctxLog = loggingRule.getFilteredLog(CONTEXT_LOGGER, "Exception while closing command context");

    // then
    // make sure the exceptions is thrown...
    assertThat(expectedException).isNotNull();
    assertThat(expectedException.getMessage()).contains("Expected Exception");
    // ...but not logged
    assertThat(jobLog.size()).isEqualTo(0);
    assertThat(ctxLog.size()).isEqualTo(0);
  }

  @Test
  public void shouldNotLogExceptionWhenUserApiCallReducedLogging() {
    // given
    processEngineConfiguration.setEnableCmdExceptionLogging(false);
    BpmnModelInstance modelInstance = Bpmn.createExecutableProcess("failingDelegate")
        .startEvent()
        .serviceTask()
          .orqueioClass("io.orqueio.bpm.engine.test.jobexecutor.FailingDelegate")
        .done();
    testRule.deploy(modelInstance);

    // when
    RuntimeException expectedException = null;
    try {
      runtimeService.startProcessInstanceByKey("failingDelegate");
    } catch (RuntimeException e) {
      expectedException = e;
    }
    List<ILoggingEvent> jobLog = loggingRule.getFilteredLog(JOBEXECUTOR_LOGGER, "Exception while executing job");
    List<ILoggingEvent> ctxLog = loggingRule.getFilteredLog(CONTEXT_LOGGER, "Exception while closing command context");

    // then
    // make sure the exceptions is thrown...
    assertThat(expectedException).isNotNull();
    assertThat(expectedException.getMessage()).contains("Expected Exception");
    // ...but not logged
    assertThat(jobLog.size()).isEqualTo(0);
    assertThat(ctxLog.size()).isEqualTo(0);
  }
}
