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

import java.util.List;
import java.util.Map;

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
 */
public class LlmTaskDelegate implements JavaDelegate {

  public static final String BEAN_NAME = "orqueioLlmTask";

  private final ChatModelRegistry chatModelRegistry;
  private final LlmPromptResolver promptResolver;
  private final LlmAnswerParser answerParser;

  public LlmTaskDelegate(ChatModelRegistry chatModelRegistry, LlmPromptResolver promptResolver,
                         LlmAnswerParser answerParser) {
    this.chatModelRegistry = chatModelRegistry;
    this.promptResolver = promptResolver;
    this.answerParser = answerParser;
  }

  @Override
  public void execute(DelegateExecution execution) {
    LlmTaskConfiguration configuration = configurationOf(execution);

    String userPrompt = promptResolver.resolve(configuration, execution);
    ChatModel chatModel = chatModelRegistry.getChatModel(configuration.getProvider());

    // Instructions and process data stay in separate messages
    List<Message> messages = List.of(
        new SystemMessage(answerParser.formatInstructions(configuration.getOutputs())),
        new UserMessage(userPrompt));
    Prompt prompt = configuration.getModel() == null
        ? new Prompt(messages)
        : new Prompt(messages, ChatOptions.builder().model(configuration.getModel()).build());

    ChatResponse response = chatModel.call(prompt);

    Map<String, Object> values = answerParser.parse(textOf(response), configuration.getOutputs());
    values.forEach(execution::setVariable);
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
