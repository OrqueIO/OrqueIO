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
package io.orqueio.bpm.engine.test.api.variables;

import static org.assertj.core.api.Assertions.assertThat;

import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.history.HistoricProcessInstance;
import io.orqueio.bpm.engine.impl.HistoricProcessInstanceQueryImpl;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import org.junit.Before;

@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_AUDIT)
@Deployment(resources = "io/orqueio/bpm/engine/test/api/oneTaskProcess.bpmn20.xml")
public class HistoricProcessInstanceQueryVariableIgnoreCaseTest
    extends AbstractVariableIgnoreCaseTest<HistoricProcessInstanceQueryImpl, HistoricProcessInstance> {

  @Before
  public void init() {
    engineRule.getRuntimeService().startProcessInstanceByKey("oneTaskProcess", VARIABLES);
    instance = engineRule.getHistoryService().createHistoricProcessInstanceQuery().singleResult();
  }

  @Override
  protected HistoricProcessInstanceQueryImpl createQuery() {
    return (HistoricProcessInstanceQueryImpl) engineRule.getHistoryService().createHistoricProcessInstanceQuery();
  }

  @Override
  protected void assertThatTwoInstancesAreEqual(HistoricProcessInstance one, HistoricProcessInstance two) {
    assertThat(one.getId()).isEqualTo(two.getId());
  }
}
