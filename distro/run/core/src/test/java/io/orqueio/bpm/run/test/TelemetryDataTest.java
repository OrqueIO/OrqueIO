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
package io.orqueio.bpm.run.test;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.diagnostics.OrqueioIntegration;
import io.orqueio.bpm.engine.impl.telemetry.dto.TelemetryDataImpl;
import io.orqueio.bpm.run.OrqueioBpmRun;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit4.SpringRunner;

@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@RunWith(SpringRunner.class)
@SpringBootTest(classes = { OrqueioBpmRun.class })
public class TelemetryDataTest {

  @Autowired
  ProcessEngine engine;

  @Test
  public void shouldAddOrqueioIntegration() {
    // given
    ProcessEngineConfigurationImpl processEngineConfiguration = (ProcessEngineConfigurationImpl) engine.getProcessEngineConfiguration();

    // then
    TelemetryDataImpl telemetryData = processEngineConfiguration.getTelemetryData();
    Set<String> orqueioIntegration = telemetryData.getProduct().getInternals().getOrqueioIntegration();
    assertThat(orqueioIntegration)
      .containsExactlyInAnyOrder(OrqueioIntegration.ORQUEIO_BPM_RUN, OrqueioIntegration.SPRING_BOOT_STARTER);
  }
}
