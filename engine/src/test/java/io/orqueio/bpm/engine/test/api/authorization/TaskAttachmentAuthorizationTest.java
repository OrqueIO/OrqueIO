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
package io.orqueio.bpm.engine.test.api.authorization;

import static io.orqueio.bpm.engine.authorization.Permissions.UPDATE;
import static io.orqueio.bpm.engine.authorization.Resources.TASK;
import static io.orqueio.bpm.engine.authorization.TaskPermissions.TASK_WORK;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.fail;

import io.orqueio.bpm.engine.AuthorizationException;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.task.Attachment;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import org.junit.Test;

/**
 * Deleting a task's attachment needs the same permission as deleting its comment (CVE-2026-109431).
 */
@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_AUDIT)
public class TaskAttachmentAuthorizationTest extends AuthorizationTest {

  protected static final String MISSING_PERMISSION = "The user with id 'test' does not have one of the following permissions: "
      + "'TASK_WORK' permission on resource 'myTask' of type 'Task' or 'UPDATE' permission on resource 'myTask' of type 'Task'";

  @Test
  public void shouldNotDeleteTaskAttachmentWithoutAuthorization() {
    // given
    createTask(TASK_ID);
    Attachment attachment = createAttachment(TASK_ID);

    try {
      // when
      taskService.deleteTaskAttachment(TASK_ID, attachment.getId());
      fail("Exception expected: It should not be possible to delete the attachment.");
    } catch (AuthorizationException e) {
      // then
      testRule.assertTextPresent(MISSING_PERMISSION, e.getMessage());
    }
    assertNotNull(findAttachment(attachment.getId()));

    deleteTask(TASK_ID, true);
  }

  @Test
  public void shouldNotDeleteAttachmentByIdWithoutAuthorizationOnItsTask() {
    // given
    createTask(TASK_ID);
    Attachment attachment = createAttachment(TASK_ID);

    try {
      // when
      taskService.deleteAttachment(attachment.getId());
      fail("Exception expected: It should not be possible to delete the attachment.");
    } catch (AuthorizationException e) {
      // then
      testRule.assertTextPresent(MISSING_PERMISSION, e.getMessage());
    }
    assertNotNull(findAttachment(attachment.getId()));

    deleteTask(TASK_ID, true);
  }

  @Test
  public void shouldDeleteTaskAttachmentWithUpdatePermission() {
    // given
    createTask(TASK_ID);
    Attachment attachment = createAttachment(TASK_ID);
    createGrantAuthorization(TASK, TASK_ID, userId, UPDATE);

    // when
    taskService.deleteTaskAttachment(TASK_ID, attachment.getId());

    // then
    assertNull(findAttachment(attachment.getId()));

    deleteTask(TASK_ID, true);
  }

  @Test
  public void shouldDeleteTaskAttachmentWithTaskWorkPermission() {
    // given
    createTask(TASK_ID);
    Attachment attachment = createAttachment(TASK_ID);
    createGrantAuthorization(TASK, TASK_ID, userId, TASK_WORK);

    // when
    taskService.deleteTaskAttachment(TASK_ID, attachment.getId());

    // then
    assertNull(findAttachment(attachment.getId()));

    deleteTask(TASK_ID, true);
  }

  protected Attachment createAttachment(String taskId) {
    return runWithoutAuthorization(
        () -> taskService.createAttachment("aType", taskId, null, "anAttachment", "aDescription", "http://example.org"));
  }

  protected Attachment findAttachment(String attachmentId) {
    return runWithoutAuthorization(() -> taskService.getAttachment(attachmentId));
  }

}
