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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.spring.boot.starter.ai.provider.ChatModelRegistry;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.EmptyUsage;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import tools.jackson.databind.json.JsonMapper;

/**
 * Records what each execution of an LLM task used and cost, so a decision can be
 * explained afterwards: a JSON process variable named {@value #VARIABLE_PREFIX} followed
 * by the task's id, set on the process instance (or the called instance in a call
 * activity). It is visible in Cockpit, kept in the engine history (every execution with
 * history level {@code full}) and removed with the instance.
 * <ul>
 *   <li>{@code promptVersion}: hash of the prompt template and the declared outputs, which
 *       together make the instructions the model receives</li>
 *   <li>{@code model}: the model the provider reports, else the one requested (a reused
 *       answer has no report)</li>
 *   <li>tokens: as reported by the provider, {@code null} when it reports none, 0 for a
 *       reused answer, which cost nothing</li>
 *   <li>{@code latencyMs}: how long the task waited for its answer, including any wait for
 *       a call of the same request</li>
 *   <li>{@code recordedAt}: when the record was written, once the answer was in</li>
 * </ul>
 * The data sent to the model (recorded as {@code prompt}: the instructions are identified
 * by {@code promptVersion}) and the answer, which may contain personal data, are recorded
 * only when {@code includeContent} is set. They are then shortened so the record fits in the
 * engine's string variable column on every supported database.
 */
public class LlmTaskAuditor {

  public static final String VARIABLE_PREFIX = "orqueioLlm_";

  /**
   * Longest record: the engine stores a string variable in a column of 4000 characters,
   * 2000 on Oracle; a longer value fails the job when the transaction is flushed.
   */
  public static final int MAX_RECORD_LENGTH = 2000;

  public enum Outcome {
    /** The answer was valid and its fields were written. */
    VALID,
    /** The answer was invalid and the task threw its BPMN error. */
    BPMN_ERROR
  }

  private final JsonMapper jsonMapper = JsonMapper.builder().build();
  private final ChatModelRegistry chatModelRegistry;
  private final boolean includeContent;
  private final Clock clock;

  public LlmTaskAuditor(ChatModelRegistry chatModelRegistry, boolean includeContent) {
    this(chatModelRegistry, includeContent, Clock.systemUTC());
  }

  public LlmTaskAuditor(ChatModelRegistry chatModelRegistry, boolean includeContent, Clock clock) {
    this.chatModelRegistry = chatModelRegistry;
    this.includeContent = includeContent;
    this.clock = clock;
  }

  public static String variableName(String activityId) {
    return VARIABLE_PREFIX + activityId;
  }

  public void record(DelegateExecution execution, LlmTaskConfiguration configuration, ChatModel chatModel,
                     Prompt prompt, String userPrompt, LlmModelAnswer answer, Duration latency, Outcome outcome) {
    Map<String, Object> audit = new LinkedHashMap<>();
    audit.put("provider", chatModelRegistry.providerIdOf(configuration.getProvider(), chatModel));
    audit.put("model", modelOf(chatModel, prompt, answer));
    audit.put("promptVersion", promptVersion(configuration));
    Usage usage = usageOf(answer);
    // A reused answer cost nothing; a provider that reports no usage leaves the counts unknown
    audit.put("inputTokens", answer.fromCache() ? Integer.valueOf(0) : usage != null ? usage.getPromptTokens() : null);
    audit.put("outputTokens", answer.fromCache() ? Integer.valueOf(0) : usage != null ? usage.getCompletionTokens() : null);
    audit.put("latencyMs", latency.toMillis());
    audit.put("fromCache", answer.fromCache());
    audit.put("outcome", outcome.name());
    audit.put("recordedAt", clock.instant().toString());
    String record = includeContent
        ? withContent(audit, userPrompt, answer.text())
        : jsonMapper.writeValueAsString(audit);
    execution.setVariable(variableName(execution.getCurrentActivityId()), record);
  }

  // Shortens prompt and answer until the record fits; escaping makes the JSON longer than the text
  protected String withContent(Map<String, Object> audit, String userPrompt, String answer) {
    String promptText = userPrompt != null ? userPrompt : "";
    String answerText = answer != null ? answer : "";
    int limit = Math.max(promptText.length(), answerText.length());
    while (true) {
      boolean truncated = promptText.length() > limit || answerText.length() > limit;
      Map<String, Object> content = new LinkedHashMap<>(audit);
      content.put("prompt", shorten(promptText, limit));
      content.put("answer", shorten(answerText, limit));
      if (truncated) {
        content.put("truncated", true);
      }
      String record = jsonMapper.writeValueAsString(content);
      if (record.length() <= MAX_RECORD_LENGTH || limit == 0) {
        return record;
      }
      limit = Math.max(0, Math.min(limit, Math.max(promptText.length(), answerText.length()))
          - Math.max(1, (record.length() - MAX_RECORD_LENGTH + 1) / 2));
    }
  }

  private static String shorten(String text, int limit) {
    return text.length() <= limit ? text : text.substring(0, limit);
  }

  // Library wording included: a starter upgrade that changes what the model is told changes the version
  protected String promptVersion(LlmTaskConfiguration configuration) {
    StringBuilder declared = new StringBuilder(configuration.getPrompt())
        .append('\n').append(LlmPromptResolver.DATA_RULE)
        .append('\n').append(LlmPromptResolver.DATA_REMINDER)
        .append('\n').append(LlmPrompt.DATA_LABEL);
    for (LlmOutputField output : configuration.getOutputs()) {
      // The allowed values and bounds are part of the instructions: changing them changes the version
      declared.append('\n').append(output.declaration());
    }
    return sha256(declared.toString());
  }

  // The model the provider reports having used, else the one requested
  protected String modelOf(ChatModel chatModel, Prompt prompt, LlmModelAnswer answer) {
    ChatResponseMetadata metadata = answer.response() != null ? answer.response().getMetadata() : null;
    if (metadata != null && metadata.getModel() != null && !metadata.getModel().isBlank()) {
      return metadata.getModel();
    }
    ChatOptions options = prompt.getOptions() != null ? prompt.getOptions() : chatModel.getOptions();
    return options != null ? options.getModel() : null;
  }

  // Spring AI fills a missing usage with EmptyUsage, whose counts read 0: that is unknown, not free
  protected Usage usageOf(LlmModelAnswer answer) {
    Usage usage = answer.response() != null && answer.response().getMetadata() != null
        ? answer.response().getMetadata().getUsage()
        : null;
    return usage instanceof EmptyUsage ? null : usage;
  }

  protected static String sha256(String value) {
    try {
      byte[] hash = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    }
    catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 is not available", e);
    }
  }

}
