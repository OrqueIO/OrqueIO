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
package io.orqueio.bpm.engine.test.history;

import static io.orqueio.bpm.engine.impl.util.StringUtil.hasText;

import java.util.Objects;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.util.ProcessEngineBootstrapRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;

/**
 * @author Edoardo Patti
 */
@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_FULL)
public class HistoryEventDataTest {

  private static final TestEventHandler HANDLER = new TestEventHandler();

  @Rule
  public HistoryEventVerifier verifier = new HistoryEventVerifier(HANDLER);

  @ClassRule
  public static ProcessEngineBootstrapRule bootstrapRule = new ProcessEngineBootstrapRule(
      c -> c.setHistoryEventHandler(HANDLER));

  private RuntimeService runtimeService;

  @Rule
  public ProvidedProcessEngineRule engineRule = new ProvidedProcessEngineRule(bootstrapRule);

  @Before
  public void initServices() {
    runtimeService = engineRule.getRuntimeService();

    verifier.historyEventIs("!= null", Objects::nonNull);
    verifier.historyEventHas("processDefinitionId != null", (evt) -> hasText(evt.getProcessDefinitionId()));
    verifier.historyEventHas("processDefinitionKey != null", (evt) -> hasText(evt.getProcessDefinitionKey()));
    verifier.historyEventHas("processDefinitionName != null", (evt) -> hasText(evt.getProcessDefinitionName()));
    verifier.historyEventHas("processDefinitionVersion != null", (evt) -> evt.getProcessDefinitionVersion() != null);
  }

  @Test
  @Deployment(resources = "io/orqueio/bpm/engine/test/api/threeTasksProcess.bpmn20.xml")
  public void verify() {
    runtimeService.startProcessInstanceByKey("threeTasksProcess");
  }
}