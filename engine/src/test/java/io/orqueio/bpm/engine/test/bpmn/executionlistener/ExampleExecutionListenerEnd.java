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
import io.orqueio.bpm.model.bpmn.instance.EndEvent;

/**
 * Simple {@link ExecutionListener} that sets a variable on the execution depending on the execution's state.
 * 
 * @author Tobias Metzke
 */
public class ExampleExecutionListenerEnd implements ExecutionListener {

  public void notify(DelegateExecution execution) throws Exception {
    boolean instanceEnded = execution.getBpmnModelElementInstance() instanceof EndEvent;
    boolean instanceCanceled = execution.getProcessInstance() != null && execution.getProcessInstance().isCanceled();
    if (instanceCanceled) {
      execution.setVariable("canceled", true);
    } else if (instanceEnded) {
      execution.setVariable("finished", true);
    } else {
      execution.setVariable("running", true);
    }
  }
}
