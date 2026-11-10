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

import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmOutputField.Type.INTEGER;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmOutputField.Type.STRING;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import io.orqueio.bpm.engine.impl.persistence.entity.ExecutionEntity;
import io.orqueio.bpm.engine.impl.pvm.process.ActivityImpl;
import io.orqueio.bpm.engine.impl.pvm.process.ProcessDefinitionImpl;
import io.orqueio.bpm.spring.boot.starter.ai.cache.InMemoryLlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.provider.ChatModelRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

class LlmTaskDelegateTest {

  @Test
  void shouldWriteNoVariableWhenALaterFieldIsInvalid() {
    ChatModel model = mock(ChatModel.class);
    when(model.call(any(Prompt.class))).thenReturn(
        new ChatResponse(List.of(new Generation(new AssistantMessage("{\"category\":\"Theft\",\"urgency\":\"high\"}")))));
    LlmTaskDelegate delegate = new LlmTaskDelegate(new ChatModelRegistry(() -> List.of(model), null),
        new LlmPromptResolver(), new LlmAnswerParser(), new LlmFailureClassifier(), Duration.ofSeconds(5));
    ExecutionEntity execution = executionOf(new LlmTaskConfiguration(null, null, "Classify", List.of(),
        List.of(new LlmOutputField("category", STRING), new LlmOutputField("urgency", INTEGER))));

    assertThatThrownBy(() -> delegate.execute(execution)).isInstanceOf(LlmTaskException.class);

    // The first field is valid, but nothing is written because the second one is not
    verify(execution, never()).setVariable(anyString(), any());
  }

  @Test
  void shouldNotRetryWhenProviderIsNotConfiguredAtRuntime() {
    LlmTaskDelegate delegate = new LlmTaskDelegate(new ChatModelRegistry(List::of, null),
        new LlmPromptResolver(), new LlmAnswerParser(), new LlmFailureClassifier(), Duration.ofSeconds(5));
    ExecutionEntity execution = executionOf(new LlmTaskConfiguration(null, null, "Classify", List.of(),
        List.of(new LlmOutputField("category", STRING))));

    assertThatThrownBy(() -> delegate.execute(execution))
        .isInstanceOf(LlmTaskException.class)
        .matches(e -> !((LlmTaskException) e).isRetryable());
  }

  @Test
  void shouldReleaseLockAfterTimeoutInterruptedTheCall() throws Exception {
    // The model ignores the interrupt of the timeout but leaves the flag set, as HTTP clients do
    ChatModel model = prompt -> {
      long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(300);
      boolean interrupted = false;
      while (System.nanoTime() < deadline) {
        try {
          Thread.sleep(10);
        }
        catch (InterruptedException e) {
          interrupted = true;
        }
      }
      if (interrupted) {
        Thread.currentThread().interrupt();
      }
      return new ChatResponse(List.of(new Generation(new AssistantMessage("{\"category\":\"Theft\"}"))));
    };
    InMemoryLlmAnswerStore store = new InMemoryLlmAnswerStore(Duration.ofMinutes(1));
    InterruptSensitiveLock lock = new InterruptSensitiveLock();
    LlmTaskDelegate delegate = new LlmTaskDelegate(new ChatModelRegistry(() -> List.of(model), null),
        new LlmPromptResolver(), new LlmAnswerParser(), new LlmFailureClassifier(), Duration.ofMillis(100), store, lock) {
      @Override
      protected String currentJobId() {
        return "job-1";
      }
    };
    ExecutionEntity execution = executionOf(new LlmTaskConfiguration(null, null, "Classify", List.of(),
        List.of(new LlmOutputField("category", STRING))));

    assertThatThrownBy(() -> delegate.execute(execution)).isInstanceOf(LlmTransientException.class);

    // Like Redis clients, the lock refuses to release on an interrupted thread
    assertThat(lock.released.await(3, TimeUnit.SECONDS)).isTrue();
    assertThat(lock.releasedWhileInterrupted).isFalse();
  }

  private static ExecutionEntity executionOf(LlmTaskConfiguration configuration) {
    ActivityImpl activity = new ProcessDefinitionImpl("llmTaskProcess").createActivity("Task_Llm");
    activity.getProperties().set(LlmTaskConfiguration.KEY, configuration);
    ExecutionEntity execution = mock(ExecutionEntity.class);
    when(execution.getActivity()).thenReturn(activity);
    return execution;
  }

  static class InterruptSensitiveLock implements LlmCallLock {

    final CountDownLatch released = new CountDownLatch(1);
    volatile boolean releasedWhileInterrupted;

    @Override
    public Lease tryAcquire(String key, Duration wait, Duration callTimeout) {
      return () -> {
        if (Thread.currentThread().isInterrupted()) {
          releasedWhileInterrupted = true;
          throw new IllegalStateException("Redis command interrupted");
        }
        released.countDown();
      };
    }
  }

}
