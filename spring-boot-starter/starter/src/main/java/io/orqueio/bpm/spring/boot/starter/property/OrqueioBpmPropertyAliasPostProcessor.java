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
package io.orqueio.bpm.spring.boot.starter.property;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.boot.origin.OriginTrackedValue;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * An {@link EnvironmentPostProcessor} that allows using "orqueio.bpm" as an alias for "camunda.bpm".
 * This provides flexibility for users to configure the application using either prefix.
 *
 * <p>Properties defined with "orqueio.bpm.*" prefix will be mapped to "camunda.bpm.*" prefix,
 * allowing the existing {@link OrqueioBpmProperties} to pick them up.</p>
 *
 * <p>If the same property is defined with both prefixes, "camunda.bpm" takes precedence.</p>
 */
public class OrqueioBpmPropertyAliasPostProcessor implements EnvironmentPostProcessor, Ordered {

  public static final String ORQUEIO_PREFIX = "orqueio.bpm.";
  public static final String CAMUNDA_PREFIX = "camunda.bpm.";
  public static final String ALIAS_PROPERTY_SOURCE_NAME = "orqueioBpmAliasProperties";

  @Override
  public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
    Map<String, Object> aliasedProperties = new HashMap<>();

    for (PropertySource<?> propertySource : environment.getPropertySources()) {
      if (propertySource.getSource() instanceof Map) {
        @SuppressWarnings("unchecked")
        Map<String, Object> source = (Map<String, Object>) propertySource.getSource();

        for (Map.Entry<String, Object> entry : source.entrySet()) {
          String key = entry.getKey();

          if (key.startsWith(ORQUEIO_PREFIX)) {
            String camundaKey = CAMUNDA_PREFIX + key.substring(ORQUEIO_PREFIX.length());

            if (!environment.containsProperty(camundaKey)) {
              Object value = entry.getValue();
              if (value instanceof OriginTrackedValue) {
                value = ((OriginTrackedValue) value).getValue();
              }
              aliasedProperties.put(camundaKey, value);
            }
          }
        }
      }
    }

    if (!aliasedProperties.isEmpty()) {
      MutablePropertySources propertySources = environment.getPropertySources();
      propertySources.addLast(new MapPropertySource(ALIAS_PROPERTY_SOURCE_NAME, aliasedProperties));
    }
  }

  @Override
  public int getOrder() {
    // Run after default property sources are loaded but before application starts
    return Ordered.LOWEST_PRECEDENCE;
  }
}
