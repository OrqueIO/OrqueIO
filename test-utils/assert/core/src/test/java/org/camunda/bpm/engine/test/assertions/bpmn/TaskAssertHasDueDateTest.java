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
package io.orqueio.bpm.engine.test.assertions.bpmn;

import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.assertThat;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.runtimeService;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.taskQuery;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.taskService;

import java.util.Date;

import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.task.Task;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.assertions.helpers.Failure;
import io.orqueio.bpm.engine.test.assertions.helpers.ProcessAssertTestCase;
import org.junit.Rule;
import org.junit.Test;

public class TaskAssertHasDueDateTest extends ProcessAssertTestCase {

  @Rule
  public ProcessEngineRule processEngineRule = new ProcessEngineRule();

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasDueDate.bpmn"
  })
  public void testHasDueDate_Success() {
    // Given
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasDueDate"
    );
    final Date dueDate = new Date();
    Task task = taskQuery().singleResult();
    task.setDueDate(dueDate);
    taskService().saveTask(task);
    // Then
    assertThat(processInstance).task().hasDueDate(dueDate);
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasDueDate.bpmn"
  })
  public void testHasDueDate_Failure() {
    // Given
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasDueDate"
    );
    // When
    final Date dueDate = new Date();
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasDueDate(dueDate);
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasDueDate.bpmn"
  })
  public void testHasDueDate_Null_Failure() {
    // When
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasDueDate"
    );
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasDueDate(null);
      }
    });
  }

}
