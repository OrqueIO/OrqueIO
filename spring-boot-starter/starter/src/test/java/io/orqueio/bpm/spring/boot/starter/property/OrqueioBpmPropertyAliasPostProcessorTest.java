/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.orqueio.bpm.spring.boot.starter.property;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;
import org.junit.Before;
import org.junit.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.origin.Origin;
import org.springframework.boot.origin.OriginTrackedValue;
import org.springframework.core.Ordered;
import org.springframework.core.env.MapPropertySource;
import org.springframework.mock.env.MockEnvironment;

public class OrqueioBpmPropertyAliasPostProcessorTest {

  private OrqueioBpmPropertyAliasPostProcessor processor;
  private MockEnvironment environment;
  private SpringApplication application;

  @Before
  public void setUp() {
    processor = new OrqueioBpmPropertyAliasPostProcessor();
    environment = new MockEnvironment();
    application = new SpringApplication();
  }

  @Test
  public void shouldAliasOrqueioPrefixToCamundaPrefix() {
    // given
    Map<String, Object> properties = new HashMap<>();
    properties.put("orqueio.bpm.admin-user.id", "admin");
    properties.put("orqueio.bpm.admin-user.password", "secret");
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then
    assertThat(environment.getProperty("camunda.bpm.admin-user.id")).isEqualTo("admin");
    assertThat(environment.getProperty("camunda.bpm.admin-user.password")).isEqualTo("secret");
  }

  @Test
  public void shouldNotOverrideCamundaPropertiesWithOrqueioAlias() {
    // given - both prefixes defined, camunda should take precedence
    Map<String, Object> properties = new HashMap<>();
    properties.put("camunda.bpm.admin-user.id", "camundaAdmin");
    properties.put("orqueio.bpm.admin-user.id", "orqueioAdmin");
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then - camunda prefix should take precedence
    assertThat(environment.getProperty("camunda.bpm.admin-user.id")).isEqualTo("camundaAdmin");
  }

  @Test
  public void shouldHandleNestedProperties() {
    // given
    Map<String, Object> properties = new HashMap<>();
    properties.put("orqueio.bpm.webapp.application-path", "/myapp");
    properties.put("orqueio.bpm.job-execution.enabled", "true");
    properties.put("orqueio.bpm.database.schema-update", "true");
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then
    assertThat(environment.getProperty("camunda.bpm.webapp.application-path")).isEqualTo("/myapp");
    assertThat(environment.getProperty("camunda.bpm.job-execution.enabled")).isEqualTo("true");
    assertThat(environment.getProperty("camunda.bpm.database.schema-update")).isEqualTo("true");
  }

  @Test
  public void shouldIgnoreNonOrqueioProperties() {
    // given
    Map<String, Object> properties = new HashMap<>();
    properties.put("spring.datasource.url", "jdbc:h2:mem:test");
    properties.put("server.port", "8080");
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then - non-orqueio properties should remain unchanged
    assertThat(environment.getProperty("spring.datasource.url")).isEqualTo("jdbc:h2:mem:test");
    assertThat(environment.getProperty("server.port")).isEqualTo("8080");
    // No camunda alias should be created for these
    assertThat(environment.containsProperty("camunda.datasource.url")).isFalse();
  }

  @Test
  public void shouldHandleOriginTrackedValues() {
    // given - Spring Boot wraps property values in OriginTrackedValue
    Map<String, Object> properties = new HashMap<>();
    Origin origin = new Origin() {
      @Override
      public String toString() {
        return "test origin";
      }
    };
    properties.put("orqueio.bpm.admin-user.id", OriginTrackedValue.of("trackedAdmin", origin));
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then - should unwrap OriginTrackedValue
    assertThat(environment.getProperty("camunda.bpm.admin-user.id")).isEqualTo("trackedAdmin");
  }

