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
package io.orqueio.bpm.dmn.engine.impl.transform;

import static io.orqueio.bpm.dmn.engine.impl.transform.DmnExpressionTransformHelper.createTypeDefinition;
import static io.orqueio.bpm.dmn.engine.impl.transform.DmnExpressionTransformHelper.getExpression;
import static io.orqueio.bpm.dmn.engine.impl.transform.DmnExpressionTransformHelper.getExpressionLanguage;

import io.orqueio.bpm.dmn.engine.impl.DmnExpressionImpl;
import io.orqueio.bpm.dmn.engine.impl.spi.transform.DmnElementTransformContext;
import io.orqueio.bpm.dmn.engine.impl.spi.transform.DmnElementTransformHandler;
import io.orqueio.bpm.model.dmn.instance.InputExpression;

public class DmnDecisionTableInputExpressionTransformHandler implements DmnElementTransformHandler<InputExpression, DmnExpressionImpl> {

  public DmnExpressionImpl handleElement(DmnElementTransformContext context, InputExpression inputExpression) {
    return createFromInputExpression(context, inputExpression);
  }

  protected DmnExpressionImpl createFromInputExpression(DmnElementTransformContext context, InputExpression inputExpression) {
    DmnExpressionImpl dmnExpression = createDmnElement(context, inputExpression);

    dmnExpression.setId(inputExpression.getId());
    dmnExpression.setName(inputExpression.getLabel());
    dmnExpression.setTypeDefinition(createTypeDefinition(context, inputExpression));
    dmnExpression.setExpressionLanguage(getExpressionLanguage(context, inputExpression));
    dmnExpression.setExpression(getExpression(inputExpression));

    return dmnExpression;
  }

  protected DmnExpressionImpl createDmnElement(DmnElementTransformContext context, InputExpression inputExpression) {
    return new DmnExpressionImpl();
  }

}
