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
package io.orqueio.bpm.engine.rest.impl.history;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import javax.ws.rs.core.UriInfo;
import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.history.CleanableHistoricCaseInstanceReport;
import io.orqueio.bpm.engine.history.CleanableHistoricCaseInstanceReportResult;
import io.orqueio.bpm.engine.history.HistoricCaseActivityStatistics;
import io.orqueio.bpm.engine.history.HistoricCaseActivityStatisticsQuery;
import io.orqueio.bpm.engine.rest.dto.CountResultDto;
import io.orqueio.bpm.engine.rest.dto.history.CleanableHistoricCaseInstanceReportDto;
import io.orqueio.bpm.engine.rest.dto.history.CleanableHistoricCaseInstanceReportResultDto;
import io.orqueio.bpm.engine.rest.dto.history.HistoricCaseActivityStatisticsDto;
import io.orqueio.bpm.engine.rest.history.HistoricCaseDefinitionRestService;
import io.orqueio.bpm.engine.rest.util.QueryUtil;

/**
 * @author Roman Smirnov
 *
 */
public class HistoricCaseDefinitionRestServiceImpl implements HistoricCaseDefinitionRestService {

  protected ObjectMapper objectMapper;
  protected ProcessEngine processEngine;

  public HistoricCaseDefinitionRestServiceImpl(ObjectMapper objectMapper, ProcessEngine processEngine) {
    this.objectMapper = objectMapper;
    this.processEngine = processEngine;
  }

  @Override
  public List<HistoricCaseActivityStatisticsDto> getHistoricCaseActivityStatistics(String caseDefinitionId) {
    HistoryService historyService = processEngine.getHistoryService();

    HistoricCaseActivityStatisticsQuery historicCaseActivityStatisticsQuery =
        historyService.createHistoricCaseActivityStatisticsQuery(caseDefinitionId);

    List<HistoricCaseActivityStatistics> statistics =
        historicCaseActivityStatisticsQuery.unlimitedList();

    List<HistoricCaseActivityStatisticsDto> result = new ArrayList<HistoricCaseActivityStatisticsDto>();
    for (HistoricCaseActivityStatistics currentStatistics : statistics) {
      result.add(HistoricCaseActivityStatisticsDto.fromHistoricCaseActivityStatistics(currentStatistics));
    }

    return result;
  }

  @Override
  public List<CleanableHistoricCaseInstanceReportResultDto> getCleanableHistoricCaseInstanceReport(UriInfo uriInfo, Integer firstResult, Integer maxResults) {
    CleanableHistoricCaseInstanceReportDto queryDto = new CleanableHistoricCaseInstanceReportDto(objectMapper, uriInfo.getQueryParameters());
    CleanableHistoricCaseInstanceReport query = queryDto.toQuery(processEngine);

    List<CleanableHistoricCaseInstanceReportResult> reportResult = QueryUtil.list(query, firstResult, maxResults);

    return CleanableHistoricCaseInstanceReportResultDto.convert(reportResult);
  }

  @Override
  public CountResultDto getCleanableHistoricCaseInstanceReportCount(UriInfo uriInfo) {
    CleanableHistoricCaseInstanceReportDto queryDto = new CleanableHistoricCaseInstanceReportDto(objectMapper, uriInfo.getQueryParameters());
    queryDto.setObjectMapper(objectMapper);
    CleanableHistoricCaseInstanceReport query = queryDto.toQuery(processEngine);

    long count = query.count();
    CountResultDto result = new CountResultDto();
    result.setCount(count);

    return result;
  }
}