  @Test
  public void shouldNotAddAliasPropertySourceWhenNoOrqueioProperties() {
    // given
    Map<String, Object> properties = new HashMap<>();
    properties.put("spring.application.name", "test-app");
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    int initialSourceCount = environment.getPropertySources().size();

    // when
    processor.postProcessEnvironment(environment, application);

    // then - no additional property source should be added
    assertThat(environment.getPropertySources().size()).isEqualTo(initialSourceCount);
  }

  @Test
  public void shouldAddAliasPropertySourceWhenOrqueioPropertiesExist() {
    // given
    Map<String, Object> properties = new HashMap<>();
    properties.put("orqueio.bpm.enabled", "true");
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then - alias property source should be added
    assertThat(environment.getPropertySources().contains(OrqueioBpmPropertyAliasPostProcessor.ALIAS_PROPERTY_SOURCE_NAME)).isTrue();
  }

  @Test
  public void shouldHaveLowestPrecedenceOrder() {
    // given/when/then
    assertThat(processor.getOrder()).isEqualTo(Ordered.LOWEST_PRECEDENCE);
  }

  @Test
  public void shouldHandleEmptyPropertyValue() {
    // given
    Map<String, Object> properties = new HashMap<>();
    properties.put("orqueio.bpm.admin-user.id", "");
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then
    assertThat(environment.getProperty("camunda.bpm.admin-user.id")).isEqualTo("");
  }

  @Test
  public void shouldHandleNullPropertyValue() {
    // given
    Map<String, Object> properties = new HashMap<>();
    properties.put("orqueio.bpm.admin-user.id", null);
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then - null values should be handled gracefully
    // The property might not be aliased or might be aliased as null
    // depending on implementation - just ensure no exception is thrown
  }

  @Test
  public void shouldPreserveOriginalOrqueioProperties() {
    // given
    Map<String, Object> properties = new HashMap<>();
    properties.put("orqueio.bpm.admin-user.id", "admin");
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then - original orqueio property should still be accessible
    assertThat(environment.getProperty("orqueio.bpm.admin-user.id")).isEqualTo("admin");
    // And aliased camunda property should also be available
    assertThat(environment.getProperty("camunda.bpm.admin-user.id")).isEqualTo("admin");
  }

  @Test
  public void shouldHandleMultiplePropertySources() {
    // given - properties from multiple sources
    Map<String, Object> source1 = new HashMap<>();
    source1.put("orqueio.bpm.property1", "value1");

    Map<String, Object> source2 = new HashMap<>();
    source2.put("orqueio.bpm.property2", "value2");

    environment.getPropertySources().addFirst(new MapPropertySource("source1", source1));
    environment.getPropertySources().addFirst(new MapPropertySource("source2", source2));

    // when
    processor.postProcessEnvironment(environment, application);

    // then - both properties should be aliased
    assertThat(environment.getProperty("camunda.bpm.property1")).isEqualTo("value1");
    assertThat(environment.getProperty("camunda.bpm.property2")).isEqualTo("value2");
  }

  @Test
  public void shouldHandleOAuth2Properties() {
    // given - OAuth2 specific properties
    Map<String, Object> properties = new HashMap<>();
    properties.put("orqueio.bpm.oauth2.sso-logout.enabled", "true");
    properties.put("orqueio.bpm.oauth2.user-sync.auto-create-users", "false");
    properties.put("orqueio.bpm.oauth2.identity-provider.group-name-attribute", "groups");
    environment.getPropertySources().addFirst(new MapPropertySource("test", properties));

    // when
    processor.postProcessEnvironment(environment, application);

    // then
    assertThat(environment.getProperty("camunda.bpm.oauth2.sso-logout.enabled")).isEqualTo("true");
    assertThat(environment.getProperty("camunda.bpm.oauth2.user-sync.auto-create-users")).isEqualTo("false");
    assertThat(environment.getProperty("camunda.bpm.oauth2.identity-provider.group-name-attribute")).isEqualTo("groups");
  }
}
