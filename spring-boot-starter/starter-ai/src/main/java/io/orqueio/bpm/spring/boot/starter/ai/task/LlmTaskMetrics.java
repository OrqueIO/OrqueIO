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

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import io.micrometer.core.instrument.Tags;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.engine.impl.persistence.entity.ExecutionEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.metadata.EmptyUsage;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;

/**
 * Metrics of LLM tasks, tagged with the process, so their cost can be attributed.
 * <ul>
 *   <li>{@value #OBSERVATION}: an observation around each execution of a task. With
 *   Micrometer's meter handler, as Spring Boot's Actuator sets up, it is also a timer of
 *   the same name: executions and their duration, by {@value #OUTCOME} and by {@value #REUSED}
 *   answer. The model call runs inside it, so Spring AI's chat observations are its children.</li>
 *   <li>{@value #TOKENS}: the input and output tokens the provider reports, by {@value #TOKEN_TYPE}
 *   (Spring AI's prompt and completion tokens; a provider's own extra counts, such as cached
 *   input, are not split out). They are
 *   counted as soon as the model answers, outside the engine's transaction: tokens of an
 *   attempt that fails afterwards, or of a call abandoned after its timeout, are counted too.
 *   A reused answer cost nothing and counts no tokens.</li>
 * </ul>
 * Every metric carries {@value #PROCESS_DEFINITION_KEY}, {@value #ACTIVITY_ID},
 * {@value #TENANT_ID}, {@value #PROVIDER} and {@value #MODEL} (the requested model). Tags
 * never hold a process instance id, a business key or content, so their values stay bounded.
 */
public class LlmTaskMetrics {

  public static final String OBSERVATION = "orqueio.llm.task";
  public static final String TOKENS = "orqueio.llm.task.tokens";

  public static final String PROCESS_DEFINITION_KEY = "process.definition.key";
  public static final String ACTIVITY_ID = "activity.id";
  public static final String TENANT_ID = "tenant.id";
  public static final String PROVIDER = "provider";
  public static final String MODEL = "model";
  public static final String OUTCOME = "outcome";
  public static final String REUSED = "reused";
  public static final String TOKEN_TYPE = "token.type";

  static final String UNKNOWN = "unknown";
  static final String NONE = "none";

  private static final Logger LOG = LoggerFactory.getLogger(LlmTaskMetrics.class);

  public enum Outcome {
    /** The answer was valid and its values were written. */
    VALID("valid"),
    /** The answer did not match the declared outputs: an incident, or the task's BPMN error. */
    INVALID_ANSWER("invalid_answer"),
    /** A failure the job retries, such as a timeout or an unavailable provider. */
    RETRYABLE_ERROR("retryable_error"),
    /** A failure the job does not retry. */
    ERROR("error");

    private final String tag;

    Outcome(String tag) {
      this.tag = tag;
    }

    public String getTag() {
      return tag;
    }
  }

  private final MeterRegistry meterRegistry;
  private final ObservationRegistry observationRegistry;

  /**
   * @param meterRegistry where tokens are counted, or {@code null} to count none
   * @param observationRegistry where executions are observed, or {@code null} to observe none
   */
  public LlmTaskMetrics(MeterRegistry meterRegistry, ObservationRegistry observationRegistry) {
    this.meterRegistry = meterRegistry;
    this.observationRegistry = observationRegistry != null ? observationRegistry : ObservationRegistry.NOOP;
  }

  /**
   * Starts observing an execution of the task. Call {@link Execution#end} when it ends.
   */
  public Execution start(DelegateExecution execution, String provider, String model) {
    Tags tags = Tags.of(
        PROCESS_DEFINITION_KEY, processDefinitionKeyOf(execution),
        ACTIVITY_ID, valueOr(execution.getCurrentActivityId(), UNKNOWN),
        TENANT_ID, valueOr(execution.getTenantId(), NONE),
        PROVIDER, valueOr(provider, UNKNOWN),
        MODEL, valueOr(model, UNKNOWN));
    Observation observation = Observation.createNotStarted(OBSERVATION, observationRegistry);
    for (Tag tag : tags) {
      observation.lowCardinalityKeyValue(tag.getKey(), tag.getValue());
    }
    return new Execution(tags, observation.start());
  }

  /**
   * @return the observation current on this thread, to carry it to the thread of the model call, or {@code null}
   */
  public Observation currentObservation() {
    return observationRegistry.getCurrentObservation();
  }

  protected String processDefinitionKeyOf(DelegateExecution execution) {
    if (execution instanceof ExecutionEntity entity && entity.getProcessDefinition() != null
        && entity.getProcessDefinition().getKey() != null) {
      return entity.getProcessDefinition().getKey();
    }
    // A process definition id starts with its key: key:version:id
    String id = execution.getProcessDefinitionId();
    if (id == null || id.isBlank()) {
      return UNKNOWN;
    }
    int colon = id.indexOf(':');
    return colon > 0 ? id.substring(0, colon) : id;
  }

  private static String valueOr(String value, String fallback) {
    return value != null && !value.isBlank() ? value : fallback;
  }

  /**
   * One execution of a task. Its token count may be called from the thread of the model call.
   */
  public class Execution {

    private final Tags tags;
    private final Observation observation;
    private volatile boolean reused;

    Execution(Tags tags, Observation observation) {
      this.tags = tags;
      this.observation = observation;
    }

    public Observation.Scope openScope() {
      return observation.openScope();
    }

    public void reused(boolean reused) {
      this.reused = reused;
    }

    /**
     * Counts the tokens of an answer. Never fails: metrics must not fail the task.
     */
    public void countTokens(ChatResponse response) {
      if (meterRegistry == null || response == null || response.getMetadata() == null) {
        return;
      }
      Usage usage = response.getMetadata().getUsage();
      // Spring AI fills a missing usage with EmptyUsage: unknown, not zero
      if (usage == null || usage instanceof EmptyUsage) {
        return;
      }
      try {
        increment("input", usage.getPromptTokens());
        increment("output", usage.getCompletionTokens());
      }
      catch (RuntimeException e) {
        LOG.debug("Could not count the tokens of an LLM task", e);
      }
    }

    private void increment(String type, Integer tokens) {
      if (tokens != null && tokens > 0) {
        Counter.builder(TOKENS)
            .description("Tokens used by LLM tasks, as reported by the provider")
            .baseUnit("tokens")
            .tags(tags)
            .tag(TOKEN_TYPE, type)
            .register(meterRegistry)
            .increment(tokens);
      }
    }

    /**
     * Ends the execution's observation. Never fails: metrics must not fail the task.
     *
     * @param error the failure, or {@code null}
     */
    public void end(Outcome outcome, Throwable error) {
      try {
        observation.lowCardinalityKeyValue(OUTCOME, outcome.getTag());
        observation.lowCardinalityKeyValue(REUSED, String.valueOf(reused));
        if (error != null) {
          observation.error(error);
        }
        observation.stop();
      }
      catch (RuntimeException e) {
        LOG.debug("Could not end the observation of an LLM task", e);
      }
    }
  }

}
