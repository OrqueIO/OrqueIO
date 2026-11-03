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
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The {@code {{variable}}} placeholders of an LLM task prompt. Every <code>{{</code> in a
 * prompt starts a placeholder; there is no escaping for a literal one yet.
 */
final class PromptTemplate {

  private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(.*?)}}", Pattern.DOTALL);

  private PromptTemplate() {
  }

  /**
   * @return the variable names used in the template, in order of first use
   * @throws IllegalArgumentException if a placeholder is malformed or not closed
   */
  static Set<String> placeholders(String template) {
    Set<String> names = new LinkedHashSet<>();
    Matcher matcher = PLACEHOLDER.matcher(template);
    int end = 0;
    while (matcher.find()) {
      checkNoOpening(template, end, matcher.start());
      String name = matcher.group(1).trim();
      if (!isVariableName(name)) {
        throw new IllegalArgumentException("malformed placeholder " + matcher.group());
      }
      names.add(name);
      end = matcher.end();
    }
    checkNoOpening(template, end, template.length());
    return names;
  }

  /**
   * Replaces every placeholder in a single pass: a value that contains
   * {@code {{...}}} is inserted as text and not resolved again.
   */
  static String resolve(String template, Function<String, String> values) {
    Matcher matcher = PLACEHOLDER.matcher(template);
    StringBuilder result = new StringBuilder();
    while (matcher.find()) {
      matcher.appendReplacement(result, Matcher.quoteReplacement(values.apply(matcher.group(1).trim())));
    }
    matcher.appendTail(result);
    return result.toString();
  }

  static boolean isVariableName(String name) {
    if (name.isEmpty() || !Character.isJavaIdentifierStart(name.charAt(0))) {
      return false;
    }
    return name.codePoints().skip(1).allMatch(Character::isJavaIdentifierPart);
  }

  private static void checkNoOpening(String template, int from, int to) {
    int opening = template.indexOf("{{", from);
    if (opening >= 0 && opening < to) {
      throw new IllegalArgumentException("unclosed placeholder at position " + opening);
    }
  }

}
