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

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.ai.retry.TransientAiException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Decides whether a failed model call is worth retrying, from the HTTP status of the
 * failure when one can be found: 408, 429 and 5xx are retried, any other 4xx is not.
 * Without a status, a {@link NonTransientAiException} is not retried; anything else
 * is, as the engine does by default.
 * <p>
 * Providers report errors differently: Spring AI's RestClient-based providers throw
 * {@link TransientAiException} or {@link NonTransientAiException} with the status in
 * the message, while providers built on a vendor SDK (OpenAI in Spring AI 2.0) throw
 * the SDK's own exceptions, which expose the status through {@code statusCode()}.
 * <p>
 * The provider's exception is not kept as the cause: its message and the response body
 * it carries may quote the request, and the engine stores the cause chain with the job.
 */
public class LlmFailureClassifier {

  // Spring AI's response error handlers: "HTTP 429 - <body>" (autoconfigured) or "429 - <body>" (default)
  private static final Pattern SPRING_AI_STATUS = Pattern.compile("^(?:HTTP )?(\\d{3}) - ");

  private static final int REQUEST_TIMEOUT = 408;
  private static final int TOO_MANY_REQUESTS = 429;

  public LlmTaskException classify(Throwable failure) {
    if (failure instanceof LlmTaskException llmTaskException) {
      return llmTaskException;
    }
    Integer status = httpStatus(failure);
    if (status != null) {
      if (status == TOO_MANY_REQUESTS) {
        return new LlmTransientException("The model provider is rate limiting requests (HTTP 429)");
      }
      if (status == REQUEST_TIMEOUT || status >= 500) {
        return new LlmTransientException("The model call failed (HTTP " + status + ")");
      }
      if (status >= 400) {
        return new LlmTaskException("The model provider rejected the request (HTTP " + status + ")");
      }
    }
    if (failure instanceof NonTransientAiException) {
      return new LlmTaskException("The model provider rejected the request (" + failure.getClass().getName() + ")");
    }
    if (isIoFailure(failure)) {
      return new LlmTransientException("The model provider could not be reached (" + failure.getClass().getName() + ")");
    }
    return new LlmTransientException("The model call failed (" + failure.getClass().getName() + ")");
  }

  protected boolean isIoFailure(Throwable failure) {
    for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
      if (cause instanceof ResourceAccessException || cause instanceof IOException) {
        return true;
      }
    }
    return false;
  }

  /**
   * @return the HTTP status of the first exception in the cause chain that has one, or {@code null}
   */
  protected Integer httpStatus(Throwable failure) {
    for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
      Integer status = statusOf(cause);
      if (status != null) {
        return status;
      }
    }
    return null;
  }

  protected Integer statusOf(Throwable failure) {
    if (failure instanceof RestClientResponseException responseException) {
      return responseException.getStatusCode().value();
    }
    if (failure instanceof TransientAiException || failure instanceof NonTransientAiException) {
      Matcher matcher = SPRING_AI_STATUS.matcher(String.valueOf(failure.getMessage()));
      return matcher.find() ? Integer.valueOf(matcher.group(1)) : null;
    }
    // Vendor SDK exceptions, such as com.openai.errors.OpenAIServiceException
    try {
      Method statusCode = failure.getClass().getMethod("statusCode");
      if (statusCode.getReturnType() == int.class) {
        int status = (int) statusCode.invoke(failure);
        return status >= 100 && status <= 599 ? status : null;
      }
    }
    catch (ReflectiveOperationException | RuntimeException e) {
      // Not an exception that carries a status
    }
    return null;
  }

}
