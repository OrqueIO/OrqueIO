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

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.slf4j.MDC;

import io.orqueio.bpm.engine.delegate.BpmnError;
import io.orqueio.bpm.engine.impl.bpmn.helper.ErrorDeclarationForProcessInstanceFinder;
import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.pvm.delegate.ActivityExecution;
import io.orqueio.bpm.engine.impl.tree.ActivityExecutionHierarchyWalker;

import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.engine.delegate.JavaDelegate;
import io.orqueio.bpm.engine.impl.persistence.entity.ExecutionEntity;
import io.orqueio.bpm.engine.impl.pvm.process.ActivityImpl;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmAnswerStore;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmCallKey;
import io.orqueio.bpm.spring.boot.starter.ai.cache.LlmCallLock;
import io.orqueio.bpm.spring.boot.starter.ai.provider.ChatModelRegistry;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;

/**
 * Runs an LLM task: resolves its prompt, calls the configured model and writes the
 * declared output fields as process variables. Referenced from BPMN as
 * {@value LlmTaskConfiguration#DELEGATE_EXPRESSION}.
 * <p>
 * Failures are thrown as {@link LlmTaskException}s that tell whether a retry may help;
 * see {@link LlmFailedJobCommandFactory}. An invalid answer becomes a BPMN error when
 * the task declares {@value LlmTaskConfiguration#ERROR_CODE_PROPERTY}.
 * <p>
 * With an answer store, a valid answer is kept, so a retried job reuses it instead of
 * paying for another call; the call lock makes a retry wait for a call of the same
 * request that is still running, for example one abandoned after its timeout. Answer
 * reuse saves calls but never fails the task: when the store or the lock is not
 * available, the model is called as without them.
 */
public class LlmTaskDelegate implements JavaDelegate {

  public static final String BEAN_NAME = "orqueioLlmTask";

  private final ChatModelRegistry chatModelRegistry;
  private final LlmPromptResolver promptResolver;
  private final LlmAnswerParser answerParser;
  private final LlmFailureClassifier failureClassifier;
  private final Duration defaultTimeout;
  private final LlmAnswerStore answerStore;
  private final LlmCallLock callLock;
  private final LlmTaskAuditor auditor;

  public LlmTaskDelegate(ChatModelRegistry chatModelRegistry, LlmPromptResolver promptResolver,
                         LlmAnswerParser answerParser, LlmFailureClassifier failureClassifier,
                         Duration defaultTimeout) {
    this(chatModelRegistry, promptResolver, answerParser, failureClassifier, defaultTimeout, null, null);
  }

  /**
   * @param answerStore keeps valid answers for retries, or {@code null} to always call the model
   * @param callLock runs one call at a time per request, or {@code null}; used only with an answer store,
   *                 and only for tasks run by a job, whose id scopes the stored answer to its retries
   */
  public LlmTaskDelegate(ChatModelRegistry chatModelRegistry, LlmPromptResolver promptResolver,
                         LlmAnswerParser answerParser, LlmFailureClassifier failureClassifier,
                         Duration defaultTimeout, LlmAnswerStore answerStore, LlmCallLock callLock) {
    this(chatModelRegistry, promptResolver, answerParser, failureClassifier, defaultTimeout, answerStore, callLock, null);
  }

  /**
   * @param auditor records each execution in a process variable, or {@code null} to record nothing
   */
  public LlmTaskDelegate(ChatModelRegistry chatModelRegistry, LlmPromptResolver promptResolver,
                         LlmAnswerParser answerParser, LlmFailureClassifier failureClassifier,
                         Duration defaultTimeout, LlmAnswerStore answerStore, LlmCallLock callLock,
                         LlmTaskAuditor auditor) {
    this.chatModelRegistry = chatModelRegistry;
    this.promptResolver = promptResolver;
    this.answerParser = answerParser;
    this.failureClassifier = failureClassifier;
    this.defaultTimeout = defaultTimeout;
    this.answerStore = answerStore;
    this.callLock = callLock;
    this.auditor = auditor;
  }

  @Override
  public void execute(DelegateExecution execution) {
    LlmTaskConfiguration configuration = configurationOf(execution);

    LlmPrompt llmPrompt = promptResolver.build(configuration, execution);
    String data = llmPrompt.data();
    ChatModel chatModel = chatModelOf(configuration);

    // One system message, first, then the process data alone: every provider accepts this order
    List<Message> messages = List.of(
        new SystemMessage(llmPrompt.instructions() + "\n\n" + answerParser.formatInstructions(configuration.getOutputs())
            + "\n\n" + LlmPromptResolver.DATA_REMINDER),
        new UserMessage(llmPrompt.dataMessage()));
    ChatOptions options = optionsOf(chatModel, configuration);
    Prompt prompt = options == null ? new Prompt(messages) : new Prompt(messages, options);

    Duration timeout = configuration.getTimeout() != null ? configuration.getTimeout() : defaultTimeout;
    long start = System.nanoTime();
    LlmModelAnswer answer = answerStore != null
        ? reusableAnswer(execution, configuration, chatModel, prompt, timeout)
        : run(() -> {
            ChatResponse response = chatModel.call(prompt);
            return LlmModelAnswer.called(textOf(response), response);
          }, timeout);
    Duration latency = Duration.ofNanos(System.nanoTime() - start);

    // Every field is validated before any variable is written
    Map<String, Object> values;
    try {
      values = answerParser.parse(answer.text(), configuration.getOutputs());
    }
    catch (LlmInvalidAnswerException e) {
      // An uncaught BPMN error would end the execution silently: raise an incident instead
      if (configuration.getErrorCode() == null || !hasErrorHandler(execution, configuration.getErrorCode())) {
        throw e;
      }
      audit(execution, configuration, chatModel, prompt, data, answer, latency, LlmTaskAuditor.Outcome.BPMN_ERROR);
      throw new BpmnError(configuration.getErrorCode(), e.getMessage());
    }
    values.forEach(execution::setVariable);
    audit(execution, configuration, chatModel, prompt, data, answer, latency, LlmTaskAuditor.Outcome.VALID);
  }

