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

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Runs the Redis store and lock against a real Redis. Two lock instances with their own
 * connections stand for two nodes. Skipped when Docker is not available.
 */
@Testcontainers(disabledWithoutDocker = true)
class RedisAnswerReuseIT {

  private static final Duration CALL_TIMEOUT = Duration.ofMinutes(1);

  @Container
  static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7.4-alpine").withExposedPorts(6379);

  private static LettuceConnectionFactory nodeA;
  private static LettuceConnectionFactory nodeB;

  private StringRedisTemplate redisA;
  private StringRedisTemplate redisB;

  @BeforeAll
  static void connect() {
    nodeA = connection();
    nodeB = connection();
  }

  @AfterAll
  static void disconnect() {
    nodeA.destroy();
    nodeB.destroy();
  }

  @BeforeEach
  void flush() {
    redisA = new StringRedisTemplate(nodeA);
    redisB = new StringRedisTemplate(nodeB);
    redisA.execute((org.springframework.data.redis.core.RedisCallback<Object>) connection -> {
      connection.serverCommands().flushAll();
      return null;
    });
  }

  private LlmCallLock lock() {
    return new RedisLlmCallLock(redisA, Duration.ofMinutes(1));
  }

  private LlmCallLock otherNodeLock() {
    return new RedisLlmCallLock(redisB, Duration.ofMinutes(1));
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

  static void sleep(long millis) {
    try {
      Thread.sleep(millis);
    }
    catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  @Test
  void shouldLetAnotherNodeTakeLockOnceLeaseExpired() throws Exception {
    // A node that stops while holding the lock must not block the others forever
    LlmCallLock.Lease crashed = new RedisLlmCallLock(redisA, Duration.ZERO).tryAcquire("key", Duration.ZERO, Duration.ofMillis(300));
    assertThat(crashed).isNotNull();

    LlmCallLock.Lease taken = otherNodeLock().tryAcquire("key", Duration.ofSeconds(3), CALL_TIMEOUT);

    assertThat(taken).isNotNull();
    // The expired lease must not free the lock the other node now holds
    crashed.release();
    assertThat(lock().tryAcquire("key", Duration.ZERO, CALL_TIMEOUT)).isNull();
    taken.release();
  }

  @Test
  void shouldHoldLeaseForCallTimeoutPlusGracePeriod() throws Exception {
    new RedisLlmCallLock(redisA, Duration.ofMinutes(10)).tryAcquire("key", Duration.ZERO, Duration.ofMinutes(15));

    // A task timeout longer than the grace period is still covered
    assertThat(redisA.getExpire(RedisLlmCallLock.KEY_PREFIX + "key")).isBetween(24 * 60L, 25 * 60L);
  }

  @Test
  void shouldShareAnswersBetweenNodesUntilTheyExpire() {
    new RedisLlmAnswerStore(redisA, Duration.ofMillis(500)).put("key", "{\"category\":\"Theft\"}");
    RedisLlmAnswerStore otherNode = new RedisLlmAnswerStore(redisB, Duration.ofMillis(500));

    assertThat(otherNode.get("key")).isEqualTo("{\"category\":\"Theft\"}");
    sleep(800);
    assertThat(otherNode.get("key")).isNull();
  }

  @Test
  void shouldPrefixKeys() {
    new RedisLlmAnswerStore(redisA, Duration.ofMinutes(1)).put("key", "answer");

    assertThat(redisA.hasKey(RedisLlmAnswerStore.KEY_PREFIX + "key")).isTrue();
  }

  private static LettuceConnectionFactory connection() {
    LettuceConnectionFactory factory = new LettuceConnectionFactory(
        new RedisStandaloneConfiguration(REDIS.getHost(), REDIS.getMappedPort(6379)));
    factory.afterPropertiesSet();
    factory.start();
    return factory;
  }

}
