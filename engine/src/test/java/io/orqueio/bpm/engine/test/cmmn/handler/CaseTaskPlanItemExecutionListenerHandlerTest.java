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

import io.orqueio.bpm.engine.impl.cmmn.handler.CaseTaskItemHandler;
import io.orqueio.bpm.engine.impl.cmmn.model.CmmnActivity;
import io.orqueio.bpm.engine.test.cmmn.handler.specification.AbstractExecutionListenerSpec;
import io.orqueio.bpm.model.cmmn.instance.CaseTask;
import io.orqueio.bpm.model.cmmn.instance.PlanItem;
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
public class CaseTaskPlanItemExecutionListenerHandlerTest extends CmmnElementHandlerTest {

  @Parameters(name = "testListener: {0}")
  public static Iterable<Object[]> data() {
    return ExecutionListenerCases.TASK_OR_STAGE_CASES;
  }

  protected CaseTask caseTask;
  protected PlanItem planItem;
  protected CaseTaskItemHandler handler = new CaseTaskItemHandler();

  protected AbstractExecutionListenerSpec testSpecification;

  public CaseTaskPlanItemExecutionListenerHandlerTest(AbstractExecutionListenerSpec testSpecification) {
    this.testSpecification = testSpecification;
  }

  @Before
  public void setUp() {
    caseTask = createElement(casePlanModel, "aCaseTask", CaseTask.class);

    planItem = createElement(casePlanModel, "PI_aCaseTask", PlanItem.class);
    planItem.setDefinition(caseTask);
  }

  @Test
  public void testCaseExecutionListener() {
    // given:
    testSpecification.addListenerToElement(modelInstance, caseTask);

    // when
    CmmnActivity activity = handler.handleElement(planItem, context);

    // then
    testSpecification.verify(activity);
  }
}
