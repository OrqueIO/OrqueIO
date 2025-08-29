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
import io.orqueio.bpm.engine.rest.EventSubscriptionRestService;
import io.orqueio.bpm.engine.rest.dto.CountResultDto;
import io.orqueio.bpm.engine.rest.dto.runtime.EventSubscriptionDto;
import io.orqueio.bpm.engine.rest.dto.runtime.EventSubscriptionQueryDto;
import io.orqueio.bpm.engine.rest.util.QueryUtil;
import io.orqueio.bpm.engine.runtime.EventSubscription;
import io.orqueio.bpm.engine.runtime.EventSubscriptionQuery;

public class EventSubscriptionRestServiceImpl extends AbstractRestProcessEngineAware implements EventSubscriptionRestService {

  public EventSubscriptionRestServiceImpl(String engineName, ObjectMapper objectMapper) {
    super(engineName, objectMapper);
  }

  @Override
  public List<EventSubscriptionDto> getEventSubscriptions(UriInfo uriInfo, Integer firstResult, Integer maxResults) {
    EventSubscriptionQueryDto queryDto = new EventSubscriptionQueryDto(getObjectMapper(), uriInfo.getQueryParameters());
    return queryEventSubscriptions(queryDto, firstResult, maxResults);
  }

  public List<EventSubscriptionDto> queryEventSubscriptions(EventSubscriptionQueryDto queryDto, Integer firstResult, Integer maxResults) {
    ProcessEngine engine = getProcessEngine();
    queryDto.setObjectMapper(getObjectMapper());
    EventSubscriptionQuery query = queryDto.toQuery(engine);

    List<EventSubscription> matchingEventSubscriptions = QueryUtil.list(query, firstResult, maxResults);

    List<EventSubscriptionDto> eventSubscriptionResults = new ArrayList<EventSubscriptionDto>();
    for (EventSubscription eventSubscription : matchingEventSubscriptions) {
      EventSubscriptionDto resultEventSubscription = EventSubscriptionDto.fromEventSubscription(eventSubscription);
      eventSubscriptionResults.add(resultEventSubscription);
    }
    return eventSubscriptionResults;
  }

  @Override
  public CountResultDto getEventSubscriptionsCount(UriInfo uriInfo) {
    EventSubscriptionQueryDto queryDto = new EventSubscriptionQueryDto(getObjectMapper(), uriInfo.getQueryParameters());
    return queryEventSubscriptionsCount(queryDto);
  }

  public CountResultDto queryEventSubscriptionsCount(EventSubscriptionQueryDto queryDto) {
    ProcessEngine engine = getProcessEngine();
    queryDto.setObjectMapper(getObjectMapper());
    EventSubscriptionQuery query = queryDto.toQuery(engine);

    long count = query.count();
    CountResultDto result = new CountResultDto();
    result.setCount(count);

    return result;
  }
}
