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

import io.orqueio.bpm.dmn.engine.impl.DmnVariableImpl;
import io.orqueio.bpm.dmn.engine.impl.spi.transform.DmnElementTransformContext;
import io.orqueio.bpm.dmn.engine.impl.spi.transform.DmnElementTransformHandler;
import io.orqueio.bpm.dmn.engine.impl.spi.type.DmnTypeDefinition;
import io.orqueio.bpm.model.dmn.instance.Variable;

public class DmnVariableTransformHandler implements DmnElementTransformHandler<Variable, DmnVariableImpl> {

  public DmnVariableImpl handleElement(DmnElementTransformContext context, Variable variable) {
    return createFromVariable(context, variable);
  }

  protected DmnVariableImpl createFromVariable(DmnElementTransformContext context, Variable variable) {
    DmnVariableImpl dmnVariable = createDmnElement(context, variable);

    dmnVariable.setId(variable.getId());
    dmnVariable.setName(variable.getName());

    DmnTypeDefinition typeDefinition = createTypeDefinition(context, variable);
    dmnVariable.setTypeDefinition(typeDefinition);

    return dmnVariable;
  }

  protected DmnVariableImpl createDmnElement(DmnElementTransformContext context, Variable variable) {
    return new DmnVariableImpl();
  }

}
