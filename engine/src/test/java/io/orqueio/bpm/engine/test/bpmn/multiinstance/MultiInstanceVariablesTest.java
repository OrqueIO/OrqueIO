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
package io.orqueio.bpm.engine.test.bpmn.multiinstance;

import static org.assertj.core.api.Assertions.assertThat;
import static io.orqueio.bpm.engine.impl.bpmn.behavior.MultiInstanceActivityBehavior.NUMBER_OF_INSTANCES;

import java.util.List;

import io.orqueio.bpm.engine.task.Task;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.model.bpmn.Bpmn;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.builder.CallActivityBuilder;
import io.orqueio.bpm.model.bpmn.instance.CallActivity;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioIn;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOut;
import org.junit.Rule;
import org.junit.Test;

/**
 * @author Askar Akhmerov
 */
public class MultiInstanceVariablesTest {

  public static final String ALL = "all";
  public static final String SUB_PROCESS_ID = "testProcess";
  public static final String PROCESS_ID = "process";
  public static final String CALL_ACTIVITY = "callActivity";

  @Rule
  public ProcessEngineRule engineRule = new ProvidedProcessEngineRule();

  @Test
  public void testMultiInstanceWithAllInOutMapping() {
    BpmnModelInstance modelInstance = getBpmnModelInstance();

    CallActivityBuilder callActivityBuilder = ((CallActivity) modelInstance.getModelElementById(CALL_ACTIVITY)).builder();

    addAllIn(modelInstance, callActivityBuilder);

    addAllOut(modelInstance, callActivityBuilder);

    BpmnModelInstance testProcess = getBpmnSubProcessModelInstance();

    deployAndStartProcess(modelInstance, testProcess);
    assertThat(engineRule.getRuntimeService().createExecutionQuery().processDefinitionKey(SUB_PROCESS_ID).list()).hasSize(2);

    List<Task> tasks = engineRule.getTaskService().createTaskQuery().active().list();
    for (Task task : tasks) {
      engineRule.getTaskService().setVariable(task.getId(),NUMBER_OF_INSTANCES,"3");
      engineRule.getTaskService().complete(task.getId());
    }

    assertThat(engineRule.getRuntimeService().createExecutionQuery().processDefinitionKey(SUB_PROCESS_ID).list()).hasSize(0);
    assertThat(engineRule.getRuntimeService().createExecutionQuery().activityId(CALL_ACTIVITY).list()).hasSize(0);
  }

  protected void addAllOut(BpmnModelInstance modelInstance, CallActivityBuilder callActivityBuilder) {
    OrqueioOut orqueioOut = modelInstance.newInstance(OrqueioOut.class);
    orqueioOut.setOrqueioVariables(ALL);
    callActivityBuilder.addExtensionElement(orqueioOut);
  }

  protected void addAllIn(BpmnModelInstance modelInstance, CallActivityBuilder callActivityBuilder) {
    OrqueioIn orqueioIn = modelInstance.newInstance(OrqueioIn.class);
    orqueioIn.setOrqueioVariables(ALL);
    callActivityBuilder.addExtensionElement(orqueioIn);
  }

  protected void deployAndStartProcess(BpmnModelInstance modelInstance, BpmnModelInstance testProcess) {
    engineRule.manageDeployment(engineRule.getRepositoryService().createDeployment()
        .addModelInstance("process.bpmn", modelInstance).deploy());
    engineRule.manageDeployment(engineRule.getRepositoryService().createDeployment()
        .addModelInstance("testProcess.bpmn", testProcess).deploy());
    engineRule.getRuntimeService().startProcessInstanceByKey(PROCESS_ID);
  }

  protected BpmnModelInstance getBpmnModelInstance() {
    return Bpmn.createExecutableProcess(PROCESS_ID)
        .startEvent()
          .callActivity(CALL_ACTIVITY)
          .calledElement(SUB_PROCESS_ID)
          .multiInstance()
            .cardinality("2")
            .multiInstanceDone()
        .endEvent()
        .done();
  }

  protected BpmnModelInstance getBpmnSubProcessModelInstance() {
    return Bpmn.createExecutableProcess(SUB_PROCESS_ID)
        .startEvent()
        .userTask("userTask")
        .endEvent()
        .done();
  }

}
