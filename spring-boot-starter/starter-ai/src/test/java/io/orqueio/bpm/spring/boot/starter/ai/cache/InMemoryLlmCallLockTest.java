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

import java.time.Duration;

import org.junit.jupiter.api.Test;

class InMemoryLlmCallLockTest {

  private static final Duration CALL_TIMEOUT = Duration.ofMinutes(1);

  private final InMemoryLlmCallLock lock = new InMemoryLlmCallLock(Duration.ofMinutes(1));

  private LlmCallLock lock() {
    return lock;
  }

  // Within one node, every caller shares the same lock
  private LlmCallLock otherNodeLock() {
    return lock;
  }

  @Test
  void shouldMakeSecondCallerWaitUntilRelease() throws Exception {
    LlmCallLock.Lease first = lock().tryAcquire("key", Duration.ZERO, CALL_TIMEOUT);
    assertThat(first).isNotNull();

    // Released by another thread, as the call does when it ends after the task stopped waiting
    Thread.ofVirtual().start(() -> {
      sleep(300);
      first.release();
    });
    long start = System.nanoTime();
    LlmCallLock.Lease second = otherNodeLock().tryAcquire("key", Duration.ofSeconds(5), CALL_TIMEOUT);

    assertThat(second).isNotNull();
    assertThat(Duration.ofNanos(System.nanoTime() - start)).isBetween(Duration.ofMillis(250), Duration.ofSeconds(4));
    second.release();
  }

  @Test
  void shouldGiveUpAfterWait() throws Exception {
    LlmCallLock.Lease first = lock().tryAcquire("key", Duration.ZERO, CALL_TIMEOUT);

    assertThat(otherNodeLock().tryAcquire("key", Duration.ofMillis(200), CALL_TIMEOUT)).isNull();
    first.release();
  }

  @Test
  void shouldLockKeysIndependently() throws Exception {
    LlmCallLock.Lease first = lock().tryAcquire("key", Duration.ZERO, CALL_TIMEOUT);

    LlmCallLock.Lease other = otherNodeLock().tryAcquire("other-key", Duration.ZERO, CALL_TIMEOUT);

    assertThat(other).isNotNull();
    first.release();
    other.release();
  }

  @Test
  void shouldIgnoreSecondRelease() throws Exception {
    LlmCallLock.Lease first = lock().tryAcquire("key", Duration.ZERO, CALL_TIMEOUT);
    first.release();
    LlmCallLock.Lease second = otherNodeLock().tryAcquire("key", Duration.ZERO, CALL_TIMEOUT);

    first.release();

    assertThat(lock().tryAcquire("key", Duration.ZERO, CALL_TIMEOUT)).isNull();
    second.release();
  }

  @Test
  void shouldExpireLeaseAfterCallTimeoutAndGracePeriod() throws Exception {
    // A call that never ends must not block the request until the node restarts
    InMemoryLlmCallLock shortLock = new InMemoryLlmCallLock(Duration.ofMillis(100));
    LlmCallLock.Lease stuck = shortLock.tryAcquire("key", Duration.ZERO, Duration.ofMillis(200));

    long start = System.nanoTime();
    LlmCallLock.Lease taken = shortLock.tryAcquire("key", Duration.ofSeconds(3), Duration.ofMillis(200));

    assertThat(taken).isNotNull();
    assertThat(Duration.ofNanos(System.nanoTime() - start)).isBetween(Duration.ofMillis(200), Duration.ofSeconds(2));
    // The expired lease must not free the lock taken after it
    stuck.release();
    assertThat(shortLock.tryAcquire("key", Duration.ZERO, Duration.ofMillis(200))).isNull();
    taken.release();
  }

  static void sleep(long millis) {
    try {
      Thread.sleep(millis);
    }
    catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

}
