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
package io.orqueio.bpm.qa.upgrade.job;

import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.qa.upgrade.DescribesScenario;
import io.orqueio.bpm.qa.upgrade.ScenarioSetup;

public class JobFailureLogScenario {

  @Deployment
  public static String modelDeployment() {
    return "io/orqueio/bpm/qa/upgrade/job/oneTaskProcess.bpmn20.xml";
  }

  @DescribesScenario("failedJobWithRetries")
  public static ScenarioSetup createFailedJobWithRetries() {
    return (engine, scenarioName) -> {
      RuntimeService runtimeService = engine.getRuntimeService();
      String processInstanceId = runtimeService.startProcessInstanceByKey("oneTaskProcess-job-716", scenarioName)
          .getId();

      ManagementService managementService = engine.getManagementService();
      Job job = managementService.createJobQuery().processInstanceId(processInstanceId).singleResult();

      try {
        managementService.executeJob(job.getId());
      } catch (Exception e) {
        // expected
      }

      // result: Job has failed once (job log; exception message populated)
      // and has still > 0 retries left
    };
  }
}
