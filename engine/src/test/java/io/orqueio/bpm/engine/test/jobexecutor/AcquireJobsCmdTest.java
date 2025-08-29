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

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import java.util.Date;

import io.orqueio.bpm.engine.impl.cmd.AcquireJobsCmd;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.jobexecutor.AcquiredJobs;
import io.orqueio.bpm.engine.impl.util.ClockUtil;
import io.orqueio.bpm.engine.repository.ProcessDefinition;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.util.PluggableProcessEngineTest;
import org.junit.Test;

/**
 *
 * @author Daniel Meyer
 */
public class AcquireJobsCmdTest extends PluggableProcessEngineTest {

  @Deployment(resources={"io/orqueio/bpm/engine/test/standalone/jobexecutor/oneJobProcess.bpmn20.xml"})
  @Test
  public void testJobsNotVisisbleToAcquisitionIfInstanceSuspended() {

    ProcessDefinition pd = repositoryService.createProcessDefinitionQuery().singleResult();
    ProcessInstance pi = runtimeService.startProcessInstanceByKey(pd.getKey());

    // now there is one job:
    Job job = managementService.createJobQuery()
      .singleResult();
    assertNotNull(job);

    makeSureJobDue(job);

    // the acquirejobs command sees the job:
    AcquiredJobs acquiredJobs = executeAcquireJobsCommand();
    assertEquals(1, acquiredJobs.size());

    // suspend the process instance:
    runtimeService.suspendProcessInstanceById(pi.getId());

    // now, the acquirejobs command does not see the job:
    acquiredJobs = executeAcquireJobsCommand();
    assertEquals(0, acquiredJobs.size());
  }

  @Deployment(resources={"io/orqueio/bpm/engine/test/standalone/jobexecutor/oneJobProcess.bpmn20.xml"})
  @Test
  public void testJobsNotVisisbleToAcquisitionIfDefinitionSuspended() {

    ProcessDefinition pd = repositoryService.createProcessDefinitionQuery().singleResult();
    runtimeService.startProcessInstanceByKey(pd.getKey());
    // now there is one job:
    Job job = managementService.createJobQuery()
      .singleResult();
    assertNotNull(job);

    makeSureJobDue(job);

    // the acquirejobs command sees the job:
    AcquiredJobs acquiredJobs = executeAcquireJobsCommand();
    assertEquals(1, acquiredJobs.size());

    // suspend the process instance:
    repositoryService.suspendProcessDefinitionById(pd.getId());

    // now, the acquirejobs command does not see the job:
    acquiredJobs = executeAcquireJobsCommand();
    assertEquals(0, acquiredJobs.size());
  }

  protected void makeSureJobDue(final Job job) {
    processEngineConfiguration.getCommandExecutorTxRequired()
      .execute(new Command<Void>() {
        public Void execute(CommandContext commandContext) {
          Date currentTime = ClockUtil.getCurrentTime();
          commandContext.getJobManager()
            .findJobById(job.getId())
            .setDuedate(new Date(currentTime.getTime() - 10000));
          return null;
        }

      });
  }

  private AcquiredJobs executeAcquireJobsCommand() {
    return processEngineConfiguration.getCommandExecutorTxRequired()
      .execute(new AcquireJobsCmd(processEngineConfiguration.getJobExecutor()));
  }

}
