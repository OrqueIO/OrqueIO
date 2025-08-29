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

import static java.lang.Boolean.TRUE;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

import javax.ws.rs.core.MultivaluedMap;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.history.HistoricIdentityLinkLogQuery;
import io.orqueio.bpm.engine.rest.dto.AbstractQueryDto;
import io.orqueio.bpm.engine.rest.dto.OrqueioQueryParam;
import io.orqueio.bpm.engine.rest.dto.converter.BooleanConverter;
import io.orqueio.bpm.engine.rest.dto.converter.DateConverter;
import io.orqueio.bpm.engine.rest.dto.converter.StringListConverter;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 *
 * @author Deivarayan Azhagappan
 *
 */
public class HistoricIdentityLinkLogQueryDto extends AbstractQueryDto<HistoricIdentityLinkLogQuery> {

  private static final String SORT_BY_TIME = "time";
  private static final String SORT_BY_TYPE = "type";
  private static final String SORT_BY_USER_ID = "userId";
  private static final String SORT_BY_GROUP_ID = "groupId";
  private static final String SORT_BY_TASK_ID = "taskId";
  private static final String SORT_BY_PROCESS_DEFINITION_ID = "processDefinitionId";
  private static final String SORT_BY_PROCESS_DEFINITION_KEY = "processDefinitionKey";
  private static final String SORT_BY_OPERATION_TYPE = "operationType";
  private static final String SORT_BY_ASSIGNER_ID = "assignerId";
  private static final String SORT_BY_TENANT_ID = "tenantId";

  private static final List<String> VALID_SORT_BY_VALUES;
  static {
    VALID_SORT_BY_VALUES = new ArrayList<String>();
    VALID_SORT_BY_VALUES.add(SORT_BY_TIME);
    VALID_SORT_BY_VALUES.add(SORT_BY_TYPE);
    VALID_SORT_BY_VALUES.add(SORT_BY_USER_ID);
    VALID_SORT_BY_VALUES.add(SORT_BY_GROUP_ID);
    VALID_SORT_BY_VALUES.add(SORT_BY_TASK_ID);
    VALID_SORT_BY_VALUES.add(SORT_BY_PROCESS_DEFINITION_ID);
    VALID_SORT_BY_VALUES.add(SORT_BY_PROCESS_DEFINITION_KEY);
    VALID_SORT_BY_VALUES.add(SORT_BY_OPERATION_TYPE);
    VALID_SORT_BY_VALUES.add(SORT_BY_ASSIGNER_ID);
    VALID_SORT_BY_VALUES.add(SORT_BY_TENANT_ID);
  }

  protected Date dateBefore;
  protected Date dateAfter;
  protected String type;
  protected String userId;
  protected String groupId;
  protected String taskId;
  protected String processDefinitionId;
  protected String processDefinitionKey;
  protected String operationType;
  protected String assignerId;
  protected List<String> tenantIds;
  protected Boolean withoutTenantId;

  public HistoricIdentityLinkLogQueryDto() {
  }

  public HistoricIdentityLinkLogQueryDto(ObjectMapper objectMapper, MultivaluedMap<String, String> queryParameters) {
    super(objectMapper, queryParameters);
  }

  @Override
  protected boolean isValidSortByValue(String value) {
    return VALID_SORT_BY_VALUES.contains(value);
  }

  @Override
  protected HistoricIdentityLinkLogQuery createNewQuery(ProcessEngine engine) {
    return engine.getHistoryService().createHistoricIdentityLinkLogQuery();
  }

  @OrqueioQueryParam("type")
  public void setType(String type) {
    this.type = type;
  }

  @OrqueioQueryParam("userId")
  public void setUserId(String userId) {
    this.userId = userId;
  }

  @OrqueioQueryParam("groupId")
  public void setGroupId(String groupId) {
    this.groupId = groupId;
  }

