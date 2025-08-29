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

import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.persistence.entity.AcquirableJobEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.JobEntity;
import io.orqueio.bpm.engine.runtime.Job;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

public class JobExecutorAcquireCleanupJobsTest extends AbstractJobExecutorAcquireJobsTest {

  public HistoryService historyService;

  @Before
  public void assignServices() {
    historyService = rule.getHistoryService();
  }

  @Test
  public void shouldNotAcquireJobsWhenCleanupDisabled() {
    // given
    historyService.cleanUpHistoryAsync(true);
    configuration.setHistoryCleanupEnabled(false);

    List<Job> historyCleanupJobs = historyService.findHistoryCleanupJobs();

    // assume
    assertThat(historyCleanupJobs).isNotEmpty();

    // when
    List<AcquirableJobEntity> acquirableJobs = findAcquirableJobs();

    // then
    assertThat(acquirableJobs).isEmpty();

    // reset
    configuration.setHistoryCleanupEnabled(true);
  }

  @Test
  public void shouldAcquireJobsWhenCleanupEnabled() {
    // given
    historyService.cleanUpHistoryAsync(true);

    List<Job> historyCleanupJobs = historyService.findHistoryCleanupJobs();

    // assume
    assertThat(historyCleanupJobs).isNotEmpty();

    // when
    List<AcquirableJobEntity> acquirableJobs = findAcquirableJobs();

    // then
    assertThat(acquirableJobs).isNotEmpty();
  }

  @After
  public void resetDatabase() {
    configuration.getCommandExecutorTxRequired().execute(new Command<Void>() {
      public Void execute(CommandContext commandContext) {
        String handlerType = "history-cleanup";
        List<Job> jobsByHandlerType = commandContext.getJobManager()
            .findJobsByHandlerType(handlerType);

        for (Job job : jobsByHandlerType) {
          commandContext.getJobManager()
              .deleteJob((JobEntity) job);
        }

        commandContext.getHistoricJobLogManager()
            .deleteHistoricJobLogsByHandlerType(handlerType);

        return null;
      }
    });
  }

}
