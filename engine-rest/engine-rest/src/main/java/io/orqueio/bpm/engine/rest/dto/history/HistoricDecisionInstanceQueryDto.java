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
import io.orqueio.bpm.engine.history.HistoricDecisionInstanceQuery;
import io.orqueio.bpm.engine.rest.dto.AbstractQueryDto;
import io.orqueio.bpm.engine.rest.dto.OrqueioQueryParam;
import io.orqueio.bpm.engine.rest.dto.converter.BooleanConverter;
import io.orqueio.bpm.engine.rest.dto.converter.DateConverter;
import io.orqueio.bpm.engine.rest.dto.converter.StringArrayConverter;
import io.orqueio.bpm.engine.rest.dto.converter.StringListConverter;

import com.fasterxml.jackson.databind.ObjectMapper;

public class HistoricDecisionInstanceQueryDto extends AbstractQueryDto<HistoricDecisionInstanceQuery> {

  public static final String SORT_BY_EVALUATION_TIME_VALUE = "evaluationTime";
  public static final String SORT_BY_TENANT_ID = "tenantId";

  public static final List<String> VALID_SORT_BY_VALUES;

  static {
    VALID_SORT_BY_VALUES = new ArrayList<String>();
    VALID_SORT_BY_VALUES.add(SORT_BY_EVALUATION_TIME_VALUE);
    VALID_SORT_BY_VALUES.add(SORT_BY_TENANT_ID);
  }

  protected String decisionInstanceId;
  protected String[] decisionInstanceIdIn;

  protected String decisionDefinitionId;
  protected String[] decisionDefinitionIdIn;

  protected String decisionDefinitionKey;
  protected String[] decisionDefinitionKeyIn;

  protected String decisionDefinitionName;
  protected String decisionDefinitionNameLike;
  protected String processDefinitionId;
  protected String processDefinitionKey;
  protected String processInstanceId;
  protected String caseDefinitionId;
  protected String caseDefinitionKey;
  protected String caseInstanceId;
  protected String[] activityIdIn;
  protected String[] activityInstanceIdIn;
  protected Date evaluatedBefore;
  protected Date evaluatedAfter;
  protected String userId;
  protected Boolean includeInputs;
  protected Boolean includeOutputs;
  protected Boolean disableBinaryFetching;
  protected Boolean disableCustomObjectDeserialization;
  protected String rootDecisionInstanceId;
  protected Boolean rootDecisionInstancesOnly;
  protected String decisionRequirementsDefinitionId;
  protected String decisionRequirementsDefinitionKey;
  protected List<String> tenantIds;
  protected Boolean withoutTenantId;

  public HistoricDecisionInstanceQueryDto() {
  }

  public HistoricDecisionInstanceQueryDto(ObjectMapper objectMapper, MultivaluedMap<String, String> queryParameters) {
    super(objectMapper, queryParameters);
  }

  @OrqueioQueryParam("decisionInstanceId")
  public void setDecisionInstanceId(String decisionInstanceId) {
    this.decisionInstanceId = decisionInstanceId;
  }

  @OrqueioQueryParam(value = "decisionInstanceIdIn", converter = StringArrayConverter.class)
  public void setDecisionInstanceIdIn(String[] decisionInstanceIdIn) {
    this.decisionInstanceIdIn = decisionInstanceIdIn;
  }

  @OrqueioQueryParam("decisionDefinitionId")
  public void setDecisionDefinitionId(String decisionDefinitionId) {
    this.decisionDefinitionId = decisionDefinitionId;
  }

  @OrqueioQueryParam(value = "decisionDefinitionIdIn", converter = StringArrayConverter.class)
  public void setDecisionDefinitionIdIn(String[] decisionDefinitionIdIn) {
    this.decisionDefinitionIdIn = decisionDefinitionIdIn;
  }

  @OrqueioQueryParam("decisionDefinitionKey")
  public void setDecisionDefinitionKey(String decisionDefinitionKey) {
    this.decisionDefinitionKey = decisionDefinitionKey;
  }

  @OrqueioQueryParam(value = "decisionDefinitionKeyIn", converter = StringArrayConverter.class)
  public void setDecisionDefinitionKeyIn(String[] decisionDefinitionKeyIn) {
    this.decisionDefinitionKeyIn = decisionDefinitionKeyIn;
  }

