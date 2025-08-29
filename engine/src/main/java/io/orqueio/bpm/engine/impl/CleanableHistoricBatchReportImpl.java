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
package io.orqueio.bpm.engine.impl;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;

import io.orqueio.bpm.engine.history.CleanableHistoricBatchReport;
import io.orqueio.bpm.engine.history.CleanableHistoricBatchReportResult;
import io.orqueio.bpm.engine.impl.batch.BatchJobHandler;
import io.orqueio.bpm.engine.impl.cfg.CommandChecker;
import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.interceptor.CommandExecutor;

import static io.orqueio.bpm.engine.ProcessEngineConfiguration.HISTORY_CLEANUP_STRATEGY_REMOVAL_TIME_BASED;

public class CleanableHistoricBatchReportImpl extends AbstractQuery<CleanableHistoricBatchReport, CleanableHistoricBatchReportResult> implements CleanableHistoricBatchReport {

  private static final long serialVersionUID = 1L;

  protected Date currentTimestamp;

  protected boolean isHistoryCleanupStrategyRemovalTimeBased;

  public CleanableHistoricBatchReportImpl(CommandExecutor commandExecutor) {
    super(commandExecutor);
  }

  @Override
  public CleanableHistoricBatchReport orderByFinishedBatchOperation() {
    orderBy(CleanableHistoricInstanceReportProperty.FINISHED_AMOUNT);
    return this;
  }

  @Override
  public long executeCount(CommandContext commandContext) {
    provideHistoryCleanupStrategy(commandContext);

    checkQueryOk();
    checkPermissions(commandContext);

    Map<String, Integer> batchOperationsForHistoryCleanup = commandContext.getProcessEngineConfiguration().getParsedBatchOperationsForHistoryCleanup();

    if (isHistoryCleanupStrategyRemovalTimeBased()) {
      addBatchOperationsWithoutTTL(batchOperationsForHistoryCleanup);
    }

    return commandContext.getHistoricBatchManager().findCleanableHistoricBatchesReportCountByCriteria(this, batchOperationsForHistoryCleanup);
  }

  @Override
  public List<CleanableHistoricBatchReportResult> executeList(CommandContext commandContext, Page page) {
    provideHistoryCleanupStrategy(commandContext);

    checkQueryOk();
    checkPermissions(commandContext);

    Map<String, Integer> batchOperationsForHistoryCleanup = commandContext.getProcessEngineConfiguration().getParsedBatchOperationsForHistoryCleanup();

    if (isHistoryCleanupStrategyRemovalTimeBased()) {
      addBatchOperationsWithoutTTL(batchOperationsForHistoryCleanup);
    }

    return commandContext.getHistoricBatchManager().findCleanableHistoricBatchesReportByCriteria(this, page, batchOperationsForHistoryCleanup);
  }

  protected void addBatchOperationsWithoutTTL(Map<String, Integer> batchOperations) {
    Map<String, BatchJobHandler<?>> batchJobHandlers = Context.getProcessEngineConfiguration().getBatchHandlers();

    Set<String> batchOperationKeys = null;
    if (batchJobHandlers != null) {
      batchOperationKeys = batchJobHandlers.keySet();
    }

    if (batchOperationKeys != null) {
      for (String batchOperation : batchOperationKeys) {
        Integer ttl = batchOperations.get(batchOperation);
        batchOperations.put(batchOperation, ttl);

      }
    }
  }

  public Date getCurrentTimestamp() {
    return currentTimestamp;
  }

  public void setCurrentTimestamp(Date currentTimestamp) {
    this.currentTimestamp = currentTimestamp;
  }

  private void checkPermissions(CommandContext commandContext) {
    for (CommandChecker checker : commandContext.getProcessEngineConfiguration().getCommandCheckers()) {
      checker.checkReadHistoricBatch();
    }
  }

  protected void provideHistoryCleanupStrategy(CommandContext commandContext) {
    String historyCleanupStrategy = commandContext.getProcessEngineConfiguration()
      .getHistoryCleanupStrategy();

    isHistoryCleanupStrategyRemovalTimeBased = HISTORY_CLEANUP_STRATEGY_REMOVAL_TIME_BASED.equals(historyCleanupStrategy);
  }

  public boolean isHistoryCleanupStrategyRemovalTimeBased() {
    return isHistoryCleanupStrategyRemovalTimeBased;
  }

}
