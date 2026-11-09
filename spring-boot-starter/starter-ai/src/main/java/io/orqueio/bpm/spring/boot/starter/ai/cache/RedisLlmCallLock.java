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

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;

/**
 * Locks calls across every node that shares the Redis server. The lock expires after
 * the call's timeout plus a grace period, so a node that stops while holding it does
 * not block the others forever.
 */
public class RedisLlmCallLock implements LlmCallLock {

  public static final String KEY_PREFIX = "orqueio:llm:lock:";

  // Deletes the lock only if this lease still owns it: an expired lease must not free another one
  private static final RedisScript<Long> RELEASE = new DefaultRedisScript<>(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      Long.class);

  private static final long MAX_POLL_MILLIS = 200;

  private final StringRedisTemplate redis;
  private final Duration gracePeriod;

  /**
   * @param gracePeriod how long a call may hold its lock after its timeout elapsed
   */
  public RedisLlmCallLock(StringRedisTemplate redis, Duration gracePeriod) {
    this.redis = redis;
    this.gracePeriod = gracePeriod;
  }

  @Override
  public Lease tryAcquire(String key, Duration wait, Duration callTimeout) throws InterruptedException {
    Duration leaseTime = callTimeout.plus(gracePeriod);
    String redisKey = KEY_PREFIX + key;
    String token = UUID.randomUUID().toString();
    long deadline = System.nanoTime() + wait.toNanos();
    long pollMillis = 10;
    while (true) {
      if (Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(redisKey, token, leaseTime))) {
        return () -> redis.execute(RELEASE, List.of(redisKey), token);
      }
      long remainingMillis = (deadline - System.nanoTime()) / 1_000_000;
      if (remainingMillis <= 0) {
        return null;
      }
      Thread.sleep(Math.min(pollMillis, remainingMillis));
      pollMillis = Math.min(pollMillis * 2, MAX_POLL_MILLIS);
    }
  }

}
