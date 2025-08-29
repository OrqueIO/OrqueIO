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
package io.orqueio.bpm.engine.impl.cmmn.handler;

import static io.orqueio.bpm.engine.impl.util.DecisionEvaluationUtil.getDecisionResultMapperForName;

import io.orqueio.bpm.engine.impl.cmmn.behavior.CmmnActivityBehavior;
import io.orqueio.bpm.engine.impl.cmmn.behavior.DmnDecisionTaskActivityBehavior;
import io.orqueio.bpm.engine.impl.cmmn.model.CmmnActivity;
import io.orqueio.bpm.engine.impl.core.model.BaseCallableElement;
import io.orqueio.bpm.engine.impl.dmn.result.DecisionResultMapper;
import io.orqueio.bpm.model.cmmn.instance.CmmnElement;
import io.orqueio.bpm.model.cmmn.instance.DecisionRefExpression;
import io.orqueio.bpm.model.cmmn.instance.DecisionTask;


/**
 * @author Roman Smirnov
 *
 */
public class DecisionTaskItemHandler extends CallingTaskItemHandler {

  protected void initializeActivity(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context) {
    super.initializeActivity(element, activity, context);

    initializeResultVariable(element, activity, context);

    initializeDecisionTableResultMapper(element, activity, context);
  }

  protected void initializeResultVariable(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context) {
    DecisionTask decisionTask = getDefinition(element);
    DmnDecisionTaskActivityBehavior behavior = getActivityBehavior(activity);
    String resultVariable = decisionTask.getOrqueioResultVariable();
    behavior.setResultVariable(resultVariable);
  }

  protected void initializeDecisionTableResultMapper(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context) {
    DecisionTask decisionTask = getDefinition(element);
    DmnDecisionTaskActivityBehavior behavior = getActivityBehavior(activity);
    String mapper = decisionTask.getOrqueioMapDecisionResult();
    DecisionResultMapper decisionResultMapper = getDecisionResultMapperForName(mapper);
    behavior.setDecisionTableResultMapper(decisionResultMapper);
  }

  protected BaseCallableElement createCallableElement() {
    return new BaseCallableElement();
  }

  protected CmmnActivityBehavior getActivityBehavior() {
    return new DmnDecisionTaskActivityBehavior();
  }

  protected DmnDecisionTaskActivityBehavior getActivityBehavior(CmmnActivity activity) {
    return (DmnDecisionTaskActivityBehavior) activity.getActivityBehavior();
  }

  protected String getDefinitionKey(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context) {
    DecisionTask definition = getDefinition(element);
    String decision = definition.getDecision();

    if (decision == null) {
      DecisionRefExpression decisionExpression = definition.getDecisionExpression();
      if (decisionExpression != null) {
        decision = decisionExpression.getText();
      }
    }

    return decision;
  }

  protected String getBinding(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context) {
    DecisionTask definition = getDefinition(element);
    return definition.getOrqueioDecisionBinding();
  }

  protected String getVersion(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context) {
    DecisionTask definition = getDefinition(element);
    return definition.getOrqueioDecisionVersion();
  }

  protected String getTenantId(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context) {
    DecisionTask definition = getDefinition(element);
    return definition.getOrqueioDecisionTenantId();
  }


  protected DecisionTask getDefinition(CmmnElement element) {
    return (DecisionTask) super.getDefinition(element);
  }

}
