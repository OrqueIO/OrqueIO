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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.ai.retry.TransientAiException;
import org.springframework.web.client.ResourceAccessException;

/**
 * Decides whether a failed model call is worth retrying. Spring AI providers report
 * HTTP errors as {@link TransientAiException} (5xx) or {@link NonTransientAiException}
 * (4xx); rate limiting (429) is a 4xx but goes away by itself, so it is retried.
 * A failure this class does not recognize is retried, as the engine does by default.
 * <p>
 * Messages name the failure but never repeat the provider's message, which may quote
 * the request.
 */
public class LlmFailureClassifier {

  // The message format of Spring AI's response error handler: "HTTP 429 - <body>"
  private static final Pattern HTTP_STATUS = Pattern.compile("^HTTP (\\d{3}) ");

  private static final int TOO_MANY_REQUESTS = 429;

  public LlmTaskException classify(Throwable failure) {
    if (failure instanceof LlmTaskException llmTaskException) {
      return llmTaskException;
    }
    if (failure instanceof NonTransientAiException) {
      Integer status = httpStatus(failure);
      if (status != null && status == TOO_MANY_REQUESTS) {
        return new LlmTransientException("The model provider is rate limiting requests (HTTP 429)", failure);
      }
      return new LlmTaskException("The model provider rejected the request" + describe(status, failure), failure);
    }
    if (isNetworkFailure(failure)) {
      return new LlmTransientException("The model provider could not be reached" + describe(null, failure), failure);
    }
    return new LlmTransientException("The model call failed" + describe(httpStatus(failure), failure), failure);
  }

  protected boolean isNetworkFailure(Throwable failure) {
    for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
      if (cause instanceof ResourceAccessException || cause instanceof IOException) {
        return true;
      }
    }
    return false;
  }

  protected Integer httpStatus(Throwable failure) {
    if (!(failure instanceof TransientAiException || failure instanceof NonTransientAiException)
        || failure.getMessage() == null) {
      return null;
    }
    Matcher matcher = HTTP_STATUS.matcher(failure.getMessage());
    return matcher.find() ? Integer.valueOf(matcher.group(1)) : null;
  }

  protected String describe(Integer status, Throwable failure) {
    return status != null
        ? " (HTTP " + status + ")"
        : " (" + failure.getClass().getName() + ")";
  }

}
