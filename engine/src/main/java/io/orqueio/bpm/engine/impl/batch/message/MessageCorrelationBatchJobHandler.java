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
package io.orqueio.bpm.engine.impl.batch.message;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import io.orqueio.bpm.engine.batch.Batch;
import io.orqueio.bpm.engine.impl.MessageCorrelationBuilderImpl;
import io.orqueio.bpm.engine.impl.batch.AbstractBatchJobHandler;
import io.orqueio.bpm.engine.impl.batch.BatchJobContext;
import io.orqueio.bpm.engine.impl.batch.BatchJobDeclaration;
import io.orqueio.bpm.engine.impl.cmd.CorrelateAllMessageCmd;
import io.orqueio.bpm.engine.impl.core.variable.VariableUtil;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.jobexecutor.JobDeclaration;
import io.orqueio.bpm.engine.impl.json.MessageCorrelationBatchConfigurationJsonConverter;
import io.orqueio.bpm.engine.impl.persistence.entity.ExecutionEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.JobEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.MessageEntity;
import io.orqueio.bpm.engine.runtime.MessageCorrelationBuilder;
import io.orqueio.bpm.engine.variable.impl.VariableMapImpl;

/**
 * Job handler for message correlation jobs. The jobs correlate a message to a
 * list of process instances.
 */
public class MessageCorrelationBatchJobHandler extends AbstractBatchJobHandler<MessageCorrelationBatchConfiguration> {

  public static final BatchJobDeclaration JOB_DECLARATION = new BatchJobDeclaration(Batch.TYPE_CORRELATE_MESSAGE);

  public String getType() {
    return Batch.TYPE_CORRELATE_MESSAGE;
  }

  public JobDeclaration<BatchJobContext, MessageEntity> getJobDeclaration() {
    return JOB_DECLARATION;
  }

  protected MessageCorrelationBatchConfigurationJsonConverter getJsonConverterInstance() {
    return MessageCorrelationBatchConfigurationJsonConverter.INSTANCE;
  }

  @Override
  protected MessageCorrelationBatchConfiguration createJobConfiguration(MessageCorrelationBatchConfiguration configuration, List<String> processIdsForJob) {
    return new MessageCorrelationBatchConfiguration(
        processIdsForJob,
        configuration.getMessageName(),
        configuration.getBatchId());
  }

  @Override
  protected void postProcessJob(MessageCorrelationBatchConfiguration configuration, JobEntity job, MessageCorrelationBatchConfiguration jobConfiguration) {
    // if there is only one process instance to adjust, set its ID to the job so exclusive scheduling is possible
    if (jobConfiguration.getIds() != null && jobConfiguration.getIds().size() == 1) {
      job.setProcessInstanceId(jobConfiguration.getIds().get(0));
    }
  }

  @Override
  public void executeHandler(MessageCorrelationBatchConfiguration batchConfiguration,
                             ExecutionEntity execution,
                             CommandContext commandContext,
                             String tenantId) {
    String batchId = batchConfiguration.getBatchId();

    MessageCorrelationBuilderImpl correlationBuilder = new MessageCorrelationBuilderImpl(commandContext, batchConfiguration.getMessageName());
    correlationBuilder.executionsOnly();
    setVariables(batchId, correlationBuilder, commandContext);
    for (String id : batchConfiguration.getIds()) {
      correlationBuilder.processInstanceId(id);
      commandContext.executeWithOperationLogPrevented(new CorrelateAllMessageCmd(correlationBuilder, false, false));
    }
  }

  protected void setVariables(String batchId,
                              MessageCorrelationBuilder correlationBuilder,
                              CommandContext commandContext) {
    Map<String, ?> variables = null;
    if (batchId != null) {
      variables = VariableUtil.findBatchVariablesSerialized(batchId, commandContext);
      if (variables != null) {
        correlationBuilder.setVariables(new VariableMapImpl(new HashMap<>(variables)));
      }
    }
  }

}
