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

import javax.ws.rs.core.Response.Status;

import io.orqueio.bpm.engine.AuthorizationException;
import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.ProcessEngineException;
import io.orqueio.bpm.engine.history.HistoricProcessInstance;
import io.orqueio.bpm.engine.rest.dto.history.HistoricProcessInstanceDto;
import io.orqueio.bpm.engine.rest.exception.InvalidRequestException;
import io.orqueio.bpm.engine.rest.sub.history.HistoricProcessInstanceResource;

public class HistoricProcessInstanceResourceImpl implements HistoricProcessInstanceResource {

  private ProcessEngine engine;
  private String processInstanceId;

  public HistoricProcessInstanceResourceImpl(ProcessEngine engine, String processInstanceId) {
    this.engine = engine;
    this.processInstanceId = processInstanceId;
  }

  @Override
  public HistoricProcessInstanceDto getHistoricProcessInstance() {
    HistoryService historyService = engine.getHistoryService();
    HistoricProcessInstance instance = historyService.createHistoricProcessInstanceQuery().processInstanceId(processInstanceId).singleResult();

    if (instance == null) {
      throw new InvalidRequestException(Status.NOT_FOUND, "Historic process instance with id " + processInstanceId + " does not exist");
    }

    return HistoricProcessInstanceDto.fromHistoricProcessInstance(instance);
  }

  @Override
  public void deleteHistoricProcessInstance(Boolean failIfNotExists) {
    HistoryService historyService = engine.getHistoryService();
    try {
      if(failIfNotExists == null || failIfNotExists) {
        historyService.deleteHistoricProcessInstance(processInstanceId);
      }else {
        historyService.deleteHistoricProcessInstanceIfExists(processInstanceId);
      }
    } catch (AuthorizationException e) {
      throw e;
    } catch (ProcessEngineException e) {
      throw new InvalidRequestException(Status.NOT_FOUND, e, "Historic process instance with id " + processInstanceId + " does not exist");
    }
  }

}
