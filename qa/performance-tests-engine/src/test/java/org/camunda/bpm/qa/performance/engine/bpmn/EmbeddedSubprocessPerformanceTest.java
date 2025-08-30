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
package io.orqueio.bpm.qa.performance.engine.bpmn;

import static io.orqueio.bpm.qa.performance.engine.steps.PerfTestConstants.*;

import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.qa.performance.engine.junit.ProcessEnginePerformanceTestCase;
import io.orqueio.bpm.qa.performance.engine.steps.SignalExecutionStep;
import io.orqueio.bpm.qa.performance.engine.steps.StartProcessInstanceStep;
import org.junit.Test;

/**
 * @author Daniel Meyer
 *
 */
public class EmbeddedSubprocessPerformanceTest extends ProcessEnginePerformanceTestCase {

  @Test
  @Deployment
  public void sync1Subprocess() {
    performanceTest()
      .step(new StartProcessInstanceStep(engine, "process"))
    .run();
  }

  @Test
  @Deployment
  public void sync2Subprocesses() {
    performanceTest()
      .step(new StartProcessInstanceStep(engine, "process"))
    .run();
  }

  @Test
  @Deployment
  public void sync3Subprocesses() {
    performanceTest()
      .step(new StartProcessInstanceStep(engine, "process"))
    .run();
  }

  @Test
  @Deployment
  public void async1Subprocess() {
    performanceTest()
      .step(new StartProcessInstanceStep(engine, "process"))
      .step(new SignalExecutionStep(engine, EXECUTION_ID))
    .run();
  }

  @Test
  @Deployment
  public void async2Subprocesses() {
    performanceTest()
      .step(new StartProcessInstanceStep(engine, "process"))
      .step(new SignalExecutionStep(engine, EXECUTION_ID))
    .run();
  }

  @Test
  @Deployment
  public void async3Subprocesses() {
    performanceTest()
      .step(new StartProcessInstanceStep(engine, "process"))
      .step(new SignalExecutionStep(engine, EXECUTION_ID))
    .run();
  }

}
