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
package io.orqueio.bpm.engine.impl.dmn.batch;

import java.util.List;

import io.orqueio.bpm.engine.batch.Batch;
import io.orqueio.bpm.engine.impl.batch.AbstractBatchJobHandler;
import io.orqueio.bpm.engine.impl.batch.BatchConfiguration;
import io.orqueio.bpm.engine.impl.batch.BatchJobContext;
import io.orqueio.bpm.engine.impl.batch.BatchJobDeclaration;
import io.orqueio.bpm.engine.impl.dmn.cmd.DeleteHistoricDecisionInstancesBulkCmd;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.jobexecutor.JobDeclaration;
import io.orqueio.bpm.engine.impl.persistence.entity.ExecutionEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.MessageEntity;

public class DeleteHistoricDecisionInstancesJobHandler extends AbstractBatchJobHandler<BatchConfiguration> {

  public static final BatchJobDeclaration JOB_DECLARATION = new BatchJobDeclaration(Batch.TYPE_HISTORIC_DECISION_INSTANCE_DELETION);

  @Override
  public String getType() {
    return Batch.TYPE_HISTORIC_DECISION_INSTANCE_DELETION;
  }

  protected DeleteHistoricDecisionInstanceBatchConfigurationJsonConverter getJsonConverterInstance() {
    return DeleteHistoricDecisionInstanceBatchConfigurationJsonConverter.INSTANCE;
  }

  @Override
  public JobDeclaration<BatchJobContext, MessageEntity> getJobDeclaration() {
    return JOB_DECLARATION;
  }

  @Override
  protected BatchConfiguration createJobConfiguration(BatchConfiguration configuration, List<String> decisionIdsForJob) {
    return new BatchConfiguration(decisionIdsForJob);
  }

  @Override
  public void executeHandler(BatchConfiguration batchConfiguration,
                             ExecutionEntity execution,
                             CommandContext commandContext,
                             String tenantId) {

    commandContext.executeWithOperationLogPrevented(
        new DeleteHistoricDecisionInstancesBulkCmd(batchConfiguration.getIds()));
  }

}
