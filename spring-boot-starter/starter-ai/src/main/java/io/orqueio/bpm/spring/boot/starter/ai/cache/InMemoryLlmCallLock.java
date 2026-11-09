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
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Locks calls within this node only. With several nodes, a retry that runs on another
 * node while a call is still in progress is not held back; use a distributed lock such
 * as {@link RedisLlmCallLock} for that.
 */
public class InMemoryLlmCallLock implements LlmCallLock {

  private final Map<String, CompletableFuture<Void>> held = new ConcurrentHashMap<>();

  @Override
  public Lease tryAcquire(String key, Duration wait) throws InterruptedException {
    long deadline = System.nanoTime() + wait.toNanos();
    while (true) {
      CompletableFuture<Void> released = new CompletableFuture<>();
      CompletableFuture<Void> current = held.putIfAbsent(key, released);
      if (current == null) {
        return () -> {
          held.remove(key, released);
          released.complete(null);
        };
      }
      long remaining = deadline - System.nanoTime();
      if (remaining <= 0) {
        return null;
      }
      try {
        current.get(remaining, TimeUnit.NANOSECONDS);
      }
      catch (TimeoutException e) {
        return null;
      }
      catch (ExecutionException e) {
        // Never completed exceptionally
      }
    }
  }

}
