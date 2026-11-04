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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import io.orqueio.bpm.engine.delegate.BpmnError;

import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.engine.delegate.JavaDelegate;
import io.orqueio.bpm.engine.impl.persistence.entity.ExecutionEntity;
import io.orqueio.bpm.engine.impl.pvm.process.ActivityImpl;
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
 */
public class LlmTaskDelegate implements JavaDelegate {

  public static final String BEAN_NAME = "orqueioLlmTask";

  private final ChatModelRegistry chatModelRegistry;
  private final LlmPromptResolver promptResolver;
  private final LlmAnswerParser answerParser;
  private final LlmFailureClassifier failureClassifier;
  private final Duration defaultTimeout;

  public LlmTaskDelegate(ChatModelRegistry chatModelRegistry, LlmPromptResolver promptResolver,
                         LlmAnswerParser answerParser, LlmFailureClassifier failureClassifier,
                         Duration defaultTimeout) {
    this.chatModelRegistry = chatModelRegistry;
    this.promptResolver = promptResolver;
    this.answerParser = answerParser;
    this.failureClassifier = failureClassifier;
    this.defaultTimeout = defaultTimeout;
  }

  @Override
  public void execute(DelegateExecution execution) {
    LlmTaskConfiguration configuration = configurationOf(execution);

    String userPrompt = promptResolver.resolve(configuration, execution);
    ChatModel chatModel = chatModelRegistry.getChatModel(configuration.getProvider());

    // The answer format goes in the system message, the resolved prompt in the user message
    List<Message> messages = List.of(
        new SystemMessage(answerParser.formatInstructions(configuration.getOutputs())),
        new UserMessage(userPrompt));
    ChatOptions options = optionsFor(chatModel, configuration.getModel());
    Prompt prompt = options == null ? new Prompt(messages) : new Prompt(messages, options);

    Duration timeout = configuration.getTimeout() != null ? configuration.getTimeout() : defaultTimeout;
    ChatResponse response = call(chatModel, prompt, timeout);

    // Every field is validated before any variable is written
    Map<String, Object> values;
    try {
      values = answerParser.parse(textOf(response), configuration.getOutputs());
    }
    catch (LlmInvalidAnswerException e) {
      if (configuration.getErrorCode() == null) {
        throw e;
      }
      throw new BpmnError(configuration.getErrorCode(), e.getMessage());
    }
    values.forEach(execution::setVariable);
  }

  /**
   * Calls the model on its own thread, so the job stops waiting when the timeout
   * elapses even if the provider's client does not.
   */
  protected ChatResponse call(ChatModel chatModel, Prompt prompt, Duration timeout) {
    FutureTask<ChatResponse> call = new FutureTask<>(() -> chatModel.call(prompt));
    Thread.ofVirtual().name("orqueio-llm-call").start(call);
    try {
      return call.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
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
