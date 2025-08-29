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
package io.orqueio.bpm.engine.test.cmmn.handler;

import io.orqueio.bpm.engine.impl.cmmn.handler.StageItemHandler;
import io.orqueio.bpm.engine.impl.cmmn.model.CmmnActivity;
import io.orqueio.bpm.engine.test.cmmn.handler.specification.AbstractExecutionListenerSpec;
import io.orqueio.bpm.model.cmmn.instance.DiscretionaryItem;
import io.orqueio.bpm.model.cmmn.instance.PlanningTable;
import io.orqueio.bpm.model.cmmn.instance.Stage;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameters;

/**
 * @author Thorben Lindhauer
 *
 */
@RunWith(Parameterized.class)
public class StageDiscretionaryItemExecutionListenerHandlerTest extends CmmnElementHandlerTest {

  @Parameters(name = "testListener: {0}")
  public static Iterable<Object[]> data() {
    return ExecutionListenerCases.TASK_OR_STAGE_CASES;
  }

  protected Stage stage;
  protected PlanningTable planningTable;
  protected DiscretionaryItem discretionaryItem;
  protected StageItemHandler handler = new StageItemHandler();

  protected AbstractExecutionListenerSpec testSpecification;

  public StageDiscretionaryItemExecutionListenerHandlerTest(AbstractExecutionListenerSpec testSpecification) {
    this.testSpecification = testSpecification;
  }

  @Before
  public void setUp() {
    stage = createElement(casePlanModel, "aStage", Stage.class);

    planningTable = createElement(casePlanModel, "aPlanningTable", PlanningTable.class);

    discretionaryItem = createElement(planningTable, "DI_aStage", DiscretionaryItem.class);
    discretionaryItem.setDefinition(stage);

  }

  @Test
  public void testCaseExecutionListener() {
    // given:
    testSpecification.addListenerToElement(modelInstance, stage);

    // when
    CmmnActivity activity = handler.handleElement(discretionaryItem, context);

    // then
    testSpecification.verify(activity);
  }

}
