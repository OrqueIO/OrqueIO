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

import io.orqueio.bpm.engine.runtime.CaseInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.assertions.helpers.Failure;
import io.orqueio.bpm.engine.test.assertions.helpers.ProcessAssertTestCase;
import org.junit.Rule;
import org.junit.Test;

@Deployment(resources = "cmmn/MilestoneAssertIsTerminatedTest.cmmn")
public class MilestoneAssertIsTerminatedTest extends ProcessAssertTestCase {

  @Rule
  public ProcessEngineRule processEngineRule = new ProcessEngineRule();

  @Test
  public void test_IsTerminated_Success() {
    CaseInstance caseInstance = caseService().createCaseInstanceByKey("MilestoneAssertIsTerminatedTest");
    MilestoneAssert milestoneAssert = assertThat(caseInstance).stage("Stage").milestone("Milestone");

    complete(caseExecution("PI_TaskA", caseInstance));

    milestoneAssert.isTerminated();
  }

  @Test
  public void test_IsTerminated_Fail() {
    final CaseInstance caseInstance = caseService().createCaseInstanceByKey("MilestoneAssertIsTerminatedTest");

    expect(new Failure() {
      @Override
      public void when() {
        assertThat(caseInstance).stage("Stage").milestone("Milestone").isTerminated();
      }
    });
  }
}
