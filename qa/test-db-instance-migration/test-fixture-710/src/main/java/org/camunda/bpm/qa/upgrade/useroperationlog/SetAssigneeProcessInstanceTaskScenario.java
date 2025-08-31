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
package io.orqueio.bpm.qa.upgrade.useroperationlog;

import java.util.List;

import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.TaskService;
import io.orqueio.bpm.engine.task.Task;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.qa.upgrade.DescribesScenario;
import io.orqueio.bpm.qa.upgrade.ScenarioSetup;

/**
 * @author Yana.Vasileva
 *
 */
public class SetAssigneeProcessInstanceTaskScenario {

  @Deployment
  public static String deploy() {
    return "io/orqueio/bpm/qa/upgrade/useroperationlog/oneTaskProcess.bpmn20.xml";
  }

  @DescribesScenario("createUserOperationLogEntries")
  public static ScenarioSetup createUserOperationLogEntries() {
    return new ScenarioSetup() {
      public void execute(ProcessEngine engine, String scenarioName) {
        IdentityService identityService = engine.getIdentityService();
        String processInstanceBusinessKey = "SetAssigneeProcessInstanceTaskScenario";
        engine.getRuntimeService().startProcessInstanceByKey("oneTaskProcess_userOpLog", processInstanceBusinessKey);

        identityService.setAuthentication("mary02", null);

        TaskService taskService = engine.getTaskService();
        List<Task> list = taskService.createTaskQuery().processInstanceBusinessKey(processInstanceBusinessKey).list();
        Task task = list.get(0);
        taskService.setAssignee(task.getId(), "john");

        identityService.clearAuthentication();
      }
    };
  }
}
