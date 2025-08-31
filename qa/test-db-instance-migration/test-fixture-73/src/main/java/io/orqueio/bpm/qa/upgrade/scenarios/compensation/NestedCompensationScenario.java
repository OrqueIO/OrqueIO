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
package io.orqueio.bpm.qa.upgrade.scenarios.compensation;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.task.Task;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.qa.upgrade.DescribesScenario;
import io.orqueio.bpm.qa.upgrade.ScenarioSetup;
import io.orqueio.bpm.qa.upgrade.Times;

/**
 * @author Thorben Lindhauer
 *
 */
public class NestedCompensationScenario {

  @Deployment
  public static String deployProcess() {
    return "io/orqueio/bpm/qa/upgrade/compensation/nestedCompensationProcess.bpmn20.xml";
  }

  @DescribesScenario("init.throwCompensate")
  @Times(1)
  public static ScenarioSetup instantiate() {
    return new ScenarioSetup() {
      public void execute(ProcessEngine engine, String scenarioName) {
        engine
          .getRuntimeService()
          .startProcessInstanceByKey("NestedCompensationScenario", scenarioName);

        // create the compensation event subscription and wait before throwing compensation
        Task userTask = engine.getTaskService().createTaskQuery()
            .processInstanceBusinessKey(scenarioName).singleResult();
        engine.getTaskService().complete(userTask.getId());
      }
    };
  }
}