  @OrqueioQueryParam(value = "dateBefore", converter = DateConverter.class)
  public void setDateBefore(Date dateBefore) {
    this.dateBefore = dateBefore;
  }

  @OrqueioQueryParam(value = "dateAfter", converter = DateConverter.class)
  public void setDateAfter(Date dateAfter) {
    this.dateAfter = dateAfter;
  }

  @OrqueioQueryParam("taskId")
  public void setTaskId(String taskId) {
    this.taskId = taskId;
  }

  @OrqueioQueryParam("processDefinitionId")
  public void setProcessDefinitionId(String processDefinitionId) {
    this.processDefinitionId = processDefinitionId;
  }

  @OrqueioQueryParam("processDefinitionKey")
  public void setProcessDefinitionKey(String processDefinitionKey) {
    this.processDefinitionKey = processDefinitionKey;
  }
  
  @OrqueioQueryParam("operationType")
  public void setOperationType(String operationType) {
    this.operationType = operationType;
  }

  @OrqueioQueryParam("assignerId")
  public void setAssignerId(String assignerId) {
    this.assignerId = assignerId;
  }

  @OrqueioQueryParam(value = "tenantIdIn", converter = StringListConverter.class)
  public void setTenantIdIn(List<String> tenantIds) {
    this.tenantIds = tenantIds;
  }

  @OrqueioQueryParam(value = "withoutTenantId", converter = BooleanConverter.class)
  public void setWithoutTenantId(Boolean withoutTenantId) {
    this.withoutTenantId = withoutTenantId;
  }

  @Override
  protected void applyFilters(HistoricIdentityLinkLogQuery query) {
    if (dateBefore != null) {
      query.dateBefore(dateBefore);
    }
    if (dateAfter != null) {
      query.dateAfter(dateAfter);
    }
    if (type != null) {
      query.type(type);
    }
    if (userId != null) {
      query.userId(userId);
    }
    if (groupId != null) {
      query.groupId(groupId);
    }
    if (taskId != null) {
      query.taskId(taskId);
    }
    if (processDefinitionId != null) {
      query.processDefinitionId(processDefinitionId);
    }
    if (processDefinitionKey != null) {
      query.processDefinitionKey(processDefinitionKey);
    }
    if (operationType != null) {
      query.operationType(operationType);
    }
    if (assignerId != null) {
      query.assignerId(assignerId);
    }
    if (tenantIds != null && !tenantIds.isEmpty()) {
      query.tenantIdIn(tenantIds.toArray(new String[tenantIds.size()]));
    }
    if (TRUE.equals(withoutTenantId)) {
      query.withoutTenantId();
    }
  }

  @Override
  protected void applySortBy(HistoricIdentityLinkLogQuery query, String sortBy, Map<String, Object> parameters, ProcessEngine engine) {
    if (sortBy.equals(SORT_BY_TIME)) {
      query.orderByTime();
    } else if (sortBy.equals(SORT_BY_TYPE)) {
      query.orderByType();
    } else if (sortBy.equals(SORT_BY_USER_ID)) {
      query.orderByUserId();
    } else if (sortBy.equals(SORT_BY_GROUP_ID)) {
      query.orderByGroupId();
    } else if (sortBy.equals(SORT_BY_TASK_ID)) {
      query.orderByTaskId();
    } else if (sortBy.equals(SORT_BY_OPERATION_TYPE)) {
      query.orderByOperationType();
    } else if (sortBy.equals(SORT_BY_ASSIGNER_ID)) {
      query.orderByAssignerId();
    } else if (sortBy.equals(SORT_BY_PROCESS_DEFINITION_ID)) {
      query.orderByProcessDefinitionId();
    } else if (sortBy.equals(SORT_BY_PROCESS_DEFINITION_KEY)) {
      query.orderByProcessDefinitionKey();
    } else if (sortBy.equals(SORT_BY_TENANT_ID)) {
      query.orderByTenantId();
    }
  }
}
