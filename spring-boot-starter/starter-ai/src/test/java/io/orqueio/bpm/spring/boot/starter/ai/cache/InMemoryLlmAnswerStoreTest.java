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

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class InMemoryLlmAnswerStoreTest {

  private final MutableClock clock = new MutableClock();
  private final InMemoryLlmAnswerStore store = new InMemoryLlmAnswerStore(Duration.ofMinutes(10), clock);

  @Test
  void shouldReturnStoredAnswer() {
    store.put("key", "{\"category\":\"Theft\"}");

    assertThat(store.get("key")).isEqualTo("{\"category\":\"Theft\"}");
    assertThat(store.get("other")).isNull();
  }

  @Test
  void shouldForgetAnswerAfterTimeToLive() {
    store.put("key", "answer");

    clock.advance(Duration.ofMinutes(9));
    assertThat(store.get("key")).isEqualTo("answer");
    clock.advance(Duration.ofMinutes(1));
    assertThat(store.get("key")).isNull();
  }

  @Test
  void shouldMakeRoomByDroppingExpiredAnswers() {
    for (int i = 0; i < InMemoryLlmAnswerStore.MAX_ENTRIES; i++) {
      store.put("old-" + i, "answer");
    }
    clock.advance(Duration.ofMinutes(10));

    store.put("new", "answer");

    assertThat(store.get("new")).isEqualTo("answer");
  }

  @Test
  void shouldNotGrowBeyondMaximum() {
    for (int i = 0; i < InMemoryLlmAnswerStore.MAX_ENTRIES; i++) {
      store.put("live-" + i, "answer");
    }

    store.put("one-too-many", "answer");

    assertThat(store.get("one-too-many")).isNull();
    assertThat(store.get("live-0")).isEqualTo("answer");
  }

  static class MutableClock extends Clock {

    private Instant now = Instant.parse("2026-11-09T10:00:00Z");

    void advance(Duration duration) {
      now = now.plus(duration);
    }

    @Override
    public Instant instant() {
      return now;
    }

    @Override
    public java.time.ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(java.time.ZoneId zone) {
      return this;
    }
  }

}
