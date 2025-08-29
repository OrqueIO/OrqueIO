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

import java.util.HashMap;
import java.util.Map;

import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.engine.delegate.ExecutionListener;

/**
 * @author Thorben Lindhauer
 *
 */
public class RecordInvocationListener implements ExecutionListener {

  public static final Map<String, Integer> INVOCATIONS = new HashMap<String, Integer>();

  @Override
  public void notify(DelegateExecution execution) throws Exception {

    Integer counter = INVOCATIONS.get(execution.getEventName());
    if (counter == null) {
      counter = 0;
    }

    INVOCATIONS.put(execution.getEventName(), ++counter);
  }

  public static void reset() {
    INVOCATIONS.clear();
  }

}
