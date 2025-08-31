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
package io.orqueio.bpm.qa.largedata.util;

import io.orqueio.bpm.model.dmn.Dmn;
import io.orqueio.bpm.model.dmn.DmnModelInstance;
import io.orqueio.bpm.model.dmn.instance.Decision;
import io.orqueio.bpm.model.dmn.instance.DecisionTable;
import io.orqueio.bpm.model.dmn.instance.Definitions;
import io.orqueio.bpm.model.dmn.instance.DmnElement;
import io.orqueio.bpm.model.dmn.instance.NamedElement;
import io.orqueio.bpm.model.dmn.instance.Output;

public class DmnHelper {
  public final static String TEST_NAMESPACE = "http://orqueio.io/schema/1.0/dmn";

  public static DmnModelInstance createSimpleDmnModel(final String decisionKey) {
    final DmnModelInstance modelInstance = Dmn.createEmptyModel();

    final Definitions definitions = generateNamedElement(Definitions.class, "definitions", modelInstance);
    definitions.setNamespace(TEST_NAMESPACE);

    modelInstance.setDefinitions(definitions);

    Decision decision = generateNamedElement(Decision.class, "decision1", modelInstance);
    decision.setId(decisionKey);
    DecisionTable decisionTable = generateElement(DecisionTable.class, modelInstance);
    decision.setExpression(decisionTable);
    Output output = generateElement(Output.class, modelInstance);
    decisionTable.getOutputs().add(output);
    definitions.addChildElement(decision);
    return modelInstance;
  }

  public static  <E extends NamedElement> E generateNamedElement(final Class<E> elementClass,
                                                                 final String name,
                                                                 final DmnModelInstance modelInstance) {
    E element = generateElement(elementClass, modelInstance);
    element.setName(name);
    return element;
  }

  public static <E extends DmnElement> E generateElement(final Class<E> elementClass,
                                                         final DmnModelInstance modelInstance) {
    E element = modelInstance.newInstance(elementClass);
    String identifier = elementClass.getSimpleName();
    identifier = Character.toLowerCase(identifier.charAt(0)) + identifier.substring(1);
    element.setId(identifier);
    return element;
  }
}