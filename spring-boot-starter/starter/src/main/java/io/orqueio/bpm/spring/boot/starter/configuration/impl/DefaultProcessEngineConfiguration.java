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

import io.orqueio.bpm.engine.ProcessEngines;
import io.orqueio.bpm.engine.impl.cfg.IdGenerator;
import io.orqueio.bpm.engine.spring.SpringProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;

import java.util.Optional;

public class DefaultProcessEngineConfiguration extends AbstractOrqueioConfiguration implements OrqueioProcessEngineConfiguration {

  @Autowired
  private Optional<IdGenerator> idGenerator;

  @Override
  public void preInit(SpringProcessEngineConfiguration configuration) {
    setProcessEngineName(configuration);
    setDefaultSerializationFormat(configuration);
    setIdGenerator(configuration);
    setJobExecutorAcquireByPriority(configuration);
    setDefaultNumberOfRetries(configuration);
  }

  private void setIdGenerator(SpringProcessEngineConfiguration configuration) {
    idGenerator.ifPresent(configuration::setIdGenerator);
  }

  private void setDefaultSerializationFormat(SpringProcessEngineConfiguration configuration) {
    String defaultSerializationFormat = orqueioBpmProperties.getDefaultSerializationFormat();
    if (StringUtils.hasText(defaultSerializationFormat)) {
      configuration.setDefaultSerializationFormat(defaultSerializationFormat);
    } else {
      logger.warn("Ignoring invalid defaultSerializationFormat='{}'", defaultSerializationFormat);
    }
  }

  private void setProcessEngineName(SpringProcessEngineConfiguration configuration) {
    String processEngineName = StringUtils.trimAllWhitespace(orqueioBpmProperties.getProcessEngineName());
    if (!StringUtils.isEmpty(processEngineName) && !processEngineName.contains("-")) {

      if (orqueioBpmProperties.getGenerateUniqueProcessEngineName()) {
        if (!processEngineName.equals(ProcessEngines.NAME_DEFAULT)) {
          throw new RuntimeException(String.format("A unique processEngineName cannot be generated "
            + "if a custom processEngineName is already set: %s", processEngineName));
        }
        processEngineName = OrqueioBpmProperties.getUniqueName(orqueioBpmProperties.UNIQUE_ENGINE_NAME_PREFIX);
      }

      configuration.setProcessEngineName(processEngineName);
    } else {
      logger.warn("Ignoring invalid processEngineName='{}' - must not be null, blank or contain hyphen", orqueioBpmProperties.getProcessEngineName());
    }
  }

  private void setJobExecutorAcquireByPriority(SpringProcessEngineConfiguration configuration) {
    Optional.ofNullable(orqueioBpmProperties.getJobExecutorAcquireByPriority())
      .ifPresent(configuration::setJobExecutorAcquireByPriority);
  }

  private void setDefaultNumberOfRetries(SpringProcessEngineConfiguration configuration) {
    Optional.ofNullable(orqueioBpmProperties.getDefaultNumberOfRetries())
      .ifPresent(configuration::setDefaultNumberOfRetries);
  }
}
