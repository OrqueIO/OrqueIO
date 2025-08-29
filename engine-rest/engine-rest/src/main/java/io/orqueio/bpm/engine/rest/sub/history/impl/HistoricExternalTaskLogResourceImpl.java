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
package io.orqueio.bpm.engine.rest.sub.history.impl;

import io.orqueio.bpm.engine.AuthorizationException;
import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.ProcessEngineException;
import io.orqueio.bpm.engine.history.HistoricExternalTaskLog;
import io.orqueio.bpm.engine.rest.dto.history.HistoricExternalTaskLogDto;
import io.orqueio.bpm.engine.rest.exception.InvalidRequestException;
import io.orqueio.bpm.engine.rest.sub.history.HistoricExternalTaskLogResource;

import javax.ws.rs.core.Response.Status;

public class HistoricExternalTaskLogResourceImpl implements HistoricExternalTaskLogResource {

  protected String id;
  protected ProcessEngine engine;

  public HistoricExternalTaskLogResourceImpl(String id, ProcessEngine engine) {
    this.id = id;
    this.engine = engine;
  }

  @Override
  public HistoricExternalTaskLogDto getHistoricExternalTaskLog() {
    HistoryService historyService = engine.getHistoryService();
    HistoricExternalTaskLog historicExternalTaskLog = historyService
      .createHistoricExternalTaskLogQuery()
      .logId(id)
      .singleResult();

    if (historicExternalTaskLog == null) {
      throw new InvalidRequestException(Status.NOT_FOUND, "Historic external task log with id " + id + " does not exist");
    }

    return HistoricExternalTaskLogDto.fromHistoricExternalTaskLog(historicExternalTaskLog);
  }

  @Override
  public String getErrorDetails() {
    try {
      HistoryService historyService = engine.getHistoryService();
      return historyService.getHistoricExternalTaskLogErrorDetails(id);
    } catch (AuthorizationException e) {
      throw e;
    } catch (ProcessEngineException e) {
      throw new InvalidRequestException(Status.NOT_FOUND, e.getMessage());
    }
  }
}
