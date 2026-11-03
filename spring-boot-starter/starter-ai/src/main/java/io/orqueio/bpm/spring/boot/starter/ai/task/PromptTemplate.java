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

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;

/**
 * The {@code {{variable}}} placeholders of an LLM task prompt. Every <code>{{</code> in a
 * prompt starts a placeholder; there is no escaping for a literal one yet.
 */
final class PromptTemplate {

  private static final String OPEN = "{{";
  private static final String CLOSE = "}}";
  private static final int MAX_QUOTED_LENGTH = 40;

  private PromptTemplate() {
  }

  /**
   * @return the variable names used in the template, in order of first use
   * @throws IllegalArgumentException if a placeholder is malformed or not closed
   */
  static Set<String> placeholders(String template) {
    Set<String> names = new LinkedHashSet<>();
    scan(template, names::add, null);
    return names;
  }

  /**
   * Replaces every placeholder in a single pass: a value that contains
   * {@code {{...}}} is inserted as text and not resolved again.
   */
  static String resolve(String template, Function<String, String> values) {
    StringBuilder result = new StringBuilder(template.length());
    scan(template, name -> result.append(values.apply(name)), result);
    return result.toString();
  }

  static boolean isVariableName(String name) {
    if (name.isEmpty() || !Character.isJavaIdentifierStart(name.codePointAt(0))) {
      return false;
    }
    return name.codePoints().skip(1).allMatch(Character::isJavaIdentifierPart);
  }

  /**
   * Walks the template once with {@code indexOf}, so the cost stays linear in its length.
   *
   * @param placeholder receives each placeholder name in order
   * @param text receives the text around placeholders, or {@code null} to skip it
   */
  private static void scan(String template, Consumer<String> placeholder, StringBuilder text) {
    int position = 0;
    while (true) {
      int open = template.indexOf(OPEN, position);
      if (open < 0) {
        break;
      }
      int close = template.indexOf(CLOSE, open + OPEN.length());
      if (close < 0) {
        throw new IllegalArgumentException("unclosed placeholder at position " + open);
      }
      String name = template.substring(open + OPEN.length(), close).trim();
      if (!isVariableName(name)) {
        throw new IllegalArgumentException("malformed placeholder "
            + quote(template.substring(open, close + CLOSE.length())) + " at position " + open);
      }
      if (text != null) {
        text.append(template, position, open);
      }
      placeholder.accept(name);
      position = close + CLOSE.length();
    }
    if (text != null) {
      text.append(template, position, template.length());
    }
  }

  private static String quote(String placeholder) {
    return placeholder.length() <= MAX_QUOTED_LENGTH ? placeholder : placeholder.substring(0, MAX_QUOTED_LENGTH) + "...";
  }

}
