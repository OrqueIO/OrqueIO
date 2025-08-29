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
package io.orqueio.bpm.engine.test.assertions.bpmn;

import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.assertThat;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.job;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.runtimeService;

import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.assertions.helpers.Failure;
import io.orqueio.bpm.engine.test.assertions.helpers.ProcessAssertTestCase;
import org.junit.Rule;
import org.junit.Test;

public class JobAssertHasActivityIdTest extends ProcessAssertTestCase {

  @Rule
  public ProcessEngineRule processEngineRule = new ProcessEngineRule();

  @Test
  @Deployment(resources = {"bpmn/JobAssert-hasActivityId.bpmn"
  })
  public void testHasActivityId_Success() {
    // Given
    ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "JobAssert-hasActivityId"
    );
    // And
    assertThat(processInstance).isNotNull();
    // Then
    assertThat(job()).isNotNull();
    // And
    assertThat(job()).hasActivityId("ServiceTask_1");
  }

  @Test
  @Deployment(resources = {"bpmn/JobAssert-hasActivityId.bpmn"
  })
  public void testHasActivityId_Failure() {
    // Given
    ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "JobAssert-hasActivityId"
    );
    // And
    assertThat(processInstance).isNotNull();
    // Then
    assertThat(job()).isNotNull();
    // And
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(job()).hasActivityId("otherDeploymentId");
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/JobAssert-hasActivityId.bpmn"
  })
  public void testHasActivityId_Error_Null() {
    // Given
    ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "JobAssert-hasActivityId"
    );
    // And
    assertThat(processInstance).isNotNull();
    // Then
    assertThat(job()).isNotNull();
    // And
    expect(new Failure() {
      @Override
      public void when() {
        BpmnAwareTests.assertThat(job()).hasActivityId(null);
      }
    });
  }

}
