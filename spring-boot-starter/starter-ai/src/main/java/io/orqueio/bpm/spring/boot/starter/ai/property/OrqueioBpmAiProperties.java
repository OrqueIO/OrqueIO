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
package io.orqueio.bpm.spring.boot.starter.ai.property;

import java.time.Duration;

import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(OrqueioBpmAiProperties.PREFIX)
public class OrqueioBpmAiProperties {

  public static final String PREFIX = OrqueioBpmProperties.PREFIX + ".ai";

  /**
   * Enable the AI integration. Default {@code true}.
   */
  private boolean enabled = true;

  /**
   * Provider used by LLM tasks that do not name one, for example {@code openai} or
   * {@code ollama}. Not needed when the application configures a single provider.
   */
  private String defaultProvider;

  /**
   * How long an LLM task waits for the model when it does not set orqueio.llm.timeout.
   * Includes the provider's own retries (spring.ai.retry.*, 10 attempts by default):
   * lower them, or a provider that keeps failing is reported as a timeout. Keep the
   * timeout below the job executor's lock time, or another job executor may run the
   * task again while the first call is still running.
   */
  private Duration timeout = Duration.ofMinutes(2);

  private final Cache cache = new Cache();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public String getDefaultProvider() {
    return defaultProvider;
  }

  public void setDefaultProvider(String defaultProvider) {
    this.defaultProvider = defaultProvider;
  }

  public Duration getTimeout() {
    return timeout;
  }

  public void setTimeout(Duration timeout) {
    this.timeout = timeout;
  }

  public Cache getCache() {
    return cache;
  }

  @Override
  public String toString() {
    return "OrqueioBpmAiProperties[enabled=" + enabled + ", defaultProvider=" + defaultProvider
        + ", timeout=" + timeout + ", cache=" + cache + "]";
  }

  /**
   * Reuse of model answers when an LLM task's job is retried. Answers are kept in Redis,
   * shared by every node, when the application has Redis; in memory otherwise.
   */
  public static class Cache {

    /**
     * Reuse answers on retries, and run a single call at a time for the same request.
     * Default {@code true}.
     */
    private boolean enabled = true;

    /**
     * How long a valid answer is kept. It may contain personal data from the process.
     */
    private Duration timeToLive = Duration.ofHours(1);

    /**
     * How long a call may keep its lock after the task's timeout elapsed, for a call
     * abandoned by the task but still running. Once it expires, a retry may start the
     * same call again. Waiting for the lock counts against the task's timeout.
     */
    private Duration lockTimeToLive = Duration.ofMinutes(10);

    private final Redis redis = new Redis();

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public Duration getTimeToLive() {
      return timeToLive;
    }

    public void setTimeToLive(Duration timeToLive) {
      this.timeToLive = timeToLive;
    }

    public Duration getLockTimeToLive() {
      return lockTimeToLive;
    }

    public void setLockTimeToLive(Duration lockTimeToLive) {
      this.lockTimeToLive = lockTimeToLive;
    }

    public Redis getRedis() {
      return redis;
    }

    @Override
    public String toString() {
      return "Cache[enabled=" + enabled + ", timeToLive=" + timeToLive + ", lockTimeToLive=" + lockTimeToLive
          + ", redis=" + redis.isEnabled() + "]";
    }
  }

  public static class Redis {

    /**
     * Keep answers in the application's Redis when it has one. Set to {@code false} to
     * keep them in memory, for example when that Redis is not meant for process data.
     * Default {@code true}.
     */
    private boolean enabled = true;

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }
  }

}
