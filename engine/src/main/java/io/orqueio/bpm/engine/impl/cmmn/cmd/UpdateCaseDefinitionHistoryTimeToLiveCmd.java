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
package io.orqueio.bpm.engine.impl.cmmn.cmd;

import io.orqueio.bpm.engine.BadUserRequestException;
import io.orqueio.bpm.engine.history.UserOperationLogEntry;
import io.orqueio.bpm.engine.impl.HistoryTimeToLiveParser;
import io.orqueio.bpm.engine.impl.cfg.CommandChecker;
import io.orqueio.bpm.engine.impl.cmmn.entity.repository.CaseDefinitionEntity;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.persistence.entity.PropertyChange;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import static io.orqueio.bpm.engine.impl.util.EnsureUtil.ensureGreaterThanOrEqual;
import static io.orqueio.bpm.engine.impl.util.EnsureUtil.ensureNotNull;

public class UpdateCaseDefinitionHistoryTimeToLiveCmd implements Command<Void>, Serializable {

  private static final long serialVersionUID = 1L;

  protected String caseDefinitionId;
  protected Integer historyTimeToLive;

  public UpdateCaseDefinitionHistoryTimeToLiveCmd(String caseDefinitionId, Integer historyTimeToLive) {
    this.caseDefinitionId = caseDefinitionId;
    this.historyTimeToLive = historyTimeToLive;
  }

  @Override
  public Void execute(CommandContext context) {
    ensureNotNull(BadUserRequestException.class, "caseDefinitionId", caseDefinitionId);

    if (historyTimeToLive != null) {
      ensureGreaterThanOrEqual(BadUserRequestException.class, "", "historyTimeToLive", historyTimeToLive, 0);
    }

    validate(historyTimeToLive, context);

    CaseDefinitionEntity caseDefinitionEntity = context.getCaseDefinitionManager().findLatestDefinitionById(caseDefinitionId);

    for (CommandChecker checker : context.getProcessEngineConfiguration().getCommandCheckers()) {
      checker.checkUpdateCaseDefinition(caseDefinitionEntity);
    }

    logUserOperation(context, caseDefinitionEntity);
    caseDefinitionEntity.setHistoryTimeToLive(historyTimeToLive);

    return null;
  }

  protected void logUserOperation(CommandContext commandContext, CaseDefinitionEntity caseDefinitionEntity) {
    List<PropertyChange> propertyChanges = new ArrayList<>();
    propertyChanges.add(new PropertyChange("historyTimeToLive", caseDefinitionEntity.getHistoryTimeToLive(), historyTimeToLive));
    propertyChanges.add(new PropertyChange("caseDefinitionKey", null, caseDefinitionEntity.getKey()));


    commandContext.getOperationLogManager()
      .logCaseDefinitionOperation(UserOperationLogEntry.OPERATION_TYPE_UPDATE_HISTORY_TIME_TO_LIVE,
        caseDefinitionId,
        caseDefinitionEntity.getTenantId(),
        propertyChanges);
  }

  protected void validate(Integer historyTimeToLive, CommandContext context) {
    HistoryTimeToLiveParser parser = HistoryTimeToLiveParser.create(context);
    parser.validate(historyTimeToLive);
  }
}
