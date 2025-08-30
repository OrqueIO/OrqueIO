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

import static org.junit.Assert.assertEquals;

import io.orqueio.bpm.engine.spring.SpringProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import io.orqueio.bpm.spring.boot.starter.util.SpringBootStarterException;
import org.junit.Before;
import org.junit.Test;

public class GenericPropertiesConfigurationTest {

  private SpringProcessEngineConfiguration processEngineConfiguration;
  private GenericPropertiesConfiguration genericPropertiesConfiguration;
  private OrqueioBpmProperties orqueioBpmProperties;

  @Before
  public void init() {
    processEngineConfiguration = new SpringProcessEngineConfiguration();
    genericPropertiesConfiguration = new GenericPropertiesConfiguration();
    orqueioBpmProperties = new OrqueioBpmProperties();
    genericPropertiesConfiguration.orqueioBpmProperties = orqueioBpmProperties;
  }

  @Test
  public void genericBindingTestWithType() {
    final int batchPollTimeValue = Integer.MAX_VALUE;
    orqueioBpmProperties.getGenericProperties().getProperties().put("batch-poll-time", batchPollTimeValue);
    genericPropertiesConfiguration.preInit(processEngineConfiguration);
    assertEquals(batchPollTimeValue, processEngineConfiguration.getBatchPollTime());
  }

  @Test
  public void genericBindingTestAsString() {
    final int batchPollTimeValue = Integer.MAX_VALUE;
    orqueioBpmProperties.getGenericProperties().getProperties().put("batch-poll-time", Integer.valueOf(batchPollTimeValue).toString());
    genericPropertiesConfiguration.preInit(processEngineConfiguration);
    assertEquals(batchPollTimeValue, processEngineConfiguration.getBatchPollTime());
  }

  @Test(expected = SpringBootStarterException.class)
  public void genericBindingTestWithNotExistingProperty() {
    final int dontExistValue = Integer.MAX_VALUE;
    orqueioBpmProperties.getGenericProperties().getProperties().put("dont-exist", dontExistValue);
    genericPropertiesConfiguration.preInit(processEngineConfiguration);
  }
}
