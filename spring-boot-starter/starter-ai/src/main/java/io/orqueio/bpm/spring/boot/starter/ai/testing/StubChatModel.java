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
package io.orqueio.bpm.spring.boot.starter.ai.testing;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;

import io.orqueio.bpm.spring.boot.starter.ai.provider.LlmProvider;
import io.orqueio.bpm.spring.boot.starter.ai.provider.LlmProviderStandIn;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskException;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.retry.TransientAiException;

/**
 * A model that answers LLM tasks with fixed answers, for process tests that run without
 * a network, an API key or cost, and always give the same result.
 *
 * <p>Register it as a bean in the test configuration. It stands in for every provider, so the
 * BPMN does not change, and it is chosen over the provider models the application configures,
 * so the provider's Spring AI starter can stay on the test classpath:
 * <pre>{@code
 * @Bean
 * StubChatModel stubChatModel() {
 *   return new StubChatModel()
 *       .when("Extract the facts").answer("{\"claimAmount\": 2400, \"incidentType\": \"Theft\"}")
 *       .when("Classify the email").answer("{\"category\": \"complaint\"}");
 * }
 * }</pre>
 *
 * <p>An LLM task is recognised by a phrase of its prompt: the model does not know which task
 * calls it. A call that no rule matches gets the default answer, set with {@link #answer}.
 * Several answers are given in turn, the last one repeated; {@link #fail} gives a provider
 * error, such as {@link #providerError(int) HTTP 429}, to test the failure paths.
 * The prompts received are kept for assertions, see {@link #prompts()}. A call it has no
 * answer for fails the task at once, with the beginning of the prompt in the job's message.
 */
public class StubChatModel implements ChatModel, LlmProviderStandIn {

  /** The model name the stub reports when the task names none, unless {@link #reportModel} sets one. */
  public static final String DEFAULT_MODEL = "stub-model";

  /** The provider id recorded for calls of tasks that name no provider. */
  public static final String PROVIDER_ID = "stub";

  private final List<Rule> rules = new ArrayList<>();
  private final Deque<Reply> defaultReplies = new ArrayDeque<>();
  private final List<Prompt> prompts = new ArrayList<>();
  private final Set<LlmProvider> providers = EnumSet.allOf(LlmProvider.class);
  private String model;
  private Integer inputTokens;
  private Integer outputTokens;
  private Consumer<Prompt> onCall = prompt -> { };

  // configuration //////////

  /**
   * Answers every call no rule matches with these answers, in turn; the last one is repeated.
   */
  public synchronized StubChatModel answer(String... answers) {
    requireSome(answers);
    defaultReplies.clear();
    Arrays.stream(answers).map(Reply::answer).forEach(defaultReplies::add);
    return this;
  }

  /**
   * Fails every call no rule matches, as a provider would.
   */
  public synchronized StubChatModel fail(RuntimeException failure) {
    defaultReplies.clear();
    defaultReplies.add(Reply.failure(failure));
    return this;
  }

  /**
   * Responds to the calls no rule matches with these answers and failures, in turn; the last
   * one is repeated. For example a provider error, then a valid answer, to test a retry.
   *
   * @param answersOrFailures answers ({@link String}) and failures ({@link RuntimeException})
   */
  public synchronized StubChatModel respond(Object... answersOrFailures) {
    requireSome(answersOrFailures);
    defaultReplies.clear();
    defaultReplies.addAll(Reply.of(answersOrFailures));
    return this;
  }

  /**
   * Starts a rule for the calls whose prompt contains this phrase: the instructions or the
   * data sent. The first matching rule answers.
   */
  public synchronized Rule when(String promptContains) {
    Rule rule = new Rule(Objects.requireNonNull(promptContains, "promptContains"));
    rules.add(rule);
    return rule;
  }

  /**
   * Reports these token counts with each answer, as a provider reports usage.
   */
  public synchronized StubChatModel reportUsage(int inputTokens, int outputTokens) {
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
    return this;
  }

  /**
   * Reports this model name with each answer, and offers it as the default model. Without it,
   * the stub reports the model the task asks for, as a provider does, else {@link #DEFAULT_MODEL}.
   */
  public synchronized StubChatModel reportModel(String model) {
    this.model = Objects.requireNonNull(model, "model");
    return this;
  }

  /**
   * Stands in only for these providers: a task that names another one does not find a model.
   */
  public synchronized StubChatModel standingFor(LlmProvider... providers) {
    this.providers.clear();
    this.providers.addAll(Arrays.asList(providers));
    return this;
  }

  /**
   * Runs this action on each call, before it answers or fails: to wait like a slow provider,
   * or to look at the context of the call. The answer was chosen when the call started.
   */
  public synchronized StubChatModel onCall(Consumer<Prompt> action) {
    this.onCall = Objects.requireNonNull(action, "action");
    return this;
  }

  /**
   * Puts the stub back as new: forgets the prompts received, the answers and rules, the
   * usage, model and providers it reports, and the action on each call.
   */
  public synchronized StubChatModel reset() {
    rules.clear();
    defaultReplies.clear();
    prompts.clear();
    providers.addAll(EnumSet.allOf(LlmProvider.class));
    model = null;
    inputTokens = null;
    outputTokens = null;
    onCall = prompt -> { };
    return this;
  }

