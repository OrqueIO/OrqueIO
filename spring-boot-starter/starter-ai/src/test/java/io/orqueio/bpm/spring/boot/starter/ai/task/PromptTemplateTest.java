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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class PromptTemplateTest {

  @Test
  void shouldListPlaceholdersInOrderOfFirstUse() {
    assertThat(PromptTemplate.placeholders("{{b}} then {{ a }} then {{b}}")).containsExactly("b", "a");
  }

  @Test
  void shouldFindNoPlaceholderInPlainText() {
    assertThat(PromptTemplate.placeholders("Summarize {the} request")).isEmpty();
  }

  @Test
  void shouldRejectMalformedPlaceholder() {
    assertThatThrownBy(() -> PromptTemplate.placeholders("Hello {{customer.name}}"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("malformed placeholder {{customer.name}}");
    assertThatThrownBy(() -> PromptTemplate.placeholders("Hello {{ }}"))
        .hasMessage("malformed placeholder {{ }}");
  }

  @Test
  void shouldRejectUnclosedPlaceholder() {
    assertThatThrownBy(() -> PromptTemplate.placeholders("Hello {{name"))
        .hasMessage("unclosed placeholder at position 6");
    assertThatThrownBy(() -> PromptTemplate.placeholders("{{a}} and {{b"))
        .hasMessage("unclosed placeholder at position 10");
  }

  @Test
  void shouldResolveInOnePass() {
    String prompt = PromptTemplate.resolve("A={{a}} B={{b}}", name -> name.equals("a") ? "{{b}} $1 \\" : "two");

    assertThat(prompt).isEqualTo("A={{b}} $1 \\ B=two");
  }

}
