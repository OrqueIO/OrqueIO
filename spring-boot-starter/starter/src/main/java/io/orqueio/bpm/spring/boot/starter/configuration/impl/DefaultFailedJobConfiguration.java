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

import io.orqueio.bpm.engine.impl.bpmn.parser.DefaultFailedJobParseListener;
import io.orqueio.bpm.engine.impl.jobexecutor.DefaultFailedJobCommandFactory;
import io.orqueio.bpm.engine.spring.SpringProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioFailedJobConfiguration;

import java.util.ArrayList;

/**
 * Register parseListener to setup failed job retry specification.
 */
public class DefaultFailedJobConfiguration extends AbstractOrqueioConfiguration implements OrqueioFailedJobConfiguration {

  @Override
  public void preInit(SpringProcessEngineConfiguration configuration) {

    if (configuration.getCustomPostBPMNParseListeners() == null) {
      configuration.setCustomPostBPMNParseListeners(new ArrayList<>());
    }

    configuration.getCustomPostBPMNParseListeners().add(new DefaultFailedJobParseListener());
    configuration.setFailedJobCommandFactory(new DefaultFailedJobCommandFactory());
  }
}
