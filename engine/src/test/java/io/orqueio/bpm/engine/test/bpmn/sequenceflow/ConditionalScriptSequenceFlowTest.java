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
package io.orqueio.bpm.engine.test.bpmn.sequenceflow;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;

import java.util.HashMap;
import java.util.Map;

import io.orqueio.bpm.engine.ProcessEngineException;
import io.orqueio.bpm.engine.task.Task;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.util.PluggableProcessEngineTest;
import org.junit.Test;

/**
 * @author Sebastian Menski
 */
public class ConditionalScriptSequenceFlowTest extends PluggableProcessEngineTest {

  @Deployment
  @Test
  public void testScriptExpression() {
    String[] directions = new String[] { "left", "right" };
    Map<String, Object> variables = new HashMap<String, Object>();

    for (String direction : directions) {
      variables.put("foo", direction);
      runtimeService.startProcessInstanceByKey("process", variables);

      Task task = taskService.createTaskQuery().singleResult();
      assertEquals(direction, task.getTaskDefinitionKey());
      taskService.complete(task.getId());
    }

  }

  @Deployment
  @Test
  public void testScriptExpressionWithNonBooleanResult() {
    try {
      runtimeService.startProcessInstanceByKey("process");
      fail("expected exception: invalid return value in script");
    } catch (ProcessEngineException e) {
      testRule.assertTextPresent("condition script returns non-Boolean", e.getMessage());
    }
  }

  @Deployment(resources = {
    "io/orqueio/bpm/engine/test/bpmn/sequenceflow/ConditionalScriptSequenceFlowTest.testScriptResourceExpression.bpmn20.xml",
    "io/orqueio/bpm/engine/test/bpmn/sequenceflow/condition-left.groovy"
  })
  @Test
  public void testScriptResourceExpression() {
    String[] directions = new String[] { "left", "right" };
    Map<String, Object> variables = new HashMap<String, Object>();

    for (String direction : directions) {
      variables.put("foo", direction);
      runtimeService.startProcessInstanceByKey("process", variables);

      Task task = taskService.createTaskQuery().singleResult();
      assertEquals(direction, task.getTaskDefinitionKey());
      taskService.complete(task.getId());
    }

  }

}