  @OrqueioQueryParam("decisionDefinitionName")
  public void setDecisionDefinitionName(String decisionDefinitionName) {
    this.decisionDefinitionName = decisionDefinitionName;
  }

  @OrqueioQueryParam("decisionDefinitionNameLike")
  public void setDecisionDefinitionNameLike(String decisionDefinitionNameLike) {
    this.decisionDefinitionNameLike = decisionDefinitionNameLike;
  }

  @OrqueioQueryParam("processDefinitionId")
  public void setProcessDefinitionId(String processDefinitionId) {
    this.processDefinitionId = processDefinitionId;
  }

  @OrqueioQueryParam("processDefinitionKey")
  public void setProcessDefinitionKey(String processDefinitionKey) {
    this.processDefinitionKey = processDefinitionKey;
  }

  @OrqueioQueryParam("processInstanceId")
  public void setProcessInstanceId(String processInstanceId) {
    this.processInstanceId = processInstanceId;
  }

  @OrqueioQueryParam("caseDefinitionId")
  public void setCaseDefinitionId(String caseDefinitionId) {
    this.caseDefinitionId = caseDefinitionId;
  }

  @OrqueioQueryParam("caseDefinitionKey")
  public void setCaseDefinitionKey(String caseDefinitionKey) {
    this.caseDefinitionKey = caseDefinitionKey;
  }

  @OrqueioQueryParam("caseInstanceId")
  public void setCaseInstanceId(String caseInstanceId) {
    this.caseInstanceId = caseInstanceId;
  }

  @OrqueioQueryParam(value="activityIdIn", converter = StringArrayConverter.class)
  public void setActivityIdIn(String[] activityIdIn) {
    this.activityIdIn = activityIdIn;
  }

  @OrqueioQueryParam(value="activityInstanceIdIn", converter = StringArrayConverter.class)
  public void setActivityInstanceIdIn(String[] activityInstanceIdIn) {
    this.activityInstanceIdIn = activityInstanceIdIn;
  }

  @OrqueioQueryParam(value = "evaluatedBefore", converter = DateConverter.class)
  public void setEvaluatedBefore(Date evaluatedBefore) {
    this.evaluatedBefore = evaluatedBefore;
  }

  @OrqueioQueryParam(value = "evaluatedAfter", converter = DateConverter.class)
  public void setEvaluatedAfter(Date evaluatedAfter) {
    this.evaluatedAfter = evaluatedAfter;
  }

  @OrqueioQueryParam(value = "userId")
  public void setUserId(String userId) {
    this.userId = userId;
  }

  @OrqueioQueryParam(value = "includeInputs", converter = BooleanConverter.class)
  public void setIncludeInputs(Boolean includeInputs) {
    this.includeInputs = includeInputs;
  }

  @OrqueioQueryParam(value = "includeOutputs", converter = BooleanConverter.class)
  public void setIncludeOutputs(Boolean includeOutputs) {
    this.includeOutputs = includeOutputs;
  }

  @OrqueioQueryParam(value = "disableBinaryFetching", converter = BooleanConverter.class)
  public void setDisableBinaryFetching(Boolean disableBinaryFetching) {
    this.disableBinaryFetching = disableBinaryFetching;
  }

  @OrqueioQueryParam(value = "disableCustomObjectDeserialization", converter = BooleanConverter.class)
  public void setDisableCustomObjectDeserialization(Boolean disableCustomObjectDeserialization) {
    this.disableCustomObjectDeserialization = disableCustomObjectDeserialization;
  }

  @OrqueioQueryParam(value = "rootDecisionInstanceId")
  public void setRootDecisionInstanceId(String rootDecisionInstanceId) {
    this.rootDecisionInstanceId = rootDecisionInstanceId;
  }

  @OrqueioQueryParam(value = "rootDecisionInstancesOnly", converter = BooleanConverter.class)
  public void setRootDecisionInstancesOnly(Boolean rootDecisionInstancesOnly) {
    this.rootDecisionInstancesOnly = rootDecisionInstancesOnly;
  }

  @OrqueioQueryParam(value = "decisionRequirementsDefinitionId")
  public void setDecisionRequirementsDefinitionId(String decisionRequirementsDefinitionId) {
    this.decisionRequirementsDefinitionId = decisionRequirementsDefinitionId;
  }

