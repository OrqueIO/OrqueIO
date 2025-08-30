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
package io.orqueio.bpm.qa.upgrade.timestamp;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.impl.persistence.entity.TaskEntity;
import io.orqueio.bpm.qa.upgrade.DescribesScenario;
import io.orqueio.bpm.qa.upgrade.ScenarioSetup;
import io.orqueio.bpm.qa.upgrade.Times;

/**
 * @author Nikola Koevski
 */
public class TaskCreateTimeScenario extends AbstractTimestampMigrationScenario {

  protected static final String TASK_NAME = "createTimeTestTask";

  @DescribesScenario("initCreateTime")
  @Times(1)
  public static ScenarioSetup initCreateTime() {
    return new ScenarioSetup() {
      @Override
      public void execute(ProcessEngine processEngine, String s) {

        TaskEntity task = TaskEntity.create();
        task.setName(TASK_NAME);
        task.setCreateTime(TIMESTAMP);
        processEngine.getTaskService().saveTask(task);
      }
    };
  }
}