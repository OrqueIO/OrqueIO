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
package io.orqueio.bpm.engine.impl.history.transformer;

import io.orqueio.bpm.engine.delegate.CaseExecutionListener;
import io.orqueio.bpm.engine.delegate.DelegateCaseExecution;
import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.history.HistoryLevel;
import io.orqueio.bpm.engine.impl.history.event.HistoryEvent;
import io.orqueio.bpm.engine.impl.history.producer.CmmnHistoryEventProducer;

/**
 * @author Sebastian Menski
 */
public abstract class HistoryCaseExecutionListener implements CaseExecutionListener {

  protected CmmnHistoryEventProducer eventProducer;
  protected HistoryLevel historyLevel;

  public HistoryCaseExecutionListener(CmmnHistoryEventProducer historyEventProducer) {
    eventProducer = historyEventProducer;
  }

  public void notify(DelegateCaseExecution caseExecution) throws Exception {
    HistoryEvent historyEvent = createHistoryEvent(caseExecution);

    if (historyEvent != null) {
      Context.getProcessEngineConfiguration()
        .getHistoryEventHandler()
        .handleEvent(historyEvent);
    }

  }
  
  protected void ensureHistoryLevelInitialized() {
    if (historyLevel == null) {
      historyLevel = Context.getProcessEngineConfiguration().getHistoryLevel();
    }
  }

  protected abstract HistoryEvent createHistoryEvent(DelegateCaseExecution caseExecution);

}
