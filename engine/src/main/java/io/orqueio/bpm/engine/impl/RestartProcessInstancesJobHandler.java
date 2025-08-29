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

import java.util.List;

import io.orqueio.bpm.engine.batch.Batch;
import io.orqueio.bpm.engine.impl.batch.AbstractBatchJobHandler;
import io.orqueio.bpm.engine.impl.batch.BatchJobContext;
import io.orqueio.bpm.engine.impl.batch.BatchJobDeclaration;
import io.orqueio.bpm.engine.impl.cmd.RestartProcessInstancesCmd;
import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.interceptor.CommandExecutor;
import io.orqueio.bpm.engine.impl.jobexecutor.JobDeclaration;
import io.orqueio.bpm.engine.impl.persistence.entity.ExecutionEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.JobEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.MessageEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.ProcessDefinitionEntity;

/**
 *
 * @author Anna Pazola
 *
 */
public class RestartProcessInstancesJobHandler extends AbstractBatchJobHandler<RestartProcessInstancesBatchConfiguration>{

  public static final BatchJobDeclaration JOB_DECLARATION = new BatchJobDeclaration(Batch.TYPE_PROCESS_INSTANCE_RESTART);

  @Override
  public String getType() {
    return Batch.TYPE_PROCESS_INSTANCE_RESTART;
  }

  @Override
  protected void postProcessJob(RestartProcessInstancesBatchConfiguration configuration, JobEntity job, RestartProcessInstancesBatchConfiguration jobConfiguration) {
    if (job.getDeploymentId() == null) {
      CommandContext commandContext = Context.getCommandContext();
      ProcessDefinitionEntity processDefinitionEntity = commandContext.getProcessEngineConfiguration().getDeploymentCache()
          .findDeployedProcessDefinitionById(configuration.getProcessDefinitionId());
      job.setDeploymentId(processDefinitionEntity.getDeploymentId());
    }
  }

  @Override
  public void executeHandler(RestartProcessInstancesBatchConfiguration batchConfiguration,
                             ExecutionEntity execution,
                             CommandContext commandContext,
                             String tenantId) {

    String processDefinitionId = batchConfiguration.getProcessDefinitionId();
    RestartProcessInstanceBuilderImpl builder =
        new RestartProcessInstanceBuilderImpl(processDefinitionId);

    builder.processInstanceIds(batchConfiguration.getIds());

    builder.setInstructions(batchConfiguration.getInstructions());

    if (batchConfiguration.isInitialVariables()) {
      builder.initialSetOfVariables();
    }

    if (batchConfiguration.isSkipCustomListeners()) {
      builder.skipCustomListeners();
    }

    if (batchConfiguration.isWithoutBusinessKey()) {
      builder.withoutBusinessKey();
    }

    if (batchConfiguration.isSkipIoMappings()) {
      builder.skipIoMappings();
    }

    CommandExecutor commandExecutor = commandContext.getProcessEngineConfiguration()
        .getCommandExecutorTxRequired();
    commandContext.executeWithOperationLogPrevented(
        new RestartProcessInstancesCmd(commandExecutor, builder));

  }

  @Override
  public JobDeclaration<BatchJobContext, MessageEntity> getJobDeclaration() {
    return JOB_DECLARATION;
  }

  @Override
  protected RestartProcessInstancesBatchConfiguration createJobConfiguration(RestartProcessInstancesBatchConfiguration configuration,
      List<String> processIdsForJob) {
    return new RestartProcessInstancesBatchConfiguration(processIdsForJob, configuration.getInstructions(), configuration.getProcessDefinitionId(),
        configuration.isInitialVariables(), configuration.isSkipCustomListeners(), configuration.isSkipIoMappings(), configuration.isWithoutBusinessKey());
  }

  @Override
  protected RestartProcessInstancesBatchConfigurationJsonConverter getJsonConverterInstance() {
    return RestartProcessInstancesBatchConfigurationJsonConverter.INSTANCE;
  }

}
