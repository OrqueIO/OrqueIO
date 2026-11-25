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
package io.orqueio.bpm.spring.boot.starter.ai.cache;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Keeps answers in this node's memory until they expire. Answers are not shared with
 * other nodes and are lost on restart.
 */
public class InMemoryLlmAnswerStore implements LlmAnswerStore {

  /** Bounds the memory used when many distinct requests are made within the lifetime. */
  public static final int MAX_ENTRIES = 10_000;

  private final Map<String, Entry> entries = new ConcurrentHashMap<>();
  private final Duration timeToLive;
  private final Clock clock;

  public InMemoryLlmAnswerStore(Duration timeToLive) {
    this(timeToLive, Clock.systemUTC());
  }

  public InMemoryLlmAnswerStore(Duration timeToLive, Clock clock) {
    this.timeToLive = timeToLive;
    this.clock = clock;
  }

  @Override
  public String get(String key) {
    Entry entry = entries.get(key);
    if (entry == null) {
      return null;
    }
    if (entry.isExpired(clock.instant())) {
      entries.remove(key, entry);
      return null;
    }
    return entry.answer();
  }

  @Override
  public void put(String key, String answer) {
    if (entries.size() >= MAX_ENTRIES) {
      Instant now = clock.instant();
      entries.values().removeIf(entry -> entry.isExpired(now));
      if (entries.size() >= MAX_ENTRIES) {
        // Still full of live answers: not caching costs at most a call on a retry
        return;
      }
    }
    entries.put(key, new Entry(answer, clock.instant().plus(timeToLive)));
  }

  private record Entry(String answer, Instant expiresAt) {

    boolean isExpired(Instant now) {
      return !now.isBefore(expiresAt);
    }
  }

}
