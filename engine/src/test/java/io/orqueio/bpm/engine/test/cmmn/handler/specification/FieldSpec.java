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
package io.orqueio.bpm.engine.test.cmmn.handler.specification;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import io.orqueio.bpm.engine.delegate.Expression;
import io.orqueio.bpm.engine.impl.bpmn.parser.FieldDeclaration;
import io.orqueio.bpm.model.cmmn.CmmnModelInstance;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioCaseExecutionListener;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioExpression;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioField;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioString;

public class FieldSpec {

  protected String fieldName;
  protected String expression;
  protected String childExpression;
  protected String stringValue;
  protected String childStringValue;

  public FieldSpec(String fieldName, String expression, String childExpression,
      String stringValue, String childStringValue) {
    this.fieldName = fieldName;
    this.expression = expression;
    this.childExpression = childExpression;
    this.stringValue = stringValue;
    this.childStringValue = childStringValue;
  }

  public void verify(FieldDeclaration field) {
    assertEquals(fieldName, field.getName());

    Object fieldValue = field.getValue();
    assertNotNull(fieldValue);

    assertTrue(fieldValue instanceof Expression);
    Expression expressionValue = (Expression) fieldValue;
    assertEquals(getExpectedExpression(), expressionValue.getExpressionText());
  }

  public void addFieldToListenerElement(CmmnModelInstance modelInstance, OrqueioCaseExecutionListener listenerElement) {
    OrqueioField field = SpecUtil.createElement(modelInstance, listenerElement, null, OrqueioField.class);
    field.setOrqueioName(fieldName);

    if (expression != null) {
      field.setOrqueioExpression(expression);

    } else if (childExpression != null) {
      OrqueioExpression fieldExpressionChild = SpecUtil.createElement(modelInstance, field, null, OrqueioExpression.class);
      fieldExpressionChild.setTextContent(childExpression);

    } else if (stringValue != null) {
      field.setOrqueioStringValue(stringValue);

    } else if (childStringValue != null) {
      OrqueioString fieldExpressionChild = SpecUtil.createElement(modelInstance, field, null, OrqueioString.class);
      fieldExpressionChild.setTextContent(childStringValue);
    }
  }

  protected String getExpectedExpression() {
    if (expression != null) {
      return expression;
    } else if (childExpression != null) {
      return childExpression;
    } else if (stringValue != null) {
      return stringValue;
    } else {
      return childStringValue;
    }
  }

}
