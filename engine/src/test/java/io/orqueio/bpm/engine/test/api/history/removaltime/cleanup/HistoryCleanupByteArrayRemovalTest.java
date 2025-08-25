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

package io.orqueio.bpm.engine.test.api.history.removaltime.cleanup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;
import static io.orqueio.bpm.engine.ProcessEngineConfiguration.HISTORY_CLEANUP_STRATEGY_REMOVAL_TIME_BASED;
import static io.orqueio.bpm.engine.ProcessEngineConfiguration.HISTORY_FULL;
import static io.orqueio.bpm.engine.ProcessEngineConfiguration.HISTORY_REMOVAL_TIME_STRATEGY_END;
import static io.orqueio.bpm.engine.impl.jobexecutor.historycleanup.HistoryCleanupHandler.MAX_BATCH_SIZE;

import java.util.Map;
import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.db.DbEntity;
import io.orqueio.bpm.engine.impl.db.entitymanager.operation.DbOperation;
import io.orqueio.bpm.engine.impl.history.DefaultHistoryRemovalTimeProvider;
import io.orqueio.bpm.engine.impl.history.event.HistoricJobLogEvent;
import io.orqueio.bpm.engine.impl.jobexecutor.historycleanup.HistoryCleanupJobHandler;
import io.orqueio.bpm.engine.impl.jobexecutor.historycleanup.HistoryCleanupRemovalTime;
import io.orqueio.bpm.engine.impl.persistence.entity.ByteArrayEntity;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.api.resources.GetByteArrayCommand;
import io.orqueio.bpm.engine.test.util.EntityRemoveRule;
import io.orqueio.bpm.engine.test.util.ProcessEngineBootstrapRule;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.engine.test.util.RemoveAfter;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

@RequiredHistoryLevel(HISTORY_FULL)
public class HistoryCleanupByteArrayRemovalTest {

  private ProcessEngineBootstrapRule bootstrapRule = new ProcessEngineBootstrapRule(config -> {

    config.setHistoryRemovalTimeStrategy(HISTORY_REMOVAL_TIME_STRATEGY_END)
        .setHistoryRemovalTimeProvider(new DefaultHistoryRemovalTimeProvider())
        .initHistoryRemovalTime();

    config.setHistoryCleanupStrategy(HISTORY_CLEANUP_STRATEGY_REMOVAL_TIME_BASED);

    config.setHistoryCleanupBatchSize(MAX_BATCH_SIZE);
    config.setHistoryCleanupBatchWindowStartTime(null);
    config.setHistoryCleanupDegreeOfParallelism(1);

    config.setBatchOperationHistoryTimeToLive(null);
    config.setBatchOperationsForHistoryCleanup(null);

    config.setHistoryTimeToLive(null);

    config.setTaskMetricsEnabled(false);
    config.setTaskMetricsTimeToLive(null);

    config.initHistoryCleanup();
  });

  protected ProcessEngineRule engineRule = new ProvidedProcessEngineRule(bootstrapRule);
  protected ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);
  protected EntityRemoveRule entityRemoveRule = EntityRemoveRule.ofLazyRule(() -> testRule);

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(bootstrapRule)
      .around(engineRule)
      .around(testRule)
      .around(entityRemoveRule);

  private ManagementService managementService;
  private HistoryService historyService;
  private ProcessEngineConfigurationImpl engineConfiguration;

  @Before
  public void init() {
    ProcessEngine processEngine = bootstrapRule.getProcessEngine();

    managementService = processEngine.getManagementService();
    historyService = processEngine.getHistoryService();
    engineConfiguration = (ProcessEngineConfigurationImpl) processEngine.getProcessEngineConfiguration();
  }

  @After
  public void tearDown() {
    restoreCleanupJobHandler();
    testRule.deleteHistoryCleanupJobs();
  }

  @Test
  @RemoveAfter
  public void shouldHaveRemovalTimeOnFailingHistoryCleanupJob() {
    // given
    engineConfiguration.setHistoryCleanupJobLogTimeToLive("1");
    overrideFailingCleanupJobHandler();

    try {
      // when
      runHistoryCleanup();
      fail("This test should fail during history cleanup and not reach this point");
    } catch (Exception e) {
      HistoricJobLogEvent event = getLastFailingHistoryCleanupJobEvent();
      String exceptionByteArrayId = event.getExceptionByteArrayId();
      ByteArrayEntity byteArray = findByteArrayById(exceptionByteArrayId);

      // then
      assertThat(byteArray).isNotNull();
      assertThat(byteArray.getRemovalTime()).isNotNull();
    }
  }

  protected ByteArrayEntity findByteArrayById(String byteArrayId) {
    return engineConfiguration.getCommandExecutorTxRequired().execute(new GetByteArrayCommand(byteArrayId));
  }

  protected void restoreCleanupJobHandler() {
    engineConfiguration.getJobHandlers().put(HistoryCleanupJobHandler.TYPE, new HistoryCleanupJobHandler());
  }

  protected void overrideFailingCleanupJobHandler() {
    engineConfiguration.getJobHandlers().put(HistoryCleanupJobHandler.TYPE, new FailingHistoryCleanupJobHandler());
  }

  protected void runHistoryCleanup() {
    historyService.cleanUpHistoryAsync(true);

    historyService.findHistoryCleanupJobs().forEach(job -> managementService.executeJob(job.getId()));
  }

  protected HistoricJobLogEvent getLastFailingHistoryCleanupJobEvent() {
    return (HistoricJobLogEvent) historyService.createHistoricJobLogQuery()
        .failureLog()
        .jobDefinitionType("history-cleanup")
        .singleResult();
  }

  /* History Cleanup Job Handler that fails during process cleanup */
  static class FailingHistoryCleanupJobHandler extends HistoryCleanupJobHandler {

    @Override
    protected HistoryCleanupRemovalTime getTimeBasedHandler() {
      return new FailingProcessCleanupRemovalTime();
    }

    static class FailingProcessCleanupRemovalTime extends HistoryCleanupRemovalTime {
      @Override
      protected Map<Class<? extends DbEntity>, DbOperation> performProcessCleanup() {
        throw new RuntimeException("This operation is always failing!");
      }
    }
  }
}
