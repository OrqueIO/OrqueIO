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
package io.orqueio.bpm.engine.test.api.multitenancy.query.history;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.exception.NullValueException;
import io.orqueio.bpm.engine.history.HistoricProcessInstance;
import io.orqueio.bpm.engine.history.HistoricProcessInstanceQuery;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.model.bpmn.Bpmn;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_ACTIVITY)
public class MultiTenancyHistoricProcessInstanceQueryTest {

  protected final static String TENANT_ONE = "tenant1";
  protected final static String TENANT_TWO = "tenant2";

  protected ProcessEngineRule engineRule = new ProvidedProcessEngineRule();

  protected ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);

  protected HistoryService historyService;
  protected RuntimeService runtimeService;
  protected IdentityService identityService;

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(engineRule).around(testRule);

  @Before
  public void setUp() {
    historyService = engineRule.getHistoryService();
    runtimeService = engineRule.getRuntimeService();
    identityService = engineRule.getIdentityService();

    BpmnModelInstance oneTaskProcess = Bpmn.createExecutableProcess("testProcess")
      .startEvent()
      .endEvent()
    .done();

    testRule.deploy(oneTaskProcess);
    testRule.deployForTenant(TENANT_ONE, oneTaskProcess);
    testRule.deployForTenant(TENANT_TWO, oneTaskProcess);

    startProcessInstance();
    startProcessInstanceForTenant(TENANT_ONE);
    startProcessInstanceForTenant(TENANT_TWO);
  }

  @Test
  public void shouldQueryNoTenantIdSet() {
    HistoricProcessInstanceQuery query = historyService.
        createHistoricProcessInstanceQuery();

    assertThat(query.count()).isEqualTo(3L);
  }

  @Test
  public void shouldQueryByTenantId() {
    HistoricProcessInstanceQuery query = historyService
        .createHistoricProcessInstanceQuery()
        .tenantIdIn(TENANT_ONE);

    assertThat(query.count()).isEqualTo(1L);

    query = historyService
        .createHistoricProcessInstanceQuery()
        .tenantIdIn(TENANT_TWO);

    assertThat(query.count()).isEqualTo(1L);
  }

  @Test
  public void shouldQueryByTenantIds() {
    HistoricProcessInstanceQuery query = historyService
        .createHistoricProcessInstanceQuery()
        .tenantIdIn(TENANT_ONE, TENANT_TWO);

    assertThat(query.count()).isEqualTo(2L);
  }

  @Test
  public void shouldQueryByNonExistingTenantId() {
    HistoricProcessInstanceQuery query = historyService
        .createHistoricProcessInstanceQuery()
        .tenantIdIn("nonExisting");

    assertThat(query.count()).isEqualTo(0L);
  }

  @Test
  public void shouldQueryByWithoutTenantId() {
    HistoricProcessInstanceQuery query = historyService
      .createHistoricProcessInstanceQuery()
      .withoutTenantId();

    assertThat(query.count()).isEqualTo(1L);
  }

  @Test
  public void shouldFailQueryByTenantIdNull() {
    try {
      historyService.createHistoricProcessInstanceQuery()
        .tenantIdIn((String) null);

      fail("expected exception");
    } catch (NullValueException e) {
    }
  }

  @Test
  public void shouldQuerySortingAsc() {
    List<HistoricProcessInstance> historicProcessInstances = historyService.createHistoricProcessInstanceQuery()
        .tenantIdIn(TENANT_ONE, TENANT_TWO)
        .orderByTenantId()
        .asc()
        .list();

    assertThat(historicProcessInstances.size()).isEqualTo(2);
    assertThat(historicProcessInstances.get(0).getTenantId()).isEqualTo(TENANT_ONE);
    assertThat(historicProcessInstances.get(1).getTenantId()).isEqualTo(TENANT_TWO);
  }

  @Test
  public void shouldQuerySortingDesc() {
    List<HistoricProcessInstance> historicProcessInstances = historyService.createHistoricProcessInstanceQuery()
        .tenantIdIn(TENANT_ONE, TENANT_TWO)
        .orderByTenantId()
        .desc()
        .list();

    assertThat(historicProcessInstances.size()).isEqualTo(2);
    assertThat(historicProcessInstances.get(0).getTenantId()).isEqualTo(TENANT_TWO);
    assertThat(historicProcessInstances.get(1).getTenantId()).isEqualTo(TENANT_ONE);
  }

  @Test
  public void shouldQueryNoAuthenticatedTenants() {
    identityService.setAuthentication("user", null, null);

    HistoricProcessInstanceQuery query = historyService.createHistoricProcessInstanceQuery();
    assertThat(query.count()).isEqualTo(1L);
  }

  @Test
  public void shouldQueryAuthenticatedTenant() {
    identityService.setAuthentication("user", null, Collections.singletonList(TENANT_ONE));

    HistoricProcessInstanceQuery query = historyService.createHistoricProcessInstanceQuery();

    assertThat(query.count()).isEqualTo(2L);
    assertThat(query.tenantIdIn(TENANT_ONE).count()).isEqualTo(1L);
    assertThat(query.tenantIdIn(TENANT_TWO).count()).isEqualTo(0L);
    assertThat(query.tenantIdIn(TENANT_ONE, TENANT_TWO).count()).isEqualTo(1L);
  }

  @Test
  public void shouldQueryAuthenticatedTenants() {
    identityService.setAuthentication("user", null, Arrays.asList(TENANT_ONE, TENANT_TWO));

    HistoricProcessInstanceQuery query = historyService.createHistoricProcessInstanceQuery();

    assertThat(query.count()).isEqualTo(3L);
    assertThat(query.tenantIdIn(TENANT_ONE).count()).isEqualTo(1L);
    assertThat(query.tenantIdIn(TENANT_TWO).count()).isEqualTo(1L);
    assertThat(query.withoutTenantId().count()).isEqualTo(1L);
  }

  @Test
  public void shouldQueryDisabledTenantCheck() {
    engineRule.getProcessEngineConfiguration().setTenantCheckEnabled(false);
    identityService.setAuthentication("user", null, null);

    HistoricProcessInstanceQuery query = historyService.createHistoricProcessInstanceQuery();
    assertThat(query.count()).isEqualTo(3L);
  }

  protected ProcessInstance startProcessInstanceForTenant(String tenant) {
    return runtimeService.createProcessInstanceByKey("testProcess")
        .processDefinitionTenantId(tenant)
        .execute();
  }

  protected ProcessInstance startProcessInstance() {
    return runtimeService.createProcessInstanceByKey("testProcess")
      .processDefinitionWithoutTenantId()
      .execute();
  }

}
