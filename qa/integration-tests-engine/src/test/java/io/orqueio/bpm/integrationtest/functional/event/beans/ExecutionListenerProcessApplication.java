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
package io.orqueio.bpm.integrationtest.functional.event.beans;

import io.orqueio.bpm.application.ProcessApplication;
import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.engine.delegate.ExecutionListener;

/**
 * @author Daniel Meyer
 *
 */
@ProcessApplication
// Using fully-qualified class name instead of import statement to allow for automatic Jakarta transformation
public class ExecutionListenerProcessApplication extends io.orqueio.bpm.application.impl.ServletProcessApplication {

  public static final String LISTENER_INVOCATION_COUNT = "listenerInvocationCount";

  public ExecutionListener getExecutionListener() {
    return new ExecutionListener() {
      public void notify(DelegateExecution execution) throws Exception {

        int listenerInvocationCount = 0;

        if(execution.hasVariable(LISTENER_INVOCATION_COUNT)) {
          listenerInvocationCount = (Integer) execution.getVariable(LISTENER_INVOCATION_COUNT);
        }

        listenerInvocationCount += 1;

        execution.setVariable(LISTENER_INVOCATION_COUNT, listenerInvocationCount);
      }
    };
  }

}
