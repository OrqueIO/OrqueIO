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
package io.orqueio.bpm.engine.rest.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import javax.ws.rs.core.UriInfo;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.rest.VariableInstanceRestService;
import io.orqueio.bpm.engine.rest.dto.CountResultDto;
import io.orqueio.bpm.engine.rest.dto.runtime.VariableInstanceDto;
import io.orqueio.bpm.engine.rest.dto.runtime.VariableInstanceQueryDto;
import io.orqueio.bpm.engine.rest.sub.runtime.VariableInstanceResource;
import io.orqueio.bpm.engine.rest.sub.runtime.impl.VariableInstanceResourceImpl;
import io.orqueio.bpm.engine.rest.util.QueryUtil;
import io.orqueio.bpm.engine.runtime.VariableInstance;
import io.orqueio.bpm.engine.runtime.VariableInstanceQuery;

public class VariableInstanceRestServiceImpl extends AbstractRestProcessEngineAware implements VariableInstanceRestService {

  public VariableInstanceRestServiceImpl(String engineName, ObjectMapper objectMapper) {
    super(engineName, objectMapper);
  }

  @Override
  public VariableInstanceResource getVariableInstance(String id) {
    return new VariableInstanceResourceImpl(id, getProcessEngine());
  }

  @Override
  public List<VariableInstanceDto> getVariableInstances(UriInfo uriInfo, Integer firstResult, Integer maxResults, boolean deserializeObjectValues) {
    VariableInstanceQueryDto queryDto = new VariableInstanceQueryDto(getObjectMapper(), uriInfo.getQueryParameters());
    return queryVariableInstances(queryDto, firstResult, maxResults, deserializeObjectValues);
  }

  @Override
  public List<VariableInstanceDto> queryVariableInstances(VariableInstanceQueryDto queryDto, Integer firstResult, Integer maxResults, boolean deserializeObjectValues) {
    ProcessEngine engine = getProcessEngine();
    queryDto.setObjectMapper(getObjectMapper());
    VariableInstanceQuery query = queryDto.toQuery(engine);

    // disable binary fetching by default.
    query.disableBinaryFetching();

    // disable custom object fetching by default. Cannot be done to not break existing API
    if (!deserializeObjectValues) {
      query.disableCustomObjectDeserialization();
    }

    List<VariableInstance> matchingInstances = QueryUtil.list(query, firstResult, maxResults);

    List<VariableInstanceDto> instanceResults = new ArrayList<>();
    for (VariableInstance instance : matchingInstances) {
      VariableInstanceDto resultInstance = VariableInstanceDto.fromVariableInstance(instance);
      instanceResults.add(resultInstance);
    }
    return instanceResults;
  }

  @Override
  public CountResultDto getVariableInstancesCount(UriInfo uriInfo) {
    VariableInstanceQueryDto queryDto = new VariableInstanceQueryDto(getObjectMapper(), uriInfo.getQueryParameters());
    return queryVariableInstancesCount(queryDto);
  }

  @Override
  public CountResultDto queryVariableInstancesCount(VariableInstanceQueryDto queryDto) {
    ProcessEngine engine = getProcessEngine();
    queryDto.setObjectMapper(getObjectMapper());
    VariableInstanceQuery query = queryDto.toQuery(engine);

    long count = query.count();
    CountResultDto result = new CountResultDto();
    result.setCount(count);

    return result;
  }

}
