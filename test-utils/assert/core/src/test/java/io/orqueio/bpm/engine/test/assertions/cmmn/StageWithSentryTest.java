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
package io.orqueio.bpm.engine.test.assertions.cmmn;

import static io.orqueio.bpm.engine.test.assertions.cmmn.CmmnAwareTests.assertThat;
import static io.orqueio.bpm.engine.test.assertions.cmmn.CmmnAwareTests.caseExecution;
import static io.orqueio.bpm.engine.test.assertions.cmmn.CmmnAwareTests.caseService;
import static io.orqueio.bpm.engine.test.assertions.cmmn.CmmnAwareTests.complete;
import static io.orqueio.bpm.engine.test.assertions.cmmn.CmmnAwareTests.manuallyStart;

import io.orqueio.bpm.engine.runtime.CaseExecution;
import io.orqueio.bpm.engine.runtime.CaseInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.assertions.helpers.ProcessAssertTestCase;
import org.junit.Rule;
import org.junit.Test;

public class StageWithSentryTest extends ProcessAssertTestCase {

  public static final String TASK_A = "PI_HT_A";
  public static final String STAGE_S = "PI_StageS";

  @Rule
  public ProcessEngineRule processEngineRule = new ProcessEngineRule();

  /**
   * Introduces: stage.isAvailable()
   */
  @Test
  @Deployment(resources = { "cmmn/StageWithSentryTest.cmmn" })
  public void stage_t_should_be_available() {
    // Given
    // When
    CaseInstance caseInstance = givenCaseIsCreated();
    // Then
    assertThat(caseInstance).isActive().humanTask(TASK_A).isEnabled();
    assertThat(caseInstance).isActive().stage(STAGE_S).isAvailable();
  }

  /**
   * Introduces:
   */
  @Test
  @Deployment(resources = { "cmmn/StageWithSentryTest.cmmn" })
  public void stage_t_should_be_enabled() {
    // Given
    CaseInstance caseInstance = givenCaseIsCreated();
    // When
    CaseExecution taskA;
    manuallyStart(taskA = caseExecution(TASK_A, caseInstance));
    complete(caseExecution(TASK_A, caseInstance));
    // Then
    assertThat(caseInstance).isActive();
    assertThat(taskA).isCompleted();
    assertThat(caseInstance).isActive().stage(STAGE_S).isEnabled();
  }

  private CaseInstance givenCaseIsCreated() {
    CaseInstance caseInstance = caseService().createCaseInstanceByKey("Case_StageWithSentryTests");
    return caseInstance;
  }

}
