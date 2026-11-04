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

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.SocketTimeoutException;

import org.junit.jupiter.api.Test;
import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.ai.retry.TransientAiException;
import org.springframework.web.client.ResourceAccessException;

class LlmFailureClassifierTest {

  private final LlmFailureClassifier classifier = new LlmFailureClassifier();

  @Test
  void shouldRetryServerError() {
    LlmTaskException result = classifier.classify(new TransientAiException("HTTP 503 - overloaded"));

    assertThat(result.isRetryable()).isTrue();
    assertThat(result).hasMessage("The model call failed (HTTP 503)");
  }

  @Test
  void shouldRetryRateLimiting() {
    LlmTaskException result = classifier.classify(new NonTransientAiException("HTTP 429 - slow down"));

    assertThat(result.isRetryable()).isTrue();
    assertThat(result).hasMessage("The model provider is rate limiting requests (HTTP 429)");
  }

  @Test
  void shouldNotRetryClientError() {
    LlmTaskException result = classifier.classify(new NonTransientAiException("HTTP 401 - invalid api key"));

    assertThat(result.isRetryable()).isFalse();
    assertThat(result).hasMessage("The model provider rejected the request (HTTP 401)");
  }

  @Test
  void shouldNotRetryClientErrorWithoutStatus() {
    LlmTaskException result = classifier.classify(new NonTransientAiException("content filtered"));

    assertThat(result.isRetryable()).isFalse();
    assertThat(result).hasMessage("The model provider rejected the request (" + NonTransientAiException.class.getName() + ")");
  }

  @Test
  void shouldRetryNetworkFailure() {
    assertThat(classifier.classify(new ResourceAccessException("I/O error", new SocketTimeoutException())).isRetryable()).isTrue();
    assertThat(classifier.classify(new IllegalStateException("wrapped", new IOException("reset"))).isRetryable()).isTrue();
  }

  @Test
  void shouldRetryUnknownFailure() {
    LlmTaskException result = classifier.classify(new IllegalStateException("unexpected"));

    assertThat(result.isRetryable()).isTrue();
    assertThat(result).hasMessage("The model call failed (java.lang.IllegalStateException)");
  }

  @Test
  void shouldNeverRepeatProviderMessage() {
    String body = "Your prompt 'My laptop was stolen, IBAN FR76' violates the policy";

    assertThat(classifier.classify(new NonTransientAiException("HTTP 400 - " + body)).getMessage()).doesNotContain("FR76");
    assertThat(classifier.classify(new TransientAiException("HTTP 500 - " + body)).getMessage()).doesNotContain("FR76");
    assertThat(classifier.classify(new NonTransientAiException(body)).getMessage()).doesNotContain("FR76");
    assertThat(classifier.classify(new IllegalStateException(body)).getMessage()).doesNotContain("FR76");
  }

  @Test
  void shouldKeepLlmTaskException() {
    LlmTaskException failure = new LlmInvalidAnswerException("bad");

    assertThat(classifier.classify(failure)).isSameAs(failure);
  }

}
