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
package io.orqueio.bpm.spring.boot.starter.ai;

import static org.assertj.core.api.Assertions.assertThat;

import io.orqueio.bpm.spring.boot.starter.ai.property.OrqueioBpmAiProperties;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.context.annotation.ImportCandidates;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class OrqueioBpmAiAutoConfigurationTest {

  private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
      .withConfiguration(AutoConfigurations.of(OrqueioBpmAiAutoConfiguration.class));

  @Test
  void shouldBeRegisteredAsAutoConfiguration() {
    ImportCandidates candidates = ImportCandidates.load(AutoConfiguration.class, getClass().getClassLoader());

    assertThat(candidates.getCandidates()).contains(OrqueioBpmAiAutoConfiguration.class.getName());
  }

  @Test
  void shouldBeEnabledByDefault() {
    contextRunner.run(context -> {
      assertThat(context).hasSingleBean(OrqueioBpmAiAutoConfiguration.class);
      assertThat(context.getBean(OrqueioBpmAiProperties.class).isEnabled()).isTrue();
    });
  }

  @Test
  void shouldStartWithoutModelProvider() {
    // Hide the provider that the test classpath carries for the IT
    contextRunner.withClassLoader(new FilteredClassLoader("org.springframework.ai.ollama")).run(context -> {
      assertThat(context).hasNotFailed();
      assertThat(context).doesNotHaveBean(ChatModel.class);
      assertThat(context).hasSingleBean(OrqueioBpmAiAutoConfiguration.class);
    });
  }

  @Test
  void shouldBeDisabledByProperty() {
    contextRunner
        .withPropertyValues(OrqueioBpmAiProperties.PREFIX + ".enabled=false")
        .run(context -> {
          assertThat(context).hasNotFailed();
          assertThat(context).doesNotHaveBean(OrqueioBpmAiAutoConfiguration.class);
          assertThat(context).doesNotHaveBean(OrqueioBpmAiProperties.class);
        });
  }

}
