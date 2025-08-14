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
package io.orqueio.bpm.qa.upgrade.scenarios.task;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.qa.upgrade.DescribesScenario;
import io.orqueio.bpm.qa.upgrade.ScenarioSetup;
import io.orqueio.bpm.qa.upgrade.Times;

/**
 * @author Thorben Lindhauer
 *
 */
public class ParallelScopeTasksScenario {

  @Deployment
  public static String deployProcess() {
    return "io/orqueio/bpm/qa/upgrade/task/parallelScopeTasksProcess.bpmn20.xml";
  }

  @Deployment
  public static String deployNestedProcess() {
    return "io/orqueio/bpm/qa/upgrade/task/nestedParallelScopeTasksProcess.bpmn20.xml";
  }

  @DescribesScenario("init.plain")
  @Times(1)
  public static ScenarioSetup instantiatePlain() {
    return new ScenarioSetup() {
      public void execute(ProcessEngine engine, String scenarioName) {
        engine
          .getRuntimeService()
          .startProcessInstanceByKey("ParallelScopeTasksScenario.plain", scenarioName);
      }
    };
  }

  @DescribesScenario("init.nested")
  @Times(1)
  public static ScenarioSetup instantiateNested() {
    return new ScenarioSetup() {
      public void execute(ProcessEngine engine, String scenarioName) {
        engine
          .getRuntimeService()
          .startProcessInstanceByKey("ParallelScopeTasksScenario.nested", scenarioName);
      }
    };
  }
}
