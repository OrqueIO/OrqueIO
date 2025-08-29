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
package io.orqueio.bpm.engine.impl.metrics.dmn;

import io.orqueio.bpm.dmn.engine.delegate.DmnDecisionEvaluationEvent;
import io.orqueio.bpm.dmn.engine.delegate.DmnDecisionEvaluationListener;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.metrics.MetricsRegistry;
import io.orqueio.bpm.engine.management.Metrics;

public class MetricsDecisionEvaluationListener implements DmnDecisionEvaluationListener {

  public void notify(DmnDecisionEvaluationEvent evaluationEvent) {
    ProcessEngineConfigurationImpl processEngineConfiguration = Context.getProcessEngineConfiguration();

    if (processEngineConfiguration != null && processEngineConfiguration.isMetricsEnabled()) {
      MetricsRegistry metricsRegistry = processEngineConfiguration.getMetricsRegistry();
      metricsRegistry.markOccurrence(Metrics.EXECUTED_DECISION_INSTANCES,
                                     evaluationEvent.getExecutedDecisionInstances());
      metricsRegistry.markOccurrence(Metrics.EXECUTED_DECISION_ELEMENTS,
                                     evaluationEvent.getExecutedDecisionElements());
    }
  }

}
