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
package io.orqueio.bpm.spring.boot.starter.telemetry;

import java.util.Set;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.diagnostics.OrqueioIntegration;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;

@ConditionalOnBean(ProcessEngine.class)
public class OrqueioIntegrationDeterminator implements InitializingBean {

  @Autowired
  protected ProcessEngine processEngine;

  @Override
  public void afterPropertiesSet() throws Exception {
    ProcessEngineConfigurationImpl configuration = (ProcessEngineConfigurationImpl) processEngine.getProcessEngineConfiguration();

    Set<String> orqueioIntegration = configuration.getTelemetryData().getProduct().getInternals().getOrqueioIntegration();
    orqueioIntegration.add(OrqueioIntegration.SPRING_BOOT_STARTER);
  }

}
