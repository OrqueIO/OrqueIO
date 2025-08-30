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
package io.orqueio.bpm.qa.upgrade.timestamp;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.event.EventType;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.persistence.entity.EventSubscriptionEntity;
import io.orqueio.bpm.qa.upgrade.DescribesScenario;
import io.orqueio.bpm.qa.upgrade.ScenarioSetup;
import io.orqueio.bpm.qa.upgrade.Times;

/**
 * @author Nikola Koevski
 */
public class EventSubscriptionCreateTimeScenario extends AbstractTimestampMigrationScenario {

  protected static final String EVENT_NAME = "createTimeTestMessage";
  protected static final String ACTIVITY_ID = "createTimeTestActivity";

  @DescribesScenario("initEventSubscriptionCreateTime")
  @Times(1)
  public static ScenarioSetup initEventSubscriptionCreateTime() {
    return new ScenarioSetup() {
      @Override
      public void execute(ProcessEngine processEngine, String s) {

        ((ProcessEngineConfigurationImpl) processEngine.getProcessEngineConfiguration())
          .getCommandExecutorTxRequired()
          .execute(new Command<Void>() {

            @Override
            public Void execute(CommandContext commandContext) {

              EventSubscriptionEntity messageEventSubscriptionEntity = new EventSubscriptionEntity(EventType.MESSAGE);
              messageEventSubscriptionEntity.setEventName(EVENT_NAME);
              messageEventSubscriptionEntity.setActivityId(ACTIVITY_ID);
              messageEventSubscriptionEntity.setCreated(TIMESTAMP);
              messageEventSubscriptionEntity.insert();

              return null;
            }
          });
      }
    };
  }
}