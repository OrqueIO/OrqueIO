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

import io.orqueio.bpm.engine.runtime.CaseInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.assertions.helpers.Failure;
import io.orqueio.bpm.engine.test.assertions.helpers.ProcessAssertTestCase;
import org.junit.Rule;
import org.junit.Test;

public class CaseTaskAssertIsTerminatedTest extends ProcessAssertTestCase {

  public static final String TASK_A = "PI_TaskA";
  public static final String TASK_B = "PI_TaskB";
  public static final String HTASK_B = "PI_TaskB_HT";
  public static final String CASE_KEY = "Case_CaseTaskAssertIsTerminatedTest";
  public static final String CASE_KEY_B = "Case_CaseTaskAssertIsTerminatedTest_CaseB";

  @Rule
  public ProcessEngineRule processEngineRule = new ProcessEngineRule();

  @Test
  @Deployment(resources = { "cmmn/CaseTaskAssertIsTerminatedTest.cmmn" })
  public void testIsTerminated_Success() {
    // Given
    final CaseInstance caseInstance = givenCaseIsCreated();
    CaseInstance caseInstanceB = caseService().createCaseInstanceQuery().caseDefinitionKey(CASE_KEY_B).singleResult();
    CaseTaskAssert caseTask = assertThat(caseInstance).caseTask(TASK_B);
    // When
    complete(caseExecution(HTASK_B, caseInstanceB));
    manuallyStart(caseExecution(TASK_B, caseInstance));
    caseService().terminateCaseExecution(caseExecution(TASK_B, caseInstance).getId());
    // Then
    caseTask.isTerminated();
  }

  @Test
  @Deployment(resources = { "cmmn/CaseTaskAssertIsTerminatedTest.cmmn" })
  public void testIsTerminated_Failure() {
    // Given
    final CaseInstance caseInstance = givenCaseIsCreated();
    // When
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(caseInstance).caseTask(TASK_B).isTerminated();
      }
    });
  }

  private CaseInstance givenCaseIsCreated() {
    return caseService().createCaseInstanceByKey(CASE_KEY);
  }
}