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
package io.orqueio.spin.plugin.variables;

import static io.orqueio.bpm.engine.variable.Variables.objectValue;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.history.HistoricVariableInstance;
import io.orqueio.bpm.engine.history.HistoricVariableUpdate;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.history.HistoryLevel;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.variable.type.ValueType;
import io.orqueio.bpm.engine.variable.value.ObjectValue;
import io.orqueio.spin.DataFormats;
import org.json.JSONException;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.skyscreamer.jsonassert.JSONAssert;

public class HistoricVariableJsonSerializationTest {

  protected static final String ONE_TASK_PROCESS = "io/orqueio/spin/plugin/oneTaskProcess.bpmn20.xml";

  protected static final String JSON_FORMAT_NAME = DataFormats.json().getName();

  @Rule
  public ProcessEngineRule engineRule = new ProcessEngineRule(true);

  protected HistoryService historyService;
  protected ProcessEngineConfigurationImpl processEngineConfiguration;
  protected RuntimeService runtimeService;

  @Before
  public void setUp() {
    historyService = engineRule.getHistoryService();
    processEngineConfiguration = engineRule.getProcessEngineConfiguration();
    runtimeService = engineRule.getRuntimeService();
  }

  @Test
  @Deployment(resources = ONE_TASK_PROCESS)
  public void testSelectHistoricVariableInstances() throws JSONException {
    if (processEngineConfiguration.getHistoryLevel().getId() >=
        HistoryLevel.HISTORY_LEVEL_AUDIT.getId()) {
      ProcessInstance instance = runtimeService.startProcessInstanceByKey("oneTaskProcess");

      JsonSerializable bean = new JsonSerializable("a String", 42, false);
      runtimeService.setVariable(instance.getId(), "simpleBean", objectValue(bean).serializationDataFormat(JSON_FORMAT_NAME).create());

      HistoricVariableInstance historicVariable = historyService.createHistoricVariableInstanceQuery().singleResult();
      assertNotNull(historicVariable.getValue());
      assertNull(historicVariable.getErrorMessage());

      assertEquals(ValueType.OBJECT.getName(), historicVariable.getTypeName());
      assertEquals(ValueType.OBJECT.getName(), historicVariable.getVariableTypeName());

      JsonSerializable historyValue = (JsonSerializable) historicVariable.getValue();
      assertEquals(bean.getStringProperty(), historyValue.getStringProperty());
      assertEquals(bean.getIntProperty(), historyValue.getIntProperty());
      assertEquals(bean.getBooleanProperty(), historyValue.getBooleanProperty());
    }
  }

  @Test
  @Deployment(resources = ONE_TASK_PROCESS)
  public void testSelectHistoricSerializedValues() throws JSONException {
    if (processEngineConfiguration.getHistoryLevel().getId() >=
        HistoryLevel.HISTORY_LEVEL_AUDIT.getId()) {


      ProcessInstance instance = runtimeService.startProcessInstanceByKey("oneTaskProcess");

      JsonSerializable bean = new JsonSerializable("a String", 42, false);
      runtimeService.setVariable(instance.getId(), "simpleBean", objectValue(bean).serializationDataFormat(JSON_FORMAT_NAME));

      HistoricVariableInstance historicVariable = historyService.createHistoricVariableInstanceQuery().singleResult();
      assertNotNull(historicVariable.getValue());
      assertNull(historicVariable.getErrorMessage());

      ObjectValue typedValue = (ObjectValue) historicVariable.getTypedValue();
      assertEquals(JSON_FORMAT_NAME, typedValue.getSerializationDataFormat());
      JSONAssert.assertEquals(bean.toExpectedJsonString(),new String(typedValue.getValueSerialized()), true);
      assertEquals(JsonSerializable.class.getName(), typedValue.getObjectTypeName());
    }
  }

  @Test
  @Deployment(resources = ONE_TASK_PROCESS)
  public void testSelectHistoricSerializedValuesUpdate() throws JSONException {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("oneTaskProcess");

    JsonSerializable bean = new JsonSerializable("a String", 42, false);
    runtimeService.setVariable(instance.getId(), "simpleBean", objectValue(bean).serializationDataFormat(JSON_FORMAT_NAME));

    if (ProcessEngineConfiguration.HISTORY_FULL.equals(processEngineConfiguration.getHistory())) {

      HistoricVariableUpdate historicUpdate = (HistoricVariableUpdate)
          historyService.createHistoricDetailQuery().variableUpdates().singleResult();

      assertNotNull(historicUpdate.getValue());
      assertNull(historicUpdate.getErrorMessage());

      assertEquals(ValueType.OBJECT.getName(), historicUpdate.getTypeName());
      assertEquals(ValueType.OBJECT.getName(), historicUpdate.getVariableTypeName());

      JsonSerializable historyValue = (JsonSerializable) historicUpdate.getValue();
      assertEquals(bean.getStringProperty(), historyValue.getStringProperty());
      assertEquals(bean.getIntProperty(), historyValue.getIntProperty());
      assertEquals(bean.getBooleanProperty(), historyValue.getBooleanProperty());

      ObjectValue typedValue = (ObjectValue) historicUpdate.getTypedValue();
      assertEquals(JSON_FORMAT_NAME, typedValue.getSerializationDataFormat());
      JSONAssert.assertEquals(bean.toExpectedJsonString(),new String(typedValue.getValueSerialized()), true);
      assertEquals(JsonSerializable.class.getName(), typedValue.getObjectTypeName());

    }
  }

}
