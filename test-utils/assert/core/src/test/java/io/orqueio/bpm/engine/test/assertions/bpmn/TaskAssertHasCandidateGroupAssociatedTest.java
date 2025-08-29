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
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.claim;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.complete;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.runtimeService;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.task;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.taskQuery;
import static io.orqueio.bpm.engine.test.assertions.bpmn.BpmnAwareTests.taskService;

import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.task.Task;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.assertions.helpers.Failure;
import io.orqueio.bpm.engine.test.assertions.helpers.ProcessAssertTestCase;
import org.junit.Rule;
import org.junit.Test;

public class TaskAssertHasCandidateGroupAssociatedTest extends ProcessAssertTestCase {

  private static final String CANDIDATE_GROUP = "candidateGroup";
  private static final String ASSIGNEE = "assignee";

  @Rule
  public ProcessEngineRule processEngineRule = new ProcessEngineRule();

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_PreDefined_Success() {
    // When
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // Then
    assertThat(processInstance).task().hasCandidateGroupAssociated("candidateGroup");
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_PreDefined_Failure() {
    // Given
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    complete(taskQuery().singleResult());
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasCandidateGroupAssociated("candidateGroup");
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_Predefined_Removed_Failure() {
    // Given
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    taskService().deleteCandidateGroup(taskQuery().singleResult().getId(), "candidateGroup");
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasCandidateGroupAssociated("candidateGroup");
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_PreDefined_Other_Failure() {
    // Given
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    taskService().deleteCandidateGroup(taskQuery().singleResult().getId(), "candidateGroup");
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasCandidateGroupAssociated("otherCandidateGroup");
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_ExplicitelySet_Success() {
    // Given
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    complete(taskQuery().singleResult());
    // And
    taskService().addCandidateGroup(taskQuery().singleResult().getId(), "explicitCandidateGroupId");
    // Then
    assertThat(processInstance).task().hasCandidateGroupAssociated("explicitCandidateGroupId");
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_ExplicitelySet_Failure() {
    // Given
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    complete(taskQuery().singleResult());
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasCandidateGroupAssociated("candidateGroup");
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_ExplicitelySet_Removed_Failure() {
    // Given
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    complete(taskQuery().singleResult());
    // And
    taskService().addCandidateGroup(taskQuery().singleResult().getId(), "explicitCandidateGroupId");
    // When
    taskService().deleteCandidateGroup(taskQuery().singleResult().getId(), "explicitCandidateGroupId");
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasCandidateGroupAssociated("explicitCandidateGroupId");
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_ExplicitelySet_Other_Failure() {
    // Given
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    complete(taskQuery().singleResult());
    // And
    taskService().addCandidateGroup(taskQuery().singleResult().getId(), "explicitCandidateGroupId");
    // When
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasCandidateGroupAssociated("otherCandidateGroup");
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_MoreThanOne_Success() {
    // When
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    taskService().addCandidateGroup(taskQuery().singleResult().getId(), "explicitCandidateGroupId");
    // Then
    assertThat(processInstance).task().hasCandidateGroupAssociated("candidateGroup");
    // And
    assertThat(processInstance).task().hasCandidateGroupAssociated("explicitCandidateGroupId");
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_MoreThanOne_Failure() {
    // When
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    taskService().addCandidateGroup(taskQuery().singleResult().getId(), "explicitCandidateGroupId");
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasCandidateGroupAssociated("otherCandidateGroup");
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_Null_Failure() {
    // When
    final ProcessInstance processInstance = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(processInstance).task().hasCandidateGroupAssociated(null);
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_NonExistingTask_Failure() {
    // Given
    runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    final Task task = taskQuery().singleResult();
    complete(task);
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(task).hasCandidateGroupAssociated("candidateGroup");
      }
    });
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_Assigned_Success() {
    // Given
    final ProcessInstance pi = runtimeService().startProcessInstanceByKey(
        "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    claim(task(pi), ASSIGNEE);
    // Then
    assertThat(task(pi)).hasCandidateGroupAssociated(CANDIDATE_GROUP);
  }

  @Test
  @Deployment(resources = {"bpmn/TaskAssert-hasCandidateGroupAssociated.bpmn"
  })
  public void testHasCandidateGroupAssociated_Assigned_Failure() {
    // Given
    final ProcessInstance pi = runtimeService().startProcessInstanceByKey(
      "TaskAssert-hasCandidateGroupAssociated"
    );
    // When
    taskService().deleteCandidateGroup(task(pi).getId(), CANDIDATE_GROUP);
    // And
    claim(task(pi), ASSIGNEE);
    // Then
    expect(new Failure() {
      @Override
      public void when() {
        assertThat(task(pi)).hasCandidateGroupAssociated(CANDIDATE_GROUP);
      }
    });
  }

}