  /**
   * Records the execution. A failure that rolls the job back also rolls back its record:
   * only executions that complete, or end in a BPMN error, are recorded.
   */
  protected void audit(DelegateExecution execution, LlmTaskConfiguration configuration, ChatModel chatModel,
                       Prompt prompt, String userPrompt, LlmModelAnswer answer, Duration latency,
                       LlmTaskAuditor.Outcome outcome) {
    if (auditor != null) {
      auditor.record(execution, configuration, chatModel, prompt, userPrompt, answer, latency, outcome);
    }
  }

  /**
   * @return {@code true} if an error event in an enclosing scope, or in a calling process, catches the error code
   */
  protected boolean hasErrorHandler(DelegateExecution execution, String errorCode) {
    if (!(execution instanceof ActivityExecution activityExecution)) {
      return true;
    }
    ErrorDeclarationForProcessInstanceFinder finder =
        new ErrorDeclarationForProcessInstanceFinder(null, errorCode, activityExecution.getActivity());
    ActivityExecutionHierarchyWalker walker = new ActivityExecutionHierarchyWalker(activityExecution);
    walker.addScopePreVisitor(finder);
    walker.walkUntil(element -> finder.getErrorEventDefinition() != null || element == null);
    return finder.getErrorHandlerActivity() != null;
  }

  // A provider that is not configured on this node will not appear by itself: no retry
  protected ChatModel chatModelOf(LlmTaskConfiguration configuration) {
    try {
      return chatModelRegistry.getChatModel(configuration.getProvider());
    }
    catch (RuntimeException e) {
      throw new LlmTaskException(e.getMessage(), e);
    }
  }

  protected ChatOptions optionsOf(ChatModel chatModel, LlmTaskConfiguration configuration) {
    try {
      return optionsFor(chatModel, configuration.getModel());
    }
    catch (RuntimeException e) {
      throw new LlmTaskException("Cannot set model '" + configuration.getModel() + "' on the provider's options", e);
    }
  }

  /**
   * Returns the stored answer for the request, or calls the model once. The lock is
   * held by the call itself and released when it ends: a retry of a job whose call
   * timed out waits for that call and reuses its answer, rather than paying again.
   */
  protected LlmModelAnswer reusableAnswer(DelegateExecution execution, LlmTaskConfiguration configuration,
                                          ChatModel chatModel, Prompt prompt, Duration timeout) {
    String jobId = currentJobId();
    if (jobId == null) {
      return run(() -> {
        ChatResponse response = chatModel.call(prompt);
        return LlmModelAnswer.called(textOf(response), response);
      }, timeout);
    }
    String key = LlmCallKey.of(jobId, chatModel, prompt);
    String stored = storedAnswer(key);
    if (stored != null) {
      return LlmModelAnswer.reused(stored);
    }

    // The timeout is the task's whole budget: waiting for the lock uses part of it
    long deadline = System.nanoTime() + timeout.toNanos();
    LlmCallLock.Lease lease = acquire(key, timeout);
    try {
      stored = storedAnswer(key);
    }
    catch (RuntimeException | Error e) {
      release(lease);
      throw e;
    }
    if (stored != null) {
      release(lease);
      return LlmModelAnswer.reused(stored);
    }
    Duration remaining = Duration.ofNanos(deadline - System.nanoTime());
    if (remaining.toMillis() < 1) {
      release(lease);
      throw new LlmTransientException("The model did not answer within " + timeout);
    }
    return run(() -> {
      try {
        ChatResponse response = chatModel.call(prompt);
        String answer = textOf(response);
        // A timeout interrupts this thread; the store and the lock must still be reached
        Thread.interrupted();
        storeIfValid(key, answer, configuration);
        return LlmModelAnswer.called(answer, response);
      }
      finally {
        release(lease);
      }
    }, remaining, timeout, lease);
  }

  /**
   * @return the id of the job running the task, which stays the same across its retries, or {@code null}
   */
  protected String currentJobId() {
    CommandContext commandContext = Context.getCommandContext();
    return commandContext != null && commandContext.getCurrentJob() != null
        ? commandContext.getCurrentJob().getId()
        : null;
  }

