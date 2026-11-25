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
package io.orqueio.bpm.spring.boot.starter.ai.task;

import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.jobexecutor.FailedJobCommandFactory;
import io.orqueio.bpm.engine.impl.persistence.entity.JobEntity;

/**
 * Handles failed jobs as the engine's configured factory does, then, when an LLM task
 * failed in a way a retry cannot fix, sets the job's retries to 0. The engine raises
 * the incident at once, and no further model call is paid for.
 */
public class LlmFailedJobCommandFactory implements FailedJobCommandFactory {

  private final FailedJobCommandFactory delegate;

  public LlmFailedJobCommandFactory(FailedJobCommandFactory delegate) {
    this.delegate = delegate;
  }

  @Override
  public Command<Object> getCommand(String jobId, Throwable exception) {
    Command<Object> command = delegate.getCommand(jobId, exception);
    if (!isPermanentLlmFailure(exception)) {
      return command;
    }
    return commandContext -> {
      Object result = command.execute(commandContext);
      JobEntity job = commandContext.getJobManager().findJobById(jobId);
      if (job != null && job.getRetries() > 0) {
        job.setRetries(0);
        // Set by a retry cycle; when an operator sets retries again, the job runs at once
        job.setDuedate(null);
      }
      return result;
    };
  }

  public FailedJobCommandFactory getDelegate() {
    return delegate;
  }

  protected boolean isPermanentLlmFailure(Throwable exception) {
    for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
      if (cause instanceof LlmTaskException llmTaskException) {
        return !llmTaskException.isRetryable();
      }
    }
    return false;
  }

}
