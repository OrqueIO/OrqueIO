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
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import tools.jackson.databind.json.JsonMapper;

/**
 * Records what each execution of an LLM task used and cost, so a decision can be
 * explained afterwards: a JSON process variable named {@value #VARIABLE_PREFIX} followed
 * by the task's id. It is visible in Cockpit, kept in the engine history (every
 * execution with history level {@code full}) and removed with the instance.
 * <p>
 * The prompt and the answer, which may contain personal data, are recorded only when
 * {@code includeContent} is set.
 */
public class LlmTaskAuditor {

  public static final String VARIABLE_PREFIX = "orqueioLlm_";

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
    audit.put("provider", providerOf(configuration, chatModel));
    audit.put("model", modelOf(chatModel, prompt, answer));
    audit.put("promptVersion", sha256(configuration.getPrompt()));
    Usage usage = usageOf(answer);
    // A reused answer cost nothing; a provider that reports no usage leaves the counts unknown
    audit.put("inputTokens", answer.fromCache() ? Integer.valueOf(0) : usage != null ? usage.getPromptTokens() : null);
    audit.put("outputTokens", answer.fromCache() ? Integer.valueOf(0) : usage != null ? usage.getCompletionTokens() : null);
    audit.put("latencyMs", latency.toMillis());
    audit.put("fromCache", answer.fromCache());
    audit.put("outcome", outcome.name());
    audit.put("timestamp", clock.instant().toString());
    if (includeContent) {
      audit.put("prompt", userPrompt);
      audit.put("answer", answer.text());
    }
    execution.setVariable(variableName(execution.getCurrentActivityId()), jsonMapper.writeValueAsString(audit));
  }

  protected String providerOf(LlmTaskConfiguration configuration, ChatModel chatModel) {
    return configuration.getProvider() != null ? configuration.getProvider() : chatModelRegistry.providerIdOf(chatModel);
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

  protected Usage usageOf(LlmModelAnswer answer) {
    return answer.response() != null && answer.response().getMetadata() != null
        ? answer.response().getMetadata().getUsage()
        : null;
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