  @OrqueioQueryParam(value = "decisionRequirementsDefinitionKey")
  public void setDecisionRequirementsDefinitionKey(String decisionRequirementsDefinitionKey) {
    this.decisionRequirementsDefinitionKey = decisionRequirementsDefinitionKey;
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
  protected boolean isValidSortByValue(String value) {
    return VALID_SORT_BY_VALUES.contains(value);
  }

  @Override
  protected HistoricDecisionInstanceQuery createNewQuery(ProcessEngine engine) {
    return engine.getHistoryService().createHistoricDecisionInstanceQuery();
  }

  @Override
  protected void applyFilters(HistoricDecisionInstanceQuery query) {
    if (decisionInstanceId != null) {
      query.decisionInstanceId(decisionInstanceId);
    }
    if (decisionInstanceIdIn != null) {
      query.decisionInstanceIdIn(decisionInstanceIdIn);
    }
    if (decisionDefinitionId != null) {
      query.decisionDefinitionId(decisionDefinitionId);
    }
    if (decisionDefinitionIdIn != null) {
      query.decisionDefinitionIdIn(decisionDefinitionIdIn);
    }
    if (decisionDefinitionKey != null) {
      query.decisionDefinitionKey(decisionDefinitionKey);
    }
    if (decisionDefinitionKeyIn != null) {
      query.decisionDefinitionKeyIn(decisionDefinitionKeyIn);
    }
    if (decisionDefinitionName != null) {
      query.decisionDefinitionName(decisionDefinitionName);
    }
    if (decisionDefinitionNameLike != null) {
      query.decisionDefinitionNameLike(decisionDefinitionNameLike);
    }
    if (processDefinitionId != null) {
      query.processDefinitionId(processDefinitionId);
    }
    if (processDefinitionKey != null) {
      query.processDefinitionKey(processDefinitionKey);
    }
    if (processInstanceId != null) {
      query.processInstanceId(processInstanceId);
    }
    if (caseDefinitionId != null) {
      query.caseDefinitionId(caseDefinitionId);
    }
    if (caseDefinitionKey != null) {
      query.caseDefinitionKey(caseDefinitionKey);
    }
    if (caseInstanceId != null) {
      query.caseInstanceId(caseInstanceId);
    }
    if (activityIdIn != null) {
      query.activityIdIn(activityIdIn);
    }
    if (activityInstanceIdIn != null) {
      query.activityInstanceIdIn(activityInstanceIdIn);
    }
    if (evaluatedBefore != null) {
      query.evaluatedBefore(evaluatedBefore);
    }
    if (evaluatedAfter != null) {
      query.evaluatedAfter(evaluatedAfter);
    }
    if (userId != null) {
      query.userId(userId);
    }
    if (TRUE.equals(includeInputs)) {
      query.includeInputs();
    }
    if (TRUE.equals(includeOutputs)) {
      query.includeOutputs();
    }
    if (TRUE.equals(disableBinaryFetching)) {
      query.disableBinaryFetching();
    }
    if (TRUE.equals(disableCustomObjectDeserialization)) {
      query.disableCustomObjectDeserialization();
    }
    if (rootDecisionInstanceId != null) {
      query.rootDecisionInstanceId(rootDecisionInstanceId);
    }
    if (TRUE.equals(rootDecisionInstancesOnly)) {
      query.rootDecisionInstancesOnly();
    }
    if (decisionRequirementsDefinitionId != null) {
      query.decisionRequirementsDefinitionId(decisionRequirementsDefinitionId);
    }
    if (decisionRequirementsDefinitionKey != null) {
      query.decisionRequirementsDefinitionKey(decisionRequirementsDefinitionKey);
    }
    if (tenantIds != null && !tenantIds.isEmpty()) {
      query.tenantIdIn(tenantIds.toArray(new String[tenantIds.size()]));
    }
    if (TRUE.equals(withoutTenantId)) {
      query.withoutTenantId();
    }
  }

  @Override
  protected void applySortBy(HistoricDecisionInstanceQuery query, String sortBy, Map<String, Object> parameters, ProcessEngine engine) {
    if (sortBy.equals(SORT_BY_EVALUATION_TIME_VALUE)) {
      query.orderByEvaluationTime();
    } else if (sortBy.equals(SORT_BY_TENANT_ID)) {
      query.orderByTenantId();
    }
  }

}
