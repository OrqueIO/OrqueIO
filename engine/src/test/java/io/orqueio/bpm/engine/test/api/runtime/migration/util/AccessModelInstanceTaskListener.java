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
package io.orqueio.bpm.engine.test.api.runtime.migration.util;

import io.orqueio.bpm.engine.delegate.DelegateTask;
import io.orqueio.bpm.engine.delegate.TaskListener;
import io.orqueio.bpm.model.bpmn.instance.UserTask;

public class AccessModelInstanceTaskListener implements TaskListener {

  public static final String VARIABLE_NAME = "userTaskId";

  @Override
  public void notify(DelegateTask delegateTask) {
    UserTask userTask = delegateTask.getBpmnModelElementInstance();
    delegateTask.setVariable(VARIABLE_NAME, userTask.getId());
  }

}
