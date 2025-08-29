/*
 * Copyright Toaddlaterccs and/or licensed to Toaddlaterccs
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Toaddlaterccs this file to you under the Apache License,
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
package io.orqueio.bpm.engine.test.junit5.registerExtension;

import static org.assertj.core.api.Assertions.assertThat;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.TaskService;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.junit5.ProcessEngineExtension;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

public class RegisterNewProcessEngineTest {

  private static ProcessEngine testEngine = ((ProcessEngineConfigurationImpl)ProcessEngineConfiguration
      .createStandaloneInMemProcessEngineConfiguration())
      .setEnforceHistoryTimeToLive(false)
      .setProcessEngineName("testEngine")
      // Use a new database to resolve the conflict with existing
      // in-memory-database. The tables will be removed after the test.
      .setJdbcUrl("jdbc:h2:mem:orqueio-test")
      .buildProcessEngine();

  @RegisterExtension
  ProcessEngineExtension extension = ProcessEngineExtension.builder()
      .useProcessEngine(testEngine)
      .build();

  @AfterAll
  public static void closeProcessEngine() {
    testEngine.close();
  }

  @Test
  @Deployment(resources = "processes/subProcess.bpmn")
  public void testUseProcessEngine() {
    // given
    RuntimeService runtimeService = testEngine.getRuntimeService();
    runtimeService.startProcessInstanceByKey("subProcess");
    TaskService taskService = testEngine.getTaskService();

    // when
    int numberOfTasks = taskService.createTaskQuery().list().size();

    // then
    assertThat(numberOfTasks).isOne();
  }

  @Test
  public void shouldUpdateServiceReferences() {

    assertThat(extension.getRuntimeService()).isEqualTo(testEngine.getRuntimeService());
  }

}