  // An unavailable store is a miss: reuse saves calls, it must not fail the task
  protected String storedAnswer(String key) {
    try {
      return answerStore.get(key);
    }
    catch (RuntimeException e) {
      return null;
    }
  }

  /**
   * @return the lease, or {@code null} if there is no lock or it is not available
   * @throws LlmTransientException if a call of the same request still runs after {@code timeout}
   */
  protected LlmCallLock.Lease acquire(String key, Duration timeout) {
    if (callLock == null) {
      return null;
    }
    LlmCallLock.Lease lease;
    try {
      lease = callLock.tryAcquire(key, timeout, timeout);
    }
    catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new LlmTransientException("Interrupted while waiting for a call of the same request");
    }
    catch (RuntimeException e) {
      // Calling without the lock risks a second call; failing the task would block it
      return null;
    }
    if (lease == null) {
      throw new LlmTransientException("A call of the same request is still running after " + timeout);
    }
    return lease;
  }

  /**
   * Releases on a thread whose interrupt flag is clear: Redis clients refuse to run a
   * command on an interrupted thread, and a lease that is not released blocks the
   * request until it expires.
   */
  protected void release(LlmCallLock.Lease lease) {
    if (lease == null) {
      return;
    }
    boolean interrupted = Thread.interrupted();
    try {
      lease.release();
    }
    catch (RuntimeException e) {
      // The lease expires by itself
    }
    finally {
      if (interrupted) {
        Thread.currentThread().interrupt();
      }
    }
  }

  /**
   * Keeps only the declared fields of a valid answer: anything else the model wrote is
   * dropped, which bounds the size of what is stored and keeps no more data than needed.
   * An invalid answer is not kept, so the next attempt gets a fresh call.
   */
  protected void storeIfValid(String key, String answer, LlmTaskConfiguration configuration) {
    String declaredFields;
    try {
      declaredFields = answerParser.declaredFields(answer, configuration.getOutputs());
    }
    catch (LlmInvalidAnswerException e) {
      return;
    }
    try {
      answerStore.put(key, declaredFields);
    }
    catch (RuntimeException e) {
      // The answer is still used; only its reuse on a retry is lost
    }
  }

  protected <T> T run(Callable<T> work, Duration timeout) {
    return run(work, timeout, timeout, null);
  }

  /**
   * Runs the model call on its own thread, so the job stops waiting when the timeout
   * elapses even if the provider's client does not. That thread runs outside the
   * engine's command and transaction; only the logging context is carried over.
   * A call that times out is interrupted, but a client that ignores interrupts keeps
   * running until its own timeout.
   *
   * @param wait how long to wait for the call: the task's timeout, less any time spent waiting for the lock
   * @param timeout the task's timeout, as reported when the call takes too long
   * @param lease released here only if the thread cannot be started; the work releases it otherwise
   */
  protected <T> T run(Callable<T> work, Duration wait, Duration timeout, LlmCallLock.Lease lease) {
    Map<String, String> loggingContext = MDC.getCopyOfContextMap();
    FutureTask<T> call = new FutureTask<>(() -> {
      if (loggingContext != null) {
        MDC.setContextMap(loggingContext);
      }
      return work.call();
    });
    try {
      Thread.ofVirtual().name("orqueio-llm-call").start(call);
    }
    catch (RuntimeException | Error e) {
      release(lease);
      throw e;
    }
    try {
      return call.get(wait.toMillis(), TimeUnit.MILLISECONDS);
    }
    catch (TimeoutException e) {
      call.cancel(true);
      throw new LlmTransientException("The model did not answer within " + timeout, e);
    }
    catch (InterruptedException e) {
      call.cancel(true);
      Thread.currentThread().interrupt();
      throw new LlmTransientException("Interrupted while waiting for the model", e);
    }
    catch (ExecutionException e) {
      throw failureClassifier.classify(e.getCause());
    }
  }

  /**
   * Spring AI 2.0 providers neither merge nor convert the options of a prompt: they
   * cast them to their own options class. The task's model is therefore set on a copy
   * of the provider's configured options, which keeps its class and its other settings.
   *
   * @return the options to send, or {@code null} to use the provider's configuration as is
   */
  protected ChatOptions optionsFor(ChatModel chatModel, String model) {
    if (model == null) {
      return null;
    }
    ChatOptions defaults = chatModel.getOptions();
    return defaults != null
        ? defaults.mutate().model(model).build()
        : ChatOptions.builder().model(model).build();
  }

  protected LlmTaskConfiguration configurationOf(DelegateExecution execution) {
    ActivityImpl activity = execution instanceof ExecutionEntity entity ? entity.getActivity() : null;
    LlmTaskConfiguration configuration = activity != null ? LlmTaskConfiguration.of(activity) : null;
    if (configuration == null) {
      throw new LlmTaskException("Activity '" + execution.getCurrentActivityId()
          + "' is not an LLM task: it has no LLM configuration");
    }
    return configuration;
  }

  protected String textOf(ChatResponse response) {
    if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
      return null;
    }
    return response.getResult().getOutput().getText();
  }

}
