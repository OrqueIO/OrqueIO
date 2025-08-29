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
package io.orqueio.bpm.engine.impl.cmd;

import io.orqueio.bpm.engine.exception.NotFoundException;
import io.orqueio.bpm.engine.history.UserOperationLogEntry;
import io.orqueio.bpm.engine.impl.cfg.CommandChecker;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.persistence.entity.ProcessDefinitionManager;
import io.orqueio.bpm.engine.impl.persistence.entity.PropertyChange;
import io.orqueio.bpm.engine.impl.persistence.entity.UserOperationLogManager;
import io.orqueio.bpm.engine.repository.ProcessDefinition;

import java.io.Serializable;
import java.util.List;

import static io.orqueio.bpm.engine.impl.util.EnsureUtil.ensureNotNull;

/**
 * @author Tassilo Weidner
 */
public abstract class AbstractDeleteProcessDefinitionCmd implements Command<Void>, Serializable {

  protected boolean cascade;
  protected boolean skipCustomListeners;
  protected boolean skipIoMappings;

  protected void deleteProcessDefinitionCmd(CommandContext commandContext, String processDefinitionId, boolean cascade, boolean skipCustomListeners, boolean skipIoMappings) {
    ensureNotNull("processDefinitionId", processDefinitionId);

    ProcessDefinition processDefinition = commandContext.getProcessDefinitionManager()
      .findLatestProcessDefinitionById(processDefinitionId);
    ensureNotNull(NotFoundException.class, "No process definition found with id '" + processDefinitionId + "'",
      "processDefinition", processDefinition);

    List<CommandChecker> commandCheckers = commandContext.getProcessEngineConfiguration().getCommandCheckers();
    for (CommandChecker checker: commandCheckers) {
      checker.checkDeleteProcessDefinitionById(processDefinitionId);
    }

    UserOperationLogManager userOperationLogManager = commandContext.getOperationLogManager();
    userOperationLogManager.logProcessDefinitionOperation(UserOperationLogEntry.OPERATION_TYPE_DELETE, processDefinitionId,
      processDefinition.getKey(), new PropertyChange("cascade", false, cascade));

    ProcessDefinitionManager definitionManager = commandContext.getProcessDefinitionManager();
    definitionManager.deleteProcessDefinition(processDefinition, processDefinitionId, cascade, cascade, skipCustomListeners, skipIoMappings);
  }

}
