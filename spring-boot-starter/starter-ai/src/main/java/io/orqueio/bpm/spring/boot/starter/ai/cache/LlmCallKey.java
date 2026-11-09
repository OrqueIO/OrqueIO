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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;

/**
 * Identifies a model request by a hash of what is sent: tenant, provider, model and
 * messages (the system message carries the declared output fields). The key never
 * contains the prompt or variable values in clear.
 */
public final class LlmCallKey {

  private LlmCallKey() {
  }

  public static String of(String tenantId, ChatModel chatModel, Prompt prompt) {
    MessageDigest digest = sha256();
    update(digest, tenantId);
    update(digest, chatModel.getClass().getName());
    update(digest, modelOf(chatModel, prompt));
    for (Message message : prompt.getInstructions()) {
      update(digest, message.getMessageType().name());
      update(digest, message.getText());
    }
    return HexFormat.of().formatHex(digest.digest());
  }

  private static String modelOf(ChatModel chatModel, Prompt prompt) {
    ChatOptions options = prompt.getOptions() != null ? prompt.getOptions() : chatModel.getOptions();
    return options != null ? options.getModel() : null;
  }

  // Each value is length-prefixed, so ("ab", "c") and ("a", "bc") give different keys
  private static void update(MessageDigest digest, String value) {
    byte[] bytes = value != null ? value.getBytes(StandardCharsets.UTF_8) : new byte[0];
    digest.update((value != null ? bytes.length + ":" : "-:").getBytes(StandardCharsets.UTF_8));
    digest.update(bytes);
  }

  private static MessageDigest sha256() {
    try {
      return MessageDigest.getInstance("SHA-256");
    }
    catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 is not available", e);
    }
  }

}
