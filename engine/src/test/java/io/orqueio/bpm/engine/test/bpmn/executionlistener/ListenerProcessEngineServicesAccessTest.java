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
package io.orqueio.bpm.engine.test.bpmn.executionlistener;

import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.engine.delegate.ExecutionListener;
import io.orqueio.bpm.engine.test.bpmn.common.AbstractProcessEngineServicesAccessTest;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.instance.ManualTask;
import io.orqueio.bpm.model.bpmn.instance.Task;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioExecutionListener;

/**
 * @author Daniel Meyer
 *
 */
public class ListenerProcessEngineServicesAccessTest extends AbstractProcessEngineServicesAccessTest {

  protected Class<?> getTestServiceAccessibleClass() {
    return AccessServicesListener.class;
  }

  protected Class<?> getQueryClass() {
    return PerformQueryListener.class;
  }

  protected Class<?> getStartProcessInstanceClass() {
    return StartProcessListener.class;
  }

  protected Class<?> getProcessEngineStartProcessClass() {
    return ProcessEngineStartProcessListener.class;
  }

  protected Task createModelAccessTask(BpmnModelInstance modelInstance, Class<?> delegateClass) {
    ManualTask task = modelInstance.newInstance(ManualTask.class);
    task.setId("manualTask");
    OrqueioExecutionListener executionListener = modelInstance.newInstance(OrqueioExecutionListener.class);
    executionListener.setOrqueioEvent(ExecutionListener.EVENTNAME_START);
    executionListener.setOrqueioClass(delegateClass.getName());
    task.builder().addExtensionElement(executionListener);
    return task;
  }

  public static class AccessServicesListener implements ExecutionListener {
    public void notify(DelegateExecution execution) throws Exception {
      assertCanAccessServices(execution.getProcessEngineServices());
    }
  }

  public static class PerformQueryListener implements ExecutionListener {
    public void notify(DelegateExecution execution) throws Exception {
      assertCanPerformQuery(execution.getProcessEngineServices());
    }
  }

  public static class StartProcessListener implements ExecutionListener {
    public void notify(DelegateExecution execution) throws Exception {
      assertCanStartProcessInstance(execution.getProcessEngineServices());
    }
  }

  public static class ProcessEngineStartProcessListener implements ExecutionListener {
    public void notify(DelegateExecution execution) throws Exception {
      assertCanStartProcessInstance(execution.getProcessEngine());
    }
  }

}
