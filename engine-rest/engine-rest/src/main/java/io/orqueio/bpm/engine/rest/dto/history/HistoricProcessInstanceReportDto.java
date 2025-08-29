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
package io.orqueio.bpm.engine.rest.dto.history;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.history.HistoricProcessInstanceReport;
import io.orqueio.bpm.engine.rest.dto.AbstractReportDto;
import io.orqueio.bpm.engine.rest.dto.OrqueioQueryParam;
import io.orqueio.bpm.engine.rest.dto.converter.DateConverter;
import io.orqueio.bpm.engine.rest.dto.converter.StringArrayConverter;
import io.orqueio.bpm.engine.rest.exception.InvalidRequestException;

import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * @author Roman Smirnov
 *
 */
public class HistoricProcessInstanceReportDto extends AbstractReportDto<HistoricProcessInstanceReport> {

  protected String[] processDefinitionIdIn;
  protected String[] processDefinitionKeyIn;
  protected Date startedAfter;
  protected Date startedBefore;

  public static final String REPORT_TYPE_DURATION = "duration";

  public static final List<String> VALID_REPORT_TYPE_VALUES;
  static {
    VALID_REPORT_TYPE_VALUES = new ArrayList<String>();
    VALID_REPORT_TYPE_VALUES.add(REPORT_TYPE_DURATION);
  }

  public HistoricProcessInstanceReportDto() {
  }

  public HistoricProcessInstanceReportDto(ObjectMapper objectMapper, MultivaluedMap<String, String> queryParameters) {
    super(objectMapper, queryParameters);
  }

  @OrqueioQueryParam(value = "processDefinitionIdIn", converter = StringArrayConverter.class)
  public void setProcessDefinitionIdIn(String[] processDefinitionIdIn) {
    this.processDefinitionIdIn = processDefinitionIdIn;
  }

  @OrqueioQueryParam(value = "processDefinitionKeyIn", converter = StringArrayConverter.class)
  public void setProcessDefinitionKeyIn(String[] processDefinitionKeyIn) {
    this.processDefinitionKeyIn = processDefinitionKeyIn;
  }

  @OrqueioQueryParam(value = "startedAfter", converter = DateConverter.class)
  public void setStartedAfter(Date startedAfter) {
    this.startedAfter = startedAfter;
  }

  @OrqueioQueryParam(value = "startedBefore", converter = DateConverter.class)
  public void setStartedBefore(Date startedBefore) {
    this.startedBefore = startedBefore;
  }

  @Override
  protected HistoricProcessInstanceReport createNewReportQuery(ProcessEngine engine) {
    return engine.getHistoryService().createHistoricProcessInstanceReport();
  }

  @Override
  protected void applyFilters(HistoricProcessInstanceReport reportQuery) {
    if (processDefinitionIdIn != null && processDefinitionIdIn.length > 0) {
      reportQuery.processDefinitionIdIn(processDefinitionIdIn);
    }
    if (processDefinitionKeyIn != null && processDefinitionKeyIn.length > 0) {
      reportQuery.processDefinitionKeyIn(processDefinitionKeyIn);
    }
    if (startedAfter != null) {
      reportQuery.startedAfter(startedAfter);
    }
    if (startedBefore != null) {
      reportQuery.startedBefore(startedBefore);
    }
    if (!REPORT_TYPE_DURATION.equals(reportType)) {
      throw new InvalidRequestException(Response.Status.BAD_REQUEST, "Unknown report type " + reportType);
    }
  }

}
