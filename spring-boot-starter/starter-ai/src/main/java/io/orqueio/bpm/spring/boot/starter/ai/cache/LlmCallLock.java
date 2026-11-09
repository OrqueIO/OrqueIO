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

/**
 * Makes sure only one model call runs at a time for the same request, for example when
 * a call abandoned after its timeout is still running while the job is retried.
 * <p>
 * The lease may be released by another thread than the one that acquired it: the
 * call that holds it releases it when it ends, even after the task stopped waiting.
 */
public interface LlmCallLock {

  /**
   * @return the lease, or {@code null} if another call still holds the lock after {@code wait}
   * @throws InterruptedException if the thread is interrupted while waiting
   */
  Lease tryAcquire(String key, Duration wait) throws InterruptedException;

  interface Lease {

    /**
     * Releases the lock. Releasing twice, or after the lease expired, has no effect.
     */
    void release();
  }

}
