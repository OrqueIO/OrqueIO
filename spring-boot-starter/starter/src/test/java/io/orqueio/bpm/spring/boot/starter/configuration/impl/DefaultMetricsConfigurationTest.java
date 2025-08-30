/*
 * Copyright TOADDLATERCCS and/or licensed to TOADDLATERCCS
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. TOADDLATERCCS this file to you under the Apache License,
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
package io.orqueio.bpm.spring.boot.starter.configuration.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.util.ReflectionTestUtils.invokeMethod;
import static org.springframework.test.util.ReflectionTestUtils.setField;

import io.orqueio.bpm.engine.spring.SpringProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import org.junit.Before;
import org.junit.Test;

public class DefaultMetricsConfigurationTest {
  private DefaultMetricsConfiguration defaultMetricsConfiguration = new DefaultMetricsConfiguration();
  private OrqueioBpmProperties orqueioBpmProperties = new OrqueioBpmProperties();
  private SpringProcessEngineConfiguration configuration = new SpringProcessEngineConfiguration();

  @Before
  public void setUp() {
    setField(defaultMetricsConfiguration, "orqueioBpmProperties", orqueioBpmProperties);
    defaultMetricsConfiguration.init();

    invokeMethod(configuration, "initMetrics");
  }

  @Test
  public void enabled() {
    assertThat(configuration.isMetricsEnabled()).isTrue();
    assertThat(orqueioBpmProperties.getMetrics().isEnabled()).isTrue();

    orqueioBpmProperties.getMetrics().setEnabled(false);
    defaultMetricsConfiguration.preInit(configuration);
    assertThat(configuration.isMetricsEnabled()).isFalse();

    orqueioBpmProperties.getMetrics().setEnabled(true);
    defaultMetricsConfiguration.preInit(configuration);
    assertThat(configuration.isMetricsEnabled()).isTrue();
  }

  @Test
  public void dbMetricsReporterActivate() {
    assertThat(configuration.isDbMetricsReporterActivate()).isTrue();
    assertThat(orqueioBpmProperties.getMetrics().isDbReporterActivate()).isTrue();

    orqueioBpmProperties.getMetrics().setDbReporterActivate(false);
    defaultMetricsConfiguration.preInit(configuration);
    assertThat(configuration.isDbMetricsReporterActivate()).isFalse();

    orqueioBpmProperties.getMetrics().setDbReporterActivate(true);
    defaultMetricsConfiguration.preInit(configuration);
    assertThat(configuration.isDbMetricsReporterActivate()).isTrue();
  }
}