  /**
   * @return an error the LLM task classifies as a provider answer with this HTTP status:
   *         429 and 5xx are retried, other 4xx fail the task at once
   */
  public static RuntimeException providerError(int httpStatus) {
    return new TransientAiException(httpStatus + " - stub provider error");
  }

  // what was received //////////

  /**
   * @return the prompts received, in order
   */
  public synchronized List<Prompt> prompts() {
    return List.copyOf(prompts);
  }

  /**
   * @return how many calls were received
   */
  public synchronized int calls() {
    return prompts.size();
  }

  /**
   * @return the text of the last prompt received: the instructions and the data sent
   */
  public synchronized String lastPromptText() {
    if (prompts.isEmpty()) {
      throw new IllegalStateException("The stub model received no call");
    }
    return prompts.get(prompts.size() - 1).getContents();
  }

  // ChatModel //////////

  @Override
  public ChatResponse call(Prompt prompt) {
    // The answer is chosen when the call starts: a slow call keeps it, as a provider would,
    // even if the test prepares other answers meanwhile
    Reply reply;
    Consumer<Prompt> action;
    ChatResponseMetadata metadata;
    synchronized (this) {
      prompts.add(prompt);
      reply = replyFor(prompt.getContents());
      action = onCall;
      ChatResponseMetadata.Builder builder = ChatResponseMetadata.builder().model(reportedModel(prompt));
      if (inputTokens != null) {
        builder.usage(new DefaultUsage(inputTokens, outputTokens));
      }
      metadata = builder.build();
    }
    action.accept(prompt);
    return new ChatResponse(List.of(new Generation(new AssistantMessage(reply.answerOrThrow()))), metadata);
  }

  @Override
  public synchronized ChatOptions getOptions() {
    return ChatOptions.builder().model(model != null ? model : DEFAULT_MODEL).build();
  }

  // LlmProviderStandIn //////////

  @Override
  public synchronized boolean standsFor(LlmProvider provider) {
    return providers.contains(provider);
  }

  @Override
  public String providerId() {
    return PROVIDER_ID;
  }

  // internals //////////

  private String reportedModel(Prompt prompt) {
    if (model != null) {
      return model;
    }
    String requested = prompt.getOptions() != null ? prompt.getOptions().getModel() : null;
    return requested != null ? requested : DEFAULT_MODEL;
  }

  private static void requireSome(Object[] responses) {
    if (responses == null || responses.length == 0) {
      throw new IllegalArgumentException("Give at least one answer");
    }
  }

  private Reply replyFor(String promptText) {
    for (Rule rule : rules) {
      if (promptText.contains(rule.promptContains) && !rule.replies.isEmpty()) {
        return next(rule.replies);
      }
    }
    if (defaultReplies.isEmpty()) {
      // Not retried, and its message is kept in the job, unlike a provider failure
      String start = promptText.length() > 200 ? promptText.substring(0, 200) + "..." : promptText;
      throw new LlmTaskException("The stub model has no answer for this prompt; give one with answer(...) "
          + "or when(\"a phrase of the prompt\").answer(...): " + start);
    }
    return next(defaultReplies);
  }

  // The last reply stays, so it answers every later call
  private static Reply next(Deque<Reply> replies) {
    return replies.size() > 1 ? replies.poll() : replies.peek();
  }

  private record Reply(String answer, RuntimeException failure) {

    static Reply answer(String answer) {
      return new Reply(Objects.requireNonNull(answer, "answer"), null);
    }

    static Reply failure(RuntimeException failure) {
      return new Reply(null, Objects.requireNonNull(failure, "failure"));
    }

    static List<Reply> of(Object... answersOrFailures) {
      List<Reply> replies = new ArrayList<>();
      for (Object item : answersOrFailures) {
        if (item instanceof String answer) {
          replies.add(answer(answer));
        }
        else if (item instanceof RuntimeException failure) {
          replies.add(failure(failure));
        }
        else {
          throw new IllegalArgumentException("Expected an answer (String) or a failure (RuntimeException): " + item);
        }
      }
      return replies;
    }

    String answerOrThrow() {
      if (failure != null) {
        throw failure;
      }
      return answer;
    }
  }

  /**
   * The answers to the calls whose prompt contains a phrase.
   */
  public final class Rule {

    private final String promptContains;
    private final Deque<Reply> replies = new ArrayDeque<>();

    private Rule(String promptContains) {
      this.promptContains = promptContains;
    }

    /**
     * Answers these calls with these answers, in turn; the last one is repeated.
     */
    public StubChatModel answer(String... answers) {
      requireSome(answers);
      synchronized (StubChatModel.this) {
        replies.clear();
        Arrays.stream(answers).map(Reply::answer).forEach(replies::add);
      }
      return StubChatModel.this;
    }

    /**
     * Fails these calls, as a provider would.
     */
    public StubChatModel fail(RuntimeException failure) {
      synchronized (StubChatModel.this) {
        replies.clear();
        replies.add(Reply.failure(failure));
      }
      return StubChatModel.this;
    }

    /**
     * Responds to these calls with these answers and failures, in turn; the last one is repeated.
     *
     * @param answersOrFailures answers ({@link String}) and failures ({@link RuntimeException})
     */
    public StubChatModel respond(Object... answersOrFailures) {
      requireSome(answersOrFailures);
      List<Reply> responses = Reply.of(answersOrFailures);
      synchronized (StubChatModel.this) {
        replies.clear();
        replies.addAll(responses);
      }
      return StubChatModel.this;
    }
  }

}
