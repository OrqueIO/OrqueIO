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
package io.orqueio.bpm.dmn.engine.impl.evaluation;

import java.util.Collections;

import io.orqueio.bpm.dmn.engine.DmnDecision;
import io.orqueio.bpm.dmn.engine.DmnDecisionResult;
import io.orqueio.bpm.dmn.engine.DmnDecisionResultEntries;
import io.orqueio.bpm.dmn.engine.delegate.DmnDecisionLiteralExpressionEvaluationEvent;
import io.orqueio.bpm.dmn.engine.delegate.DmnDecisionLogicEvaluationEvent;
import io.orqueio.bpm.dmn.engine.impl.DefaultDmnEngineConfiguration;
import io.orqueio.bpm.dmn.engine.impl.DmnDecisionLiteralExpressionImpl;
import io.orqueio.bpm.dmn.engine.impl.DmnDecisionResultEntriesImpl;
import io.orqueio.bpm.dmn.engine.impl.DmnDecisionResultImpl;
import io.orqueio.bpm.dmn.engine.impl.DmnExpressionImpl;
import io.orqueio.bpm.dmn.engine.impl.DmnVariableImpl;
import io.orqueio.bpm.dmn.engine.impl.delegate.DmnDecisionLiteralExpressionEvaluationEventImpl;
import io.orqueio.bpm.engine.variable.context.VariableContext;
import io.orqueio.bpm.engine.variable.value.TypedValue;

public class DecisionLiteralExpressionEvaluationHandler implements DmnDecisionLogicEvaluationHandler {

  protected final ExpressionEvaluationHandler expressionEvaluationHandler;

  protected final String literalExpressionLanguage;

  public DecisionLiteralExpressionEvaluationHandler(DefaultDmnEngineConfiguration configuration) {
    expressionEvaluationHandler = new ExpressionEvaluationHandler(configuration);

    literalExpressionLanguage = configuration.getDefaultLiteralExpressionLanguage();
  }

  @Override
  public DmnDecisionLogicEvaluationEvent evaluate(DmnDecision decision, VariableContext variableContext) {
    DmnDecisionLiteralExpressionEvaluationEventImpl evaluationResult = new DmnDecisionLiteralExpressionEvaluationEventImpl();
    evaluationResult.setDecision(decision);
    evaluationResult.setExecutedDecisionElements(1);

    DmnDecisionLiteralExpressionImpl dmnDecisionLiteralExpression = (DmnDecisionLiteralExpressionImpl) decision.getDecisionLogic();
    DmnVariableImpl variable = dmnDecisionLiteralExpression.getVariable();
    DmnExpressionImpl expression = dmnDecisionLiteralExpression.getExpression();

    Object evaluateExpression = evaluateLiteralExpression(expression, variableContext);
    TypedValue typedValue = variable.getTypeDefinition().transform(evaluateExpression);

    evaluationResult.setOutputValue(typedValue);
    evaluationResult.setOutputName(variable.getName());

    return evaluationResult;
  }

  protected Object evaluateLiteralExpression(DmnExpressionImpl expression, VariableContext variableContext) {
    String expressionLanguage = expression.getExpressionLanguage();
    if (expressionLanguage == null) {
      expressionLanguage = literalExpressionLanguage;
    }
    return expressionEvaluationHandler.evaluateExpression(expressionLanguage, expression, variableContext);
  }

  @Override
  public DmnDecisionResult generateDecisionResult(DmnDecisionLogicEvaluationEvent event) {
    DmnDecisionLiteralExpressionEvaluationEvent evaluationEvent = (DmnDecisionLiteralExpressionEvaluationEvent) event;

    DmnDecisionResultEntriesImpl result = new DmnDecisionResultEntriesImpl();
    result.putValue(evaluationEvent.getOutputName(), evaluationEvent.getOutputValue());

    return new DmnDecisionResultImpl(Collections.<DmnDecisionResultEntries> singletonList(result));
  }

}
