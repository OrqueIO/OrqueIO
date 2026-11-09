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

import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Keeps answers in Redis, shared by every node, until they expire.
 */
public class RedisLlmAnswerStore implements LlmAnswerStore {

  public static final String KEY_PREFIX = "orqueio:llm:answer:";

  private final StringRedisTemplate redis;
  private final Duration timeToLive;

  public RedisLlmAnswerStore(StringRedisTemplate redis, Duration timeToLive) {
    this.redis = redis;
    this.timeToLive = timeToLive;
  }

  @Override
  public String get(String key) {
    return redis.opsForValue().get(KEY_PREFIX + key);
  }

  @Override
  public void put(String key, String answer) {
    redis.opsForValue().set(KEY_PREFIX + key, answer, timeToLive);
  }

}
