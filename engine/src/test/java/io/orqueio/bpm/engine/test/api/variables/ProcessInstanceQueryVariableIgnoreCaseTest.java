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

import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.impl.ProcessInstanceQueryImpl;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.Deployment;
import org.junit.Before;

@Deployment(resources = "io/orqueio/bpm/engine/test/api/oneTaskProcess.bpmn20.xml")
public class ProcessInstanceQueryVariableIgnoreCaseTest extends AbstractVariableIgnoreCaseTest<ProcessInstanceQueryImpl, ProcessInstance> {

  RuntimeService runtimeService;

  @Before
  public void init() {
    runtimeService = engineRule.getRuntimeService();
    instance = runtimeService.startProcessInstanceByKey("oneTaskProcess", VARIABLES);
  }

  protected ProcessInstanceQueryImpl createQuery() {
    return (ProcessInstanceQueryImpl) runtimeService.createProcessInstanceQuery();
  }

  @Override
  protected void assertThatTwoInstancesAreEqual(ProcessInstance one, ProcessInstance two) {
    assertThat(one.getId()).isEqualTo(two.getId());
  }
}
