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

import org.springframework.ai.chat.model.ChatResponse;

/**
 * The model's answer to an LLM task, as called or as reused from a previous attempt.
 *
 * @param text the answer
 * @param response the provider's response, or {@code null} when the answer was reused
 * @param fromCache whether the answer was reused instead of calling the model
 */
public record LlmModelAnswer(String text, ChatResponse response, boolean fromCache) {

  static LlmModelAnswer called(String text, ChatResponse response) {
    return new LlmModelAnswer(text, response, false);
  }

  static LlmModelAnswer reused(String text) {
    return new LlmModelAnswer(text, null, true);
  }

}
