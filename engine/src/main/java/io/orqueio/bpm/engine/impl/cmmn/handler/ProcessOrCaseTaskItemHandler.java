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
package io.orqueio.bpm.engine.impl.cmmn.handler;

import java.util.List;

import io.orqueio.bpm.engine.impl.cmmn.behavior.ProcessOrCaseTaskActivityBehavior;
import io.orqueio.bpm.engine.impl.cmmn.model.CmmnActivity;
import io.orqueio.bpm.engine.impl.core.model.CallableElement;
import io.orqueio.bpm.engine.impl.core.model.CallableElementParameter;
import io.orqueio.bpm.engine.impl.core.variable.mapping.value.ParameterValueProvider;
import io.orqueio.bpm.engine.impl.el.ExpressionManager;
import io.orqueio.bpm.model.cmmn.instance.CmmnElement;
import io.orqueio.bpm.model.cmmn.instance.PlanItemDefinition;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioIn;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioOut;

/**
 * @author Roman Smirnov
 *
 */
public abstract class ProcessOrCaseTaskItemHandler extends CallingTaskItemHandler {

  protected CallableElement createCallableElement() {
    return new CallableElement();
  }

  protected void initializeCallableElement(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context) {
    super.initializeCallableElement(element, activity, context);

    ProcessOrCaseTaskActivityBehavior behavior = (ProcessOrCaseTaskActivityBehavior) activity.getActivityBehavior();
    CallableElement callableElement = behavior.getCallableElement();

    // inputs
    initializeInputParameter(element, activity, context, callableElement);

    // outputs
    initializeOutputParameter(element, activity, context, callableElement);
  }

  protected void initializeInputParameter(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context, CallableElement callableElement) {
    ExpressionManager expressionManager = context.getExpressionManager();

    List<OrqueioIn> inputs = getInputs(element);

    for (OrqueioIn input : inputs) {

      // businessKey
      String businessKey = input.getOrqueioBusinessKey();
      if (businessKey != null && !businessKey.isEmpty()) {
        ParameterValueProvider businessKeyValueProvider = createParameterValueProvider(businessKey, expressionManager);
        callableElement.setBusinessKeyValueProvider(businessKeyValueProvider);

      } else {
        // create new parameter
        CallableElementParameter parameter = new CallableElementParameter();
        callableElement.addInput(parameter);

        if (input.getOrqueioLocal()) {
          parameter.setReadLocal(true);
        }

        // all variables
        String variables = input.getOrqueioVariables();
        if ("all".equals(variables)) {
          parameter.setAllVariables(true);
          continue;
        }

        // source/sourceExpression
        String source = input.getOrqueioSource();
        if (source == null || source.isEmpty()) {
          source = input.getOrqueioSourceExpression();
        }

        ParameterValueProvider sourceValueProvider = createParameterValueProvider(source, expressionManager);
        parameter.setSourceValueProvider(sourceValueProvider);

        // target
        String target = input.getOrqueioTarget();
        parameter.setTarget(target);
      }
    }
  }

  protected void initializeOutputParameter(CmmnElement element, CmmnActivity activity, CmmnHandlerContext context, CallableElement callableElement) {
    ExpressionManager expressionManager = context.getExpressionManager();

    List<OrqueioOut> outputs = getOutputs(element);

    for (OrqueioOut output : outputs) {

      // create new parameter
      CallableElementParameter parameter = new CallableElementParameter();
      callableElement.addOutput(parameter);

      // all variables
      String variables = output.getOrqueioVariables();
      if ("all".equals(variables)) {
        parameter.setAllVariables(true);
        continue;
      }

      // source/sourceExpression
      String source = output.getOrqueioSource();
      if (source == null || source.isEmpty()) {
        source = output.getOrqueioSourceExpression();
      }

      ParameterValueProvider sourceValueProvider = createParameterValueProvider(source, expressionManager);
      parameter.setSourceValueProvider(sourceValueProvider);

      // target
      String target = output.getOrqueioTarget();
      parameter.setTarget(target);

    }
  }

  protected List<OrqueioIn> getInputs(CmmnElement element) {
    PlanItemDefinition definition = getDefinition(element);
    return queryExtensionElementsByClass(definition, OrqueioIn.class);
  }

  protected List<OrqueioOut> getOutputs(CmmnElement element) {
    PlanItemDefinition definition = getDefinition(element);
    return queryExtensionElementsByClass(definition, OrqueioOut.class);
  }
}
